import { describe, expect, it, vi } from "vitest";
import { GameEngine, calculatePoints, getRoundTime, START_LIVES } from "@/game/GameEngine";
import { toPuzzle } from "@/services/fishApi";

const puzzle = { imageUrl: "x.png", fish: 2, chests: 11 };
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("GameEngine", () => {
  it("scores 10 + time left + 5 per streak", () => {
    expect(calculatePoints(20, 0)).toBe(30);
    expect(calculatePoints(5, 2)).toBe(25);
  });

  it("correct answer adds points and keeps lives", async () => {
    const g = new GameEngine(async () => puzzle);
    g.start();
    await flush();
    g.submit(2);
    expect(g.getState().score).toBe(30);
    expect(g.getState().lives).toBe(START_LIVES);
    g.dispose();
  });

  it("three wrong answers end the game and emit gameOver", async () => {
    const g = new GameEngine(async () => puzzle);
    const over = vi.fn();
    g.events.on("gameOver", over);
    g.start();
    for (let i = 0; i < 3; i++) {
      await flush();
      g.submit(0);
    }
    expect(g.getState().phase).toBe("over");
    expect(over).toHaveBeenCalledOnce();
    g.dispose();
  });

  it("only the fish count matters", async () => {
    const g = new GameEngine(async () => puzzle);
    g.start();
    await flush();
    g.submit(11);
    expect(g.getState().lives).toBe(START_LIVES - 1);
    g.dispose();
  });

  it("adapts the external API format", () => {
    expect(toPuzzle({ question: "a.png", fish: 3, chest: 4 })).toEqual({ imageUrl: "a.png", fish: 3, chests: 4 });
    expect(() => toPuzzle({ foo: 1 })).toThrow();
  });

  it("pause freezes the clock and blocks answers until resume", async () => {
    vi.useFakeTimers();
    const g = new GameEngine(async () => puzzle);
    try {
      g.start();
      await Promise.resolve();
      vi.advanceTimersByTime(2000);
      g.pause();
      expect(g.getState().phase).toBe("paused");
      expect(g.getState().timeLeft).toBe(18);
      g.submit(2);
      vi.advanceTimersByTime(30000);
      expect(g.getState().timeLeft).toBe(18);
      expect(g.getState().score).toBe(0);
      expect(g.getState().lives).toBe(3);
      g.resume();
      g.resume();
      vi.advanceTimersByTime(1000);
      expect(g.getState().phase).toBe("playing");
      expect(g.getState().timeLeft).toBe(17);
    } finally {
      g.dispose();
      vi.useRealTimers();
    }
  });

  it("starts automatically with twenty seconds", async () => {
    const g = new GameEngine(async () => puzzle);
    g.start();
    await flush();
    expect(g.getState().timeLeft).toBe(20);
    g.dispose();
  });

  it("advances after five correct answers, not mistakes", async () => {
    const g = new GameEngine(async () => puzzle);
    g.start();
    await flush();
    g.submit(0);
    await flush();
    for (let i = 0; i < 4; i++) {
      g.submit(2);
      await flush();
    }
    expect(g.getState().level).toBe(1);
    g.submit(2);
    await flush();
    expect(g.getState().level).toBe(2);
    expect(g.getState().correctAnswers).toBe(5);
    expect(g.getState().timeLeft).toBe(20);
    g.start();
    await flush();
    expect(g.getState().level).toBe(1);
    expect(g.getState().correctAnswers).toBe(0);
    expect(g.getState().timeLeft).toBe(20);
    g.dispose();
  });

  it("keeps the opening stages fair and caps late-stage difficulty", () => {
    expect(getRoundTime(24)).toBe(20);
    expect(getRoundTime(100)).toBe(19);
    expect(getRoundTime(1000000)).toBe(6);
  });
  it("keeps time stable while working toward a stage goal", async () => {
    const g = new GameEngine(async () => puzzle);
    g.start();
    await flush();
    g.submit(2);
    await flush();
    expect(g.getState().roundTime).toBe(20);
    g.submit(2);
    await flush();
    expect(g.getState().roundTime).toBe(20);
    g.dispose();
  });

  it("quit returns to the idle menu state and stops the clock", async () => {
    vi.useFakeTimers();
    const g = new GameEngine(async () => puzzle);
    try {
      g.start();
      await Promise.resolve();
      vi.advanceTimersByTime(2000);
      g.submit(2);
      await Promise.resolve();
      g.quit();
      expect(g.getState().phase).toBe("idle");
      expect(g.getState().score).toBe(0);
      expect(g.getState().round).toBe(0);
      vi.advanceTimersByTime(30000);
      expect(g.getState().phase).toBe("idle");
      expect(g.getState().timeLeft).toBe(20);
    } finally {
      g.dispose();
      vi.useRealTimers();
    }
  });
});
