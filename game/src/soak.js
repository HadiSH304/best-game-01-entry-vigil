// ?soak=1 self-test: drives the real simulation headlessly and logs
// PASS/FAIL per rule. Runs in the page (no rendering needed) and reports
// through window.__SOAK__ = { done, log, errors }.
import { Game } from './game.js';
import { NIGHT_TABLE, nightHasBoss } from './waves.js';
import { PATH_LENGTH, pointAt, makeWraith } from './wraiths.js';
import { BELL_TYPES, makeRing, applyRingHit } from './bells.js';
import { SPRITE_ERRORS } from './sprites.js';

const DT = 1 / 60;

function stepFor(game, seconds) {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) game.step(DT);
}

export function runSoak() {
  const log = [];
  const errors = [];
  const check = (name, pass, detail) => log.push({ test: name, pass: !!pass, detail: detail ?? '' });

  try {
    // 0. Sprite maps are well-formed.
    check('sprites-valid', SPRITE_ERRORS.length === 0, SPRITE_ERRORS.join('; ') || 'all maps valid');

    // 1. Night table: 7 nights, boss only on night 7.
    check('night-table-7', NIGHT_TABLE.length === 7, `nights=${NIGHT_TABLE.length}`);
    const bossNights = NIGHT_TABLE.map((_, i) => (nightHasBoss(i) ? i + 1 : null)).filter(Boolean);
    check('boss-only-night-7', bossNights.length === 1 && bossNights[0] === 7, `boss nights=${bossNights.join(',')}`);

    // 2. A placed Treble damages a Drifter on the road.
    {
      const g = new Game({ seed: 1 });
      g.startGame();
      g.buildBell(0, 'treble'); // pad 0 (170,500), road passes (170,580)
      const w = g.spawnWraith('drifter');
      w.dist = 230; // on the road right below the bell
      const p = pointAt(230);
      w.x = p.x; w.y = p.y;
      const hp0 = w.hp;
      stepFor(g, 3);
      check('treble-damages-drifter', w.hp < hp0 || w.dead, `hp ${hp0} -> ${w.hp}${w.dead ? ' (dead)' : ''}`);
    }

    // 3. Two overlapping rings on one wraith = CHORD (double damage).
    {
      const g = new Game({ seed: 1 });
      g.startGame();
      g.buildBell(0, 'treble');
      g.buildBell(1, 'treble');
      const b1 = g.bells[0];
      const b2 = g.bells[1];
      const w = makeWraith('drifter', 350); // ~92px from pad 0, ~64px from pad 1
      const r1 = makeRing(b1);
      const r2 = makeRing(b2);
      const hp0 = w.hp;
      g.time = 1.0;
      applyRingHit(g, w, r1); // first ring: 14 dmg
      g.time = 1.1; // 0.1s later, inside the chord window
      const res = applyRingHit(g, w, r2); // second ring: chord, 28 dmg
      const expected = hp0 - 14 - 28;
      check('chord-double-damage', res === 'chord' && w.hp === expected, `res=${res} hp ${hp0} -> ${w.hp} (expected ${expected})`);
      check('chord-counted', g.chords === 1 && g.combo === 1, `chords=${g.chords} combo=${g.combo}`);
    }

    // 3b. Integration: two bells ringing live produce a chord.
    {
      const g = new Game({ seed: 1 });
      g.startGame();
      g.buildBell(0, 'treble');
      g.buildBell(1, 'treble');
      const w = g.spawnWraith('drifter');
      w.dist = 350;
      const p = pointAt(350);
      w.x = p.x; w.y = p.y;
      stepFor(g, 6);
      check('live-chord', g.chords >= 1, `chords=${g.chords} wraith hp=${w.hp} dead=${w.dead}`);
    }

    // 4. A Shroud takes reduced damage from a lone (non-chord) ring.
    {
      const g = new Game({ seed: 1 });
      g.startGame();
      g.buildBell(0, 'treble');
      const w = makeWraith('shroud', 350);
      const r = makeRing(g.bells[0]);
      const hp0 = w.hp;
      g.time = 1.0;
      applyRingHit(g, w, r);
      const dealt = hp0 - w.hp;
      check('shroud-reduced', dealt === 14 * 0.25, `lone ring dealt ${dealt} (expected 3.5)`);
      // ...but a chord hits it at full double damage.
      const r2 = makeRing(g.bells[0]);
      r2.bellId = 9999; // a different bell
      g.time = 1.1;
      const hp1 = w.hp;
      const res = applyRingHit(g, w, r2);
      check('shroud-chord-full', res === 'chord' && hp1 - w.hp === 28, `chord dealt ${hp1 - w.hp} (expected 28)`);
    }

    // 5. THE HUSH mutes a bell inside its radius, not one outside.
    {
      const g = new Game({ seed: 1 });
      g.startGame();
      g.buildBell(0, 'treble'); // pad 0 (170,500) — 80px from the road point
      g.buildBell(3, 'treble'); // pad 3 (520,560) — far from it
      const boss = g.spawnWraith('hush');
      boss.dist = 230;
      const p = pointAt(230);
      boss.x = p.x; boss.y = p.y;
      g.boss = boss;
      g.phase = 'night';
      stepFor(g, 0.2);
      const near = g.bells.find((b) => b.padIndex === 0);
      const far = g.bells.find((b) => b.padIndex === 3);
      check('hush-mutes-near', near.muted === true, `near bell muted=${near.muted}`);
      check('hush-spares-far', far.muted === false, `far bell muted=${far.muted}`);
    }

    // 6. Pip dashes to the most-advanced wraith; the nip damages + slows.
    {
      const g = new Game({ seed: 1 });
      g.startGame();
      g.phase = 'night';
      const ahead = g.spawnWraith('drifter');
      ahead.dist = 900;
      const pa = pointAt(900);
      ahead.x = pa.x; ahead.y = pa.y;
      const behind = g.spawnWraith('drifter');
      behind.dist = 300;
      const pb = pointAt(300);
      behind.x = pb.x; behind.y = pb.y;
      g.pip.nipTimer = 0;
      g.pip.x = 600; g.pip.y = 400; // mid-field, close to the action
      const hp0 = ahead.hp;
      stepFor(g, 0.1);
      check('pip-targets-leader', g.pip.state === 'dash' && g.pip.target === ahead, `state=${g.pip.state} target=${g.pip.target?.type}@${g.pip.target?.dist}`);
      let nipped = false;
      for (let i = 0; i < 60 * 8 && !nipped; i++) {
        g.step(DT);
        if (g.nips >= 1) nipped = true;
      }
      check('pip-nip-damages', nipped && ahead.hp < hp0, `nips=${g.nips} hp ${hp0} -> ${ahead.hp}`);
      check('pip-nip-slows', ahead.slowUntil > 0, `slowUntil=${ahead.slowUntil.toFixed(2)} time=${g.time.toFixed(2)}`);
    }

    // 7. A wraith reaching the belfry drains Voice.
    {
      const g = new Game({ seed: 1 });
      g.startGame();
      g.phase = 'night';
      const w = g.spawnWraith('drifter');
      w.dist = PATH_LENGTH - 5;
      const p = pointAt(w.dist);
      w.x = p.x; w.y = p.y;
      stepFor(g, 1);
      check('breach-drains-voice', g.voice === 92 && g.wraiths.length === 0, `voice=${g.voice} wraiths=${g.wraiths.length}`);
    }

    // 8a. Victory: night 7 cleared reaches the results screen.
    {
      const g = new Game({ seed: 1 });
      g.startGame();
      g.night = 7;
      g.startNight();
      let guard = 0;
      while (g.phase !== 'results' && guard < 60 * 240) {
        g.step(DT);
        for (const w of [...g.wraiths]) g.killWraith(w);
        guard++;
      }
      check('victory-results', g.phase === 'results' && g.result === 'victory', `phase=${g.phase} result=${g.result} after ${guard} steps`);
    }

    // 8b. Defeat: Voice to zero reaches the results screen.
    {
      const g = new Game({ seed: 1 });
      g.startGame();
      g.phase = 'night';
      g.voice = 8;
      const w = g.spawnWraith('drifter');
      w.dist = PATH_LENGTH - 5;
      const p = pointAt(w.dist);
      w.x = p.x; w.y = p.y;
      stepFor(g, 1);
      check('defeat-results', g.phase === 'results' && g.result === 'defeat', `phase=${g.phase} result=${g.result} voice=${g.voice}`);
    }
  } catch (e) {
    errors.push(String(e && e.stack || e));
  }

  const passed = log.filter((r) => r.pass).length;
  return { done: true, log, errors, passed, total: log.length };
}
