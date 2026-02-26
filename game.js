// Wave management & notifications
       // ==========================================
       // WAVE MANAGEMENT
       // ==========================================
       function isSuperbossWave() {
           return gameState.wave % 5 === 0;
       }

       const MAX_ZOMBIES_ON_GROUND = 5;

       function spawnOneRegularZombie() {
           if (gameState.isGameOver) return;
           let sx, sz, attempts = 0;
           do {
               const angle = Math.random() * Math.PI * 2;
               const distance = 45 + Math.random() * 15;
               sx = Math.cos(angle) * distance;
               sz = Math.sin(angle) * distance;
               attempts++;
           } while (attempts < 30 && buildings.some(b =>
               Math.abs(sx - b.x) < b.width / 2 + 4 &&
               Math.abs(sz - b.z) < b.depth / 2 + 4
           ));
           new Zombie(sx, sz, false);
           gameState.regularZombiesSpawned++;
           updateUI();
       }

       function spawnZombies(count) {
           gameState.bossSpawned = false;
           gameState.bossDefeated = false;
           gameState.bossKilled = false;
           gameState.regularZombiesKilled = 0;
           gameState.regularZombiesSpawned = 0;

           if (isSuperbossWave()) {
               // Super boss wave — spawn only the super boss immediately, no regulars
               gameState.regularZombiesTotal = 0;
               gameState.bossSpawned = true;

               const warning = document.getElementById('boss-warning');
               warning.textContent = '💀 SUPER BOSS INCOMING 💀';
               warning.style.color = '#ff00ff';
               warning.style.display = 'block';
               showNotification('💀 SUPER BOSS WAVE!', '#ff00ff');

               setTimeout(() => {
                   if (gameState.isGameOver) return;
                   warning.style.display = 'none';
                   warning.textContent = '⚠️ BOSS INCOMING ⚠️';
                   warning.style.color = '';
                   let bx, bz, attempts = 0;
                   do {
                       const angle = Math.random() * Math.PI * 2;
                       bx = Math.cos(angle) * 48; bz = Math.sin(angle) * 48;
                       attempts++;
                   } while (attempts < 30 && buildings.some(b =>
                       Math.abs(bx - b.x) < b.width / 2 + 4 && Math.abs(bz - b.z) < b.depth / 2 + 4
                   ));
                   new Zombie(bx, bz, false, true);
                   updateUI();
               }, 3000);
           } else {
               // Normal wave — spawn up to MAX_ZOMBIES_ON_GROUND at once, respawn on death
               gameState.regularZombiesTotal = count;

               const _effectiveMax = window._modZombieLimit !== undefined ? window._modZombieLimit : MAX_ZOMBIES_ON_GROUND;
               const initialSpawn = Math.min(count, _effectiveMax);
               for (let i = 0; i < initialSpawn; i++) {
                   setTimeout(() => {
                       spawnOneRegularZombie();
                   }, i * 300);
               }
           }
       }

       function checkSpawnBoss() {
           // Only called on normal waves — spawn regular boss after all regulars die
           if (gameState.bossSpawned) return;
           if (gameState.regularZombiesKilled < gameState.regularZombiesTotal) return;
           if (gameState.isGameOver) return;

           gameState.bossSpawned = true;

           const warning = document.getElementById('boss-warning');
           warning.style.display = 'block';
           showNotification('⚠️ BOSS INCOMING!', '#ff0000');

           setTimeout(() => {
               if (gameState.isGameOver) return;
               warning.style.display = 'none';
               let bx, bz, attempts = 0;
               do {
                   const angle = Math.random() * Math.PI * 2;
                   bx = Math.cos(angle) * 48; bz = Math.sin(angle) * 48;
                   attempts++;
               } while (attempts < 30 && buildings.some(b =>
                   Math.abs(bx - b.x) < b.width / 2 + 4 && Math.abs(bz - b.z) < b.depth / 2 + 4
               ));
               new Zombie(bx, bz, true);
               updateUI();
           }, 2000);
       }

       function checkWaveComplete() {
           // Super boss wave: no regulars, just need boss killed
           if (isSuperbossWave()) {
               if (gameState.bossKilled) {
                   setTimeout(() => { if (!gameState.isGameOver) nextWave(); }, 1000);
               }
               return;
           }
           // Normal wave
           if (gameState.bossKilled && gameState.regularZombiesKilled >= gameState.regularZombiesTotal) {
               setTimeout(() => { if (!gameState.isGameOver) nextWave(); }, 500);
           }
       }

       function nextWave() {
           gameState.wave++;
           gameState.zombiesThisWave = Math.floor(5 * Math.pow(1.25, gameState.wave - 1));
           gameState.health = Math.min(CONFIG.MAX_HEALTH, gameState.health + 30);

           // Every 10 waves, increase zombie speed slightly
           if (gameState.wave % 10 === 0) {
               CONFIG.ZOMBIE_SPEED = Math.min(0.09, CONFIG.ZOMBIE_SPEED * 1.1);
               showNotification('⚡ ZOMBIES FASTER!', '#ff0000');
           }

           updateUI();
           updateHealthBar();

           if (isSuperbossWave()) {
               showNotification(`💀 WAVE ${gameState.wave} — SUPER BOSS WAVE! 💀`, '#ff00ff');
           } else {
               showNotification(`WAVE ${gameState.wave} STARTING!`, '#ffcc00');
           }

           setTimeout(() => {
               spawnZombies(gameState.zombiesThisWave);
           }, 3000);
       }

       // ==========================================
       // NOTIFICATIONS
       // ==========================================
       function showNotification(text, color = '#0f0') {
           const notif = document.getElementById('drop-notification');
           notif.textContent = text;
           notif.style.color = color;
           notif.style.textShadow = `0 0 10px ${color}`;
           notif.style.display = 'block';
           
           setTimeout(() => {
               notif.style.display = 'none';
           }, 2000);
       }

       let comboTimeout = null;
       function showComboFlash(multiplier, bonus) {
           const el = document.getElementById('combo-display');
           const colors = ['','','#ffcc00','#ff6600','#ff2200','#ff00ff'];
           const color = colors[Math.min(multiplier, 5)];
           el.style.color = color;
           el.style.textShadow = `0 0 25px ${color}, 2px 2px 6px #000`;
           el.innerHTML = `💥 x${multiplier} COMBO!<br><span style="font-size:20px">+${bonus}</span>`;
           el.style.display = 'block';
           el.style.animation = 'none';
           void el.offsetWidth;
           el.style.animation = 'comboAnim 0.4s ease-out';
           if (comboTimeout) clearTimeout(comboTimeout);
           comboTimeout = setTimeout(() => el.style.display = 'none', 1500);
       }

       // ==========================================
       // CONTROLS
       // ==========================================
       const moveState = {
           joystickActive: false,