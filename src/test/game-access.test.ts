import { describe, expect, it } from "vitest";
import { canPlayGame } from "@/identity/gameAccess";
describe("game access", () => {
  it("blocks signed-out players", () => { expect(canPlayGame(null)).toBe(false); expect(canPlayGame(undefined)).toBe(false); });
  it("allows signed-in players", () => { expect(canPlayGame({ id: "player-id" })).toBe(true); });
});