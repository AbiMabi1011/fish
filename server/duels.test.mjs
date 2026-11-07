import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "./store.mjs";
import { Duels } from "./duels.mjs";
test("duels enforce membership, capacity, host start, deadlines and replay protection", async (t) => {
  let now = 100000;
  t.mock.method(Date, "now", () => now);
  const store = createStore(":memory:");
  try {
    const host = await store.register(
        "host@example.com",
        "local-password-123",
        "Host",
      ),
      guest = await store.register(
        "guest@example.com",
        "local-password-123",
        "Guest",
      ),
      other = await store.register(
        "other@example.com",
        "local-password-123",
        "Other",
      );
    const service = new Duels(store, async () => ({
      imageUrl: "test-image",
      fish: 8,
      chests: 2,
    }));
    const id = await service.create(host);
    const room = await service.read(id, host);
    assert.equal(room.puzzles, undefined);
    await assert.rejects(() => service.read(id, other), /other players/);
    assert.equal(await service.join(room.code, guest), id);
    await assert.rejects(() => service.join(room.code, other), /full/);
    await assert.rejects(() => service.start(id, guest), /host/);
    await service.start(id, host);
    assert.equal((await service.puzzle(id, host)).fish, undefined);
    await assert.rejects(() => service.answer(id, host, 0, 8), /countdown/);
    now += 3100;
    assert.equal((await service.answer(id, host, 0, 8)).correct, true);
    await assert.rejects(() => service.answer(id, host, 0, 8), /ended/);
    assert.equal((await service.read(id, host)).host_score, 25);
    now += 20000;
    await service.read(id, guest);
    assert.equal((await service.read(id, host)).host_lives, 2);
    await service.leave(id, host);
    await service.leave(id, guest);
    assert.equal((await service.read(id, host)).status, "finished");
  } finally {
    store.close();
  }
});
