// Pixel art: every character is a chunky pixel sprite drawn from a small
// string map onto an offscreen canvas (1 px per cell), then drawn scaled
// up with image smoothing OFF — so pixels stay crisp, never blurry.
// Each sprite uses 3-4 shades per colour (base, highlight, shadow, plus
// an outline in a darker tone of the same hue) on one consistent grid,
// with a soft drop shadow added at draw time so characters sit on the
// ground. Two frames give a simple bob / tail-wag as things move.
// Maps are validated at import: every row must be the same length and
// every character must be in the palette (see SPRITE_ERRORS).
export const SPRITE_ERRORS = [];

function def(name, palette, rows, frames) {
  const w = rows[0].length;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].length !== w) SPRITE_ERRORS.push(`${name} row ${i} is ${rows[i].length} wide, expected ${w}`);
    for (const ch of rows[i]) {
      if (ch !== '.' && !(ch in palette)) SPRITE_ERRORS.push(`${name} row ${i} uses unknown char '${ch}'`);
    }
  }
  if (frames) {
    for (let f = 0; f < frames.length; f++) {
      for (let i = 0; i < frames[f].length; i++) {
        if (frames[f][i].length !== w) SPRITE_ERRORS.push(`${name} frame ${f} row ${i} is ${frames[f][i].length} wide, expected ${w}`);
        for (const ch of frames[f][i]) {
          if (ch !== '.' && !(ch in palette)) SPRITE_ERRORS.push(`${name} frame ${f} row ${i} uses unknown char '${ch}'`);
        }
      }
    }
  }
  return { name, palette, rows, frames: frames || null, w, h: rows.length, canvases: null };
}

export const SPRITES = {};

// ---- Wraiths ----
SPRITES.drifter = def('drifter',
  { o: '#0e3a44', b: '#9fe8ff', h: '#d8f6ff', s: '#5fb8d8', e: '#0b2233' },
  [
    '................',
    '.....oooooo.....',
    '....ohbbbbho....',
    '...ohbbbbbbho...',
    '...obbbbbbbbo...',
    '...obbbbbbbbo...',
    '...obbeebeebo...',
    '...obbbbbbbbo...',
    '...osbbbbbbso...',
    '....osbbbbso....',
    '....obbbbbbo....',
    '...obbo..obbo...',
    '...obb....bbo...',
    '..obb......bbo..',
    '................',
    '................',
  ]);

SPRITES.swift = def('swift',
  { o: '#2e4d0e', b: '#a8f04a', h: '#d6ff8a', s: '#6db32a', e: '#14220a' },
  [
    '................',
    '......oooo......',
    '.....ohbbho.....',
    '....ohbbbbho....',
    '....obbbbbbo....',
    '....obeebbeo....',
    '....obbbbbbo....',
    '....osbbbbso....',
    '.....osbbso.....',
    '.....obbbo......',
    '....obbobbo.....',
    '...obb...bbo....',
    '..obb.....bbo...',
    '................',
    '................',
    '................',
  ]);

SPRITES.shroud = def('shroud',
  { o: '#1c0b33', b: '#7a3fd0', h: '#a86ef0', s: '#4d2385', a: '#c8ccd8', e: '#ff2fa0' },
  [
    '................',
    '.....oooooo.....',
    '....ohbbbbho....',
    '...ohbbbbbbho...',
    '...osssssssso...',
    '...osaaaaaaso...',
    '...osaaaaaaso...',
    '...osssssssso...',
    '...obbbbbbbbo...',
    '...obeebbeebo...',
    '...obbbbbbbbo...',
    '....osbbbbso....',
    '....obbbbbbo....',
    '...obbo..obbo...',
    '................',
    '................',
  ]);

SPRITES.splitter = def('splitter',
  { o: '#4d1c05', b: '#ff8a2a', h: '#ffb35e', s: '#d85f10', e: '#1a0e06' },
  [
    '................',
    '...oooo..oooo...',
    '..ohbbhoohbbho..',
    '..obbbboobbbbo..',
    '..obbbboobbbbo..',
    '..obeebobeebbo..',
    '..obbbboobbbbo..',
    '..osbbboosbbbo..',
    '...osbboosbbo...',
    '....obb..bbo....',
    '....ob....bo....',
    '................',
    '................',
    '................',
    '................',
    '................',
  ]);

SPRITES.drift = def('drift',
  { o: '#4d1c05', b: '#ff8a2a', h: '#ffb35e', s: '#d85f10', e: '#1a0e06' },
  [
    '............',
    '....oooo....',
    '...ohbbho...',
    '...obbbbo...',
    '...obeebo...',
    '...obbbbo...',
    '....osbo....',
    '....obbo....',
    '...obbbo....',
    '............',
    '............',
    '............',
  ]);

// THE HUSH — 24x24, a huge black-violet mass with a magenta core.
SPRITES.hush = def('hush',
  { o: '#0a0416', b: '#241040', h: '#4a2a7a', s: '#120826', m: '#ff2fa0', e: '#ffffff', w: '#1a0b2e' },
  [
    '........................',
    '........oooooooo........',
    '......oobbbbbbbboo......',
    '.....obbbbbbbbbbbbo.....',
    '....obbbbbbbbbbbbbbo....',
    '...obbbbbbbbbbbbbbbbo...',
    '...obbbhhbbbbbbhhbbbo...',
    '...obbhhhhhhhhhhhhbbo...',
    '...obhhhhmmmmmmhhhhbo...',
    '...obhhhmmmmmmmmhhhbo...',
    '...obhhmmmmmmmmmmhhbo...',
    '...obhhmmmeeeemmmhhbo...',
    '...obhhmmmeweemmmhhbo...',
    '...obhhmmmeeeemmmhhbo...',
    '...obhhmmmmmmmmmmhhbo...',
    '...obhhhmmmmmmmmhhhbo...',
    '...obhhhhmmmmmmhhhhbo...',
    '...obbhhhhhhhhhhhhbbo...',
    '....obbbbbbbbbbbbbbo....',
    '.....osbbbbbbbbbbso.....',
    '......osbbbbbbbbso......',
    '......obb..bb..bbo......',
    '........................',
    '........................',
  ]);

// ---- Bells: one silhouette, one vivid colour per type ----
const BELL_ROWS = [
  '................',
  '......oooo......',
  '.....ohhhho.....',
  '.....ohbbho.....',
  '....ohbbbbho....',
  '....obbbbbbo....',
  '...obbbbbbbbo...',
  '...obbbbbbbbo...',
  '...obbbbbbbbo...',
  '...osbbbbbbso...',
  '...obbbbbbbbo...',
  '..oobbbbbbbboo..',
  '..oooooooooooo..',
  '.....o....o.....',
  '.....o....o.....',
  '....oo....oo....',
];

function bellSprite(name, base, hi, shadow, outline) {
  return def(name, { o: outline, b: base, h: hi, s: shadow }, BELL_ROWS);
}
SPRITES['bell-treble'] = bellSprite('bell-treble', '#ffb020', '#ffd76a', '#c87f00', '#5a3a00');
SPRITES['bell-alto'] = bellSprite('bell-alto', '#ff6a5e', '#ffa49c', '#c93a30', '#571410');
SPRITES['bell-tenor'] = bellSprite('bell-tenor', '#a06bff', '#c9a5ff', '#6d3fd0', '#2c1457');
SPRITES['bell-bass'] = bellSprite('bell-bass', '#2fd8c8', '#8af2e8', '#149a8c', '#073832');
SPRITES['bell-chime'] = bellSprite('bell-chime', '#ff7fb0', '#ffb3d1', '#d84a82', '#571028');

// ---- Pip, the ember fox: two frames, tail down / tail up ----
const PIP_BASE = [
  '................',
  '..oo........oo..',
  '..oho......oho..',
  '..ohbo....obho..',
  '..obbbboobbbbo..',
  '..obbbbbbbbbbo..',
  '..obbeebbeebbo..',
  '..obbbbbbbbbbo..',
  '..osbbggbbbso...',
  '...obbbbbbbbo...',
  '....obbbbbbo....',
  '....oobbbboo....',
  '.....oooooo.....',
  '................',
  '................',
  '................',
];
const PIP_TAIL_UP = [
  '................',
  '..oo........oo..',
  '..oho......oho..',
  '..ohbo....obho..',
  '..obbbboobbbbo..',
  '..obbbbbbbbbbo..',
  '..obbeebbeebbo..',
  '..obbbbbbbbbbo..',
  '..osbbggbbbsoc..',
  '...obbbbbbbboc..',
  '....obbbbbbooc..',
  '....oobbbboocc..',
  '.....ooooooccc..',
  '................',
  '................',
  '................',
];
SPRITES.pip = def('pip',
  { o: '#5a2d12', b: '#ff8a2a', h: '#ffb35e', s: '#d85f10', e: '#1a0e06', g: '#ffd23e', c: '#ffe9c4' },
  PIP_BASE, [PIP_BASE, PIP_TAIL_UP]);

// ---- Rendering ----
function buildCanvas(sprite, frame) {
  const rows = frame != null && sprite.frames ? sprite.frames[frame] : sprite.rows;
  const c = document.createElement('canvas');
  c.width = sprite.w;
  c.height = sprite.h;
  const g = c.getContext('2d');
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      if (ch === '.') continue;
      g.fillStyle = sprite.palette[ch];
      g.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

export function getSpriteCanvas(name, frame) {
  const sprite = SPRITES[name];
  if (!sprite) return null;
  if (!sprite.canvases) sprite.canvases = [];
  const f = frame || 0;
  if (!sprite.canvases[f]) sprite.canvases[f] = buildCanvas(sprite, f);
  return sprite.canvases[f];
}

// Draw a sprite so its bottom-centre sits at (cx, cy) — characters stand
// on the ground. `scale` is px per pixel (3-4 for readable pixel art).
// anchor 'center' centres the sprite on (cx, cy) instead (bells, rings).
export function drawSprite(ctx, name, cx, cy, scale, frame, anchor) {
  const canvas = getSpriteCanvas(name, frame);
  if (!canvas) return;
  const w = canvas.width * scale;
  const h = canvas.height * scale;
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  if (anchor === 'center') {
    ctx.drawImage(canvas, cx - w / 2, cy - h / 2, w, h);
  } else {
    ctx.drawImage(canvas, cx - w / 2, cy - h, w, h);
  }
  ctx.imageSmoothingEnabled = prev;
}

// Soft ellipse shadow under a character at ground level.
export function drawShadow(ctx, cx, cy, rx, ry) {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 6, 20, 0.35)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
