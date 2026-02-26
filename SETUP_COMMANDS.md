# Commands to Run in Codespaces Terminal

Run these one at a time in your terminal:

```bash
# 1. Create folder structure
mkdir -p css js models test/unit

# 2. Move the .glb model files to models folder (they stay as-is)
# The game already loads them from URLs so no change needed

# 3. After uploading all the new files, commit everything:
git add .
git commit -m "Restructure: split index.html into modular CSS and JS files"
git push
```

## Project Structure Created
- `css/base.css` — resets, body, canvas, CSS variables
- `css/hud.css` — HUD components, stats bars, minimap
- `css/responsive.css` — button layouts, joystick
- `css/menus.css` — shop, mod menu, game over, HUD editor
- `js/config.js` — CONFIG, WEAPONS, gameState
- `js/renderer.js` — THREE.js scene, camera, renderer, lights
- `js/models.js` — GLB model loading
- `js/environment.js` — ground, portals, grass, trees, buildings, doors
- `js/weapons.js` — weapon model, drops, projectiles
- `js/enemies.js` — Zombie class & AI
- `js/game.js` — wave management, notifications
- `js/input.js` — touch & keyboard controls
- `js/player.js` — player movement, jump, fly
- `js/ui.js` — UI updates, minimap
- `js/perks.js` — perk shop system
- `js/mods.js` — mod menu + game loop + day/night + HUD editor
- `js/utils.js` — utility functions
- `test/unit/config.test.js` — unit tests
