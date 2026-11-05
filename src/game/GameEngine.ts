/**
 * GameEngine — the game rules (HIGH COHESION).
 *
 * Owns score, lives, streak, timer and round flow. It has no React and
 * no HTML: it receives a puzzle provider (dependency injection → LOW
 * COUPLING, the engine can be tested with a fake API) and reports
 * everything that happens through its EventBus (EVENT-DRIVEN).
 *
 * Code generated with AI assistance (Lovable), reviewed by the author.
 */
import { stageStart, stageFromAnswers, TOTAL_STAGES } from "./stageRules";
import { EventBus } from "./eventBus";
import type { Puzzle } from "@/services/fishApi";

export const ROUND_TIME = 20;
export const START_LIVES = 3;

export const ANSWERS_PER_LEVEL = 5;
export function getRoundTime(correctAnswers: number): number {
  return Math.max(6, ROUND_TIME - Math.floor((stageFromAnswers(correctAnswers)-1)/4));
}

export type Phase = "idle" | "loading" | "playing" | "paused" | "over";

export interface GameState {
  phase: Phase;
  puzzle: Puzzle | null;
  score: number;
  lives: number;
  streak: number;
  round: number;
  timeLeft: number;
  roundTime: number;
  level: number;
  correctAnswers: number;
  bestStreak: number;
  fishCounted: number;
  elapsed: number;
  error: string | null;
}

export interface AnswerResult {
  correct: boolean;
  points: number;
  expected: { fish: number };
  reason: "answer" | "timeout";
}

export type GameEvents = {
  stateChanged: GameState;
  tick: number;
  answered: AnswerResult;
  gameOver: { score: number; rounds: number; correctAnswers: number; bestStreak: number; fishCounted: number; elapsed: number; level: number };
};

/** Pure scoring rule, exported so it can be unit-tested. */
export function calculatePoints(timeLeft: number, streak: number): number {
  return 10 + timeLeft + streak * 5;
}

export class GameEngine {
  readonly events = new EventBus<GameEvents>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private state: GameState = GameEngine.initialState();
  private requestId = 0;
  private startOffset = 0;

  constructor(private readonly getPuzzle: () => Promise<Puzzle>) {}

  static initialState(): GameState {
    const roundTime = getRoundTime(0);
    return { phase: "idle", puzzle: null, score: 0, lives: START_LIVES, streak: 0, round: 0, timeLeft: roundTime, roundTime, level: 1, correctAnswers: 0, bestStreak: 0, fishCounted: 0, elapsed: 0, error: null };
  }

  getState(): GameState {
    return this.state;
  }

  /** Start a game; a map stage above 1 begins at that level's faster clock. */
  start(stage = 1): void {
    this.stopTimer();
    this.state = GameEngine.initialState();
    const offset = stageStart(Math.min(TOTAL_STAGES,Math.max(1, Math.floor(stage))));
    this.state = { ...this.state, level: stageFromAnswers(offset), correctAnswers: offset };
    this.startOffset = offset;
    void this.nextRound();
  }

  async nextRound(): Promise<void> {
    this.stopTimer();
    const requestId = ++this.requestId;
    this.update({ phase: "loading", error: null });
    try {
      const puzzle = await this.getPuzzle();
      if (requestId !== this.requestId) return;
      const roundTime = getRoundTime(this.state.correctAnswers);
      this.update({ phase: "playing", puzzle, round: this.state.round + 1, timeLeft: roundTime, roundTime });
      this.startTimer();
    } catch (e) {
      if (requestId !== this.requestId) return;
      this.update({ error: e instanceof Error ? e.message : "Could not load puzzle" });
    }
  }

  /** The player only has to count the fish. */
  submit(fish: number): void {
    const p = this.state.puzzle;
    if (this.state.phase !== "playing" || !p) return;
    this.resolve(fish === p.fish, "answer");
  }

  pause(): void {
    if (this.state.phase !== "playing") return;
    this.stopTimer();
    this.update({ phase: "paused" });
  }

  resume(): void {
    if (this.state.phase !== "paused") return;
    this.update({ phase: "playing" });
    this.startTimer();
  }

  /** Back to the main menu: stop everything and reset to the idle state. */
  quit(): void {
    this.requestId++;
    this.stopTimer();
    this.state = GameEngine.initialState();
    this.events.emit("stateChanged", this.state);
  }

  dispose(): void {
    this.requestId++;
    this.stopTimer();
    this.events.clear();
  }

  private resolve(correct: boolean, reason: AnswerResult["reason"]): void {
    const p = this.state.puzzle;
    if (!p || this.state.phase !== "playing") return;
    this.stopTimer();
    const points = correct ? calculatePoints(this.state.timeLeft, this.state.streak) : 0;
    const lives = correct ? this.state.lives : this.state.lives - 1;
    const correctAnswers = this.state.correctAnswers + (correct ? 1 : 0);
    const streak = correct ? this.state.streak + 1 : 0;
    this.update({ score: this.state.score + points, streak, bestStreak: Math.max(this.state.bestStreak, streak), fishCounted: this.state.fishCounted + (correct ? p.fish : 0), lives, correctAnswers, level: stageFromAnswers(correctAnswers) });
    this.events.emit("answered", { correct, points, reason, expected: { fish: p.fish } });

    if (lives <= 0) {
      this.update({ phase: "over" });
      const st = this.state;
      this.events.emit("gameOver", { score: st.score, rounds: st.round, correctAnswers: st.correctAnswers - this.startOffset, bestStreak: st.bestStreak, fishCounted: st.fishCounted, elapsed: st.elapsed, level: st.level });
    } else {
      void this.nextRound();
    }
  }

  private startTimer(): void {
    this.timer = setInterval(() => {
      const t = this.state.timeLeft - 1;
      this.update({ timeLeft: t, elapsed: this.state.elapsed + 1 });
      this.events.emit("tick", t);
      if (t <= 0) this.resolve(false, "timeout");
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private update(patch: Partial<GameState>): void {
    this.state = { ...this.state, ...patch };
    this.events.emit("stateChanged", this.state);
  }
}
