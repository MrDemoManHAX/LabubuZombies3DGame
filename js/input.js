// Touch & keyboard input controls
       // ==========================================
       // CONTROLS
       // ==========================================
       const moveState = {
           joystickActive: false,
           joystickX: 0,
           joystickY: 0
       };

       const joystickArea = document.getElementById('joystick-area');
       const joystickStick = document.getElementById('joystick-stick');
       const joystickBase  = document.getElementById('joystick-base');
       let joystickCenter = { x: 0, y: 0 };
       let joystickTouchId = null;

       function updateJoystickCenter() {
           const rect = joystickArea.getBoundingClientRect();
           joystickCenter = {
               x: rect.left + rect.width / 2,
               y: rect.top + rect.height / 2
           };
       }
       updateJoystickCenter();

       // Double-tap joystick = 180 degree turn
       let _joystickLastTap = 0;
       joystickArea.addEventListener('touchstart', (e) => {
           e.preventDefault();
           e.stopPropagation();
           moveState.joystickActive = true;
           joystickTouchId = e.touches[0].identifier;
           updateJoystickCenter();

           const now = Date.now();
           if (now - _joystickLastTap < 300) {
               // Double tap — snap 180 degrees
               lookState.rotationY += Math.PI;
               camera.rotation.y = lookState.rotationY;
               // Brief flash on joystick to confirm
               joystickBase.style.background = 'radial-gradient(circle, rgba(0,200,255,0.7), rgba(0,100,200,0.5))';
               setTimeout(() => {
                   joystickBase.style.background = '';
               }, 200);
               _joystickLastTap = 0;
           } else {
               _joystickLastTap = now;
           }
       }, { passive: false });

       joystickArea.addEventListener('touchmove', (e) => {
           e.preventDefault();
           e.stopPropagation();
           if (!moveState.joystickActive) return;

           let touch = null;
           for (let i = 0; i < e.touches.length; i++) {
               if (e.touches[i].identifier === joystickTouchId) {
                   touch = e.touches[i];
                   break;
               }
           }
           if (!touch) return;

           const deltaX = touch.clientX - joystickCenter.x;
           const deltaY = touch.clientY - joystickCenter.y;
           
           const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
           const maxDistance = 40;
           
           if (distance > maxDistance) {
               const angle = Math.atan2(deltaY, deltaX);
               moveState.joystickX = Math.cos(angle) * maxDistance;
               moveState.joystickY = Math.sin(angle) * maxDistance;
           } else {
               moveState.joystickX = deltaX;
               moveState.joystickY = deltaY;
           }
           
           joystickStick.style.transform = `translate(calc(-50% + ${moveState.joystickX}px), calc(-50% + ${moveState.joystickY}px))`;
       }, { passive: false });

       joystickArea.addEventListener('touchend', (e) => {
           e.preventDefault();
           moveState.joystickActive = false;
           moveState.joystickX = 0;
           moveState.joystickY = 0;
           joystickTouchId = null;
           joystickStick.style.transform = 'translate(-50%, -50%)';
       }, { passive: false });

       // Shooting
       const shootButton = document.getElementById('shoot-button');
       let isShooting = false;
       let lastShootTime = 0;

       shootButton.addEventListener('touchstart', (e) => {
           e.preventDefault();
           e.stopPropagation();
           isShooting = true;
       }, { passive: false });

       shootButton.addEventListener('touchend', (e) => {
           e.preventDefault();
           isShooting = false;
       }, { passive: false });

       function shoot() {
           const currentWeapon = getCurrentWeapon();
           const weaponDef = getCurrentWeaponDef();
           
           if (gameState.isReloading || (!modState.unlimitedAmmo && currentWeapon.ammo <= 0) || gameState.isGameOver) return;

           const now = Date.now();
           if (now - lastShootTime < weaponDef.fireRate / (perks.doubleTap.active ? 2 : 1)) return;
           lastShootTime = now;

           if (!modState.unlimitedAmmo) currentWeapon.ammo--;
           if (modState.noReload && currentWeapon.ammo <= 0) {
               currentWeapon.ammo = getCurrentWeaponDef().clipSize;
           }
           updateUI();

           muzzleFlash.color.setHex(weaponDef.name === 'FREEZE' ? 0x00ffff : (weaponDef.explosionColor || 0xffaa00));
           muzzleFlash.visible = true;
           setTimeout(() => muzzleFlash.visible = false, 50);

           weaponGroup.position.z += weaponDef.recoil;
           weaponGroup.rotation.x -= weaponDef.recoil * 0.5;
           setTimeout(() => {
               weaponGroup.position.z = -0.5;
               weaponGroup.rotation.x = 0;
           }, 60);

           if (weaponDef.projectile) {
               const direction = new THREE.Vector3(0, 0, -1);
               direction.applyQuaternion(camera.quaternion);
               const startPos = camera.position.clone().add(direction.clone().multiplyScalar(1));
               new Projectile(startPos, direction, currentWeapon.type);
           } else {
               const pellets = weaponDef.pellets || 1;
               
               for (let p = 0; p < pellets; p++) {
                   const spread = weaponDef.spread || 0;
                   const spreadX = (Math.random() - 0.5) * spread;
                   const spreadY = (Math.random() - 0.5) * spread;
                   
                   const raycaster = new THREE.Raycaster();
                   raycaster.setFromCamera(new THREE.Vector2(spreadX, spreadY), camera);

                   // Collect zombie meshes
                   const hitTargets = [];
                   zombies.forEach(z => {
                       if (z.health > 0 && z.group) hitTargets.push(z.group);
                   });

                   // Collect building meshes to block bullets
                   const wallTargets = [];
                   buildings.forEach(b => wallTargets.push(b.mesh));

                   const zombieHits = raycaster.intersectObjects(hitTargets, true);
                   const wallHits = raycaster.intersectObjects(wallTargets, true);

                   // Only register zombie hit if no wall is closer
                   const closestWall = wallHits.length > 0 ? wallHits[0].distance : Infinity;

                   if (zombieHits.length > 0 && zombieHits[0].distance < closestWall) {
                       const hitObject = zombieHits[0].object;
                       const zombie = hitObject.userData.zombie;

                       if (zombie && zombie.health > 0) {
                           const damage = weaponDef.damage * (perks.hollowPoints.active ? 1.25 : 1);
                           const isFreeze = weaponDef.name === 'FREEZE';
                           zombie.takeDamage(damage, isFreeze);
                           createHitEffect(zombieHits[0].point);
                       }
                   }
               }
           }

           if (!modState.unlimitedAmmo && currentWeapon.ammo === 0 && currentWeapon.totalAmmo > 0) {
               reload();
           }
       }

       // Reload
       const reloadButton = document.getElementById('reload-button');
       reloadButton.addEventListener('touchstart', (e) => {
           e.preventDefault();
           reload();
       }, { passive: false });

       function reload() {
           const currentWeapon = getCurrentWeapon();
           const weaponDef = getCurrentWeaponDef();
           
           if (modState.unlimitedAmmo || modState.noReload) return;
           if (gameState.isReloading || currentWeapon.totalAmmo === 0 || currentWeapon.ammo === weaponDef.clipSize) return;

           gameState.isReloading = true;
           reloadButton.style.opacity = '0.5';
           reloadButton.textContent = '...';

           setTimeout(() => {
               const ammoNeeded = weaponDef.clipSize - currentWeapon.ammo;
               const ammoToReload = Math.min(ammoNeeded, currentWeapon.totalAmmo);
               
               currentWeapon.ammo += ammoToReload;
               currentWeapon.totalAmmo -= ammoToReload;
               gameState.isReloading = false;
               reloadButton.style.opacity = '1';
               reloadButton.textContent = 'RELOAD';
               
               updateUI();
           }, 1500);
       }

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
       // PLAYER MOVEMENT
       // ==========================================
       function updatePlayer(deltaTime) {
           if (gameState.isGameOver) return;
           
           const isSprinting = keys['ShiftLeft'] || keys['ShiftRight'];
           const speed = CONFIG.PLAYER_SPEED * (isSprinting ? 1.7 : 1) * getSpeedMultiplier();
           const movement = new THREE.Vector3();

           if (moveState.joystickActive) {
               const forward = new THREE.Vector3(0, 0, -1);
               forward.applyQuaternion(camera.quaternion);
               forward.y = 0;
               forward.normalize();

               const right = new THREE.Vector3(1, 0, 0);
               right.applyQuaternion(camera.quaternion);
               right.y = 0;
               right.normalize();

               const normalizedX = moveState.joystickX / 40;
               const normalizedY = moveState.joystickY / 40;

               movement.add(forward.clone().multiplyScalar(-normalizedY * speed));
               movement.add(right.clone().multiplyScalar(normalizedX * speed));
           }

           // WASD keyboard movement
           if (keys['KeyW'] || keys['ArrowUp']) {
               const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
               forward.y = 0; forward.normalize();
               movement.add(forward.multiplyScalar(speed));
           }
           if (keys['KeyS'] || keys['ArrowDown']) {
               const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion);
               forward.y = 0; forward.normalize();
               movement.add(forward.multiplyScalar(speed));
           }
           if (keys['KeyA'] || keys['ArrowLeft']) {
               const right = new THREE.Vector3(-1, 0, 0).applyQuaternion(camera.quaternion);
               right.y = 0; right.normalize();
               movement.add(right.multiplyScalar(speed));
           }
           if (keys['KeyD'] || keys['ArrowRight']) {
               const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
               right.y = 0; right.normalize();
               movement.add(right.multiplyScalar(speed));
           }

           const newPos = camera.position.clone().add(movement);

           // Helper: check if a position is inside any building (respects height so you can fly over)
           function insideBuilding(pos) {
               for (const b of buildings) {
                   const halfW = b.width / 2 + 0.4;
                   const halfD = b.depth / 2 + 0.4;
                   const buildingTop = b.height + 0.4;
                   if (pos.x > b.x - halfW && pos.x < b.x + halfW &&
                       pos.z > b.z - halfD && pos.z < b.z + halfD &&
                       pos.y < buildingTop) return true;
               }
               return false;
           }

           // Wall sliding: try full move, then X-only, then Z-only
           if (!insideBuilding(newPos) && !insideTree(newPos)) {
               camera.position.add(movement);
           } else {
               const slideX = camera.position.clone();
               slideX.x += movement.x;
               if (!insideBuilding(slideX) && !insideTree(slideX)) {
                   camera.position.x += movement.x;
               } else {
                   const slideZ = camera.position.clone();
                   slideZ.z += movement.z;
                   if (!insideBuilding(slideZ) && !insideTree(slideZ)) {
                       camera.position.z += movement.z;
                   }
               }
           }

           function insideTree(pos) {
               for (const tree of trees) {
                   const dx = pos.x - tree.position.x;
                   const dz = pos.z - tree.position.z;
                   if (Math.sqrt(dx*dx + dz*dz) < 1) return true;
               }
               return false;
           }

           camera.position.x = Math.max(-70, Math.min(70, camera.position.x));
           camera.position.z = Math.max(-70, Math.min(70, camera.position.z));

           // Jump / Fly physics
           const onGround = camera.position.y <= CONFIG.PLAYER_HEIGHT + 0.05;

           // Jetpack thrust: held button consumes fuel and pushes up
           if (gameState.flyUnlocked && gameState.flyHeld && gameState.flyFuel > 0) {
               gameState.jumpVy = Math.min(gameState.jumpVy + 0.025, 0.25);
               if (!modState.jetpack) gameState.flyFuel = Math.max(0, gameState.flyFuel - 0.0045);
               else gameState.flyFuel = 100;
               updateFuelBar();
           }

           // Apply vertical velocity + gravity
           if (gameState.jumpVy > 0 || camera.position.y > CONFIG.PLAYER_HEIGHT) {
               camera.position.y += gameState.jumpVy;
               gameState.jumpVy -= 0.013; // gravity

               // Check if landing on top of a building roof
               let landedOnRoof = false;
               for (const b of buildings) {
                   const halfW = b.width / 2 + 0.4;
                   const halfD = b.depth / 2 + 0.4;
                   const roofY = b.height + CONFIG.PLAYER_HEIGHT;
                   if (camera.position.x > b.x - halfW && camera.position.x < b.x + halfW &&
                       camera.position.z > b.z - halfD && camera.position.z < b.z + halfD &&
                       camera.position.y <= roofY && gameState.jumpVy <= 0) {
                       camera.position.y = roofY;
                       gameState.jumpVy = 0;
                       landedOnRoof = true;
                       break;
                   }
               }

               if (!landedOnRoof && camera.position.y <= CONFIG.PLAYER_HEIGHT) {
                   camera.position.y = CONFIG.PLAYER_HEIGHT;
                   gameState.jumpVy = 0;
               }
           }

           // Jump impulse (only while jetpack locked, must be on ground)
           if (!gameState.flyUnlocked && gameState.jumpRequested && onGround && gameState.jumpVy === 0) {
               gameState.jumpVy = 0.20;
               gameState.jumpRequested = false;
           }

           checkDoorTeleport(camera.position);
       }

       // ==========================================
       // ==========================================
       // LOOK CONTROLS
       // ==========================================
       let lookState = {
           isLooking: false,
           lastX: 0,
           lastY: 0,
           rotationX: 0,
           rotationY: 0,
           touchId: null
       };

       canvas.addEventListener('touchstart', (e) => {
           for (let i = 0; i < e.changedTouches.length; i++) {
               const touch = e.changedTouches[i];
               if (touch.target === canvas) {
                   lookState.isLooking = true;
                   lookState.touchId = touch.identifier;
                   lookState.lastX = touch.clientX;
                   lookState.lastY = touch.clientY;
                   break;
               }
           }
       }, { passive: true });

       canvas.addEventListener('touchmove', (e) => {
           if (!lookState.isLooking) return;
           
           let touch = null;
           for (let i = 0; i < e.touches.length; i++) {
               if (e.touches[i].identifier === lookState.touchId) {
                   touch = e.touches[i];
                   break;
               }
           }
           if (!touch) return;

           const deltaX = touch.clientX - lookState.lastX;
           const deltaY = touch.clientY - lookState.lastY;

           // Any manual look input breaks the auto-aim lock so player regains control
           if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
               if (autoAimState.lockedZombie) {
                   autoAimState.lockedZombie = null;
                   autoAimRing.classList.remove('locked');
               }
           }

           lookState.rotationY -= deltaX * CONFIG.LOOK_SENSITIVITY_X;
           lookState.rotationX -= deltaY * CONFIG.LOOK_SENSITIVITY_Y;
           lookState.rotationX = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, lookState.rotationX));

           camera.rotation.order = 'YXZ';
           camera.rotation.y = lookState.rotationY;
           camera.rotation.x = lookState.rotationX;

           lookState.lastX = touch.clientX;
           lookState.lastY = touch.clientY;
       }, { passive: true });

       canvas.addEventListener('touchend', (e) => {
           for (let i = 0; i < e.changedTouches.length; i++) {
               if (e.changedTouches[i].identifier === lookState.touchId) {
                   lookState.isLooking = false;
                   lookState.touchId = null;
                   break;
               }
           }
       }, { passive: true });

       // ==========================================