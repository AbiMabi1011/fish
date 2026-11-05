/**
 * Play screen — presentation only. Game rules live in GameEngine,
 * API access in fishApi, identity in AuthProvider.
 * Code generated with AI assistance (Lovable), reviewed by the author.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useGame } from "@/game/useGame";
import { stageGoal, stageStart } from "@/game/stageRules";
import { START_LIVES } from "@/game/GameEngine";
import { GameWelcome } from "@/components/GameWelcome";
import { GameModeChooser } from "@/components/GameModeChooser";
import { FishCountingScene } from "@/components/FishCountingScene";
import { Button } from "@/components/ui/button";
import { Pause, Play, Check, Home } from "lucide-react";
import { useAuth } from "@/identity/AuthProvider";
import { canPlayGame } from "@/identity/gameAccess";
import { api } from "@/services/localApi";
import { getPersonalBest, saveScore } from "@/services/scoreService";
import { recordGame, type GameReward } from "@/services/progressService";
import { useProgress } from "@/hooks/useProgress";
import ocean from "@/assets/welcome-ocean.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Treasure Count — Count the Fish Puzzle Game" },
      { name: "description", content: "Count the fish before time runs out. Build streaks, climb the leaderboard." },
      { property: "og:title", content: "Treasure Count — Count the Fish Puzzle Game" },
      { property: "og:description", content: "Count the fish before time runs out." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { stage?: number } => {
    const n = Number(s["stage"]);
    return Number.isInteger(n) && n >= 1 && n <= 100 ? { stage: n } : {};
  },
  component: PlayPage,
});


function PlayPage() {
  const { user, displayName, avatar } = useAuth();
  const navigate = useNavigate();
  const [best, setBest] = useState(0);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string; key: number } | null>(null);
  const [fish, setFish] = useState("");
  const [choosingMode, setChoosingMode] = useState(false);
  const [reward, setReward] = useState<GameReward | null>(null);
  const { refresh } = useProgress();
  const { stage } = Route.useSearch();
  const submitRef = useRef<(n: number) => void>(() => {});

  const { state, start, retry, submit, pause, resume, quit } = useGame({
    onAnswered: (r) =>
      setFeedback({
        ok: r.correct,
        key: Date.now(),
        text: r.correct ? `Correct! +${r.points}` : `${r.reason === "timeout" ? "Time's up!" : "Not quite."} Last picture had ${r.expected.fish} fish.`,
      }),
    onGameOver: async (r) => {
      const { score, rounds } = r;
      if (!user) return;
      recordGame({ ...r }).then((rw) => { setReward(rw); void refresh(); if (rw.quests.length) toast.success(`Daily quest complete! ×${rw.quests.length}`); }).catch(() => toast.error("Couldn't save your rewards"));
      try {
        await saveScore(user.id, score, rounds);
        setBest((b) => Math.max(b, score));
        toast.success("Score saved to the leaderboard");
      } catch {
        toast.error("Couldn't save your score");
      }
    },
  });

  submitRef.current = submit;

  useEffect(() => {
    if (user) getPersonalBest(user.id).then(setBest);
    else setBest(0);
  }, [user]);

  useEffect(() => {
    if (state.phase === "playing") setFish("");
  }, [state.round, state.phase]);

  // Picking a number — by pad tap, typed digit, or Enter — answers instantly.
  const answer = (n: number) => {
    if (!canPlayGame(user) || state.phase !== "playing") return;
    setFish(String(n));
    submitRef.current(n);
  };

  useEffect(() => {
    if (state.phase !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        answer(Number(e.key));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.phase]);

  const chooseGame = async () => {
    const data = await api("/auth/me");
    if (!canPlayGame(data.user)) {
      void navigate({ to: "/auth" });
      return;
    }
    setChoosingMode(true);
  };
  useEffect(() => {
    if (!stage || !user) return;
    void begin(stage);
    void navigate({ to: "/", search: {}, replace: true });
  }, [stage, user]);
  const begin = async (fromStage = 1) => {
    const data = await api("/auth/me");
    if (!canPlayGame(data.user)) { void navigate({ to: "/auth" }); return; }
    setFeedback(null);
    setReward(null);
    setChoosingMode(false);
    start(fromStage);
  };
  const lives = Math.max(state.lives, 0);
  const paused = state.phase === "paused";
  const levelProgress = state.correctAnswers-stageStart(state.level);
  const answersNeeded=stageGoal(state.level);
  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const padButton = (n: number) => (
    <Button key={n} type="button" variant="ghost" className="stepper p-0" disabled={state.phase !== "playing"} onClick={() => answer(n)} aria-label={`${n} fish`}>{n}</Button>
  );
  return (
    <main className={!user || choosingMode || state.phase === "idle" || state.phase === "over" ? "welcome-page" : "welcome-page solo-ocean"}>
      {user && !choosingMode && (state.phase === "playing" || state.phase === "loading" || paused) && <><img src={ocean} alt="" width={1536} height={1024} className="welcome-background" /><div className="welcome-shade" /></>}
      {choosingMode && user && <GameModeChooser onSingle={() => void begin()} onBack={() => setChoosingMode(false)} />}
      {(!user || (state.phase === "idle" && !choosingMode)) && (
        <GameWelcome onPlay={() => void chooseGame()} signedIn={!!user} best={best} />
      )}

      {user && (state.phase === "playing" || state.phase === "loading" || paused) && (
        <section className="solo-scene fade-up">
          <div className="play-hud">
            <div className={`dive-timer-track ${state.timeLeft<=5?"is-urgent":""}`} aria-hidden="true"><span style={{width:`${Math.max(0,Math.min(100,state.timeLeft/Math.max(1,state.roundTime)*100))}%`}}/></div>
            <div className="hud-player">
              <img src={avatar.image} alt={avatar.name} width={512} height={512} className="hud-avatar" />
              <span className="min-w-0">
                <b className="block truncate">{displayName ?? "Player"}</b>
                <span className="text-xs text-muted-foreground">Level {state.level}</span>
              </span>
            </div>
            <div className="hud-pill" aria-live="polite">
              <span className="hud-seg">Score: <b className="text-gold">{state.score}</b></span>
              <span className="hud-seg" aria-label={`${lives} lives`}>
                {Array.from({ length: START_LIVES }, (_, i) => (
                  <span key={i} className={i < lives ? "" : "opacity-25 grayscale"}>❤️</span>
                ))}
              </span>
              <span className={`hud-seg ${state.timeLeft <= 5 && !paused ? "hud-time-danger" : ""}`} aria-label={`${state.timeLeft} seconds remaining`}>⏱ {fmtTime(state.timeLeft)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" title={paused ? "Resume game" : "Pause game"} aria-label={paused ? "Resume game" : "Pause game"} onClick={paused ? resume : pause} disabled={state.phase === "loading"} className="border border-border text-gold">
                {paused ? <Play /> : <Pause />}
              </Button>
              <Button variant="ghost" onClick={quit} className="hud-menu"><Home />Main menu</Button>
            </div>
          </div>

          <aside className="solo-progress" aria-label="Round and level progress">
            <h2 className="font-display text-xl text-gold">Your dive</h2>
            <dl className="dive-stats"><div><dt>Round</dt><dd>{state.round}</dd></div><div><dt>Time per round</dt><dd>{state.roundTime}s</dd></div><div><dt>Streak</dt><dd>{state.streak} 🔥</dd></div></dl>
            <div className="dive-next-level" aria-label={`${levelProgress} of ${answersNeeded} correct answers to next level`}>
              <span className="text-sm text-muted-foreground">Next level</span>
              <div className="flex flex-wrap gap-2">
              <div className="stage-goal-progress"><b>{levelProgress} / {answersNeeded} correct</b><progress aria-label="Correct answers toward next stage" value={levelProgress} max={answersNeeded}/></div>
              </div>
            </div>
          </aside>

          <div className="play-panel">
            <h2 className="play-title">How many fish do you see?</h2>
            <div className="puzzle-frame">
              {paused ? (
                <div className="pause-screen absolute inset-0 z-10 flex flex-col items-center justify-center gap-3" role="status">
                  <Pause className="h-8 w-8 text-gold" />
                  <h2 className="font-display text-3xl text-gold">Paused</h2>
                  <span className="text-sm text-muted-foreground">Level {state.level} · {state.timeLeft}s remaining</span>
                  <Button onClick={resume} className="btn-gold h-auto"><Play />Resume</Button>
                </div>
              ) : state.phase === "loading" || !state.puzzle ? (
                <div className="flex flex-col items-center gap-3">
                  <img src={avatar.image} alt={avatar.name} className="mascot w-20 rounded-full" />
                  <p className="animate-pulse text-card-foreground">Fetching a new puzzle…</p>
                </div>
              ) : (
                <FishCountingScene key={state.round} puzzle={state.puzzle} round={state.round} />
              )}
            </div>
            <div className="feedback-slot" aria-live="polite">
              {feedback && !paused && (
                <div key={feedback.key} className={`toast-pop ${feedback.ok ? "toast-ok" : "toast-bad"}`}>{feedback.text}</div>
              )}
            </div>
            <img src={avatar.image} alt="" width={512} height={512} className="play-mascot selected-character" aria-hidden="true" />
          </div>

          {state.error && (
            <p className="text-center text-destructive">
              {state.error} <Button variant="link" onClick={retry}>Retry</Button>
            </p>
          )}

          <div className="answer-row">
            <div className="pad-cluster">{[1, 2, 3, 4].map(padButton)}</div>
            <div className="answer-mid">
              <div className="answer-display" aria-label="Your answer">{fish === "" ? "Your answer…" : fish}</div>
              <div className="pad-cluster">{[9, 0].map(padButton)}</div>
            </div>
            <div className="pad-cluster">{[5, 6, 7, 8].map(padButton)}</div>
          </div>
          <p className="play-footer">Count carefully. Choose a number to answer.</p>
        </section>
      )}

      {user && state.phase === "over" && !choosingMode && (
        <section className="over-ocean">
          <img src={ocean} alt="" width={1536} height={1024} className="welcome-background" />
          <div className="welcome-shade" />
          <div className="hud-player over-player">
            <img src={avatar.image} alt={avatar.name} width={512} height={512} className="hud-avatar" />
            <b className="block truncate">{displayName ?? "Player"}</b>
          </div>
          <span className="number-bubble over-bubble-left" aria-hidden="true">3</span>
          <span className="number-bubble over-bubble-right" aria-hidden="true">7</span>
          <div className="over-panel fade-up">
            <img src={avatar.image} alt={avatar.name} width={512} height={512} className="over-mascot selected-character" />
            <h2 className="over-title">Game Over</h2>
            <p className="over-sub">Level {state.level} · {state.roundTime}s per round</p>
            {feedback && <p className="over-note">{feedback.text}</p>}
            <div className="over-stats">
              <div className="over-stat"><span>Score</span><b className="text-gold">{state.score}</b></div>
              <div className="over-stat"><span>Rounds</span><b>{state.round}</b></div>
              <div className="over-stat"><span>Best</span><b>{Math.max(best, state.score)}</b></div>
            </div>
            {reward && <p className="pill mx-auto mt-4 w-fit">+{reward.xp} XP · +{reward.coins} 🪙{reward.shells ? ` · +${reward.shells} 🐚` : ""}</p>}
            {state.score > 0 && state.score >= best && <p className="pill mx-auto mt-4 w-fit">🏆 New personal best!</p>}
            <div className="over-actions">
              <Button onClick={() => void chooseGame()} className="btn-gold btn-lg h-auto"><Play />Play again</Button>
              <Link to="/journey" className="btn-ghost">Journey</Link>
              <Link to="/leaderboard" className="btn-ghost">Leaderboard</Link>
            </div>
          </div>
          <p className="play-footer over-footer">Count carefully. Choose a number to answer.</p>
        </section>
      )}
    </main>
  );
}
