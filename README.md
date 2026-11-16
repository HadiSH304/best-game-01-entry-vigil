# VIGIL // FOUNDRY

A 5v5 round-based tactical FPS that runs entirely offline in a desktop
browser. Ember Jackals attack — plant the charge at Site A or Site B, or
eliminate the Harbor Wardens. First team to 9 rounds wins; sides swap at
halftime. Two maps (Foundry Yard and Killhouse), a buy phase between rounds,
bot teammates and enemies with team plans and radio callouts, and an
After-Action Report with a tactical rank after every match.

## Play

Serve `game/` with any static server (`node serve.ts`, then open
http://localhost:8080) and click DEPLOY.

## Controls

- **WASD** move · **Shift** silent walk · **C** crouch · **Space** jump
- **Mouse** aim · **Click** fire · **R** reload · **1/2/3/4** weapons
- **Q** smoke · **G** flashbang · **F** frag · **E** plant / defuse
- **B** buy menu (number keys 1–9 buy) · **TAB** scoreboard
- **M** switch map next round · **ESC** pause

## The entry

`main.ts` (Node 22) copies `game/` and `screenshots/` to the output
directory and writes `dossier.json` with the kit's `vendor/makefun-game.ts`.
The game is original code and art: three.js 0.187.0 is vendored under
`game/vendor/`, all textures are generated on canvas, and all sounds are
synthesised with Web Audio. No network requests.

MIT licensed — see LICENSE.
