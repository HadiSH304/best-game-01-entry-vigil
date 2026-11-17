// PIP — the ember fox with the bell collar, who lives at the belfry.
// Pip is a real system, not decoration: every few seconds Pip dashes to
// the most-advanced wraith on the road, nips it (damage that scales with
// Pip's level, plus a brief slow), and dashes home, leaving a sparkle
// trail. Pip gains a level at the start of each night: Lv 1 on night 1,
// Lv 7 on night 7.
export class Pip {
  constructor(game) {
    this.game = game;
    this.homeX = 1120;
    this.homeY = 585;
    this.x = this.homeX;
    this.y = this.homeY;
    this.state = 'roam'; // roam | dash | return
    this.target = null; // wraith being chased
    this.roamTarget = null; // {x,y} wander point near a bell
    this.nipTimer = 2.0; // first nip comes early
    this.nips = 0;
    this.trail = []; // {x, y, t} sparkle points, fading
    this.wag = 0; // tail-wag phase
    this.bobPhase = 0;
  }

  get level() {
    return Math.max(1, Math.min(7, this.game.night || 1));
  }

  get nipInterval() {
    return Math.max(2.0, 4.2 - 0.25 * this.level);
  }

  get nipDamage() {
    return 8 + 4 * this.level;
  }

  // The most-advanced living wraith: furthest along the road.
  mostAdvanced() {
    let best = null;
    for (const w of this.game.wraiths) {
      if (w.dead) continue;
      if (!best || w.dist > best.dist) best = w;
    }
    return best;
  }

  step(dt) {
    const g = this.game;
    this.wag += dt * 6;
    this.bobPhase += dt * 4;
    for (const p of this.trail) p.t -= dt;
    this.trail = this.trail.filter((p) => p.t > 0);

    if (this.state === 'roam') {
      this.nipTimer -= dt;
      // Wander between the bells (or home when there are none).
      if (!this.roamTarget || Math.hypot(this.roamTarget.x - this.x, this.roamTarget.y - this.y) < 8) {
        const bells = g.bells;
        if (bells.length > 0) {
          const b = bells[g.rng.int(0, bells.length - 1)];
          this.roamTarget = { x: b.x + g.rng.range(-30, 30), y: b.y + g.rng.range(34, 52) };
        } else {
          this.roamTarget = { x: this.homeX + g.rng.range(-40, 10), y: this.homeY + g.rng.range(-14, 10) };
        }
      }
      this.moveToward(this.roamTarget, 70, dt);
      if (this.nipTimer <= 0 && g.wraiths.some((w) => !w.dead)) {
        const target = this.mostAdvanced();
        if (target) {
          this.target = target;
          this.state = 'dash';
        }
      }
    } else if (this.state === 'dash') {
      const t = this.target;
      if (!t || t.dead) { this.state = 'return'; this.target = null; return; }
      this.moveToward(t, 420, dt);
      this.trail.push({ x: this.x, y: this.y, t: 0.5 });
      if (Math.hypot(t.x - this.x, t.y - this.y) < 16) this.nip(t);
    } else if (this.state === 'return') {
      this.moveToward({ x: this.homeX, y: this.homeY }, 380, dt);
      this.trail.push({ x: this.x, y: this.y, t: 0.4 });
      if (Math.hypot(this.homeX - this.x, this.homeY - this.y) < 10) {
        this.state = 'roam';
        this.nipTimer = this.nipInterval;
        this.roamTarget = null;
      }
    }
  }

  moveToward(p, speed, dt) {
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.5) return;
    const step = Math.min(d, speed * dt);
    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
  }

  // The nip itself: damage + a brief slow, counted in the stats.
  nip(wraith) {
    const g = this.game;
    wraith.hp -= this.nipDamage;
    wraith.slowUntil = g.time + 1.2;
    wraith.slowFactor = 0.6;
    this.nips += 1;
    g.nips = this.nips;
    g.audio.yip();
    g.sparks.push({ x: wraith.x, y: wraith.y, t: 0, life: 0.5, color: '#ffd76a', n: 8 });
    if (wraith.hp <= 0) g.killWraith(wraith);
    this.target = null;
    this.state = 'return';
  }
}
