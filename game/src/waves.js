// NIGHT_TABLE — 7 nights. Each night is a list of spawn groups, in order:
// { type, count, gap } — `count` wraiths of `type`, `gap` seconds apart.
// The boss appears only in night 7, as the last group.
export const NIGHT_TABLE = [
  // Night 1 — first drifters, learn to place bells.
  [{ type: 'drifter', count: 8, gap: 2.2 }],
  // Night 2 — swifts join: fast, low HP.
  [
    { type: 'drifter', count: 8, gap: 2.0 },
    { type: 'swift', count: 4, gap: 1.6 },
  ],
  // Night 3 — the first shroud: armored, chords only.
  [
    { type: 'drifter', count: 10, gap: 1.8 },
    { type: 'swift', count: 6, gap: 1.4 },
    { type: 'shroud', count: 2, gap: 3.0 },
  ],
  // Night 4 — splitters: kill one, two drifts come out.
  [
    { type: 'drifter', count: 10, gap: 1.7 },
    { type: 'swift', count: 8, gap: 1.3 },
    { type: 'shroud', count: 3, gap: 2.8 },
    { type: 'splitter', count: 2, gap: 3.5 },
  ],
  // Night 5 — pressure night.
  [
    { type: 'drifter', count: 12, gap: 1.6 },
    { type: 'swift', count: 10, gap: 1.2 },
    { type: 'shroud', count: 4, gap: 2.6 },
    { type: 'splitter', count: 4, gap: 3.2 },
  ],
  // Night 6 — the long siege before the boss.
  [
    { type: 'drifter', count: 14, gap: 1.5 },
    { type: 'swift', count: 12, gap: 1.1 },
    { type: 'shroud', count: 6, gap: 2.4 },
    { type: 'splitter', count: 5, gap: 3.0 },
  ],
  // Night 7 — THE HUSH walks the road last.
  [
    { type: 'drifter', count: 10, gap: 1.5 },
    { type: 'swift', count: 8, gap: 1.1 },
    { type: 'shroud', count: 5, gap: 2.4 },
    { type: 'splitter', count: 4, gap: 3.0 },
    { type: 'hush', count: 1, gap: 1.0 },
  ],
];

// Expand a night's groups into a timed spawn queue: [{ type, at }] with
// `at` = seconds after the night starts. Groups run back to back with a
// short breath between them.
export function expandNight(nightIndex) {
  const groups = NIGHT_TABLE[nightIndex];
  const queue = [];
  let t = 0.5;
  for (const g of groups) {
    for (let i = 0; i < g.count; i++) queue.push({ type: g.type, at: t + i * g.gap });
    t += g.count * g.gap + 1.5;
  }
  return queue;
}

export function nightHasBoss(nightIndex) {
  return NIGHT_TABLE[nightIndex].some((g) => g.type === 'hush');
}

export function nightIncoming(nightIndex) {
  // { type, count } list for the HUD INCOMING panel.
  return NIGHT_TABLE[nightIndex].map((g) => ({ type: g.type, count: g.count }));
}
