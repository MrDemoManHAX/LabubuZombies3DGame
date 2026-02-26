// Mod menu system
       // ==========================================
       // GAME INITIALIZATION
       // ==========================================
       async function initGame() {
           console.log('=== ZOMBIE SURVIVAL 3D - LABUBU EDITION ===');
           console.log('Loading assets...');
           
           await loadLabubuModel();
           await loadGolemModel();
           await loadOverlordModel();
           await loadWarriorModel();

           // Now that warrior is loaded, swap out the fallback procedural body
           if (warriorLoaded && warriorTemplate) {
               while (playerBodyGroup.children.length > 0) {
                   playerBodyGroup.remove(playerBodyGroup.children[0]);
               }
               const warriorModel = deepCloneGLTF(warriorTemplate);
               warriorModel.position.y = warriorBaseHeight;
               warriorModel.rotation.y = Math.PI;
               playerBodyGroup.add(warriorModel);
               playerBodyGroup.userData.warriorModel = warriorModel;
           }
           
           document.getElementById('loading-screen').style.display = 'none';
           
           gameState.gameStarted = true;
           spawnZombies(gameState.zombiesThisWave);
           
           animate();
           
           const pickupHint = document.getElementById('pickup-hint');
           pickupHint.style.display = 'block';
           setTimeout(() => pickupHint.style.display = 'none', 5000);

           const weaponHint = document.getElementById('weapon-hint');
           setTimeout(() => weaponHint.style.display = 'none', 8000);
       }

       // ==========================================
       // MINIMAP
       // ==========================================
       // GAME LOOP
       // ==========================================
       let lastTime = performance.now();

       function animate() {
           if (gameState.isGameOver) {
               renderer.render(scene, camera);
               return;
           }

           requestAnimationFrame(animate);

           // Pause all simulation while shop is open, but keep rendering
           if (shopOpen) {
               renderer.render(scene, camera);
               return;
           }

           const currentTime = performance.now();
           const rawDelta = currentTime - lastTime;
           const deltaTime = Math.min(rawDelta, 50); // Cap at 50ms to prevent spiral of death
           lastTime = currentTime;

           // In 3rd person, updatePlayer moves playerWorldPos; camera is offset from it.
           // In 1st person, playerWorldPos and camera.position are the same object.
           if (thirdPersonState.enabled) {
               // Save camera position (it's currently the offset cam pos from last frame)
               // Restore true player world position before updatePlayer runs
               camera.position.copy(thirdPersonState.worldPos);
           }

           updatePlayer(deltaTime);

           if (thirdPersonState.enabled) {
               // Save the true player world position after movement
               thirdPersonState.worldPos.copy(camera.position);

               // Place the body mesh at player's feet
               const groundY = thirdPersonState.worldPos.y - CONFIG.PLAYER_HEIGHT;
               playerBodyGroup.position.set(thirdPersonState.worldPos.x, groundY, thirdPersonState.worldPos.z);
               playerBodyGroup.rotation.y = lookState.rotationY;

               // Offset camera behind + above the player
               const back = new THREE.Vector3(0, 0, 1);
               back.applyEuler(new THREE.Euler(0, lookState.rotationY, 0));
               camera.position.copy(thirdPersonState.worldPos)
                   .add(back.multiplyScalar(thirdPersonState.DISTANCE))
                   .add(new THREE.Vector3(0, thirdPersonState.HEIGHT, 0));
           }

           updateAutoAim();

           if (isShooting) {
               shoot();
           }

           const playerPos = thirdPersonState.enabled ? thirdPersonState.worldPos.clone() : camera.position.clone();
           // Enforce mod zombie limit
           if (window._modZombieLimit !== undefined) {
               const _lim = window._modZombieLimit;
               while (zombies.length > _lim) {
                   const _z = zombies[zombies.length - 1];
                   scene.remove(_z.group);
                   zombies.splice(zombies.length - 1, 1);
               }
           }

           zombies.forEach(zombie => zombie.update(playerPos, deltaTime));

           projectiles.forEach(proj => proj.update(deltaTime));

           drops.forEach(drop => {
               drop.update(currentTime);
               drop.checkPickup(playerPos);
           });

           // Update minimap every 3 frames for performance
           if (fpsFrameCount % 3 === 0) {
               updateMinimap();
           }

           // Day/night cycle
           updateDayNight(deltaTime);

           // Portal animation
           if (window._portalAnimators) {
               window._portalAnimators.forEach(fn => fn(deltaTime));
           }

           // FPS counter
           fpsFrameCount++;
           if (currentTime - fpsLastTime > 500) {
               currentFps = Math.round(fpsFrameCount / ((currentTime - fpsLastTime) / 1000));
               fpsFrameCount = 0;
               fpsLastTime = currentTime;
               document.getElementById('fps-counter').textContent = currentFps + ' FPS';
           }

           renderer.render(scene, camera);
       }

       window.addEventListener('resize', () => {
           camera.aspect = window.innerWidth / window.innerHeight;
           camera.updateProjectionMatrix();
           renderer.setSize(window.innerWidth, window.innerHeight);
           updateJoystickCenter();
       });

       document.body.addEventListener('touchmove', (e) => {
           if (e.target === canvas || e.target === document.body) {
               e.preventDefault();
           }
       }, { passive: false });

       updateUI();
       updateHealthBar();
       updateWeaponCycleButton();

       // ==========================================
       // MOD MENU
       // ==========================================
       const modState = {
           godMode: false,
       };

       let modMenuOpen = false;

       function openModMenu() {
           try {
               modMenuOpen = true;
               shopOpen = true;
               document.getElementById('mod-menu-overlay').classList.add('open');
               document.getElementById('mod-zombie-limit-display').textContent = window._modZombieLimit || MAX_ZOMBIES_ON_GROUND;
               document.getElementById('mod-zombie-limit-input').value = window._modZombieLimit || MAX_ZOMBIES_ON_GROUND;
               document.getElementById('mod-health-display').textContent = Math.round(gameState.health);
               document.getElementById('mod-maxhealth-display').textContent = CONFIG.MAX_HEALTH;
               document.getElementById('mod-health-input').value = Math.round(gameState.health);
               document.getElementById('mod-speed-input').value = CONFIG.PLAYER_SPEED;
               syncToggle('mod-godmode-toggle', modState.godMode);
               syncToggle('mod-unlimitedammo-toggle', modState.unlimitedAmmo);
               syncToggle('mod-autoaim-toggle', modState.autoAim || false);
               document.getElementById('mod-row-autoaim').classList.toggle('active-mod', modState.autoAim || false);
               syncToggle('mod-allweapons-toggle', modState.allWeapons || false);
               syncToggle('mod-noreload-toggle', modState.noReload || false);
               syncToggle('mod-jetpack-toggle', modState.jetpack || false);
               document.getElementById('mod-row-allweapons').classList.toggle('active-mod', modState.allWeapons || false);
               document.getElementById('mod-row-noreload').classList.toggle('active-mod', modState.noReload || false);
               document.getElementById('mod-row-jetpack').classList.toggle('active-mod', modState.jetpack || false);
               document.getElementById('mod-row-unlimitedammo').classList.toggle('active-mod', modState.unlimitedAmmo);
               document.getElementById('mod-row-godmode').classList.toggle('active-mod', modState.godMode);
               ['doublePickup', 'invisibility', 'adrenaline', 'hollowPoints', 'doubleTap'].forEach(perkId => {
                   const active = perks[perkId] ? perks[perkId].active : false;
                   syncToggle('mod-perk-' + perkId + '-toggle', active);
                   const rowEl = document.getElementById('mod-row-perk-' + perkId);
                   if (rowEl) rowEl.classList.toggle('active-mod', active);
               });
           } catch(e) { console.error('Mod menu error:', e); }
       }

       function closeModMenu() {
           modMenuOpen = false;
           shopOpen = false;
           lastTime = performance.now();
           document.getElementById('mod-menu-overlay').classList.remove('open');
       }

       function syncToggle(id, state) {
           const el = document.getElementById(id);
           if (state) { el.classList.add('on'); } else { el.classList.remove('on'); }
       }

       function flashStatus(id) {
           const el = document.getElementById(id);
           if (!el) return;
           el.classList.add('visible');
           setTimeout(() => el.classList.remove('visible'), 1500);
       }

       // Zombie limit
       document.getElementById('mod-zombie-limit-apply').addEventListener('click', () => {
           const val = parseInt(document.getElementById('mod-zombie-limit-input').value);
           if (isNaN(val) || val < 1) return;
           // Override the MAX_ZOMBIES_ON_GROUND constant by patching via a global
           window._modZombieLimit = val;
           document.getElementById('mod-zombie-limit-display').textContent = val;
           flashStatus('mod-zombielimit-status');
       });

       // Player health
       document.getElementById('mod-health-apply').addEventListener('click', () => {
           const val = parseInt(document.getElementById('mod-health-input').value);
           if (isNaN(val) || val < 1) return;
           // Also raise MAX_HEALTH if needed so the bar renders correctly
           if (val > CONFIG.MAX_HEALTH) CONFIG.MAX_HEALTH = val;
           gameState.health = val;
           updateHealthBar();
           updateUI();
           document.getElementById('mod-health-display').textContent = val;
           document.getElementById('mod-maxhealth-display').textContent = CONFIG.MAX_HEALTH;
           flashStatus('mod-health-status');
       });

       // Unlimited ammo toggle
       modState.unlimitedAmmo = false;
       document.getElementById('mod-unlimitedammo-toggle').addEventListener('click', () => {
           modState.unlimitedAmmo = !modState.unlimitedAmmo;
           syncToggle('mod-unlimitedammo-toggle', modState.unlimitedAmmo);
           document.getElementById('mod-row-unlimitedammo').classList.toggle('active-mod', modState.unlimitedAmmo);
           showNotification(modState.unlimitedAmmo ? '∞ UNLIMITED AMMO ON' : '🔫 UNLIMITED AMMO OFF', '#ff00ff');
       });

       // Player speed
       document.getElementById('mod-speed-apply').addEventListener('click', () => {
           const val = parseFloat(document.getElementById('mod-speed-input').value);
           if (isNaN(val) || val <= 0) return;
           CONFIG.PLAYER_SPEED = val;
           flashStatus('mod-speed-status');
       });

       // Auto aim toggle
       modState.autoAim = false;
       document.getElementById('mod-autoaim-toggle').addEventListener('click', () => {
           modState.autoAim = !modState.autoAim;
           autoAimState.enabled = modState.autoAim;
           autoAimState.lockedZombie = null;
           autoAimRing.style.display = modState.autoAim ? 'block' : 'none';
           autoAimRing.classList.remove('locked');
           syncToggle('mod-autoaim-toggle', modState.autoAim);
           document.getElementById('mod-row-autoaim').classList.toggle('active-mod', modState.autoAim);
           showNotification(modState.autoAim ? '🎯 AUTO AIM ON' : '🎯 AUTO AIM OFF', '#00ffff');
       });
       document.getElementById('mod-autoaim-toggle').addEventListener('touchstart', (e) => {
           e.preventDefault(); document.getElementById('mod-autoaim-toggle').click();
       }, { passive: false });

       // All weapons toggle
       modState.allWeapons = false;
       document.getElementById('mod-allweapons-toggle').addEventListener('click', () => {
           modState.allWeapons = !modState.allWeapons;
           syncToggle('mod-allweapons-toggle', modState.allWeapons);
           document.getElementById('mod-row-allweapons').classList.toggle('active-mod', modState.allWeapons);
           if (modState.allWeapons) {
               ['shotgun', 'rocketLauncher', 'grenadeLauncher', 'freezeGun'].forEach(type => {
                   addWeapon(type);
                   const w = gameState.weapons.find(x => x.type === type);
                   if (w) w.totalAmmo = 9999;
               });
               const rifle = gameState.weapons.find(x => x.type === 'rifle');
               if (rifle) rifle.totalAmmo = 9999;
               updateUI();
               showNotification('🔫 ALL WEAPONS GIVEN!', '#ff00ff');
           } else {
               gameState.weapons = gameState.weapons.filter(w => w.type === 'rifle');
               gameState.currentWeaponIndex = 0;
               updateWeaponModel();
               updateWeaponCycleButton();
               updateUI();
               showNotification('🔫 WEAPONS RESET', '#ff6644');
           }
       });
       document.getElementById('mod-allweapons-toggle').addEventListener('touchstart', (e) => {
           e.preventDefault(); document.getElementById('mod-allweapons-toggle').click();
       }, { passive: false });

       // No reload toggle
       modState.noReload = false;
       document.getElementById('mod-noreload-toggle').addEventListener('click', () => {
           modState.noReload = !modState.noReload;
           syncToggle('mod-noreload-toggle', modState.noReload);
           document.getElementById('mod-row-noreload').classList.toggle('active-mod', modState.noReload);
           showNotification(modState.noReload ? '🔄 NO RELOAD ON' : '🔄 NO RELOAD OFF', '#ff00ff');
       });
       document.getElementById('mod-noreload-toggle').addEventListener('touchstart', (e) => {
           e.preventDefault(); document.getElementById('mod-noreload-toggle').click();
       }, { passive: false });

       // Jetpack toggle
       modState.jetpack = false;
       document.getElementById('mod-jetpack-toggle').addEventListener('click', () => {
           modState.jetpack = !modState.jetpack;
           syncToggle('mod-jetpack-toggle', modState.jetpack);
           document.getElementById('mod-row-jetpack').classList.toggle('active-mod', modState.jetpack);
           if (modState.jetpack) {
               gameState.flyUnlocked = true;
               gameState.flyFuel = 100;
               const jBtn = document.getElementById('jump-button');
               jBtn.textContent = '🚀 FLY';
               jBtn.classList.add('fly-mode');
               document.getElementById('fuel-bar').style.display = 'block';
               showNotification('🚀 JETPACK ACTIVATED!', '#0af');
           } else {
               gameState.flyUnlocked = false;
               const jBtn = document.getElementById('jump-button');
               jBtn.textContent = '🦘 JUMP';
               jBtn.classList.remove('fly-mode');
               document.getElementById('fuel-bar').style.display = 'none';
               showNotification('🚀 JETPACK OFF', '#ff6644');
           }
       });
       document.getElementById('mod-jetpack-toggle').addEventListener('touchstart', (e) => {
           e.preventDefault(); document.getElementById('mod-jetpack-toggle').click();
       }, { passive: false });

       // God mode toggle
       document.getElementById('mod-godmode-toggle').addEventListener('click', () => {
           modState.godMode = !modState.godMode;
           syncToggle('mod-godmode-toggle', modState.godMode);
           document.getElementById('mod-row-godmode').classList.toggle('active-mod', modState.godMode);
           showNotification(modState.godMode ? '😇 GOD MODE ON' : '💀 GOD MODE OFF', '#ff00ff');
       });

       // Perks dropdown toggle
       document.getElementById('mod-row-perks-header').addEventListener('click', () => {
           const dd = document.getElementById('mod-perks-dropdown');
           const arrow = document.getElementById('mod-perks-arrow');
           const open = dd.style.display === 'block';
           dd.style.display = open ? 'none' : 'block';
           arrow.textContent = open ? '▼' : '▲';
       });
       document.getElementById('mod-row-perks-header').addEventListener('touchstart', (e) => {
           e.preventDefault();
           const dd = document.getElementById('mod-perks-dropdown');
           const arrow = document.getElementById('mod-perks-arrow');
           const open = dd.style.display === 'block';
           dd.style.display = open ? 'none' : 'block';
           arrow.textContent = open ? '▼' : '▲';
       }, { passive: false });

       // Individual perk toggles
       ['doublePickup', 'invisibility', 'adrenaline', 'hollowPoints', 'doubleTap'].forEach(perkId => {
           const toggleEl = document.getElementById('mod-perk-' + perkId + '-toggle');
           const rowEl = document.getElementById('mod-row-perk-' + perkId);
           toggleEl.addEventListener('click', () => {
               const isActive = perks[perkId].active;
               if (!isActive) {
                   const def = PERK_DEFS.find(p => p.id === perkId);
                   activatePerk(perkId, Object.assign({}, def, { duration: 86400000 }));
               } else {
                   const state = perks[perkId];
                   state.active = false;
                   if (state._timeout) clearTimeout(state._timeout);
                   if (state._interval) clearInterval(state._interval);
                   if (state.badgeEl) { state.badgeEl.remove(); state.badgeEl = null; }
                   if (perkId === 'invisibility' && window._portalHoop) window._portalHoop.visible = false;
                   showNotification('❌ ' + PERK_DEFS.find(p => p.id === perkId).name + ' OFF', '#ff6644');
               }
               syncToggle('mod-perk-' + perkId + '-toggle', !isActive);
               rowEl.classList.toggle('active-mod', !isActive);
           });
           toggleEl.addEventListener('touchstart', (e) => { e.preventDefault(); toggleEl.click(); }, { passive: false });
       });

       // Open / close buttons
       document.getElementById('mod-menu-button').addEventListener('click', openModMenu);
       document.getElementById('mod-menu-button').addEventListener('touchstart', (e) => {
           e.preventDefault(); e.stopPropagation(); openModMenu();
       }, { passive: false });

       document.getElementById('mod-close-btn').addEventListener('click', closeModMenu);
       document.getElementById('mod-close-btn').addEventListener('touchstart', (e) => {
           e.preventDefault(); closeModMenu();
       }, { passive: false });

       // ==========================================
       // PATCH takeDamage for God Mode
       // ==========================================
       // We intercept damage in the gameState by wrapping the existing damage logic.
       // Since damage is applied directly via: gameState.health -= damage
       // we use a Proxy on gameState to intercept health changes.
       (function patchGodMode() {
           let _health = gameState.health;
           Object.defineProperty(gameState, 'health', {
               get() { return _health; },
               set(val) {
                   // Only block decreases when god mode is on and game is running
                   if (modState.godMode && val < _health && gameState.gameStarted && !gameState.isGameOver) {
                       return; // block the damage
                   }
                   _health = val;
               },
               configurable: true
           });
       })();

       // ==========================================
       // PATCH spawnOneRegularZombie for zombie cap
       // ==========================================
       // We override the MAX_ZOMBIES_ON_GROUND check by replacing the spawn function
       const _origSpawnOne = spawnOneRegularZombie;
       // The cap is enforced inside spawnZombies via Math.min(count, MAX_ZOMBIES_ON_GROUND)
       // and in die() which calls spawnOneRegularZombie if regularZombiesSpawned < total.
       // We patch by overriding the initial spawn count in spawnZombies — we redefine it:
       const _origSpawnZombies = spawnZombies;
       // Rather than redefine (scope issues), we patch via the global window._modZombieLimit
       // which is checked below by monkey-patching the zombie die() respawn logic is already
       // handled — the live cap check uses zombies.length which we enforce separately.
       // The simplest approach: after each spawn, trim excess zombies if over limit.
       function enforceZombieLimit() {
           const limit = window._modZombieLimit || 20;
           while (zombies.length > limit) {
               const z = zombies[zombies.length - 1];
               scene.remove(z.group);
               zombies.splice(zombies.length - 1, 1);
           }
       }
       // Hook into the game loop by patching spawnOneRegularZombie on the window
       const _realSpawnOne = window.spawnOneRegularZombie || spawnOneRegularZombie;



       // ==========================================
       // DAY/NIGHT CYCLE
       // ==========================================
       let dayNightTime = 0;
       const DAY_CYCLE_SPEED = 0.00005;

       function updateDayNight(deltaTime) {
           dayNightTime += deltaTime * DAY_CYCLE_SPEED;
           const dayFactor = (Math.sin(dayNightTime) + 1) / 2; // 0=night, 1=day
           
           // Sky color
           const dayColor = new THREE.Color(0x87CEEB);
           const nightColor = new THREE.Color(0x050515);
           scene.background = dayColor.clone().lerp(nightColor, 1 - dayFactor);
           scene.fog.color.copy(scene.background);
           
           // Light intensity
           sunLight.intensity = 0.2 + dayFactor * 0.8;
           ambientLight.intensity = 0.2 + dayFactor * 0.5;
           hemiLight.intensity = 0.1 + dayFactor * 0.5;
           
           // Night zombies are a bit faster
           if (dayFactor < 0.3 && !gameState.isNight) {
               gameState.isNight = true;
               showNotification('🌙 NIGHT FALLS - ZOMBIES SPEED UP!', '#8866ff');
           } else if (dayFactor >= 0.3 && gameState.isNight) {
               gameState.isNight = false;
               showNotification('☀️ DAWN BREAKS!', '#ffcc44');
           }
       }
       
       gameState.isNight = false;
       
       initGame();
       // ============================================================
       //  HUD LAYOUT EDITOR
       // ============================================================
       (function() {

           // All editable HUD elements: id -> display label
           const HUD_ELEMENTS = {
               'stats':               '❤️ Stats Panel',
               'wave-info':           '🌊 Wave Info',
               'minimap':             '🗺️ Minimap',
               'shoot-button':        '🔴 Fire Button',
               'reload-button':       '🟡 Reload Button',
               'jump-button':         '🟢 Jump Button',
               'weapon-cycle-button': '🔫 Weapon Switch',
               'weapon-hint':         '💬 Weapon Hint',
               'joystick-area':       '🕹️ Joystick',
               'third-person-button': '📷 3rd Person',
               'mod-menu-button':     '⚙️ Mod Menu',
               'hud-settings-button': '🎛️ HUD Settings',
               'shop-button':         '🛒 Shop',
               'coins-display':       '💰 Coins',
               'active-perks-hud':    '✨ Active Perks',
               'streak-display':      '🔥 Streak',
               'fps-counter':         '📊 FPS Counter',
           };

           const STORAGE_KEY = 'hudLayoutV2';
           let hudState = {};          // { id: {x, y, scale, opacity} }
           let selectedId = null;
           let dragHandle = null;      // currently dragged overlay div
           let dragOffX = 0, dragOffY = 0;
           let handles = {};           // id -> overlay div

           // Load saved state
           function loadState() {
               try {
                   const raw = localStorage.getItem(STORAGE_KEY);
                   hudState = raw ? JSON.parse(raw) : {};
               } catch(e) { hudState = {}; }
           }

           function saveState() {
               try { localStorage.setItem(STORAGE_KEY, JSON.stringify(hudState)); } catch(e) {}
           }

           function getDefault(id) {
               const el = document.getElementById(id);
               if (!el) return null;
               const r = el.getBoundingClientRect();
               return { x: r.left, y: r.top, scale: 1, opacity: 1 };
           }

           function getState(id) {
               if (!hudState[id]) {
                   const d = getDefault(id);
                   if (!d) return null;
                   hudState[id] = d;
               }
               return hudState[id];
           }

           // Apply stored position/scale/opacity to a real element
           function applyState(id) {
               const el = document.getElementById(id);
               const s = hudState[id];
               if (!el || !s) return;
               el.style.position  = 'fixed';
               el.style.left      = s.x + 'px';
               el.style.top       = s.y + 'px';
               el.style.right     = 'unset';
               el.style.bottom    = 'unset';
               el.style.transform = `scale(${s.scale})`;
               el.style.transformOrigin = 'top left';
               el.style.opacity   = s.opacity;
           }

           function applyAllStates() {
               Object.keys(hudState).forEach(applyState);
           }

           // Build overlay drag handles for every element
           function buildHandles() {
               // Remove old
               Object.values(handles).forEach(h => h.remove());
               handles = {};

               Object.entries(HUD_ELEMENTS).forEach(([id, label]) => {
                   const el = document.getElementById(id);
                   if (!el) return;

                   const h = document.createElement('div');
                   h.className = 'hud-drag-handle';
                   h.dataset.id = id;

                   const lbl = document.createElement('div');
                   lbl.className = 'hud-drag-handle-label';
                   lbl.textContent = label;
                   h.appendChild(lbl);

                   document.getElementById('hud-editor-overlay').appendChild(h);
                   handles[id] = h;

                   // Click to select
                   h.addEventListener('pointerdown', e => {
                       e.stopPropagation();
                       selectElement(id);
                       startDrag(e, id);
                   });
               });

               positionHandles();
           }

           function positionHandles() {
               Object.entries(handles).forEach(([id, h]) => {
                   const el = document.getElementById(id);
                   if (!el) return;
                   const r = el.getBoundingClientRect();
                   h.style.left   = r.left + 'px';
                   h.style.top    = r.top  + 'px';
                   h.style.width  = r.width  + 'px';
                   h.style.height = r.height + 'px';
               });
           }

           function selectElement(id) {
               selectedId = id;
               // highlight
               Object.values(handles).forEach(h => h.classList.remove('selected'));
               if (handles[id]) handles[id].classList.add('selected');

               // sync dropdown
               const sel = document.getElementById('hud-editor-element-select');
               sel.value = id;

               // sync sliders
               const s = getState(id);
               if (s) {
                   const sizeSlider = document.getElementById('hud-editor-size');
                   sizeSlider.value = Math.round(s.scale * 100);
                   document.getElementById('hud-editor-size-val').textContent = sizeSlider.value + '%';
                   const opSlider = document.getElementById('hud-editor-opacity');
                   opSlider.value = Math.round(s.opacity * 100);
                   document.getElementById('hud-editor-opacity-val').textContent = opSlider.value + '%';
               }
           }

           // ── DRAG ──────────────────────────────────────────────
           function startDrag(e, id) {
               dragHandle = handles[id];
               const r = dragHandle.getBoundingClientRect();
               const clientX = e.touches ? e.touches[0].clientX : e.clientX;
               const clientY = e.touches ? e.touches[0].clientY : e.clientY;
               dragOffX = clientX - r.left;
               dragOffY = clientY - r.top;
               dragHandle.setPointerCapture && dragHandle.setPointerCapture(e.pointerId);
           }

           document.addEventListener('pointermove', e => {
               if (!dragHandle || !selectedId) return;
               e.preventDefault();
               const clientX = e.clientX;
               const clientY = e.clientY;
               const nx = clientX - dragOffX;
               const ny = clientY - dragOffY;

               dragHandle.style.left = nx + 'px';
               dragHandle.style.top  = ny + 'px';

               const s = getState(selectedId);
               if (s) { s.x = nx; s.y = ny; }
               applyState(selectedId);
               saveState();
           }, { passive: false });

           document.addEventListener('pointerup', () => { dragHandle = null; });

           // ── OPEN / CLOSE ──────────────────────────────────────
           function openEditor() {
               loadState();
               applyAllStates();

               // Populate dropdown
               const sel = document.getElementById('hud-editor-element-select');
               sel.innerHTML = '<option value="">— Select Element —</option>';
               Object.entries(HUD_ELEMENTS).forEach(([id, label]) => {
                   const opt = document.createElement('option');
                   opt.value = id; opt.textContent = label;
                   sel.appendChild(opt);
               });

               const overlay = document.getElementById('hud-editor-overlay');
               overlay.classList.add('open');
               overlay.style.pointerEvents = 'all';

               // Pause the game loop exactly like shop/mod menu does
               if (typeof shopOpen !== 'undefined') shopOpen = true;

               // Short delay so elements have rendered positions
               setTimeout(buildHandles, 50);
           }

           function closeEditor() {
               const overlay = document.getElementById('hud-editor-overlay');
               overlay.classList.remove('open');
               overlay.style.pointerEvents = 'none';
               Object.values(handles).forEach(h => h.remove());
               handles = {};

               // Resume the game loop
               if (typeof shopOpen !== 'undefined') shopOpen = false;

               // Save layout and show confirmation
               saveState();
               showSaveConfirm();
           }

           // ── CONTROLS ─────────────────────────────────────────
           // Show a brief "Layout Saved" toast when closing
           function showSaveConfirm() {
               let toast = document.getElementById('hud-save-toast');
               if (!toast) {
                   toast = document.createElement('div');
                   toast.id = 'hud-save-toast';
                   toast.style.cssText = [
                       'position:fixed','top:50%','left:50%',
                       'transform:translate(-50%,-50%)',
                       'background:rgba(0,20,30,0.95)',
                       'border:2px solid #00ccff',
                       'border-radius:12px',
                       'padding:14px 28px',
                       'color:#00ccff',
                       'font-size:16px',
                       'font-weight:bold',
                       'text-shadow:0 0 10px #00ccff',
                       'box-shadow:0 0 20px rgba(0,204,255,0.4)',
                       'z-index:400',
                       'pointer-events:none',
                       'opacity:0',
                       'transition:opacity 0.3s'
                   ].join(';');
                   toast.textContent = '✔ HUD Layout Saved';
                   document.body.appendChild(toast);
               }
               toast.style.opacity = '1';
               clearTimeout(toast._t);
               toast._t = setTimeout(() => { toast.style.opacity = '0'; }, 1800);
           }

           // Make the editor window itself draggable
           (function() {
               const panel = document.getElementById('hud-editor-panel');
               const header = document.getElementById('hud-editor-panel-header');
               let pdx=0, pdy=0, draggingPanel=false;
               header.addEventListener('pointerdown', e => {
                   draggingPanel = true;
                   const r = panel.getBoundingClientRect();
                   pdx = e.clientX - r.left;
                   pdy = e.clientY - r.top;
                   header.setPointerCapture(e.pointerId);
                   e.stopPropagation();
               });
               header.addEventListener('pointermove', e => {
                   if (!draggingPanel) return;
                   panel.style.transform = 'none';
                   panel.style.left = (e.clientX - pdx) + 'px';
                   panel.style.top  = (e.clientY - pdy) + 'px';
               });
               header.addEventListener('pointerup', () => { draggingPanel = false; });
           })();

           document.getElementById('hud-settings-button').addEventListener('click', openEditor);
           document.getElementById('hud-editor-close-btn').addEventListener('click', closeEditor);

           document.getElementById('hud-editor-element-select').addEventListener('change', function() {
               if (this.value) selectElement(this.value);
           });

           document.getElementById('hud-editor-size').addEventListener('input', function() {
               document.getElementById('hud-editor-size-val').textContent = this.value + '%';
               if (!selectedId) return;
               const s = getState(selectedId);
               if (!s) return;
               s.scale = parseInt(this.value) / 100;
               applyState(selectedId);
               // reposition handle to match new size
               setTimeout(() => positionHandles(), 10);
               saveState();
           });

           document.getElementById('hud-editor-opacity').addEventListener('input', function() {
               document.getElementById('hud-editor-opacity-val').textContent = this.value + '%';
               if (!selectedId) return;
               const s = getState(selectedId);
               if (!s) return;
               s.opacity = parseInt(this.value) / 100;
               applyState(selectedId);
               saveState();
           });

           document.getElementById('hud-editor-reset-btn').addEventListener('click', () => {
               if (!selectedId) return;
               delete hudState[selectedId];
               saveState();
               const el = document.getElementById(selectedId);
               if (el) {
                   el.style.position = '';
                   el.style.left = '';
                   el.style.top = '';
                   el.style.right = '';
                   el.style.bottom = '';
                   el.style.transform = '';
                   el.style.transformOrigin = '';
                   el.style.opacity = '';
               }
               setTimeout(() => {
                   positionHandles();
                   selectElement(selectedId);
               }, 30);
           });

           document.getElementById('hud-editor-reset-all-btn').addEventListener('click', () => {
               hudState = {};
               saveState();
               Object.keys(HUD_ELEMENTS).forEach(id => {
                   const el = document.getElementById(id);
                   if (!el) return;
                   el.style.position = '';
                   el.style.left = '';
                   el.style.top = '';
                   el.style.right = '';
                   el.style.bottom = '';
                   el.style.transform = '';
                   el.style.transformOrigin = '';
                   el.style.opacity = '';
               });
               setTimeout(buildHandles, 30);
           });

           // Apply saved layout on load
           window.addEventListener('load', () => {
               loadState();
               applyAllStates();
           });

       })();

