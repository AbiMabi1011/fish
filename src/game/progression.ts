/** Pure progression rules (XP levels, daily quests, avatar prices) shared by UI and tests. The database enforces the same values. */
export const XP_PER_LEVEL = 1000;
export function playerLevel(xp: number) {
  const level = 1 + Math.floor(Math.max(0, xp) / XP_PER_LEVEL);
  return { level, nextAt: level * XP_PER_LEVEL, progress: (Math.max(0, xp) % XP_PER_LEVEL) / XP_PER_LEVEL };
}
export const QUESTS = [
  { id: 1, title: "Count 30 fish total", goal: 30, field: "quest_fish", reward: "30 Coins" },
  { id: 2, title: "Get 5 correct answers in a row", goal: 5, field: "quest_streak", reward: "50 Coins" },
  { id: 3, title: "Survive for 2 minutes in a game", goal: 120, field: "quest_seconds", reward: "1 Seashell" },
] as const;
export const AVATAR_PRICES: Record<string, { coins: number; shells: number }> = {
  pufferfish: { coins: 100, shells: 0 }, angelfish: { coins: 150, shells: 0 }, seahorse: { coins: 200, shells: 0 }, starfish: { coins: 250, shells: 0 },
  "pirate-shark": { coins: 0, shells: 3 }, "baby-whale": { coins: 0, shells: 4 }, lanternfish: { coins: 0, shells: 5 },
};
export const MAP_STAGES = 100;
