// HUD + screens, all drawn in canvas so the screenshots are exactly
// what the player sees: top bar (NIGHT n / 7, Voice, gold, CHORD combo,
// grade), WIN/LOSE objective lines with live progress, right panel
// (INCOMING / BELLS RUNG / COMPANION), boss bar, bottom build bar, the
// one-line how-to strip, the build menu, the title screen with its HOW
// TO PLAY panel, and the results screen.
import { W, H, FONT, panel, roundRect } from './render.js';
import { BELL_TYPES, BELL_ORDER, UPGRADE_MULT, SELL_REFUND } from './bells.js';
import { WRAITH_TYPES } from './wraiths.js';
import { PADS } from './game.js';

export const HOWTO = 'Place bells on rune pads — two rings on one wraith = CHORD x2 — stop every wraith before the Great Bell';

function text(ctx, s, x, y, size, color, weight = 700, align = 'left') {
  ctx.save();
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
  ctx.restore();
}

function bar(ctx, x, y, w, h, frac, fill, bg = 'rgba(255,255,255,0.18)') {
  ctx.save();
  ctx.fillStyle = bg;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  if (frac > 0) {
    ctx.fillStyle = fill;
    roundRect(ctx, x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawTopBar(ctx, game) {
  panel(ctx, 0, 0, W, 56, 0.8);
  // Left: Voice + gold.
  text(ctx, 'VOICE', 18, 24, 13, '#c9a5ff');
  bar(ctx, 18, 30, 170, 12, game.voice / 100, game.voice > 40 ? '#ffd76a' : '#ff6a5e');
  text(ctx, `${game.voice}`, 196, 42, 15, '#ffffff');
  text(ctx, `◆ ${game.gold} gold`, 240, 40, 16, '#ffd76a');
  // Centre: counted progression + boss bar on night 7.
  const nightLabel = game.phase === 'title' ? 'CARILLON' : `NIGHT ${Math.max(1, game.night)} / 7`;
  text(ctx, nightLabel, W / 2, 30, 26, '#ffffff', 800, 'center');
  if (game.boss) {
    text(ctx, 'THE HUSH', W / 2 - 130, 50, 13, '#ff2fa0', 800, 'right');
    bar(ctx, W / 2 - 120, 40, 240, 12, game.boss.hp / game.boss.maxHp, '#ff2fa0');
    text(ctx, `${Math.round((game.boss.hp / game.boss.maxHp) * 100)}%`, W / 2 + 130, 52, 13, '#ff9ed2', 700, 'left');
  }
  // Right: CHORD combo + grade.
  const combo = game.combo > 1 ? `CHORD x${game.combo}` : 'CHORD x—';
  text(ctx, combo, W - 120, 26, 17, game.combo > 1 ? '#ffe9a0' : '#8a84a8', 800, 'right');
  text(ctx, `GRADE ${game.grade()}`, W - 120, 46, 13, '#c9a5ff', 700, 'right');
}

export function drawObjectives(ctx, game) {
  const bossPct = game.bossPct();
  const winLine = game.phase === 'title'
    ? 'WIN: ring all 7 nights'
    : bossPct !== null
      ? `WIN: silence THE HUSH — boss ${bossPct}%`
      : `WIN: survive all 7 nights — nights ${game.nightsHeld}/7`;
  const loseLine = `LOSE: the Great Bell falls silent — Voice ${game.voice}%`;
  panel(ctx, 14, 64, 470, 26, 0.66);
  text(ctx, winLine, 24, 82, 15, '#7dff9a');
  panel(ctx, 14, 94, 470, 26, 0.66);
  text(ctx, loseLine, 24, 112, 15, '#ff8a8a');
}

const TYPE_COLOR = {
  drifter: '#9fe8ff', swift: '#a8f04a', shroud: '#a86ef0',
  splitter: '#ff8a2a', drift: '#ffb35e', hush: '#ff2fa0',
};

export function drawRightPanel(ctx, game) {
  if (game.phase === 'title') return;
  // Left column, under the WIN/LOSE pills: the right of the field stays
  // clear for the belfry and the boss.
  const x = 14;
  const y = 128;
  const w = 268;
  let h = 34;
  const inc = game.incoming();
  h += inc.length * 20 + 8;
  const held = game.bellsHeld();
  h += 24 + Math.max(1, held.length) * 20 + 8;
  h += 24 + 20;
  panel(ctx, x, y, w, h, 0.7);
  let cy = y + 22;
  text(ctx, `INCOMING — NIGHT ${Math.max(1, game.night)}`, x + 12, cy, 13, '#ffd76a');
  cy += 20;
  for (const g of inc) {
    ctx.fillStyle = TYPE_COLOR[g.type] || '#fff';
    ctx.beginPath();
    ctx.arc(x + 18, cy - 4, 5, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, `${WRAITH_TYPES[g.type].name} ×${g.count}`, x + 30, cy, 14, '#ffffff', 600);
    cy += 20;
  }
  cy += 6;
  text(ctx, 'BELLS RUNG', x + 12, cy, 13, '#ffd76a');
  cy += 20;
  if (held.length === 0) {
    text(ctx, 'none yet — click a rune pad', x + 12, cy, 13, '#b9b3d6', 600);
    cy += 20;
  } else {
    for (const b of held) {
      ctx.fillStyle = BELL_TYPES[b.type].color;
      ctx.beginPath();
      ctx.arc(x + 18, cy - 4, 5, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, `${BELL_TYPES[b.type].name} ×${b.count}`, x + 30, cy, 14, '#ffffff', 600);
      cy += 20;
    }
  }
  cy += 6;
  text(ctx, 'COMPANION', x + 12, cy, 13, '#ffd76a');
  cy += 20;
  text(ctx, `PIP Lv ${game.pip.level} — nips ${game.nips}`, x + 12, cy, 14, '#ffe9c4', 600);
}

export function drawBuildBar(ctx, game) {
  panel(ctx, 0, 648, W, 72, 0.8);
  let x = 16;
  for (let i = 0; i < BELL_ORDER.length; i++) {
    const type = BELL_ORDER[i];
    const t = BELL_TYPES[type];
    const w = 132;
    const selected = game.menuType === type;
    ctx.save();
    ctx.fillStyle = selected ? 'rgba(255, 215, 106, 0.22)' : 'rgba(255,255,255,0.06)';
    ctx.strokeStyle = selected ? '#ffd76a' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = selected ? 2 : 1;
    roundRect(ctx, x, 658, w, 52, 8);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = t.color;
    ctx.beginPath();
    ctx.arc(x + 16, 684, 7, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, `${i + 1} ${t.name}`, x + 30, 678, 15, '#ffffff');
    text(ctx, `${t.cost}g`, x + 30, 698, 13, '#ffd76a', 600);
    x += w + 10;
  }
  // Start-night / status button on the right.
  const bx = W - 250;
  const by = 658;
  const bw = 234;
  const bh = 52;
  const canStart = game.phase === 'build';
  ctx.save();
  ctx.fillStyle = canStart ? '#2f7a4a' : 'rgba(255,255,255,0.10)';
  ctx.strokeStyle = canStart ? '#7dff9a' : 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  roundRect(ctx, bx, by, bw, bh, 8);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  text(ctx, canStart ? `▶  START NIGHT ${game.night}` : `NIGHT ${Math.max(1, game.night)} — FIGHTING…`, bx + bw / 2, by + 33, 17, canStart ? '#ffffff' : '#b9b3d6', 800, 'center');
}

export function drawHowTo(ctx) {
  panel(ctx, 0, 620, W, 24, 0.55);
  text(ctx, HOWTO, W / 2, 637, 14, '#ffe9c4', 600, 'center');
}

// --- Build menu (open on a pad) ---
// Returns the clickable rects for main.js: { rows: [{y,h,type|action}], close }.
export function drawBuildMenu(ctx, game) {
  if (game.selectedPad < 0) return null;
  const pad = PADS[game.selectedPad];
  const bell = game.padBell(game.selectedPad);
  const w = 380;
  // Keep clear of the left info panel (x 14..282) and of the canvas edge.
  let x = Math.min(Math.max(292, pad.x - w / 2), W - w - 8);
  let y = Math.min(Math.max(130, pad.y - 190), 600 - 260);
  const rows = [];
  if (!bell) {
    const h = 44 + BELL_ORDER.length * 44 + 30;
    panel(ctx, x, y, w, h, 0.88);
    text(ctx, 'RUNE PAD — CHOOSE A BELL', x + 14, y + 28, 15, '#ffd76a');
    let ry = y + 44;
    for (const type of BELL_ORDER) {
      const t = BELL_TYPES[type];
      const afford = game.gold >= t.cost;
      ctx.save();
      ctx.fillStyle = game.menuType === type ? 'rgba(255,215,106,0.16)' : 'rgba(255,255,255,0.05)';
      roundRect(ctx, x + 8, ry, w - 16, 40, 6);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.arc(x + 26, ry + 20, 7, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, `${t.name} — ${t.cost}g`, x + 42, ry + 18, 15, afford ? '#ffffff' : '#8a84a8');
      text(ctx, t.role, x + 42, ry + 34, 11, '#b9b3d6', 600);
      rows.push({ y: ry, h: 40, type, afford });
      ry += 44;
    }
    text(ctx, 'Click a bell to place it — Esc closes', x + 14, y + h - 10, 12, '#8a84a8', 600);
    return { x, y, w, h, rows, close: { x: x + w - 30, y: y + 8, w: 22, h: 22 } };
  }
  // Bell already here: upgrade / sell.
  const t = BELL_TYPES[bell.type];
  const upCost = Math.round(t.cost * UPGRADE_MULT);
  const sellGain = Math.round(bell.invested * SELL_REFUND);
  const h = 170;
  panel(ctx, x, y, w, h, 0.88);
  text(ctx, `${t.name} — Lv ${bell.level}${bell.muted ? '  ·  MUTED' : ''}`, x + 14, y + 28, 16, t.color);
  text(ctx, t.role, x + 14, y + 50, 12, '#b9b3d6', 600);
  text(ctx, `Damage ${Math.round(t.damage * (bell.level === 2 ? 1.5 : 1))}  ·  Radius ${Math.round(t.radius * (bell.level === 2 ? 1.2 : 1))}  ·  every ${t.interval}s`, x + 14, y + 72, 13, '#ffffff', 600);
  const buy = { x: x + 14, y: y + 88, w: 170, h: 34, action: 'upgrade', afford: bell.level === 1 && game.gold >= upCost };
  const sell = { x: x + 196, y: y + 88, w: 170, h: 34, action: 'sell', afford: true };
  for (const b of [buy, sell]) {
    ctx.save();
    ctx.fillStyle = b.action === 'upgrade' ? (b.afford ? '#2f7a4a' : 'rgba(255,255,255,0.08)') : '#5a2d12';
    ctx.strokeStyle = b.action === 'upgrade' ? '#7dff9a' : '#ff8a2a';
    ctx.lineWidth = 1;
    roundRect(ctx, b.x, b.y, b.w, b.h, 6);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    text(ctx, b.action === 'upgrade' ? (bell.level === 2 ? 'MAX LEVEL' : `UPGRADE — ${upCost}g`) : `SELL +${sellGain}g`, b.x + b.w / 2, b.y + 22, 13, '#ffffff', 800, 'center');
  }
  text(ctx, 'Click a button — Esc closes', x + 14, y + h - 12, 12, '#8a84a8', 600);
  rows.push(buy, sell);
  return { x, y, w, h, rows, close: { x: x + w - 30, y: y + 8, w: 22, h: 22 } };
}

// --- Title screen ---
export function drawTitle(ctx, game) {
  ctx.save();
  ctx.fillStyle = 'rgba(12, 8, 32, 0.45)';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  text(ctx, 'CARILLON', W / 2, 150, 84, '#ffd76a', 800, 'center');
  text(ctx, 'An acoustic tower defence — seven nights, one Great Bell', W / 2, 186, 20, '#ffe9c4', 600, 'center');
  text(ctx, 'The fog-wraiths march to silence the Great Bell. Your bells answer.', W / 2, 214, 16, '#c9a5ff', 600, 'center');
  // HOW TO PLAY panel.
  const px = W / 2 - 360;
  const py = 250;
  panel(ctx, px, py, 720, 208, 0.82);
  text(ctx, 'HOW TO PLAY', px + 24, py + 34, 19, '#ffd76a');
  const lines = [
    '1.  Place bells on the glowing rune pads beside the road.',
    '2.  Each bell rings — its sound ring damages every wraith it crosses.',
    '3.  Two rings striking one wraith together are a CHORD — double damage.',
    '4.  Pip the fox nips the leading wraith. If one reaches the belfry,',
    '     the Great Bell loses Voice — at zero, you lose.',
  ];
  lines.forEach((l, i) => text(ctx, l, px + 24, py + 66 + i * 26, 17, '#ffffff', 600));
  text(ctx, 'Click a rune pad to build  ·  Keys 1–5 pick a bell  ·  Space starts the night', W / 2, 496, 15, '#b9b3d6', 600, 'center');
  // START button.
  const bx = W / 2 - 130;
  const by = 530;
  ctx.save();
  ctx.fillStyle = '#2f7a4a';
  ctx.strokeStyle = '#7dff9a';
  ctx.lineWidth = 2;
  roundRect(ctx, bx, by, 260, 56, 10);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  text(ctx, '▶  START — NIGHT 1', W / 2, by + 36, 22, '#ffffff', 800, 'center');
  return { start: { x: bx, y: by, w: 260, h: 56 } };
}

// --- Results screen ---
export function drawResults(ctx, game) {
  ctx.save();
  ctx.fillStyle = 'rgba(12, 8, 32, 0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  const win = game.result === 'victory';
  const px = W / 2 - 330;
  const py = 120;
  panel(ctx, px, py, 660, 420, 0.88);
  text(ctx, win ? 'VICTORY — THE GREAT PEAL RINGS OUT' : 'DEFEAT — THE BELLS FALL SILENT', W / 2, py + 56, 30, win ? '#ffd76a' : '#ff8a8a', 800, 'center');
  text(ctx, win ? 'All seven nights held. THE HUSH is silenced.' : `The fog reached the belfry on night ${Math.max(1, game.night)}.`, W / 2, py + 88, 16, '#ffe9c4', 600, 'center');
  const stats = [
    ['Nights held', `${game.nightsHeld} / 7`],
    ['Wraiths silenced', `${game.kills}`],
    ['Chords struck', `${game.chords}`],
    ["Pip's nips", `${game.nips}`],
    ['Voice remaining', `${game.voice}%`],
  ];
  stats.forEach(([label, value], i) => {
    const y = py + 140 + i * 34;
    text(ctx, label, px + 60, y, 18, '#b9b3d6', 600);
    text(ctx, value, px + 600, y, 18, '#ffffff', 800, 'right');
  });
  text(ctx, `GRADE ${game.grade()}`, W / 2, py + 340, 44, win ? '#ffd76a' : '#ff8a8a', 800, 'center');
  const bx = W / 2 - 130;
  const by = py + 372;
  ctx.save();
  ctx.fillStyle = '#2f7a4a';
  ctx.strokeStyle = '#7dff9a';
  ctx.lineWidth = 2;
  roundRect(ctx, bx, by, 260, 52, 10);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  text(ctx, '↻  PLAY AGAIN', W / 2, by + 34, 20, '#ffffff', 800, 'center');
  return { again: { x: bx, y: by, w: 260, h: 52 } };
}
