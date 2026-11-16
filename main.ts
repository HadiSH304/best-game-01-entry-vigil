// VIGIL // FOUNDRY — best-game-01 entrypoint (Node 22, standard library only).
//
// The game itself lives in game/ as plain static files (three.js vendored
// under game/vendor/), and the screenshots in screenshots/. This program
// hands both in: it copies them into the output directory and writes
// /output/dossier.json with buildDossier from the kit's vendored library,
// which is the summary the judge reads.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The repository root is the directory holding this file; the output
// directory is the grader's /output unless MAKEFUN_OUTPUT_DIR says otherwise.
const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

function copyTree(sourceName, targetName) {
  const source = join(repoRoot, sourceName);
  const target = join(outputDir, targetName);
  if (!existsSync(source)) throw new Error(`missing ${sourceName}/ in the repository`);
  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true, dereference: false });
  return target;
}

mkdirSync(outputDir, { recursive: true });
copyTree('game', 'game');
const shotDir = copyTree('screenshots', 'screenshots');

// The gate refuses more than 4 screenshots or any one over 256 KiB, so
// check the copied set here and fail loudly instead of handing in a
// dossier the scorer would reject.
const MAX_SHOT_BYTES = 262144;
const shotFiles = readdirSync(shotDir).filter((name) => !name.startsWith('.'));
if (shotFiles.length < 3 || shotFiles.length > 4) {
  throw new Error(`expected 3 or 4 screenshots, found ${shotFiles.length}`);
}
const shotSizes = shotFiles.map((name) => {
  const size = statSync(join(shotDir, name)).size;
  if (size > MAX_SHOT_BYTES) throw new Error(`screenshot ${name} is ${size} bytes, over the 256 KiB cap`);
  return `${name} (${size} bytes)`;
});

// The scorer's own caps (reference/gate.json): the text cap shapes the
// dossier bytes; the rest refuse an entry the scorer would refuse.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

writeFileSync(join(outputDir, 'dossier.json'), dossier);
console.log(`screenshots: ${shotSizes.join(', ')}`);
console.log(`wrote ${join(outputDir, 'dossier.json')} (${dossier.length} bytes)`);
