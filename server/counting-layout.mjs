/** Seeded presentation positions keep a puzzle stable during timer updates. */
export function countingLayout(fish, chests, seedText) {
  let seed = 2166136261;
  for (const char of seedText) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  const random = () => {
    seed += 0x6D2B79F5;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const total = fish + chests;
  const side = Math.max(4, Math.ceil(Math.sqrt(total)));
  const slots = Array.from({ length: side * side }, (_, i) => i);
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = slots[i];
    const b = slots[j];
    if (a === undefined || b === undefined) continue;
    slots[i] = b;
    slots[j] = a;
  }
  return Array.from({ length: total }, (_, i) => {
    const slot = slots[i] ?? i;
    const cell = 90 / side;
    return {
      kind: i < fish ? "fish" : "chest",
      left: 5 + (slot % side + 0.5) * cell + (random() - 0.5) * cell * 0.25,
      top: 5 + (Math.floor(slot / side) + 0.5) * cell + (random() - 0.5) * cell * 0.25,
      size: cell * (0.82 + random() * 0.12),
      rotation: (random() - 0.5) * 32,
      flipped: random() > 0.5,
    };
  });
}

