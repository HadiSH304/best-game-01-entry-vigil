// CARILLON — boot, game loop, input, shot modes, soak wiring.
// Shot modes stage deterministic frames for screenshots:
//   ?shot=title | build | night | climax | results   (+ &seed=1)
//   ?soak=1  runs the headless self-test and logs PASS/FAIL lines.
import { Game, PADS, PAD_RADIUS } from './game.js';
import { W, H } from './render.js';
import { drawScene } from './render.js';
import {
  drawTopBar, drawObjectives, drawRightPanel, drawBuildBar, drawHowTo,
  drawBuildMenu, drawTitle, drawResults,
} from './hud.js';
import { BELL_TYPES, BELL_ORDER, makeRing } from './bells.js';
import { pointAt } from './wraiths.js';
import { runSoak } from './soak.js';
import { SPRITE_ERRORS } from './sprites.js';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || '1') || 1;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const game = new Game({ seed });
window.__GAME__ = game;
window.__SPRITE_ERRORS__ = SPRITE_ERRORS;

// ---- Shot staging: deterministic frames, sim frozen afterwards ----
function placeBell(g, padIndex, type, level = 1) {
  const pad = PADS[padIndex];
  g.gold = Math.max(g.gold, 9999);
  g.buildBell(padIndex, type);
  const b = g.padBell(padIndex);
  if (b && level === 2) { g.gold = 9999; g.upgradeBell(b); }
  return b;
}

function stageCommon(night, gold) {
  game.startGame();
  game.night = night;
  game.gold = gold;
  game.vtime = 12;
  game.time = 40;
}

function stageTitle() {
  game.vtime = 12;
  game.pip.x = 1130;
  game.pip.y = 590;
}

function stageBuild() {
  stageCommon(3, 320);
  placeBell(game, 0, 'treble');
  placeBell(game, 3, 'alto');
  placeBell(game, 5, 'tenor');
  game.gold = 320;
  game.selectedPad = 2; // empty pad — menu shows all 5 bells + roles
  game.menuType = 'tenor';
  game.staged = true;
}

function stageNight() {
  stageCommon(4, 210);
  placeBell(game, 0, 'treble');
  placeBell(game, 1, 'alto');
  placeBell(game, 4, 'tenor');
  placeBell(game, 6, 'bass');
  placeBell(game, 8, 'chime');
  game.gold = 210;
  game.phase = 'night';
  game.nightTime = 18;
  game.chords = 12;
  game.combo = 5;
  game.comboTimer = 2.5;
  game.kills = 31;
  game.nips = 6;
  game.nightsHeld = 3;
  game.voice = 82;
  for (const [type, dist] of [['drifter', 420], ['swift', 300], ['shroud', 640], ['drifter', 760], ['splitter', 520]]) {
    const w = game.spawnWraith(type);
    w.dist = dist;
    const p = pointAt(dist);
    w.x = p.x; w.y = p.y;
  }
  // Rings mid-flight from three bells.
  for (const b of game.bells) {
    if (b.type === 'chime') continue;
    const ring = makeRing(b);
    ring.r = ring.maxR * 0.55;
    game.rings.push(ring);
  }
  // Pip mid-dash toward the leader.
  const leader = game.wraiths.reduce((a, w) => (w.dist > a.dist ? w : a), game.wraiths[0]);
  game.pip.state = 'dash';
  game.pip.target = leader;
  game.pip.x = (game.pip.homeX + leader.x) / 2;
  game.pip.y = (game.pip.homeY + leader.y) / 2;
  // Build menu open on an empty pad: bell names, costs, roles readable.
  game.selectedPad = 2;
  game.menuType = 'tenor';
  game.staged = true;
}

function stageClimax() {
  stageCommon(7, 210);
  placeBell(game, 0, 'treble');
  placeBell(game, 1, 'alto');
  placeBell(game, 4, 'tenor');
  placeBell(game, 5, 'bass');
  placeBell(game, 6, 'chime', 2);
  placeBell(game, 7, 'treble'); // near the boss — will read MUTED
  game.gold = 210;
  game.phase = 'night';
  game.nightTime = 52;
  game.chords = 23;
  game.combo = 7;
  game.comboTimer = 2.5;
  game.kills = 96;
  game.nips = 14;
  game.nightsHeld = 6;
  game.voice = 64;
  // THE HUSH on the road, HP ~55% — set back from the muted bells so
  // its sprite never covers them or their MUTED labels.
  const boss = game.spawnWraith('hush');
  boss.dist = 1040;
  const bp = pointAt(1040);
  boss.x = bp.x; boss.y = bp.y;
  boss.hp = 1430;
  game.boss = boss;
  // Wraiths around it.
  for (const [type, dist] of [['drifter', 980], ['swift', 880], ['shroud', 1180], ['splitter', 1240], ['drifter', 1300]]) {
    const w = game.spawnWraith(type);
    w.dist = dist;
    const p = pointAt(dist);
    w.x = p.x; w.y = p.y;
  }
  // The bell beside the boss is muted; the rest ring.
  for (const b of game.bells) {
    b.muted = Math.hypot(boss.x - b.x, boss.y - b.y) <= 150;
    if (!b.muted && b.type !== 'chime') {
      const ring = makeRing(b);
      ring.r = ring.maxR * (0.4 + (b.id % 3) * 0.2);
      game.rings.push(ring);
    }
  }
  // Pip mid-dash toward the boss.
  game.pip.state = 'dash';
  game.pip.target = boss;
  game.pip.x = (game.pip.homeX + boss.x) / 2;
  game.pip.y = (game.pip.homeY + boss.y) / 2;
  game.pip.trail = [
    { x: game.pip.x + 60, y: game.pip.y + 24, t: 0.4 },
    { x: game.pip.x + 30, y: game.pip.y + 12, t: 0.3 },
  ];
  game.staged = true;
}

function stageResults() {
  stageCommon(7, 180);
  game.phase = 'results';
  game.result = 'victory';
  game.nightsHeld = 7;
  game.kills = 143;
  game.chords = 38;
  game.nips = 21;
  game.voice = 64;
  game.staged = true;
}

const shot = params.get('shot');
if (shot === 'build') stageBuild();
else if (shot === 'night') stageNight();
else if (shot === 'climax') stageClimax();
else if (shot === 'results') stageResults();
else stageTitle(); // default + ?shot=title

// ---- Soak ----
if (params.get('soak') === '1') {
  const result = runSoak();
  window.__SOAK__ = result;
  for (const row of result.log) console.log(`SOAK ${row.pass ? 'PASS' : 'FAIL'} ${row.test} ${row.detail}`);
  console.log(`SOAK ${result.passed}/${result.total} passed`);
  if (result.errors.length) console.log(`SOAK ERRORS: ${result.errors.join('\n')}`);
}

// ---- Input ----
function toCanvas(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * W,
    y: ((e.clientY - r.top) / r.height) * H,
  };
}

function inRect(p, r) {
  return r && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

function bellButtonRects() {
  const rects = [];
  let x = 16;
  for (let i = 0; i < BELL_ORDER.length; i++) {
    rects.push({ x, y: 658, w: 132, h: 52, type: BELL_ORDER[i] });
    x += 142;
  }
  return rects;
}

function handleClick(p) {
  game.audio.unlock();
  const ui = game.ui || {};
  if (game.phase === 'title') {
    if (inRect(p, ui.start)) game.startGame();
    return;
  }
  if (game.phase === 'results') {
    if (inRect(p, ui.again)) game.startGame();
    return;
  }
  // Build-bar bell buttons: pick the type.
  for (const r of bellButtonRects()) {
    if (inRect(p, r)) {
      game.menuType = r.type;
      if (game.selectedPad >= 0 && !game.padBell(game.selectedPad)) {
        game.buildBell(game.selectedPad, r.type);
        game.selectedPad = -1;
      }
      return;
    }
  }
  // START NIGHT button.
  if (inRect(p, { x: W - 250, y: 658, w: 234, h: 52 }) && game.phase === 'build') {
    game.startNight();
    return;
  }
  // Build menu.
  if (game.selectedPad >= 0 && ui.menu) {
    const m = ui.menu;
    if (inRect(p, m.close)) { game.selectedPad = -1; return; }
    for (const row of m.rows) {
      if (p.y >= row.y && p.y <= row.y + row.h && p.x >= m.x + 8 && p.x <= m.x + m.w - 8) {
        if (row.type) {
          if (row.afford) game.buildBell(game.selectedPad, row.type);
          game.selectedPad = -1;
        } else if (row.action === 'upgrade') {
          const b = game.padBell(game.selectedPad);
          if (b && row.afford) game.upgradeBell(b);
          game.selectedPad = -1;
        } else if (row.action === 'sell') {
          const b = game.padBell(game.selectedPad);
          if (b) game.sellBell(b);
          game.selectedPad = -1;
        }
        return;
      }
    }
  }
  // Pads: open the build menu.
  for (let i = 0; i < PADS.length; i++) {
    if (Math.hypot(p.x - PADS[i].x, p.y - PADS[i].y) <= PAD_RADIUS + 8) {
      game.selectedPad = game.selectedPad === i ? -1 : i;
      if (!game.padBell(i)) game.menuType = game.menuType || 'treble';
      return;
    }
  }
  game.selectedPad = -1;
}

canvas.addEventListener('pointerdown', (e) => handleClick(toCanvas(e)));
window.addEventListener('keydown', (e) => {
  game.audio.unlock();
  if (e.key >= '1' && e.key <= '5') {
    const type = BELL_ORDER[Number(e.key) - 1];
    game.menuType = type;
    if (game.selectedPad >= 0 && !game.padBell(game.selectedPad)) {
      game.buildBell(game.selectedPad, type);
      game.selectedPad = -1;
    }
  } else if (e.key === 'Escape') {
    game.selectedPad = -1;
  } else if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    if (game.phase === 'title' || game.phase === 'results') game.startGame();
    else if (game.phase === 'build') game.startNight();
  }
});

// ---- Loop ----
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  game.step(dt);
  ctx.clearRect(0, 0, W, H);
  drawScene(ctx, game);
  game.ui = {};
  if (game.phase === 'title') {
    game.ui.start = drawTitle(ctx, game).start;
  } else if (game.phase === 'results') {
    game.ui.again = drawResults(ctx, game).again;
  } else {
    drawTopBar(ctx, game);
    drawObjectives(ctx, game);
    drawRightPanel(ctx, game);
    drawHowTo(ctx);
    drawBuildBar(ctx, game);
    game.ui.menu = drawBuildMenu(ctx, game);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
