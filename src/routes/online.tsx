import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Copy, LogOut, Play, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/identity/AuthProvider";
import { useDuel } from "@/game/useDuel";
import { DUEL_ROUNDS, duelResult } from "@/game/duelRules";
import { createDuel, joinDuel, leaveDuel, startDuel } from "@/services/duelService";
import mascot from "@/assets/mascot.png";

export const Route = createFileRoute("/online")({
  head: () => ({ meta: [
    { title: "Online Fish Duel — Treasure Count" },
    { name: "description", content: "Challenge a friend in an online two-player fish-counting match with shared puzzles and live scores." },
    { property: "og:title", content: "Online Fish Duel — Treasure Count" },
    { property: "og:description", content: "Count the same fish, race the clock and challenge a friend online." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: OnlinePage,
});

function OnlinePage() {
  const { user, loading, avatar } = useAuth();
  const [id, setId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const game = useDuel(id, user?.id);
  const { duel, players, puzzle } = game;
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try { await action(); } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't connect to the room"); }
    finally { setBusy(false); }
  };
  const leave = () => void run(async () => { if (id) await leaveDuel(id); setId(null); });
  const finished = duel?.status === "finished";
  const done = !!players && (players.me.round >= DUEL_ROUNDS || players.me.lives <= 0);
  return (
    <main className="mx-auto max-w-4xl px-4 pb-16">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Button variant="ghost" asChild><Link to="/"><ArrowLeft />Back to play</Link></Button>
        {id && <Button variant="ghost" disabled={busy} onClick={leave}><LogOut />Leave match</Button>}
      </div>
      <div className="mb-6 text-center"><span className="pill"><Users className="size-4" />Online duel</span><h1 className="mt-3 font-display text-4xl text-gold">Two players. One ocean.</h1></div>
      {loading ? <p className="text-center">Loading…</p> : !user ? (
        <section className="py-8 text-center"><img src={mascot} alt="Goldie" className="mascot mx-auto w-40" /><h2 className="mt-4 font-display text-2xl">Sign in to play online</h2><Button asChild className="btn-gold mt-6 h-auto"><Link to="/auth">Sign in</Link></Button></section>
      ) : !id ? (
        <section className="mx-auto grid max-w-2xl gap-8 py-8 sm:grid-cols-2">
          <div className="space-y-5"><h2 className="font-display text-2xl">Create a match</h2><img src={avatar.image} alt={avatar.name} className="mascot w-32 rounded-full" /><Button disabled={busy} onClick={() => { setProgress(0); void run(async () => setId(await createDuel(setProgress))); }} className="btn-gold h-auto"><Plus />{busy && progress > 0 ? `Preparing ${progress}/10` : "Create room"}</Button></div>
          <form className="space-y-5 border-t border-border pt-6 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0" onSubmit={(e) => { e.preventDefault(); void run(async () => setId(await joinDuel(code))); }}><h2 className="font-display text-2xl">Join a friend</h2><label className="field"><span>Room code</span><input aria-label="Room code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={8} placeholder="XXXXXXXX" required /></label><Button disabled={busy || code.length !== 8} className="btn-gold h-auto"><Users />Join room</Button></form>
        </section>
      ) : !duel || !players ? <p className="text-center">Connecting…</p> : (
        <section className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {[{ ...players.me, label: "You" }, { ...players.opponent, label: "Opponent" }].map((player) => <div key={player.label} className="mode-option min-w-0 p-4"><p className="text-xs text-muted-foreground">{player.label}</p><h2 className="truncate font-display text-xl">{player.name || "Waiting for a friend…"}</h2><div className="mt-2 flex flex-wrap items-center justify-between gap-2"><b className="font-display text-3xl text-gold">{player.score}</b><span className="text-sm">{player.round}/{DUEL_ROUNDS} · {Math.max(0, player.lives)} ❤️</span></div></div>)}
          </div>
          {duel.status === "waiting" ? (
            <div className="py-8 text-center"><p className="text-muted-foreground">Room code</p><div className="mt-2 flex items-center justify-center gap-3"><span className="font-display text-3xl text-gold">{duel.code}</span><Button variant="ghost" size="icon" title="Copy room code" aria-label="Copy room code" onClick={() => { void navigator.clipboard.writeText(duel.code).then(() => toast.success("Room code copied")); }}><Copy /></Button></div><p className="mt-4 text-muted-foreground">{duel.guest_id ? "Both players are ready" : "Waiting for player 2…"}</p>{players.host && <Button disabled={busy || !duel.guest_id} onClick={() => void run(async () => { await startDuel(duel.id); await game.refresh(); })} className="btn-gold mt-6 h-auto"><Play />Start match</Button>}</div>
          ) : finished ? (
            <div className="py-8 text-center"><img src={mascot} alt="Goldie" className="mascot mx-auto w-32" /><h2 className="mt-4 font-display text-4xl text-gold">{duelResult(players.me.score, players.opponent.score)}</h2><p className="mt-3 text-muted-foreground">Final score {players.me.score} — {players.opponent.score}</p><Button onClick={() => setId(null)} className="btn-gold mt-6 h-auto"><Plus />New match</Button></div>
          ) : done ? <div className="py-12 text-center"><h2 className="font-display text-3xl text-gold">Your run is complete</h2><p className="mt-3 text-muted-foreground">Waiting for your opponent to finish…</p></div> : (
            <>
              <div className="flex items-center justify-between"><span className="pill">Round {players.me.round + 1}/{DUEL_ROUNDS}</span><span className="font-display text-2xl text-gold" aria-label={`${game.timeLeft} seconds remaining`}>{game.countdown > 0 ? `Starts in ${game.countdown}` : `${game.timeLeft}s`}</span></div>
              <div className="puzzle-frame">{puzzle && game.countdown === 0 ? <img src={puzzle.imageUrl} alt="Count the fish" className="api-puzzle-image h-full w-full object-contain" /> : <img src={avatar.image} alt="Preparing the next picture" className="mascot w-28 rounded-full" />}</div>
              <p role="status" className="min-h-6 text-center text-primary">{game.feedback}</p>
              <div className="flex flex-col items-center gap-4"><label className="font-display text-lg" htmlFor="duel-answer">How many fish?</label><input id="duel-answer" aria-label="Number of fish" type="number" inputMode="numeric" min={0} placeholder="?" value="" onChange={(e) => { if (e.target.value !== "") void game.submit(Number(e.target.value)); }} disabled={!game.accepting} className="counter w-24 text-center" /><div className="grid grid-cols-5 gap-2 sm:grid-cols-10">{[1,2,3,4,5,6,7,8,9,0].map((n) => <Button key={n} variant="ghost" className="stepper p-0" disabled={!game.accepting} onClick={() => void game.submit(n)} aria-label={`${n} fish`}>{n}</Button>)}</div></div>
            </>
          )}
        </section>
      )}
      {game.error && <p role="alert" className="mt-5 text-center text-destructive">{game.error}</p>}
    </main>
  );
}