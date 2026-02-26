// UI updates — health bar, HUD, minimap
       // ==========================================
       // UI UPDATES
       // ==========================================
       function updateFuelBar() {
           const pct = Math.max(0, Math.min(100, gameState.flyFuel));
           document.getElementById('fuel-value').textContent = Math.floor(pct);
           document.getElementById('fuel-fill').style.width = pct + '%';
           document.getElementById('fuel-fill').style.background = pct < 20
               ? 'linear-gradient(90deg,#f40,#f80)'
               : 'linear-gradient(90deg,#0af,#0ff)';
       }

       function updateUI() {
           const currentWeapon = getCurrentWeapon();
           const weaponDef = getCurrentWeaponDef();
           
           document.getElementById('ammo-count').textContent = `${currentWeapon.ammo}/${currentWeapon.totalAmmo}`;
           document.getElementById('kill-count').textContent = gameState.kills;
           document.getElementById('score').textContent = gameState.score;
           document.getElementById('coins-count').textContent = gameState.coins;
           document.getElementById('wave-number').textContent = gameState.wave;
           document.getElementById('zombie-count').textContent = zombies.length;
           
           const ammoPercent = (currentWeapon.ammo / weaponDef.clipSize) * 100;
           document.getElementById('ammo-fill').style.width = ammoPercent + '%';
           
           updateWeaponCycleButton();
       }

       function updateHealthBar() {
           const healthPercent = (gameState.health / CONFIG.MAX_HEALTH) * 100;
           document.getElementById('health-fill').style.width = Math.max(0, healthPercent) + '%';
           document.getElementById('health-value').textContent = Math.max(0, Math.floor(gameState.health));
           
           const armorPercent = (gameState.armor / CONFIG.MAX_ARMOR) * 100;
           document.getElementById('armor-fill').style.width = armorPercent + '%';
           document.getElementById('armor-value').textContent = Math.floor(gameState.armor);
           
           const healthBar = document.getElementById('health-bar');
           if (healthPercent < 30) {
               healthBar.classList.add('low-health');
           } else {
               healthBar.classList.remove('low-health');
           }
       }

       function showDamageFlash() {
           const flash = document.getElementById('damage-flash');
           flash.style.opacity = '1';
           setTimeout(() => flash.style.opacity = '0', 200);
       }

       function gameOver() {
           gameState.isGameOver = true;
           document.getElementById('final-wave').textContent = gameState.wave;
           document.getElementById('final-kills').textContent = gameState.kills;
           document.getElementById('final-score').textContent = gameState.score;
           document.getElementById('final-high-score').textContent = gameState.highScore;
           document.getElementById('game-over').style.display = 'block';
       }

       document.getElementById('restart-button').addEventListener('click', () => location.reload());
       document.getElementById('restart-button').addEventListener('touchstart', (e) => {
           e.preventDefault();
           location.reload();
       }, { passive: false });

       // ==========================================
       // MINIMAP
       // ==========================================
       const minimapCanvas = document.getElementById('minimapCanvas');
       const minimapCtx = minimapCanvas.getContext('2d');
       const MAP_SIZE = 100;
       const WORLD_SIZE = 140;
       const MAP_SCALE = MAP_SIZE / WORLD_SIZE;

       function updateMinimap() {
           minimapCtx.clearRect(0, 0, MAP_SIZE, MAP_SIZE);
           
           // Background
           minimapCtx.fillStyle = 'rgba(0,20,0,0.7)';
           minimapCtx.beginPath();
           minimapCtx.arc(MAP_SIZE/2, MAP_SIZE/2, MAP_SIZE/2, 0, Math.PI * 2);
           minimapCtx.fill();

           // Buildings
           minimapCtx.fillStyle = 'rgba(100,100,100,0.8)';
           for (const b of buildings) {
               const mx = (b.x + WORLD_SIZE/2) * MAP_SCALE - b.width * MAP_SCALE / 2;
               const mz = (b.z + WORLD_SIZE/2) * MAP_SCALE - b.depth * MAP_SCALE / 2;
               minimapCtx.fillRect(mx, mz, b.width * MAP_SCALE, b.depth * MAP_SCALE);
           }

           // Zombies
           for (const z of zombies) {
               const mx = (z.group.position.x + WORLD_SIZE/2) * MAP_SCALE;
               const mz = (z.group.position.z + WORLD_SIZE/2) * MAP_SCALE;
               minimapCtx.fillStyle = z.isSuperBoss ? '#ff00ff' : (z.isBoss ? '#ff0000' : (z.isAgro ? '#ff6600' : '#00cc00'));
               minimapCtx.beginPath();
               minimapCtx.arc(mx, mz, z.isSuperBoss ? 5 : (z.isBoss ? 3 : 2), 0, Math.PI * 2);
               minimapCtx.fill();
           }

           // Player
           const px = (camera.position.x + WORLD_SIZE/2) * MAP_SCALE;
           const pz = (camera.position.z + WORLD_SIZE/2) * MAP_SCALE;
           minimapCtx.fillStyle = '#00ffff';
           minimapCtx.beginPath();
           minimapCtx.arc(px, pz, 3, 0, Math.PI * 2);
           minimapCtx.fill();

           // Player direction indicator
           minimapCtx.strokeStyle = '#00ffff';
           minimapCtx.lineWidth = 1.5;
           minimapCtx.beginPath();
           minimapCtx.moveTo(px, pz);
           minimapCtx.lineTo(
               px + Math.sin(camera.rotation.y) * -8,
               pz + Math.cos(camera.rotation.y) * -8
           );
           minimapCtx.stroke();

           // Drops
           for (const d of drops) {
               const mx = (d.mesh.position.x + WORLD_SIZE/2) * MAP_SCALE;
               const mz = (d.mesh.position.z + WORLD_SIZE/2) * MAP_SCALE;
               minimapCtx.fillStyle = d.type === 'health' ? '#00ff00' : (d.type === 'ammo' ? '#ffcc00' : '#ff00ff');
               minimapCtx.beginPath();
               minimapCtx.arc(mx, mz, 2, 0, Math.PI * 2);
               minimapCtx.fill();
           }

           // Circle border
           minimapCtx.strokeStyle = 'rgba(0,255,0,0.4)';
           minimapCtx.lineWidth = 2;
           minimapCtx.beginPath();
           minimapCtx.arc(MAP_SIZE/2, MAP_SIZE/2, MAP_SIZE/2, 0, Math.PI * 2);
           minimapCtx.stroke();
       }

       // FPS tracking
       let fpsFrameCount = 0;
       let fpsLastTime = performance.now();
       let currentFps = 60;

       // ==========================================
       // PERK SHOP SYSTEM