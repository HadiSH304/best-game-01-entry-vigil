// CARILLON — game state, simulation and FSM.
// Phases: title -> build -> night -> build -> ... -> results (victory /
// defeat). Rendering lives in render.js; this file is pure simulation
// plus input intents, so the soak can drive it without a canvas.
import { makeRng } from './rng.js';
import { NIGHT_TABLE, expandNight, nightIncoming } from './waves.js';
import { PATH, PATH_LENGTH, pointAt, WRAITH_TYPES, makeWraith, MUTE_RADIUS } from './wraiths.js';
import { BELL_TYPES, BELL_ORDER, UPGRADE_MULT, SELL_REFUND, CHIME_AURA, CHIME_RADIUS_BOOST, CHIME_INTERVAL_BOOST, RING_SPEED, makeBell, makeRing, applyRingHit } from './bells.js';
import { Pip } from './pet.js';
import { AudioSys } from './audio.js';
import { SPRITE_ERRORS } from './sprites.js';

export const PADS = [
  { x: 170, y: 500 }, { x: 290, y: 560 }, { x: 410, y: 410 }, { x: 520, y: 560 },
  { x: 660, y: 440 }, { x: 740, y: 280 }, { x: 900, y: 440 }, { x: 1000, y: 400 },
  { x: 1080, y: 560 }, { x: 900, y: 280 },
];
export const PAD_RADIUS = 26;
export const VOICE_MAX = 100;
export const START_GOLD = 150;

export function nightClearBonus(night) { return 60 + 25 * night; }

export class Game {
  constructor(opts = {}) {
    this.seed = opts.seed ?? 1;
    this.rng = makeRng(this.seed);
    this.time = 0; // sim seconds since game start
    this.vtime = 0; // cosmetic seconds (fireflies, twinkle) — also seeded
    this.phase = 'title'; // title | build | night | results
    this.result = null; // 'victory' | 'defeat' once phase === 'results'
    this.night = 0; // 1..7 while playing
    this.voice = VOICE_MAX;
    this.gold = START_GOLD;
    this.bells = [];
    this.wraiths = [];
    this.rings = [];
    this.sparks = [];
    this.flashes = [];
    this.pip = new Pip(this);
    this.spawnQueue = [];
    this.nightTime = 0;
    this.chords = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.kills = 0;
    this.nips = 0;
    this.nightsHeld = 0;
    this.boss = null;
    this.selectedPad = -1; // pad index with the build menu open, -1 = none
    this.menuType = null; // bell type highlighted in the open menu
    this.hoverBell = null;
    this.pads = PADS; // fixed rune-pad positions beside the road
    this.staged = false; // shot mode: freeze the sim, render one frame
    this.audio = new AudioSys();
    this.scenery = this.buildScenery();
    this.events = [];
  }

  log(kind, data) { this.events.push({ t: +this.time.toFixed(2), kind, ...(data || {}) }); }

  buildScenery() {
    const r = makeRng(this.seed * 7 + 3);
    const stars = [];
    for (let i = 0; i < 90; i++) stars.push({ x: r.range(0, 1280), y: r.range(0, 240), s: r.range(0.6, 1.8), p: r.range(0, 6.28) });
    const mushrooms = [];
    for (let i = 0; i < 14; i++) mushrooms.push({ x: r.range(40, 1240), y: r.range(600, 700), s: r.range(0.7, 1.4), hue: r.pick(['#ff7fb0', '#8af2e8', '#c9a5ff']) });
    const crystals = [];
    for (let i = 0; i < 10; i++) crystals.push({ x: r.range(60, 1220), y: r.range(590, 690), s: r.range(0.6, 1.3), c: r.pick(['#8af2e8', '#c9a5ff', '#9fe8ff']) });
    const stones = [];
    for (let i = 0; i < 7; i++) stones.push({ x: r.range(60, 1220), y: r.range(560, 660), s: r.range(0.8, 1.5), lean: r.range(-0.12, 0.12) });
    const fireflies = [];
    for (let i = 0; i < 26; i++) fireflies.push({ x: r.range(0, 1280), y: r.range(300, 640), p: r.range(0, 6.28), s: r.range(0.5, 1) });
    const grass = [];
    for (let i = 0; i < 60; i++) grass.push({ x: r.range(0, 1280), y: r.range(620, 712), s: r.range(0.7, 1.4) });
    const flowers = [];
    for (let i = 0; i < 18; i++) flowers.push({ x: r.range(40, 1240), y: r.range(470, 580), c: r.pick(['#ff7fb0', '#8af2e8', '#ffd76a']), p: r.range(0, 6.28) });
    return { stars, mushrooms, crystals, stones, fireflies, grass, flowers };
  }

  bellById(id) { return this.bells.find((b) => b.id === id) || null; }
  padBell(padIndex) { return this.bells.find((b) => b.padIndex === padIndex) || null; }

  startGame() {
    this.phase = 'build';
    this.night = 1;
    this.voice = VOICE_MAX;
    this.gold = START_GOLD;
    this.bells = [];
    this.wraiths = [];
    this.rings = [];
    this.chords = 0; this.combo = 0; this.kills = 0; this.nips = 0; this.nightsHeld = 0;
    this.boss = null;
    this.selectedPad = -1;
    this.menuType = 'treble';
    this.log('start');
  }

  startNight() {
    if (this.phase !== 'build') return false;
    this.spawnQueue = expandNight(this.night - 1);
    this.nightTime = 0;
    this.phase = 'night';
    this.selectedPad = -1;
    this.log('night-start', { night: this.night, spawns: this.spawnQueue.length });
    return true;
  }

  // --- Economy: build / upgrade / sell ---
  buildBell(padIndex, type) {
    if (this.phase !== 'build' && this.phase !== 'night') return false;
    if (this.padBell(padIndex)) return false;
    const t = BELL_TYPES[type];
    if (!t || this.gold < t.cost) return false;
    const pad = PADS[padIndex];
    this.gold -= t.cost;
    this.bells.push(makeBell(type, padIndex, pad.x, pad.y));
    this.log('build', { type, pad: padIndex, gold: this.gold });
    return true;
  }

  upgradeBell(bell) {
    if (!bell || bell.level !== 1) return false;
    const cost = Math.round(BELL_TYPES[bell.type].cost * UPGRADE_MULT);
    if (this.gold < cost) return false;
    this.gold -= cost;
    bell.invested += cost;
    bell.level = 2;
    this.log('upgrade', { type: bell.type, gold: this.gold });
    return true;
  }

  sellBell(bell) {
    if (!bell) return false;
    this.gold += Math.round(bell.invested * SELL_REFUND);
    this.bells = this.bells.filter((b) => b !== bell);
    if (this.selectedPad === bell.padIndex) this.selectedPad = -1;
    this.log('sell', { type: bell.type, gold: this.gold });
    return true;
  }

  // --- Wraith lifecycle ---
  spawnWraith(type) {
    const w = makeWraith(type, 0);
    w.bobPhase = this.rng.range(0, 6.28);
    this.wraiths.push(w);
    if (w.boss) this.boss = w;
    return w;
  }

  killWraith(w) {
    if (w.dead) return;
    w.dead = true;
    this.kills += 1;
    this.gold += w.reward;
    const c = WRAITH_TYPES[w.type];
    this.sparks.push({ x: w.x, y: w.y, t: 0, life: 0.6, color: this.wraithColor(w.type), n: 10 });
    if (w.type === 'splitter') {
      // A splitter bursts into two Drifts on the same spot.
      for (let i = 0; i < 2; i++) {
        const d = makeWraith('drift', Math.max(0, w.dist - 6 - i * 6));
        d.bobPhase = this.rng.range(0, 6.28);
        this.wraiths.push(d);
      }
      this.log('split', { at: Math.round(w.dist) });
    }
    if (w.boss) this.boss = null;
  }

  wraithColor(type) {
    return { drifter: '#9fe8ff', swift: '#a8f04a', shroud: '#a86ef0', splitter: '#ff8a2a', drift: '#ffb35e', hush: '#ff2fa0' }[type] || '#ffffff';
  }

  reachBelfry(w) {
    w.dead = true;
    this.voice = Math.max(0, this.voice - w.drain);
    this.audio.toll();
    this.flashes.push({ x: 1180, y: 460, t: 0, life: 0.5 });
    this.log('breach', { type: w.type, voice: this.voice });
    if (w.boss) this.boss = null;
    if (this.voice <= 0) this.defeat();
  }

  victory() {
    if (this.phase === 'results') return;
    this.phase = 'results';
    this.result = 'victory';
    this.nightsHeld = 7;
    this.audio.peal();
    this.log('victory');
  }

  defeat() {
    if (this.phase === 'results') return;
    this.phase = 'results';
    this.result = 'defeat';
    this.log('defeat');
  }

  grade() {
    if (this.result === 'victory') {
      if (this.voice >= 60) return 'S';
      if (this.voice >= 30) return 'A';
      return 'B';
    }
    if (this.result === 'defeat') return 'C';
    // Live grade during play: voice + chords.
    if (this.voice >= 80 && this.chords >= 8) return 'S';
    if (this.voice >= 60 && this.chords >= 4) return 'A';
    if (this.voice >= 40) return 'B';
    return 'C';
  }

  // --- Simulation step ---
  step(dt) {
    if (this.staged) return;
    this.time += dt;
    this.vtime += dt;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
    if (this.phase !== 'night' && this.phase !== 'build') return;

    // Spawning.
    if (this.phase === 'night') {
      this.nightTime += dt;
      while (this.spawnQueue.length > 0 && this.spawnQueue[0].at <= this.nightTime) {
        this.spawnWraith(this.spawnQueue.shift().type);
      }
    }

    // Chime auras: bells near a Chime ring wider and faster.
    for (const b of this.bells) {
      b.chimeBoost = this.bells.some(
        (c) => c.type === 'chime' && c !== b && Math.hypot(c.x - b.x, c.y - b.y) <= CHIME_AURA,
      );
    }

    // THE HUSH mutes bells inside its radius.
    for (const b of this.bells) {
      const muted = !!this.boss && Math.hypot(this.boss.x - b.x, this.boss.y - b.y) <= MUTE_RADIUS;
      if (muted && !b.muted) this.audio.thud();
      b.muted = muted;
    }

    // Bells ring.
    for (const b of this.bells) {
      if (b.muted) continue;
      if (BELL_TYPES[b.type].interval === 0) continue; // Chime never rings
      b.timer -= dt;
      if (b.timer <= 0) {
        this.rings.push(makeRing(b));
        this.audio.ring(BELL_TYPES[b.type].pitch);
        b.timer = this.bellInterval(b);
      }
    }

    // Rings expand and strike.
    for (const ring of this.rings) {
      ring.r += RING_SPEED * dt;
      for (const w of this.wraiths) {
        if (w.dead) continue;
        const d = Math.hypot(w.x - ring.x, w.y - ring.y);
        if (d <= ring.r + 2 && d >= ring.r - 16) applyRingHit(this, w, ring);
      }
    }
    this.rings = this.rings.filter((r) => r.r < r.maxR + 20);

    // Wraiths march.
    for (const w of this.wraiths) {
      if (w.dead) continue;
      const slowed = this.time < w.slowUntil;
      const speed = w.baseSpeed * (slowed ? w.slowFactor : 1);
      w.dist += speed * dt;
      const p = pointAt(w.dist);
      w.x = p.x; w.y = p.y; w.angle = p.angle;
      w.wobble += dt * 6;
      if (w.dist >= PATH_LENGTH) this.reachBelfry(w);
    }
    this.wraiths = this.wraiths.filter((w) => !w.dead);

    // Pip roams, dashes, nips.
    this.pip.step(dt);

    // Sparks and flashes age.
    for (const s of this.sparks) s.t += dt;
    this.sparks = this.sparks.filter((s) => s.t < s.life);
    for (const f of this.flashes) f.t += dt;
    this.flashes = this.flashes.filter((f) => f.t < f.life);

    // Night clear?
    if (this.phase === 'night' && this.spawnQueue.length === 0 && this.wraiths.length === 0) {
      if (this.night >= 7) {
        this.victory();
      } else {
        const bonus = nightClearBonus(this.night);
        this.gold += bonus;
        this.nightsHeld = this.night;
        this.log('night-clear', { night: this.night, bonus, gold: this.gold });
        this.night += 1;
        this.phase = 'build';
        this.selectedPad = -1;
      }
    }
  }

  bellInterval(b) {
    const t = BELL_TYPES[b.type];
    return t.interval * (b.chimeBoost ? CHIME_INTERVAL_BOOST : 1);
  }

  // --- HUD data ---
  incoming() { return nightIncoming(Math.max(0, this.night - 1)); }
  bellsHeld() {
    const counts = {};
    for (const b of this.bells) counts[b.type] = (counts[b.type] || 0) + 1;
    return BELL_ORDER.filter((t) => counts[t]).map((t) => ({ type: t, count: counts[t] }));
  }
  bossPct() { return this.boss ? Math.max(0, Math.round((this.boss.hp / this.boss.maxHp) * 100)) : null; }
}
