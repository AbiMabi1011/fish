/**
 * Online 2-Player Duel page.
 * Uses the same ocean gameplay UI as Single-Player mode, plus live opponent
 * tracking and a Play Again (rematch) flow that requires the opponent to accept.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  LogOut,
  Play,
  Plus,
  RotateCcw,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { START_LIVES } from "@/game/GameEngine";
import { useAuth } from "@/identity/AuthProvider";
import { useDuel } from "@/game/useDuel";
import { DUEL_ROUNDS, duelResult } from "@/game/duelRules";
import {
  createDuel,
  joinDuel,
  leaveDuel,
  requestRematch,
  startDuel,
} from "@/services/duelService";
import mascot from "@/assets/mascot.png";
import ocean from "@/assets/welcome-ocean.jpg";

export const Route = createFileRoute("/online")({
  head: () => ({
    meta: [
      { title: "Online Fish Duel — Treasure Count" },
      {
        name: "description",
        content:
          "Challenge a friend in an online two-player fish-counting match with shared puzzles and live scores.",
      },
      { property: "og:title", content: "Online Fish Duel — Treasure Count" },
      {
        property: "og:description",
        content:
          "Count the same fish, race the clock and challenge a friend online.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OnlinePage,
});

function OnlinePage() {
  const { user, displayName, loading, avatar } = useAuth();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const game = useDuel(roomId, user?.id);
  const { duel, players, puzzle } = game;

  // Allow pressing 0-9 on the keyboard to answer quickly during a round.
  useEffect(() => {
    if (!game.accepting) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        void game.submit(Number(event.key));
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [game.accepting, game.submit]);

  async function runAction(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn't connect to the room",
      );
    } finally {
      setBusy(false);
    }
  }

  function handleLeave() {
    void runAction(async () => {
      if (roomId) await leaveDuel(roomId);
      setRoomId(null);
    });
  }

  function handleRematch() {
    if (!duel) return;
    void runAction(async () => {
      const result = await requestRematch(duel.id);
      await game.refresh();
      if (result.started) {
        toast.success("Rematch starting!");
      } else {
        toast.success("Play again request sent — waiting for opponent!");
      }
    });
  }

  const isFinished = duel?.status === "finished";
  const isMyRunDone =
    !!players &&
    (players.me.round >= DUEL_ROUNDS || players.me.lives <= 0);
  const isPlayingActive =
    !!duel && !!players && duel.status === "playing" && !isMyRunDone;

  function renderNumberButton(digit: number) {
    return (
      <Button
        key={digit}
        type="button"
        variant="ghost"
        className="stepper p-0"
        disabled={!game.accepting}
        onClick={() => void game.submit(digit)}
        aria-label={`${digit} fish`}
      >
        {digit}
      </Button>
    );
  }

  const fmtTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const timerPercent = Math.max(0, Math.min(100, (game.timeLeft / 15) * 100));
  const isTimerUrgent = game.timeLeft <= 5 && game.countdown === 0;
  const myLives = Math.max(0, players?.me.lives ?? 0);

  return (
    <main className="welcome-page solo-ocean">
      <img
        src={ocean}
        alt=""
        width={1536}
        height={1024}
        className="welcome-background"
      />
      <div className="welcome-shade" />

      {isPlayingActive ? (
        <section className="solo-scene fade-up">
          {/* Same top HUD as Single-Player */}
          <div className="play-hud">
            <div
              className={`dive-timer-track ${isTimerUrgent ? "is-urgent" : ""}`}
              aria-hidden="true"
            >
              <span style={{ width: `${timerPercent}%` }} />
            </div>
            <div className="hud-player">
              <img
                src={avatar.image}
                alt={avatar.name}
                width={512}
                height={512}
                className="hud-avatar"
              />
              <span className="min-w-0">
                <b className="block truncate">
                  {displayName ?? players.me.name ?? "Player"}
                </b>
                <span className="text-xs text-muted-foreground">
                  Round {players.me.round + 1}/{DUEL_ROUNDS}
                </span>
              </span>
            </div>
            <div className="hud-pill" aria-live="polite">
              <span className="hud-seg">
                Score: <b className="text-gold">{players.me.score}</b>
              </span>
              <span className="hud-seg" aria-label={`${myLives} lives`}>
                {Array.from({ length: START_LIVES }, (_, i) => (
                  <span key={i} className={i < myLives ? "" : "opacity-25 grayscale"}>
                    ❤️
                  </span>
                ))}
              </span>
              <span
                className={`hud-seg ${isTimerUrgent ? "hud-time-danger" : ""}`}
                aria-label={`${game.timeLeft} seconds remaining`}
              >
                {game.countdown > 0
                  ? `Starts in ${game.countdown}`
                  : `⏱ ${fmtTime(game.timeLeft)}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                disabled={busy}
                onClick={handleLeave}
                className="hud-menu"
              >
                <LogOut />
                Leave match
              </Button>
            </div>
          </div>

          {/* Side panel matching Single-Player .solo-progress, showing live 2P scoreboard */}
          <aside className="solo-progress" aria-label="2-player match progress">
            <h2 className="font-display text-xl text-gold">2-Player Duel</h2>
            <dl className="dive-stats">
              <div>
                <dt>You</dt>
                <dd>{players.me.score}</dd>
              </div>
              <div>
                <dt>{players.opponent.name || "Opponent"}</dt>
                <dd>{players.opponent.score}</dd>
              </div>
              <div>
                <dt>Opp. lives</dt>
                <dd>{Math.max(0, players.opponent.lives)} ❤️</dd>
              </div>
            </dl>
            <div className="dive-next-level">
              <span className="text-sm text-muted-foreground">
                Opponent progress
              </span>
              <div className="stage-goal-progress">
                <b>
                  {players.opponent.round} / {DUEL_ROUNDS} rounds
                </b>
                <progress
                  aria-label="Opponent rounds completed"
                  value={players.opponent.round}
                  max={DUEL_ROUNDS}
                />
              </div>
            </div>
          </aside>

          {/* Same center puzzle panel as Single-Player */}
          <div className="play-panel">
            <h2 className="play-title">How many fish do you see?</h2>
            <div className="puzzle-frame">
              {puzzle && game.countdown === 0 ? (
                <img
                  key={puzzle.round}
                  src={puzzle.imageUrl}
                  alt="Count the fish"
                  className="api-puzzle-image puzzle-img h-full w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <img
                    src={avatar.image}
                    alt={avatar.name}
                    className="mascot w-20 rounded-full"
                  />
                  <p className="animate-pulse text-card-foreground">
                    {game.countdown > 0
                      ? `Starting in ${game.countdown}…`
                      : "Fetching the next puzzle…"}
                  </p>
                </div>
              )}
            </div>
            <div className="feedback-slot" aria-live="polite">
              {game.feedback && (
                <div
                  role="status"
                  className={`toast-pop ${
                    game.feedback.startsWith("Nice") ? "toast-ok" : "toast-bad"
                  }`}
                >
                  {game.feedback}
                </div>
              )}
            </div>
            <img
              src={avatar.image}
              alt=""
              width={512}
              height={512}
              className="play-mascot selected-character"
              aria-hidden="true"
            />
          </div>

          {game.error && (
            <p role="alert" className="text-center text-destructive">
              {game.error}
            </p>
          )}

          {/* Same split number pad as Single-Player */}
          <div className="answer-row">
            <div className="pad-cluster">
              {[1, 2, 3, 4].map(renderNumberButton)}
            </div>
            <div className="answer-mid">
              <label className="sr-only" htmlFor="duel-answer">
                How many fish?
              </label>
              <input
                id="duel-answer"
                aria-label="Number of fish"
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="?"
                value=""
                onChange={(e) => {
                  if (e.target.value !== "") {
                    void game.submit(Number(e.target.value));
                  }
                }}
                disabled={!game.accepting}
                className="answer-display w-28 text-center"
              />
              <div className="pad-cluster">
                {[9, 0].map(renderNumberButton)}
              </div>
            </div>
            <div className="pad-cluster">
              {[5, 6, 7, 8].map(renderNumberButton)}
            </div>
          </div>
          <p className="play-footer">
            Count carefully. Choose a number or press 0-9 to answer.
          </p>
        </section>
      ) : (
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-5 flex items-center justify-between gap-3">
            <Button variant="ghost" asChild className="hud-menu">
              <Link to="/">
                <ArrowLeft />
                Back to play
              </Link>
            </Button>
            {roomId && (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={handleLeave}
                className="hud-menu"
              >
                <LogOut />
                Leave match
              </Button>
            )}
          </div>

          <div className="mb-6 text-center">
            <span className="pill">
              <Users className="size-4" />
              Online duel
            </span>
            <h1 className="mt-3 font-display text-4xl text-gold">
              Two players. One ocean.
            </h1>
          </div>

          {loading ? (
            <p className="text-center">Loading…</p>
          ) : !user ? (
            <section className="play-panel mx-auto max-w-lg py-8 text-center">
              <img src={mascot} alt="Goldie" className="mascot mx-auto w-40" />
              <h2 className="mt-4 font-display text-2xl">
                Sign in to play online
              </h2>
              <Button asChild className="btn-gold mt-6 h-auto">
                <Link to="/auth">Sign in</Link>
              </Button>
            </section>
          ) : !roomId ? (
            <section className="play-panel mx-auto grid max-w-2xl gap-8 py-8 sm:grid-cols-2">
              <div className="space-y-5">
                <h2 className="font-display text-2xl">Create a match</h2>
                <img
                  src={avatar.image}
                  alt={avatar.name}
                  className="mascot w-32 rounded-full"
                />
                <Button
                  disabled={busy}
                  onClick={() => {
                    setProgress(0);
                    void runAction(async () =>
                      setRoomId(await createDuel(setProgress)),
                    );
                  }}
                  className="btn-gold h-auto"
                >
                  <Plus />
                  {busy && progress > 0
                    ? `Preparing ${progress}/10`
                    : "Create room"}
                </Button>
              </div>

              <form
                className="space-y-5 border-t border-border pt-6 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0"
                onSubmit={(event) => {
                  event.preventDefault();
                  void runAction(async () =>
                    setRoomId(await joinDuel(roomCode)),
                  );
                }}
              >
                <h2 className="font-display text-2xl">Join a friend</h2>
                <label className="field">
                  <span>Room code</span>
                  <input
                    aria-label="Room code"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    placeholder="XXXXXXXX"
                    required
                  />
                </label>
                <Button
                  disabled={busy || roomCode.length !== 8}
                  className="btn-gold h-auto"
                >
                  <Users />
                  Join room
                </Button>
              </form>
            </section>
          ) : !duel || !players ? (
            <p className="text-center">Connecting…</p>
          ) : (
            <section className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { ...players.me, label: "You" },
                  { ...players.opponent, label: "Opponent" },
                ].map((player) => (
                  <div key={player.label} className="mode-option min-w-0 p-4">
                    <p className="text-xs text-muted-foreground">
                      {player.label}
                    </p>
                    <h2 className="truncate font-display text-xl">
                      {player.name || "Waiting for a friend…"}
                    </h2>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <b className="font-display text-3xl text-gold">
                        {player.score}
                      </b>
                      <span className="text-sm">
                        {player.round}/{DUEL_ROUNDS} ·{" "}
                        {Math.max(0, player.lives)} ❤️
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {duel.status === "waiting" ? (
                <div className="play-panel py-8 text-center">
                  <p className="text-muted-foreground">Room code</p>
                  <div className="mt-2 flex items-center justify-center gap-3">
                    <span className="font-display text-3xl text-gold">
                      {duel.code}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Copy room code"
                      aria-label="Copy room code"
                      onClick={() => {
                        void navigator.clipboard
                          .writeText(duel.code)
                          .then(() => toast.success("Room code copied"));
                      }}
                    >
                      <Copy />
                    </Button>
                  </div>
                  <p className="mt-4 text-muted-foreground">
                    {duel.guest_id
                      ? "Both players are ready"
                      : "Waiting for player 2…"}
                  </p>
                  {players.host && (
                    <Button
                      disabled={busy || !duel.guest_id}
                      onClick={() =>
                        void runAction(async () => {
                          await startDuel(duel.id);
                          await game.refresh();
                        })
                      }
                      className="btn-gold mt-6 h-auto"
                    >
                      <Play />
                      Start match
                    </Button>
                  )}
                </div>
              ) : isFinished ? (
                <div className="play-panel py-8 text-center">
                  <img
                    src={mascot}
                    alt="Goldie"
                    className="mascot mx-auto w-32"
                  />
                  <h2 className="mt-4 font-display text-4xl text-gold">
                    {duelResult(players.me.score, players.opponent.score)}
                  </h2>
                  <p className="mt-3 text-muted-foreground">
                    Final score {players.me.score} — {players.opponent.score}
                  </p>

                  {/* Rematch / Play Again with Opponent Acceptance */}
                  {duel.guest_id && (
                    <div className="mt-6 space-y-3">
                      {players.opponent.rematch && !players.me.rematch && (
                        <p role="status" className="font-semibold text-gold">
                          {players.opponent.name || "Your opponent"} wants to
                          play again!
                        </p>
                      )}
                      {players.me.rematch && !players.opponent.rematch && (
                        <p
                          role="status"
                          className="animate-pulse text-muted-foreground"
                        >
                          Waiting for{" "}
                          {players.opponent.name || "your opponent"} to accept…
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    {duel.guest_id && (
                      <Button
                        disabled={busy || players.me.rematch}
                        onClick={handleRematch}
                        className="btn-gold h-auto"
                      >
                        {players.opponent.rematch && !players.me.rematch ? (
                          <>
                            <Check />
                            Accept &amp; Play again
                          </>
                        ) : players.me.rematch ? (
                          <>
                            <RotateCcw />
                            Waiting for opponent…
                          </>
                        ) : (
                          <>
                            <RotateCcw />
                            Play again
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={handleLeave}
                      className="hud-menu h-auto"
                    >
                      <Plus />
                      New room
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="play-panel py-12 text-center">
                  <h2 className="font-display text-3xl text-gold">
                    Your run is complete
                  </h2>
                  <p className="mt-3 text-muted-foreground">
                    Waiting for your opponent to finish…
                  </p>
                </div>
              )}
            </section>
          )}

          {game.error && (
            <p role="alert" className="mt-5 text-center text-destructive">
              {game.error}
            </p>
          )}
        </div>
      )}
    </main>
  );
}
