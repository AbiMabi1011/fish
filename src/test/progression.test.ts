import { describe, expect, it } from "vitest";
import { playerLevel, AVATAR_PRICES, QUESTS } from "@/game/progression";
describe("progression", () => {
  it("levels up every 1000 XP", () => {
    expect(playerLevel(0).level).toBe(1);
    expect(playerLevel(999).level).toBe(1);
    expect(playerLevel(4983)).toMatchObject({ level: 5, nextAt: 5000 });
  });
  it("starter avatars are free and shark costs 3 seashells", () => {
    expect(AVATAR_PRICES["goldfish"]).toBeUndefined();
    expect(AVATAR_PRICES["pirate-shark"]).toEqual({ coins: 0, shells: 3 });
  });
  it("quests target 30 fish, 5 streak, 2 minutes", () => {
    expect(QUESTS.map((q) => q.goal)).toEqual([30, 5, 120]);
  });
});
