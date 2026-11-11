import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { createPostgresStore } from "./postgres-store.mjs";
import {
  createPostgresDatabase,
  normalizeConnectionString,
} from "./postgres-db.mjs";
import { createStore } from "./store.mjs";
import { importSqlite } from "./import-sqlite.mjs";
import { Duels } from "./duels.mjs";
import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

// PGlite executes the PostgreSQL engine in-process. This adapter supplies pg's client API.
function embeddedPool() {
  const db = new PGlite();
  const query = async (sql, values = []) =>
    values.length
      ? db.query(sql, values)
      : ((await db.exec(sql)).at(-1) ?? { rows: [] });
  return {
    query,
    connect: async () => ({ query, release() {} }),
    end: () => db.close(),
  };
}

test("PostgreSQL supports identity, transactional rewards, aquarium, reef and duel persistence", async () => {
  const store = await createPostgresStore(undefined, embeddedPool());
  try {
    const host = await store.register(
      "pg@example.com",
      "password-123",
      "Diver",
    );
    const guest = await store.register(
      "guest@example.com",
      "password-123",
      "Guest",
    );
    assert.equal(
      (await store.login("PG@example.com", "password-123")).id,
      host.id,
    );
    await assert.rejects(
      store.register("PG@example.com", "password-123", "Duplicate"),
      /already registered/,
    );
    const token = await store.createSession(host.id);
    assert.equal((await store.user(token)).id, host.id);
    const result = {
      correctAnswers: 200,
      fishCounted: 30,
      bestStreak: 5,
      elapsed: 120,
      score: 2100,
      level: 12,
      rounds: 200,
    };
    const reward = await store.complete(host.id, "pg-game", result);
    assert.deepEqual(await store.complete(host.id, "pg-game", result), reward);
    assert.equal((await store.progress(host.id)).max_stage, 12);
    assert.equal(await store.best(host.id), 2100);
    assert.equal((await store.leaderboard()).length, 1);
    await store.aquarium(host.id, "buy", "blue");
    await store.aquarium(host.id, "feed");
    const balance = (await store.progress(host.id)).coins;
    await assert.rejects(store.aquarium(host.id, "feed"), /still eating/);
    assert.equal((await store.progress(host.id)).coins, balance);
    await store.reef(host.id, "coral", "buy");
    const after = (await store.progress(host.id)).coins;
    await store.reef(host.id, "coral", "buy");
    assert.equal((await store.progress(host.id)).coins, after);
    await store.unlock(host.id, "pufferfish");
    assert.equal(
      (await store.selectAvatar(host.id, "pufferfish")).avatar_id,
      "pufferfish",
    );
    await store.gift(host.id, 1);
    await assert.rejects(store.gift(host.id, 1), /already collected/);
    const duel = new Duels(store, async () => ({ fish: 2, imageUrl: "image" }));
    const id = await duel.create(host);
    await duel.join((await duel.read(id, host)).code, guest);
    await duel.start(id, host);
    assert.equal((await duel.read(id, guest)).status, "playing");
    await duel.leave(id, guest);
    await duel.leave(id, host);
    assert.equal((await duel.read(id, host)).status, "finished");
    await store.logout(token);
    assert.equal(await store.user(token), null);
  } finally {
    await store.close();
  }
});

test("SQLite import preserves data and is repeatable, with no partial imports into populated targets", async () => {
  mkdirSync("data", { recursive: true });
  const file = resolve("data", "test-import-" + randomUUID() + ".sqlite");
  const source = createStore(file);
  let target;
  try {
    const user = await source.register(
      "import@example.com",
      "password-123",
      "Original",
    );
    source.complete(user.id, "old-game", {
      correctAnswers: 100,
      fishCounted: 0,
      bestStreak: 0,
      elapsed: 0,
      score: 100,
      level: 2,
      rounds: 100,
    });
    source.aquarium(user.id, "buy", "blue");
    source.close();
    target = await createPostgresDatabase(undefined, embeddedPool());
    const counts = await importSqlite(file, target);
    assert.equal(counts.users, 1);
    assert.equal(counts.games, 1);
    assert.deepEqual(await importSqlite(file, target), {
      alreadyImported: true,
    });
    const rows = await target.query(
      "SELECT data FROM progress WHERE user_id=$1",
      [user.id],
    );
    assert.deepEqual(JSON.parse(rows.rows[0].data).aquarium.fish, [
      "gold",
      "blue",
    ]);
    const reopened = createStore(file);
    await reopened.register("later@example.com", "password-123", "Later");
    reopened.close();
    await assert.rejects(importSqlite(file, target), /empty target/);
    assert.equal(
      Number(
        (await target.query("SELECT count(*) AS count FROM users")).rows[0]
          .count,
      ),
      1,
    );
  } finally {
    await target?.close();
    for (const suffix of ["", "-wal", "-shm"])
      rmSync(file + suffix, { force: true });
  }
});
test("PostgreSQL retries serialization conflicts using one checked-out client per transaction", async () => {
  const log = [];
  const client = {
    async query(sql) {
      log.push(sql);
      return { rows: [] };
    },
    release() {
      log.push("release");
    },
  };
  const pool = {
    async query() {
      return { rows: [] };
    },
    async connect() {
      return client;
    },
    async end() {},
  };
  const db = await createPostgresDatabase(undefined, pool);
  let calls = 0;
  try {
    const result = await db.transaction(async () => {
      await db.query("SELECT 1");
      if (++calls === 1)
        throw Object.assign(new Error("retry"), { code: "40001" });
      return "saved";
    });
    assert.equal(result, "saved");
    assert.deepEqual(log, [
      "BEGIN ISOLATION LEVEL SERIALIZABLE",
      "SELECT 1",
      "ROLLBACK",
      "release",
      "BEGIN ISOLATION LEVEL SERIALIZABLE",
      "SELECT 1",
      "COMMIT",
      "release",
    ]);
  } finally {
    await db.close();
  }
});

test("normalizeConnectionString configures compatible TLS for Supabase poolers without overriding explicit certs", () => {
  const pooler =
    "postgresql://postgres.ref:pass@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres";
  assert.equal(
    normalizeConnectionString(pooler),
    pooler + "?sslmode=require&uselibpqcompat=true",
  );
  assert.equal(
    normalizeConnectionString(pooler + "?sslmode=require"),
    pooler + "?sslmode=require&uselibpqcompat=true",
  );
  const strict =
    pooler + "?sslmode=verify-full&sslrootcert=./prod-ca-2021.crt";
  assert.equal(normalizeConnectionString(strict), strict);
  const local = "postgresql://postgres:pass@127.0.0.1:5432/postgres";
  assert.equal(normalizeConnectionString(local), local);
});
