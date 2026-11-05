import { describe, it, expect } from "vitest";
import { duelPlayers, duelResult, DUEL_ROUNDS } from "@/game/duelRules";
import type { Duel } from "@/services/duelService";

const room: Duel = { id: "room", code: "ABCDEFGH", host_id: "host", guest_id: "guest", host_name: "One", guest_name: "Two", status: "playing", host_score: 50, guest_score: 30, host_round: 3, guest_round: 2, host_lives: 3, guest_lives: 2, host_started: null, guest_started: null, created_at: "2026-10-30" };
describe("online two-player rules", () => {
  it("gives player two their own score and opponent's progress", () => {
    const players = duelPlayers(room, "guest");
    expect(players.host).toBe(false);
    expect(players.me.score).toBe(30);
    expect(players.opponent.score).toBe(50);
    expect(players.me.round).toBe(2);
    expect(players.opponent.round).toBe(3);
  });
  it("compares scores for a win, loss or draw", () => {
    expect(duelResult(50,30)).toBe("You won!");
    expect(duelResult(30,50)).toBe("Your opponent won!");
    expect(duelResult(50,50)).toBe("It's a draw!");
  });
  it("limits online matches to ten shared rounds", () => { expect(DUEL_ROUNDS).toBe(10); });
});