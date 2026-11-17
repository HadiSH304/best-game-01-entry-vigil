// Scene rendering — everything drawn in canvas, no image assets.
// The enchanted dusk valley: gradient sky banded violet -> magenta ->
// amber, crescent moon, stars, aurora ribbon, layered teal and purple
// hills, glowing mushrooms, crystals, standing stones, fireflies, mist,
// and the warm sand road edged with runestones to the belfry.
import { PATH, PATH_LENGTH, pointAt } from './wraiths.js';
import { BELL_TYPES } from './bells.js';
import { drawSprite, drawShadow } from './sprites.js';
import { makeRng } from './rng.js';

export const W = 1280;
export const H = 720;
export const FONT = `'Trebuchet MS', Verdana, sans-serif`;

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function panel(ctx, x, y, w, h, alpha = 0.72) {
  ctx.save();
  ctx.fillStyle = `rgba(10, 12, 30, ${alpha})`;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function hillPath(ctx, baseY, amp, seed, color) {
  const r = makeRng(seed);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-20, H);
  ctx.lineTo(-20, baseY);
  let x = -20;
  while (x < W + 40) {
    const nx = x + r.range(120, 220);
    const ny = baseY + r.range(-amp, amp);
    ctx.quadraticCurveTo(x + (nx - x) / 2, ny - r.range(10, 40), nx, ny);
    x = nx;
  }
  ctx.lineTo(W + 20, H);
  ctx.closePath();
  ctx.fill();
}

function drawSky(ctx, game) {
  const t = game.vtime;
  const g = ctx.createLinearGradient(0, 0, 0, 470);
  g.addColorStop(0, '#2a1650');
  g.addColorStop(0.55, '#7b2d6e');
  g.addColorStop(1, '#e8823f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 470);
  // Light dithering: faint dots soften the gradient bands.
  const r = makeRng(99);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 260; i++) ctx.fillRect(r.range(0, W), r.range(0, 430), 2, 2);
  // Stars.
  for (const s of game.scenery.stars) {
    ctx.globalAlpha = 0.35 + 0.45 * Math.abs(Math.sin(t * 0.7 + s.p));
    ctx.fillStyle = '#fff8e0';
    ctx.fillRect(s.x, s.y, s.s, s.s);
  }
  ctx.globalAlpha = 1;
  // Crescent moon, clear of the top bar and the info panel.
  ctx.save();
  ctx.fillStyle = '#ffeec2';
  ctx.beginPath();
  ctx.arc(1060, 108, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a1650';
  ctx.beginPath();
  ctx.arc(1076, 100, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Aurora ribbon: thin, saturated, wavy — teal over violet.
  ctx.save();
  ctx.globalAlpha = 0.30 + 0.08 * Math.sin(t * 0.4);
  ctx.strokeStyle = '#5ef2d8';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(60, 170 + Math.sin(t * 0.3) * 10);
  ctx.bezierCurveTo(300, 110, 520, 200, 760, 140);
  ctx.bezierCurveTo(950, 100, 1100, 180, 1220, 130);
  ctx.stroke();
  ctx.globalAlpha = 0.22 + 0.06 * Math.sin(t * 0.4 + 1);
  ctx.strokeStyle = '#b78cff';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(60, 196 + Math.sin(t * 0.3 + 1) * 10);
  ctx.bezierCurveTo(300, 140, 520, 224, 760, 166);
  ctx.bezierCurveTo(950, 128, 1100, 204, 1220, 156);
  ctx.stroke();
  ctx.restore();
}

function drawGround(ctx, game) {
  const g = ctx.createLinearGradient(0, 380, 0, H);
  g.addColorStop(0, '#3a2358');
  g.addColorStop(1, '#241640');
  ctx.fillStyle = g;
  ctx.fillRect(0, 380, W, H - 380);
  hillPath(ctx, 470, 26, 11, '#14424a'); // far teal hills
  hillPath(ctx, 560, 30, 23, '#33204f'); // near purple hills
}

function drawRoad(ctx) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // Outer edge, then warm sand, then a lighter centre line.
  ctx.strokeStyle = '#8a5a2b';
  ctx.lineWidth = 52;
  ctx.beginPath();
  PATH.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.stroke();
  ctx.strokeStyle = '#d9a05b';
  ctx.lineWidth = 44;
  ctx.stroke();
  ctx.strokeStyle = '#e8b878';
  ctx.lineWidth = 30;
  ctx.stroke();
  // Runestones along both edges.
  const r = makeRng(5);
  for (let d = 20; d < PATH_LENGTH; d += 46) {
    const p = pointAt(d);
    const nx = Math.cos(p.angle + Math.PI / 2);
    const ny = Math.sin(p.angle + Math.PI / 2);
    ctx.fillStyle = '#f5d9a0';
    ctx.beginPath();
    ctx.arc(p.x + nx * 24, p.y + ny * 24, 2.5, 0, Math.PI * 2);
    ctx.arc(p.x - nx * 24, p.y - ny * 24, 2.5, 0, Math.PI * 2);
    ctx.fill();
    if (r.next() < 0.3) {
      ctx.fillStyle = 'rgba(138, 90, 43, 0.5)';
      ctx.fillRect(p.x + r.range(-14, 14), p.y + r.range(-10, 10), 5, 3);
    }
  }
  ctx.restore();
}

function drawPads(ctx, game) {
  const t = game.vtime;
  game.pads.forEach((pad, i) => {
    const hasBell = game.padBell(i);
    const pulse = 0.45 + 0.2 * Math.sin(t * 2 + i * 0.9);
    ctx.save();
    ctx.globalAlpha = hasBell ? 0.9 : pulse;
    ctx.strokeStyle = '#ffd76a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pad.x, pad.y, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = hasBell ? 0.35 : pulse * 0.5;
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.arc(pad.x, pad.y, 26, 0, Math.PI * 2);
    ctx.fill();
    // Rune ticks around the circle.
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = '#fff3c4';
    ctx.lineWidth = 2;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + i;
      ctx.beginPath();
      ctx.moveTo(pad.x + Math.cos(a) * 20, pad.y + Math.sin(a) * 20);
      ctx.lineTo(pad.x + Math.cos(a) * 25, pad.y + Math.sin(a) * 25);
      ctx.stroke();
    }
    ctx.restore();
  });
}

function drawBelfry(ctx, game) {
  const t = game.vtime;
  const sway = Math.sin(t * 0.8) * 0.05;
  ctx.save();
  // Crooked little wizard-tower: stone body, pointed roof, gold window.
  ctx.translate(1200, 0);
  ctx.rotate(0.02);
  ctx.fillStyle = '#6b5a8a';
  ctx.beginPath();
  ctx.moveTo(-42, 620);
  ctx.lineTo(-34, 380);
  ctx.lineTo(30, 380);
  ctx.lineTo(44, 620);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-34, 380, 10, 240);
  ctx.strokeStyle = 'rgba(20,10,40,0.5)';
  ctx.lineWidth = 1;
  for (let y = 410; y < 610; y += 34) {
    ctx.beginPath();
    ctx.moveTo(-36, y);
    ctx.lineTo(38, y);
    ctx.stroke();
  }
  // Roof.
  ctx.fillStyle = '#4a3566';
  ctx.beginPath();
  ctx.moveTo(-48, 384);
  ctx.lineTo(-2, 300);
  ctx.lineTo(46, 384);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath();
  ctx.arc(-2, 296, 4, 0, Math.PI * 2);
  ctx.fill();
  // Arched window, warm gold glow.
  ctx.save();
  ctx.shadowColor = '#ffd76a';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath();
  ctx.moveTo(-12, 470);
  ctx.lineTo(-12, 430);
  ctx.arc(0, 430, 12, Math.PI, 0);
  ctx.lineTo(12, 470);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // The Great Bell, swaying gently under the eaves.
  ctx.save();
  ctx.translate(-2, 386);
  ctx.rotate(sway);
  drawSprite(ctx, 'bell-tenor', 0, 34, 2.6, 0, 'center');
  ctx.restore();
  // Door where the road ends.
  ctx.fillStyle = '#3a2358';
  ctx.beginPath();
  ctx.moveTo(-16, 620);
  ctx.lineTo(-16, 560);
  ctx.arc(-2, 560, 14, Math.PI, 0);
  ctx.lineTo(12, 620);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Sparkles when a CHORD lands near the belfry.
  if (game.flashes.length > 0) {
    ctx.save();
    ctx.fillStyle = '#fff3c4';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + t;
      ctx.fillRect(1200 + Math.cos(a) * 46, 420 + Math.sin(a) * 30, 3, 3);
    }
    ctx.restore();
  }
}

const BELL_SCALE = { treble: 2.6, alto: 2.8, tenor: 3.0, bass: 3.4, chime: 2.8 };

function drawBells(ctx, game) {
  for (const b of game.bells) {
    drawShadow(ctx, b.x, b.y + 16, 20, 6);
    const frame = 0;
    drawSprite(ctx, `bell-${b.type}`, b.x, b.y - 4 + Math.sin(game.vtime * 2 + b.id) * 1.5, BELL_SCALE[b.type], frame, 'center');
    if (b.level === 2) {
      ctx.fillStyle = '#ffd76a';
      ctx.font = `700 13px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('★2', b.x, b.y - 34);
    }
    if (b.muted) {
      ctx.save();
      ctx.fillStyle = 'rgba(10, 6, 24, 0.8)';
      roundRect(ctx, b.x - 26, b.y - 52, 52, 16, 4);
      ctx.fill();
      ctx.fillStyle = '#c9a5ff';
      ctx.font = `700 11px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('MUTED', b.x, b.y - 40);
      ctx.restore();
    }
  }
}

function drawRings(ctx, game) {
  for (const ring of game.rings) {
    const f = ring.r / ring.maxR;
    const alpha = Math.max(0, 0.85 * (1 - f));
    ctx.save();
    ctx.globalAlpha = alpha * 0.35;
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  // CHORD flashes bloom white-gold.
  for (const fl of game.flashes) {
    const f = fl.t / fl.life;
    const g = ctx.createRadialGradient(fl.x, fl.y, 0, fl.x, fl.y, 60 * (1 - f * 0.4));
    g.addColorStop(0, `rgba(255, 240, 190, ${0.9 * (1 - f)})`);
    g.addColorStop(1, 'rgba(255, 240, 190, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(fl.x, fl.y, 60, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWraiths(ctx, game) {
  for (const w of game.wraiths) {
    // THE HUSH's mute aura: a dark circle with a magenta edge.
    if (w.boss) {
      ctx.save();
      ctx.fillStyle = 'rgba(16, 4, 36, 0.4)';
      ctx.beginPath();
      ctx.arc(w.x, w.y - 20, 150, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 47, 160, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
    const bob = Math.sin(w.wobble + w.bobPhase) * 2;
    const frame = Math.floor(game.time * 3 + w.bobPhase) % 2;
    drawShadow(ctx, w.x, w.y + 8, 18 * w.scale, 5);
    drawSprite(ctx, w.sprite, w.x, w.y - 4 + bob, 3 * w.scale, w.boss ? 0 : frame, 'bottom');
    // HP bar over damaged wraiths (always over the boss).
    if (w.boss || w.hp < w.maxHp) {
      const bw = w.boss ? 130 : 34;
      const bx = w.x - bw / 2;
      const by = w.y - 62 * w.scale;
      ctx.save();
      ctx.fillStyle = 'rgba(8, 6, 20, 0.75)';
      ctx.fillRect(bx - 1, by - 1, bw + 2, 8);
      ctx.fillStyle = w.boss ? '#ff2fa0' : '#ff6a5e';
      ctx.fillRect(bx, by, bw * Math.max(0, w.hp / w.maxHp), 6);
      ctx.restore();
    }
    // Trailing shadow wisps behind the boss.
    if (w.boss) {
      ctx.save();
      ctx.fillStyle = 'rgba(74, 42, 122, 0.5)';
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(w.x - i * 26, w.y - 10 + Math.sin(game.vtime * 3 + i) * 6, 10 - i * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}

function drawPip(ctx, game) {
  const pip = game.pip;
  for (const p of pip.trail) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.t / 0.5) * 0.8;
    ctx.fillStyle = '#ffd76a';
    ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    ctx.restore();
  }
  const frame = Math.floor(pip.wag) % 2;
  drawShadow(ctx, pip.x, pip.y + 6, 12, 4);
  drawSprite(ctx, 'pip', pip.x, pip.y - 2 + Math.sin(pip.bobPhase) * 1.5, 2.6, frame, 'bottom');
}

function drawSparks(ctx, game) {
  for (const s of game.sparks) {
    const f = s.t / s.life;
    ctx.save();
    ctx.globalAlpha = 1 - f;
    ctx.fillStyle = s.color;
    const r = makeRng(Math.floor(s.x) + Math.floor(s.y));
    for (let i = 0; i < s.n; i++) {
      const a = (i / s.n) * Math.PI * 2 + r.next() * 0.6;
      const d = 26 * f + 4;
      ctx.fillRect(s.x + Math.cos(a) * d - 2, s.y + Math.sin(a) * d - 2, 4, 4);
    }
    ctx.restore();
  }
}

function drawSceneryBits(ctx, game) {
  const t = game.vtime;
  // Standing stones.
  for (const st of game.scenery.stones) {
    ctx.save();
    ctx.translate(st.x, st.y);
    ctx.rotate(st.lean);
    ctx.fillStyle = '#5a4a7a';
    roundRect(ctx, -9 * st.s, -34 * st.s, 18 * st.s, 34 * st.s, 5);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(-9 * st.s, -34 * st.s, 4 * st.s, 34 * st.s);
    ctx.restore();
  }
  // Glowing mushrooms and crystals.
  for (const m of game.scenery.mushrooms) {
    ctx.save();
    ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 1.5 + m.x);
    ctx.fillStyle = '#e8dcc4';
    ctx.fillRect(m.x - 2, m.y - 8 * m.s, 4, 8 * m.s);
    ctx.fillStyle = m.hue;
    ctx.beginPath();
    ctx.arc(m.x, m.y - 8 * m.s, 7 * m.s, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(m.x - 3, m.y - 12 * m.s, 2, 2);
    ctx.fillRect(m.x + 2, m.y - 10 * m.s, 2, 2);
    ctx.restore();
  }
  for (const c of game.scenery.crystals) {
    ctx.save();
    ctx.globalAlpha = 0.6 + 0.3 * Math.sin(t * 1.2 + c.x);
    ctx.fillStyle = c.c;
    ctx.beginPath();
    ctx.moveTo(c.x - 5 * c.s, c.y);
    ctx.lineTo(c.x, c.y - 18 * c.s);
    ctx.lineTo(c.x + 5 * c.s, c.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // Fireflies.
  for (const f of game.scenery.fireflies) {
    const x = f.x + Math.sin(t * 0.5 + f.p) * 14;
    const y = f.y + Math.cos(t * 0.4 + f.p) * 8;
    ctx.save();
    ctx.globalAlpha = 0.3 + 0.6 * Math.abs(Math.sin(t * 1.4 + f.p));
    ctx.fillStyle = '#ffe9a0';
    ctx.beginPath();
    ctx.arc(x, y, 2 * f.s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Low mist drifting along the road.
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const mx = ((i * 340 + t * 12) % 1400) - 60;
    const my = 500 + (i % 2) * 60;
    const g = ctx.createRadialGradient(mx, my, 0, mx, my, 120);
    g.addColorStop(0, 'rgba(220, 200, 255, 0.10)');
    g.addColorStop(1, 'rgba(220, 200, 255, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(mx, my, 130, 34, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Glowing flowers in the mid-ground band (breaks up the flat hills).
  for (const f of game.scenery.flowers) {
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t * 1.1 + f.p);
    ctx.fillStyle = f.c;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha *= 0.5;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Foreground grass tufts.
  ctx.save();
  ctx.strokeStyle = 'rgba(60, 140, 110, 0.8)';
  ctx.lineWidth = 2;
  for (const g of game.scenery.grass) {
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x - 3 * g.s, g.y - 9 * g.s);
    ctx.moveTo(g.x + 3, g.y);
    ctx.lineTo(g.x + 4 * g.s, g.y - 8 * g.s);
    ctx.stroke();
  }
  ctx.restore();
}

// Full scene, no HUD. `game` may be in any phase; title/results overlays
// are drawn by hud.js on top.
export function drawScene(ctx, game) {
  drawSky(ctx, game);
  drawGround(ctx, game);
  drawSceneryBits(ctx, game);
  drawRoad(ctx);
  drawPads(ctx, game);
  drawBelfry(ctx, game);
  drawBells(ctx, game);
  drawRings(ctx, game);
  drawWraiths(ctx, game);
  drawPip(ctx, game);
  drawSparks(ctx, game);
}

export { BELL_TYPES };
