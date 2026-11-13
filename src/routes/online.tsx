import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Copy, LogOut, Play, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FishCountingScene } from "@/components/FishCountingScene";
import { useAuth } from "@/identity/AuthProvider";
import { useDuel } from "@/game/useDuel";
import { DUEL_ROUNDS, duelResult } from "@/game/duelRules";
import { createDuel, joinDuel, leaveDuel, startDuel } from "@/services/duelService";
import mascot from "@/assets/mascot.png";
import ocean from "@/assets/welcome-ocean.jpg";

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
  useEffect(() => {
    if (!game.accepting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        void game.submit(Number(e.key));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [game.accepting, game.submit]);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try { await action(); } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't connect to the room"); }
    finally { setBusy(false); }
  };
  const leave = () => void run(async () => { if (id) await leaveDuel(id); setId(null); });
  const finished = duel?.status === "finished";
  const done = !!players && (players.me.round >= DUEL_ROUNDS || players.me.lives <= 0);
  const padButton = (n: number) => (
    <Button key={n} type="button" variant="ghost" className="stepper p-0" disabled={!game.accepting} onClick={() => void game.submit(n)} aria-label={`${n} fish`}>{n}</Button>
  );
  return (
    <main className="welcome-page solo-ocean">
      <img src={ocean} alt="" width={1536} height={1024} className="welcome-background" />
      <div className="welcome-shade" />
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Button variant="ghost" asChild className="hud-menu"><Link to="/"><ArrowLeft />Back to play</Link></Button>
          {id && <Button variant="ghost" disabled={busy} onClick={leave} className="hud-menu"><LogOut />Leave match</Button>}
        </div>
        {(!id || duel?.status === "waiting" || finished) && (
          <div className="mb-6 text-center"><span className="pill"><Users className="size-4" />Online duel</span><h1 className="mt-3 font-display text-4xl text-gold">Two players. One ocean.</h1></div>
        )}
        {loading ? <p className="text-center">Loading…</p> : !user ? (
          <section className="play-panel mx-auto max-w-lg py-8 text-center"><img src={mascot} alt="Goldie" className="mascot mx-auto w-40" /><h2 className="mt-4 font-display text-2xl">Sign in to play online</h2><Button asChild className="btn-gold mt-6 h-auto"><Link to="/auth">Sign in</Link></Button></section>
        ) : !id ? (
          <section className="play-panel mx-auto grid max-w-2xl gap-8 py-8 sm:grid-cols-2">
            <div className="space-y-5"><h2 className="font-display text-2xl">Create a match</h2><img src={avatar.image} alt={avatar.name} className="mascot w-32 rounded-full" /><Button disabled={busy} onClick={() => { setProgress(0); void run(async () => setId(await createDuel(setProgress))); }} className="btn-gold h-auto"><Plus />{busy && progress > 0 ? `Preparing ${progress}/10` : "Create room"}</Button></div>
            <form className="space-y-5 border-t border-border pt-6 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0" onSubmit={(e) => { e.preventDefault(); void run(async () => setId(await joinDuel(code))); }}><h2 className="font-display text-2xl">Join a friend</h2><label className="field"><span>Room code</span><input aria-label="Room code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={8} placeholder="XXXXXXXX" required /></label><Button disabled={busy || code.length !== 8} className="btn-gold h-auto"><Users />Join room</Button></form>
          </section>
        ) : !duel || !players ? <p className="text-center">Connecting…</p> : (
          <section className="solo-scene fade-up">
            <div className="grid grid-cols-2 gap-4">
              {[{ ...players.me, label: "You" }, { ...players.opponent, label: "Opponent" }].map((player) => <div key={player.label} className="mode-option min-w-0 p-4"><p className="text-xs text-muted-foreground">{player.label}</p><h2 className="truncate font-display text-xl">{player.name || "Waiting for a friend…"}</h2><div className="mt-2 flex flex-wrap items-center justify-between gap-2"><b className="font-display text-3xl text-gold">{player.score}</b><span className="text-sm">{player.round}/{DUEL_ROUNDS} · {Math.max(0, player.lives)} ❤️</span></div></div>)}
            </div>
            {duel.status === "waiting" ? (
              <div className="play-panel py-8 text-center"><p className="text-muted-foreground">Room code</p><div className="mt-2 flex items-center justify-center gap-3"><span className="font-display text-3xl text-gold">{duel.code}</span><Button variant="ghost" size="icon" title="Copy room code" aria-label="Copy room code" onClick={() => { void navigator.clipboard.writeText(duel.code).then(() => toast.success("Room code copied")); }}><Copy /></Button></div><p className="mt-4 text-muted-foreground">{duel.guest_id ? "Both players are ready" : "Waiting for player 2…"}</p>{players.host && <Button disabled={busy || !duel.guest_id} onClick={() => void run(async () => { await startDuel(duel.id); await game.refresh(); })} className="btn-gold mt-6 h-auto"><Play />Start match</Button>}</div>
            ) : finished ? (
              <div className="play-panel py-8 text-center"><img src={mascot} alt="Goldie" className="mascot mx-auto w-32" /><h2 className="mt-4 font-display text-4xl text-gold">{duelResult(players.me.score, players.opponent.score)}</h2><p className="mt-3 text-muted-foreground">Final score {players.me.score} — {players.opponent.score}</p><Button onClick={() => setId(null)} className="btn-gold mt-6 h-auto"><Plus />New match</Button></div>
            ) : done ? <div className="play-panel py-12 text-center"><h2 className="font-display text-3xl text-gold">Your run is complete</h2><p className="mt-3 text-muted-foreground">Waiting for your opponent to finish…</p></div> : (
              <>
                <div className="play-hud">
                  <div className={`dive-timer-track ${game.timeLeft <= 5 && game.countdown === 0 ? "is-urgent" : ""}`} aria-hidden="true"><span style={{ width: `${Math.max(0, Math.min(100, (game.timeLeft / 15) * 100))}%` }} /></div>
                  <div className="hud-pill" aria-live="polite">
                    <span className="hud-seg">Round <b className="text-gold">{players.me.round + 1}/{DUEL_ROUNDS}</b></span>
                    <span className={`hud-seg ${game.timeLeft <= 5 && game.countdown === 0 ? "hud-time-danger" : ""}`} aria-label={`${game.timeLeft} seconds remaining`}>{game.countdown > 0 ? `Starts in ${game.countdown}` : `⏱ ${game.timeLeft}s`}</span>
                  </div>
                </div>
                <div className="play-panel">
                  <h2 className="play-title">How many fish do you see?</h2>
                  <div className="puzzle-frame">{puzzle && game.countdown === 0 ? <FishCountingScene key={puzzle.round} puzzle={puzzle} round={puzzle.round} /> : <img src={avatar.image} alt="Preparing the next picture" className="mascot w-28 rounded-full" />}</div>
                  <div className="feedback-slot" aria-live="polite"><p role="status" className="min-h-6 text-center text-primary">{game.feedback}</p></div>
                  <img src={avatar.image} alt="" width={512} height={512} className="play-mascot selected-character" aria-hidden="true" />
                </div>
                <div className="answer-row">
                  <div className="pad-cluster">{[1, 2, 3, 4].map(padButton)}</div>
                  <div className="answer-mid">
                    <label className="sr-only" htmlFor="duel-answer">How many fish?</label>
                    <input id="duel-answer" aria-label="Number of fish" type="number" inputMode="numeric" min={0} placeholder="?" value="" onChange={(e) => { if (e.target.value !== "") void game.submit(Number(e.target.value)); }} disabled={!game.accepting} className="counter w-24 text-center" />
                    <div className="pad-cluster">{[9, 0].map(padButton)}</div>
                  </div>
                  <div className="pad-cluster">{[5, 6, 7, 8].map(padButton)}</div>
                </div>
                <p className="play-footer">Count carefully. Choose a number or press 0-9 to answer.</p>
              </>
            )}
          </section>
        )}
        {game.error && <p role="alert" className="mt-5 text-center text-destructive">{game.error}</p>}
      </div>
    </main>
  );
}