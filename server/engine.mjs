// src/game/stageRules.ts
var TOTAL_STAGES = 100;
var GOALS = [5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90];
function stageGoal(stage) {
  return GOALS[stage - 1] ?? 100 + (stage - GOALS.length - 1) * 10;
}
function stageStart(stage) {
  let total = 0;
  for (let i = 1; i < stage; i++) total += stageGoal(i);
  return total;
}
function stageFromAnswers(answers) {
  let stage = 1;
  while (stage < TOTAL_STAGES && answers >= stageGoal(stage)) {
    answers -= stageGoal(stage);
    stage++;
  }
  return stage;
}

// src/game/eventBus.ts
var EventBus = class {
  listeners = {};
  on(event, listener) {
    (this.listeners[event] ??= /* @__PURE__ */ new Set()).add(listener);
    return () => this.listeners[event]?.delete(listener);
  }
  emit(event, payload) {
    this.listeners[event]?.forEach((l) => l(payload));
  }
  clear() {
    this.listeners = {};
  }
};

// src/game/GameEngine.ts
var ROUND_TIME = 20;
var START_LIVES = 3;
var ANSWERS_PER_LEVEL = 5;
function getRoundTime(correctAnswers) {
  return Math.max(6, ROUND_TIME - Math.floor((stageFromAnswers(correctAnswers) - 1) / 4));
}
function calculatePoints(timeLeft, streak) {
  return 10 + timeLeft + streak * 5;
}
var GameEngine = class _GameEngine {
  constructor(getPuzzle) {
    this.getPuzzle = getPuzzle;
  }
  events = new EventBus();
  timer = null;
  state = _GameEngine.initialState();
  requestId = 0;
  startOffset = 0;
  static initialState() {
    const roundTime = getRoundTime(0);
    return { phase: "idle", puzzle: null, score: 0, lives: START_LIVES, streak: 0, round: 0, timeLeft: roundTime, roundTime, level: 1, correctAnswers: 0, bestStreak: 0, fishCounted: 0, elapsed: 0, error: null };
  }
  getState() {
    return this.state;
  }
  /** Start a game; a map stage above 1 begins at that level's faster clock. */
  start(stage = 1) {
    this.stopTimer();
    this.state = _GameEngine.initialState();
    const offset = stageStart(Math.min(TOTAL_STAGES, Math.max(1, Math.floor(stage))));
    this.state = { ...this.state, level: stageFromAnswers(offset), correctAnswers: offset };
    this.startOffset = offset;
    void this.nextRound();
  }
  async nextRound() {
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
  submit(fish) {
    const p = this.state.puzzle;
    if (this.state.phase !== "playing" || !p) return;
    this.resolve(fish === p.fish, "answer");
  }
  pause() {
    if (this.state.phase !== "playing") return;
    this.stopTimer();
    this.update({ phase: "paused" });
  }
  resume() {
    if (this.state.phase !== "paused") return;
    this.update({ phase: "playing" });
    this.startTimer();
  }
  /** Back to the main menu: stop everything and reset to the idle state. */
  quit() {
    this.requestId++;
    this.stopTimer();
    this.state = _GameEngine.initialState();
    this.events.emit("stateChanged", this.state);
  }
  dispose() {
    this.requestId++;
    this.stopTimer();
    this.events.clear();
  }
  resolve(correct, reason) {
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
  startTimer() {
    this.timer = setInterval(() => {
      const t = this.state.timeLeft - 1;
      this.update({ timeLeft: t, elapsed: this.state.elapsed + 1 });
      this.events.emit("tick", t);
      if (t <= 0) this.resolve(false, "timeout");
    }, 1e3);
  }
  stopTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
  update(patch) {
    this.state = { ...this.state, ...patch };
    this.events.emit("stateChanged", this.state);
  }
};
export {
  ANSWERS_PER_LEVEL,
  GameEngine,
  ROUND_TIME,
  START_LIVES,
  calculatePoints,
  getRoundTime
};
