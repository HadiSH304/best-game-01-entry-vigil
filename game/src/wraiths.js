// Wraith types + the valley road they march down.
// The road is a polyline across the 1280x720 play field; wraiths track
// their distance along it. The belfry door is the last point.
export const PATH = [
  [-60, 580], [170, 580], [290, 480], [520, 480], [620, 360],
  [860, 360], [960, 480], [1080, 480], [1160, 520],
];

export const PATH_LENGTH = (() => {
  let total = 0;
  for (let i = 1; i < PATH.length; i++) {
    total += Math.hypot(PATH[i][0] - PATH[i - 1][0], PATH[i][1] - PATH[i - 1][1]);
  }
  return total;
})();

// Point on the road at distance d along it (clamped to the ends).
export function pointAt(d) {
  const clamped = Math.max(0, Math.min(PATH_LENGTH, d));
  let acc = 0;
  for (let i = 1; i < PATH.length; i++) {
    const [x0, y0] = PATH[i - 1];
    const [x1, y1] = PATH[i];
    const seg = Math.hypot(x1 - x0, y1 - y0);
    if (acc + seg >= clamped) {
      const f = seg === 0 ? 0 : (clamped - acc) / seg;
      return { x: x0 + (x1 - x0) * f, y: y0 + (y1 - y0) * f, angle: Math.atan2(y1 - y0, x1 - x0) };
    }
    acc += seg;
  }
  const last = PATH[PATH.length - 1];
  return { x: last[0], y: last[1], angle: 0 };
}

// hp: hit points. speed: px/s along the road. drain: Voice lost when one
// reaches the belfry. reward: gold when silenced. sprite: pixel-art key.
export const WRAITH_TYPES = {
  drifter:  { name: 'Drifter',  hp: 45,  speed: 55,  drain: 8,  reward: 12, sprite: 'drifter',  scale: 1.0,  label: 'pale wisp' },
  swift:    { name: 'Swift',    hp: 30,  speed: 95,  drain: 6,  reward: 10, sprite: 'swift',    scale: 0.9,  label: 'fast, frail' },
  shroud:   { name: 'Shroud',   hp: 130, speed: 40,  drain: 12, reward: 18, sprite: 'shroud',   scale: 1.1,  label: 'armored — chords only' },
  splitter: { name: 'Splitter', hp: 60,  speed: 50,  drain: 8,  reward: 15, sprite: 'splitter', scale: 1.0,  label: 'splits into two Drifts' },
  drift:    { name: 'Drift',    hp: 15,  speed: 110, drain: 3,  reward: 4,  sprite: 'drift',    scale: 0.6,  label: 'splitter spawn' },
  hush:     { name: 'THE HUSH', hp: 2600, speed: 26, drain: 40, reward: 200, sprite: 'hush',   scale: 2.4,  label: 'mutes bells near it', boss: true },
};

export const MUTE_RADIUS = 150; // THE HUSH silences bells inside this.
export const CHORD_WINDOW = 0.35; // seconds between two bells' rings on one wraith.
export const SHROUD_NONCHORD = 0.25; // Shroud takes 1/4 from a lone ring.

let nextWraithId = 1;

export function makeWraith(type, dist = 0) {
  const t = WRAITH_TYPES[type];
  const p = pointAt(dist);
  return {
    id: nextWraithId++,
    type,
    name: t.name,
    hp: t.hp,
    maxHp: t.hp,
    speed: t.speed,
    baseSpeed: t.speed,
    drain: t.drain,
    reward: t.reward,
    sprite: t.sprite,
    scale: t.scale,
    boss: !!t.boss,
    dist,
    x: p.x,
    y: p.y,
    angle: p.angle,
    slowUntil: -1,
    slowFactor: 1,
    lastHit: null, // { t, bellId } — the last ring that struck this wraith
    dead: false,
    bobPhase: 0,
    wobble: 0,
  };
}
