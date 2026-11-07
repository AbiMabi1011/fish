import { randomUUID, randomBytes } from "node:crypto";
export class Duels {
  constructor(store, provider) {
    this.store = store;
    this.provider = provider;
    this.creating = new Set();
    let queue = Promise.resolve();
    for (const name of ["read", "join", "start", "puzzle", "answer", "leave"]) {
      const operation = this[name].bind(this);
      this[name] = (...args) => {
        if (store.transaction)
          return store.transaction(() => operation(...args));
        const result = queue.then(() => operation(...args));
        queue = result.catch(() => {});
        return result;
      };
    }
  }
  async create(user) {
    if (this.creating.has(user.id))
      throw new Error("A room is already being created.");
    this.creating.add(user.id);
    try {
      const puzzles = [];
      for (let i = 0; i < 10; i += 2)
        puzzles.push(
          ...(await Promise.all([this.provider(), this.provider()])),
        );
      const room = {
        id: randomUUID(),
        code: randomBytes(4).toString("hex").toUpperCase(),
        created_at: new Date().toISOString(),
        status: "waiting",
        host_id: user.id,
        host_name: user.display_name,
        host_round: 0,
        host_score: 0,
        host_lives: 3,
        host_started: null,
        guest_id: null,
        guest_name: null,
        guest_round: 0,
        guest_score: 0,
        guest_lives: 3,
        guest_started: null,
        puzzles,
      };
      await this.store.saveRoom(room);
      return room.id;
    } finally {
      this.creating.delete(user.id);
    }
  }
  member(room, user) {
    if (![room.host_id, room.guest_id].includes(user.id))
      throw new Error("This room belongs to other players.");
    return user.id === room.host_id ? "host" : "guest";
  }
  async sweep(room) {
    if (room.status !== "playing") return;
    for (const side of ["host", "guest"]) {
      if (room[side + "_round"] >= 10 || room[side + "_lives"] <= 0) continue;
      if (
        room[side + "_started"] &&
        Date.now() > Date.parse(room[side + "_started"]) + 15000
      ) {
        room[side + "_round"]++;
        room[side + "_lives"]--;
        room[side + "_started"] = new Date(Date.now() + 700).toISOString();
      }
    }
    if (
      ["host", "guest"].every(
        (s) => room[s + "_round"] >= 10 || room[s + "_lives"] <= 0,
      )
    )
      room.status = "finished";
    await this.store.saveRoom(room);
  }
  async read(id, user) {
    const room = await this.store.room(id);
    this.member(room, user);
    await this.sweep(room);
    const { puzzles, ...publicRoom } = room;
    return publicRoom;
  }
  async join(code, user) {
    const room = await this.store.roomByCode(String(code).trim().toUpperCase());
    if (room.host_id === user.id || room.guest_id === user.id) return room.id;
    if (room.status !== "waiting" || room.guest_id)
      throw new Error("This room is full or already started.");
    Object.assign(room, { guest_id: user.id, guest_name: user.display_name });
    await this.store.saveRoom(room);
    return room.id;
  }
  async start(id, user) {
    const room = await this.store.room(id);
    if (room.host_id !== user.id || !room.guest_id || room.status !== "waiting")
      throw new Error("Only the host can start when both players are ready.");
    room.status = "playing";
    room.host_started = room.guest_started = new Date(
      Date.now() + 3000,
    ).toISOString();
    await this.store.saveRoom(room);
  }
  async puzzle(id, user) {
    const room = await this.store.room(id),
      side = this.member(room, user);
    await this.sweep(room);
    const n = room[side + "_round"];
    if (room.status !== "playing" || n >= 10 || room[side + "_lives"] <= 0)
      return null;
    return {
      imageUrl: room.puzzles[n].imageUrl,
      round: n,
      startsAt: room[side + "_started"],
      seconds: 15,
    };
  }
  async answer(id, user, round, answer) {
    const room = await this.store.room(id),
      side = this.member(room, user);
    if (!Number.isInteger(answer) || answer < -1 || answer > 99)
      throw new Error("Invalid answer.");
    if (
      room.status !== "playing" ||
      room[side + "_round"] !== round ||
      room[side + "_lives"] <= 0 ||
      round >= 10
    )
      throw new Error("This round has already ended.");
    const start = Date.parse(room[side + "_started"]);
    if (Date.now() < start) throw new Error("Wait for the countdown.");
    const left = Math.max(0, Math.ceil((start + 15000 - Date.now()) / 1000));
    const expected = room.puzzles[round].fish,
      correct = left > 0 && answer === expected,
      points = correct ? 10 + left : 0;
    room[side + "_score"] += points;
    room[side + "_round"]++;
    if (!correct) room[side + "_lives"]--;
    room[side + "_started"] = new Date(Date.now() + 700).toISOString();
    if (
      ["host", "guest"].every(
        (s) => room[s + "_round"] >= 10 || room[s + "_lives"] <= 0,
      )
    )
      room.status = "finished";
    await this.store.saveRoom(room);
    return { expected, correct, points };
  }
  async leave(id, user) {
    const room = await this.store.room(id),
      side = this.member(room, user);
    if (room.status === "waiting") {
      if (side === "host") room.status = "finished";
      else {
        room.guest_id = null;
        room.guest_name = null;
      }
    } else {
      room[side + "_lives"] = 0;
      room[side + "_round"] = 10;
    }
    await this.store.saveRoom(room);
    await this.sweep(room);
  }
}
