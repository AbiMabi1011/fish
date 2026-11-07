// Independent persistence and identity. OpenAI Codex assistance; see REFERENCES.md.
import { createPostgresDatabase } from "./postgres-db.mjs";
import {
  randomUUID,
  randomBytes,
  scrypt as derive,
  timingSafeEqual,
  createHash,
  randomInt,
} from "node:crypto";
import { promisify } from "node:util";
import reefItems from "../src/game/reef-items.json" with { type: "json" };
const scrypt = promisify(derive);
const day = () => new Date().toISOString().slice(0, 10);
const prices = {
  pufferfish: [100, 0],
  angelfish: [150, 0],
  seahorse: [200, 0],
  starfish: [250, 0],
  "pirate-shark": [0, 3],
  "baby-whale": [0, 4],
  lanternfish: [0, 5],
};
export async function createPostgresStore(connectionString, suppliedPool) {
  const db = await createPostgresDatabase(connectionString, suppliedPool);
  const hashToken = (token) => createHash("sha256").update(token).digest("hex");
  const profile = (row) =>
    row
      ? {
          id: row.id,
          email: row.email,
          display_name: row.name,
          avatar_id: row.avatar,
        }
      : null;
  const tx = (operation) => db.transaction(operation);
  async function saveProgress(p) {
    await db
      .prepare(
        "INSERT INTO progress VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data",
      )
      .run(p.user_id, JSON.stringify(p));
  }
  async function progress(id) {
    const row = await db
      .prepare("SELECT data FROM progress WHERE user_id=?")
      .get(id);
    const p = row
      ? JSON.parse(row.data)
      : {
          user_id: id,
          xp: 0,
          coins: 0,
          shells: 0,
          max_stage: 1,
          unlocked_avatars: ["goldfish", "bluefish", "clownfish"],
          quest_date: day(),
          quest_fish: 0,
          quest_streak: 0,
          quest_seconds: 0,
          quests_done: [],
          claimed_gifts: [],
          daily_gift_date: null,
        };
    p.aquarium ??= { fish: ["gold"], fedAt: 0, feeds: 0 };
    p.reef_owned ??= [];
    p.reef_equipped ??= [];
    if (p.quest_date !== day())
      Object.assign(p, {
        quest_date: day(),
        quest_fish: 0,
        quest_streak: 0,
        quest_seconds: 0,
        quests_done: [],
      });
    await saveProgress(p);
    return p;
  }
  const store = {
    async register(email, password, name) {
      if (
        typeof email !== "string" ||
        !/^\S+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        email.length > 254
      )
        throw new Error("Enter a valid email address.");
      if (
        typeof password !== "string" ||
        password.length < 8 ||
        password.length > 128
      )
        throw new Error("Use a password between 8 and 128 characters.");
      if (typeof name !== "string" || !name.trim() || name.trim().length > 30)
        throw new Error("Enter a player name of 1–30 characters.");
      const id = randomUUID(),
        salt = randomBytes(16).toString("hex"),
        hash = (await scrypt(password, salt, 64)).toString("hex");
      try {
        await db
          .prepare(
            "INSERT INTO users(id,email,name,salt,hash) VALUES(?,?,?,?,?)",
          )
          .run(id, email.trim().toLowerCase(), name.trim(), salt, hash);
      } catch (e) {
        if (e.code === "23505")
          throw new Error(
            "This email is already registered on this server. Sign in with its password.",
          );
        throw e;
      }
      return profile(
        await db.prepare("SELECT * FROM users WHERE id=?").get(id),
      );
    },
    async login(email, password) {
      if (
        typeof email !== "string" ||
        typeof password !== "string" ||
        password.length > 128
      )
        throw new Error("Email or password not recognised.");
      const row = await db
        .prepare("SELECT * FROM users WHERE email=?")
        .get(email.trim().toLowerCase());
      const check = await scrypt(password, row?.salt || "dummy-local-salt", 64);
      if (!row || !timingSafeEqual(check, Buffer.from(row.hash, "hex")))
        throw new Error(
          "Email or password not recognised. Use an account created on this local server.",
        );
      return profile(row);
    },
    async createSession(id) {
      await db.prepare("DELETE FROM sessions WHERE expires<?").run(Date.now());
      const token = randomBytes(32).toString("hex");
      await db
        .prepare("INSERT INTO sessions VALUES(?,?,?)")
        .run(hashToken(token), id, Date.now() + 604800000);
      return token;
    },
    async user(token) {
      return token
        ? profile(
            await db
              .prepare(
                "SELECT u.* FROM users u JOIN sessions s ON u.id=s.user_id WHERE s.token=? AND s.expires>?",
              )
              .get(hashToken(token), Date.now()),
          )
        : null;
    },
    async logout(token) {
      if (token)
        await db
          .prepare("DELETE FROM sessions WHERE token=?")
          .run(hashToken(token));
    },
    progress,
    async selectAvatar(id, avatar) {
      if (!(await progress(id)).unlocked_avatars.includes(avatar))
        throw new Error("Unlock this avatar first.");
      await db.prepare("UPDATE users SET avatar=? WHERE id=?").run(avatar, id);
      return profile(
        await db.prepare("SELECT * FROM users WHERE id=?").get(id),
      );
    },
    async unlock(id, avatar) {
      return tx(async () => {
        const p = await progress(id);
        if (p.unlocked_avatars.includes(avatar)) return p;
        const price = prices[avatar];
        if (!price) throw new Error("Unknown avatar.");
        if (p.coins < price[0] || p.shells < price[1])
          throw new Error("Not enough coins or seashells.");
        p.coins -= price[0];
        p.shells -= price[1];
        p.unlocked_avatars.push(avatar);
        await saveProgress(p);
        return p;
      });
    },
    async aquarium(id, action, species) {
      return tx(async () => {
        const p = await progress(id),
          a = p.aquarium;
        if (action === "feed") {
          if (Date.now() - a.fedAt < 60000)
            throw new Error("Your fish are still eating. Wait a minute.");
          if (p.coins < 5)
            throw new Error("Earn 5 coins in the game to feed your fish.");
          p.coins -= 5;
          a.fedAt = Date.now();
          a.feeds++;
        } else if (action === "buy") {
          const prices = { gold: 60, blue: 100, silver: 150 };
          if (!Object.hasOwn(prices, species)) throw new Error("Unknown fish.");
          if (a.fish.length >= 8)
            throw new Error("Your tank is full (8 fish).");
          if (p.coins < prices[species])
            throw new Error("Play the game to earn more coins.");
          p.coins -= prices[species];
          a.fish.push(species);
        } else throw new Error("Unknown aquarium action.");
        await saveProgress(p);
        return p;
      });
    },
    async reef(id, itemId, action) {
      return tx(async () => {
        const item = reefItems.find((i) => i.id === itemId);
        if (!item || !["buy", "show", "hide"].includes(action))
          throw new Error("Unknown reef item or action.");
        const p = await progress(id);
        const owned = p.reef_owned.includes(itemId);
        if (action === "buy" && !owned) {
          if (1 + Math.floor(p.xp / 1000) < item.level)
            throw new Error(`Reach player level ${item.level} first.`);
          if (p.coins < item.coins || p.shells < item.shells)
            throw new Error("Not enough coins or seashells.");
          p.coins -= item.coins;
          p.shells -= item.shells;
          p.reef_owned.push(itemId);
        } else if (!owned) throw new Error("Buy this decoration first.");
        p.reef_equipped = p.reef_equipped.filter((i) => i !== itemId);
        if (action !== "hide") p.reef_equipped.push(itemId);
        await saveProgress(p);
        return p;
      });
    },
    async gift(id, gift) {
      return tx(async () => {
        const p = await progress(id);
        let coins = 0,
          shells = 0,
          xp = 0;
        if (gift === 0) {
          if (p.daily_gift_date === day())
            throw new Error("Today’s chest has already been collected.");
          coins = randomInt(20, 101);
          shells = randomInt(100) < 15 ? 1 : 0;
          p.daily_gift_date = day();
        } else {
          if (
            !Number.isInteger(gift) ||
            gift < 1 ||
            gift > 14 ||
            p.max_stage <= Math.ceil(gift / 2)
          )
            throw new Error("Finish the next stage to unlock this gift.");
          if (p.claimed_gifts.includes(gift))
            throw new Error("This gift is already collected.");
          if (gift % 5 === 0) shells = 1;
          else if (gift % 3 === 0) xp = 150;
          else coins = 30 + gift * 10;
          p.claimed_gifts.push(gift);
        }
        p.coins += coins;
        p.shells += shells;
        p.xp += xp;
        await saveProgress(p);
        return { coins, shells, xp };
      });
    },
    async complete(id, gameId, r) {
      return tx(async () => {
        const old = await db
          .prepare("SELECT reward FROM games WHERE id=? AND user_id=?")
          .get(gameId, id);
        if (old) return JSON.parse(old.reward);
        const p = await progress(id);
        p.quest_fish += r.fishCounted;
        p.quest_streak = Math.max(p.quest_streak, r.bestStreak);
        p.quest_seconds = Math.max(p.quest_seconds, r.elapsed);
        let coins = r.correctAnswers * 2,
          shells = 0;
        const quests = [];
        for (const [q, done, c, s] of [
          [1, p.quest_fish >= 30, 30, 0],
          [2, p.quest_streak >= 5, 50, 0],
          [3, p.quest_seconds >= 120, 0, 1],
        ])
          if (done && !p.quests_done.includes(q)) {
            quests.push(q);
            coins += c;
            shells += s;
          }
        p.xp += r.score;
        p.coins += coins;
        p.shells += shells;
        p.max_stage = Math.max(p.max_stage, Math.min(100, r.level));
        p.quests_done.push(...quests);
        await saveProgress(p);
        const reward = { xp: r.score, coins, shells, quests };
        await db
          .prepare(
            "INSERT INTO games(id,user_id,score,rounds,reward) VALUES(?,?,?,?,?)",
          )
          .run(gameId, id, r.score, r.rounds, JSON.stringify(reward));
        return reward;
      });
    },
    async leaderboard() {
      return await db
        .prepare(
          "SELECT g.id,g.score,g.rounds,g.created_at,u.name FROM games g JOIN users u ON u.id=g.user_id ORDER BY g.score DESC,g.created_at DESC LIMIT 20",
        )
        .all();
    },
    async best(id) {
      return (
        await db
          .prepare(
            "SELECT COALESCE(MAX(score),0) AS best FROM games WHERE user_id=?",
          )
          .get(id)
      ).best;
    },
    async room(id) {
      const row = await db.prepare("SELECT data FROM rooms WHERE id=?").get(id);
      if (!row) throw new Error("Room not found.");
      return JSON.parse(row.data);
    },
    async roomByCode(code) {
      const row = await db
        .prepare("SELECT data FROM rooms WHERE code=?")
        .get(code);
      if (!row) throw new Error("Room not found. Check its code.");
      return JSON.parse(row.data);
    },
    async saveRoom(room) {
      await db
        .prepare(
          "INSERT INTO rooms VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
        )
        .run(room.id, room.code, JSON.stringify(room));
    },
    async close() {
      await db.close();
    },
  };
  return {
    transaction: db.transaction,
    ...Object.fromEntries(
      Object.entries(store).map(([name, operation]) => [
        name,
        name === "close"
          ? operation
          : (...args) => tx(() => operation(...args)),
      ]),
    ),
  };
}
