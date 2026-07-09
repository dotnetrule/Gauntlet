# Tiny Swords — asset pack

Art: **Tiny Swords** by [Pixel Frog](https://pixelfrog-assets.itch.io/tiny-swords),
free to use in game projects (see the itch.io page for license details).

Used here as placeholder art for the Gauntlet prototype.

- `Factions/`, `Terrain/`, `Resources/`, `Effects/`, `Deco/`, `UI/` — Tiny Swords (Update 010 layout)
- `UI/Extra/` — a few extra UI pieces (avatar, wood table, paper, bars, dust) from a newer Tiny Swords release

Sprite sheet frame conventions used by the code:
- Units: 192×192 frames. Row 0 = idle, row 1 = run, later rows = attacks
  (Pawn 6×6, Warrior 6×8, Archer 8×7, Torch 7×5, TNT 7×3, Barrel 4×4).
- `Factions/Knights/Troops/Dead/Dead.png`: 128×128 frames, 7×2 (two death anims).
- Terrain tiles 64×64 (`Tilemap_Sand`/`Tilemap_Grass` 5×4, `Tilemap_Elevation` 4×8).
- `Terrain/Water/Foam/Foam.png`: 192×192 × 8 frames.
- `Effects/Explosion/Explosions.png`: 192×192 × 9; `Effects/Fire/Fire.png`: 128×128 × 7.
- `Resources/Trees/Tree.png`: 192×192, row 0 = 4-frame sway; UI icons/buttons 64×64.
