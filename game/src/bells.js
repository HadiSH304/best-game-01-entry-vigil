// Bell types + rings + chords.
// A bell rings every `interval` seconds: an expanding sound ring pulses
// outward at RING_SPEED. A wraith is struck once as the ring front crosses
// it. Two bells' rings striking the same wraith within CHORD_WINDOW is a
// CHORD: double damage, combo, bonus gold, a white-gold flash and a chime.
import { CHORD_WINDOW, SHROUD_NONCHORD } from './wraiths.js';

export const RING_SPEED = 260; // px/s the ring front travels

// pitch: fundamental in Hz. color: the ring + sprite colour. role: the
// one-line description the build menu shows.
export const BELL_TYPES = {
  treble: { name: 'Treble', cost: 40,  interval: 1.1, radius: 110, damage: 14, pitch: 880, color: '#ffb020', role: 'Cheap, fast rings — pepper the road' },
  alto:   { name: 'Alto',   cost: 70,  interval: 1.6, radius: 140, damage: 26, pitch: 659, color: '#ff6a5e', role: 'Balanced — steady, honest damage' },
  tenor:  { name: 'Tenor',  cost: 110, interval: 2.4, radius: 180, damage: 48, pitch: 523, color: '#a06bff', role: 'Slow, heavy rings — big splash' },
  bass:   { name: 'Bass',   cost: 150, interval: 3.6, radius: 230, damage: 85, pitch: 330, color: '#2fd8c8', role: 'Very slow, huge ring — shakes the valley' },
  chime:  { name: 'Chime',  cost: 90,  interval: 0,   radius: 160, damage: 0,  pitch: 1046, color: '#ff7fb0', role: 'Support — nearby bells ring wider + faster' },
};

export const BELL_ORDER = ['treble', 'alto', 'tenor', 'bass', 'chime'];
export const UPGRADE_MULT = 0.6; // upgrade costs 60% of the base price
export const SELL_REFUND = 0.7;  // sell returns 70% of gold invested
export const CHIME_RADIUS_BOOST = 1.35; // radius multiplier from a Chime aura
export const CHIME_INTERVAL_BOOST = 0.75; // interval multiplier from a Chime aura
export const CHIME_AURA = 160; // Chime's support radius in px

let nextBellId = 1;
let nextRingId = 1;

export function makeBell(type, padIndex, x, y) {
  const t = BELL_TYPES[type];
  return {
    id: nextBellId++,
    type,
    name: t.name,
    padIndex,
    x,
    y,
    level: 1,
    invested: t.cost,
    timer: 0.4, // first ring comes quickly so a new bell feels alive
    muted: false,
    chimeBoost: false,
  };
}

export function bellInterval(bell) {
  const t = BELL_TYPES[bell.type];
  return t.interval * (bell.chimeBoost ? CHIME_INTERVAL_BOOST : 1);
}

export function bellRadius(bell) {
  const t = BELL_TYPES[bell.type];
  const levelMul = bell.level === 2 ? 1.2 : 1;
  return t.radius * levelMul * (bell.chimeBoost ? CHIME_RADIUS_BOOST : 1);
}

export function bellDamage(bell) {
  const t = BELL_TYPES[bell.type];
  return t.damage * (bell.level === 2 ? 1.5 : 1);
}

// One ring: { x, y, r, maxR, damage, bellId, color, hit:Set<wraithId> }.
export function makeRing(bell) {
  return {
    id: nextRingId++,
    x: bell.x,
    y: bell.y,
    r: 6,
    maxR: bellRadius(bell),
    damage: bellDamage(bell),
    bellId: bell.id,
    color: BELL_TYPES[bell.type].color,
    hit: new Set(),
  };
}

// Strike one wraith with one ring. Returns 'chord' | 'hit' | null.
// Chord rules live here so the soak tests them through this one function.
export function applyRingHit(game, wraith, ring) {
  if (wraith.dead || ring.hit.has(wraith.id)) return null;
  ring.hit.add(wraith.id);
  let dmg = ring.damage;
  let chord = false;
  const last = wraith.lastHit;
  if (last && last.bellId !== ring.bellId && game.time - last.t <= CHORD_WINDOW) {
    chord = true;
    dmg *= 2;
  } else if (wraith.type === 'shroud' && !chord) {
    dmg *= SHROUD_NONCHORD; // armored shell shrugs off a lone ring
  }
  wraith.lastHit = { t: game.time, bellId: ring.bellId };
  wraith.hp -= dmg;
  if (chord) {
    game.chords += 1;
    game.combo += 1;
    game.comboTimer = 3;
    game.gold += 6; // chord bonus gold
    game.flashes.push({ x: wraith.x, y: wraith.y, t: 0, life: 0.45 });
    game.audio.chord();
  } else {
    game.audio.ring(BELL_TYPES[game.bellById(ring.bellId)?.type ?? 'treble']?.pitch ?? 880);
  }
  if (wraith.hp <= 0) game.killWraith(wraith);
  return chord ? 'chord' : 'hit';
}
