// Weapon model, drops system, weapon management, projectiles
       // ==========================================
       // WEAPON MODEL
       // ==========================================
       // Declared early so updateWeaponModel can safely reference it at any time
       var thirdPersonState = {
           enabled: false,
           worldPos: null, // initialised to a Vector3 below after THREE is ready
           DISTANCE: 4.5,
           HEIGHT: 1.8
       };

       let weaponGroup = new THREE.Group();
       camera.add(weaponGroup);
       scene.add(camera);

       function updateWeaponModel() {
           while(weaponGroup.children.length > 0) {
               weaponGroup.remove(weaponGroup.children[0]);
           }

           const weaponDef = getCurrentWeaponDef();
           
           const bodyGeo = new THREE.BoxGeometry(0.15, 0.18, 0.7);
           const bodyMat = new THREE.MeshStandardMaterial({ color: weaponDef.color });
           const body = new THREE.Mesh(bodyGeo, bodyMat);
           weaponGroup.add(body);

           const barrelGeo = new THREE.BoxGeometry(0.08, 0.08, 0.4);
           const barrelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
           const barrel = new THREE.Mesh(barrelGeo, barrelMat);
           barrel.position.set(0, 0.03, -0.45);
           weaponGroup.add(barrel);

           const gripGeo = new THREE.BoxGeometry(0.08, 0.2, 0.12);
           const gripMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
           const grip = new THREE.Mesh(gripGeo, gripMat);
           grip.position.set(0, -0.15, 0.15);
           weaponGroup.add(grip);

           if (weaponDef.name === 'ROCKET') {
               const tubGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8);
               const tubMat = new THREE.MeshStandardMaterial({ color: 0x2a4a2a });
               const tub = new THREE.Mesh(tubGeo, tubMat);
               tub.rotation.x = Math.PI / 2;
               tub.position.set(0, 0.12, -0.25);
               weaponGroup.add(tub);
               
               const tipGeo = new THREE.ConeGeometry(0.05, 0.15, 8);
               const tipMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0x441100 });
               const tip = new THREE.Mesh(tipGeo, tipMat);
               tip.rotation.x = -Math.PI / 2;
               tip.position.set(0, 0.12, -0.6);
               weaponGroup.add(tip);
           }
           
           if (weaponDef.name === 'GRENADE') {
               const tubGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8);
               const tubMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
               const tub = new THREE.Mesh(tubGeo, tubMat);
               tub.rotation.x = Math.PI / 2;
               tub.position.set(0, 0.1, -0.3);
               weaponGroup.add(tub);
               
               const grenadeGeo = new THREE.SphereGeometry(0.06, 8, 8);
               const grenadeMat = new THREE.MeshStandardMaterial({ color: 0x556600, emissive: 0x222200 });
               const grenade = new THREE.Mesh(grenadeGeo, grenadeMat);
               grenade.position.set(0, 0.1, -0.55);
               weaponGroup.add(grenade);
           }

           if (weaponDef.name === 'FREEZE') {
               const tankGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.25, 8);
               const tankMat = new THREE.MeshStandardMaterial({ color: 0x00FFFF, transparent: true, opacity: 0.7 });
               const tank = new THREE.Mesh(tankGeo, tankMat);
               tank.position.set(0, 0.15, 0);
               weaponGroup.add(tank);
           }

           if (weaponDef.name === 'SHOTGUN') {
               const barrel2 = new THREE.Mesh(barrelGeo.clone(), barrelMat.clone());
               barrel2.position.set(0.06, 0.03, -0.45);
               weaponGroup.add(barrel2);
               
               const barrel3 = new THREE.Mesh(barrelGeo.clone(), barrelMat.clone());
               barrel3.position.set(-0.06, 0.03, -0.45);
               weaponGroup.add(barrel3);
           }

           // Re-apply correct parent and position based on view mode
           if (thirdPersonState.enabled) {
               if (typeof playerBodyGroup !== 'undefined' && weaponGroup.parent !== playerBodyGroup) {
                   camera.remove(weaponGroup);
                   playerBodyGroup.add(weaponGroup);
               }
               weaponGroup.position.set(0.35, 0.6, 0.25);
               weaponGroup.rotation.set(0, Math.PI, 0);
           } else {
               weaponGroup.position.set(0.3, -0.25, -0.5);
               weaponGroup.rotation.set(0, 0, 0);
           }
       }

       updateWeaponModel();

       const muzzleFlash = new THREE.PointLight(0xffaa00, 3, 5);
       muzzleFlash.position.set(0.3, -0.2, -1.2);
       muzzleFlash.visible = false;
       camera.add(muzzleFlash);

       // ==========================================
       // DROPS SYSTEM
       // ==========================================
       const drops = [];

       class Drop {
           constructor(x, z, type) {
               this.type = type;
               this.collected = false;
               
               let color, emissive, size;
               switch(type) {
                   case 'ammo':
                       color = 0xffcc00;
                       emissive = 0x554400;
                       size = 0.4;
                       break;
                   case 'health':
                       color = 0x00ff00;
                       emissive = 0x005500;
                       size = 0.5;
                       break;
                   case 'armor':
                       color = 0x0088ff;
                       emissive = 0x003366;
                       size = 0.5;
                       break;
                   case 'rocketLauncher':
                   case 'grenadeLauncher':
                   case 'freezeGun':
                   case 'shotgun':
                       color = 0xff00ff;
                       emissive = 0x550055;
                       size = 0.7;
                       break;
               }

               const geometry = new THREE.BoxGeometry(size, size, size);
               const material = new THREE.MeshStandardMaterial({ 
                   color: color,
                   emissive: emissive,
                   emissiveIntensity: 0.5
               });
               
               this.mesh = new THREE.Mesh(geometry, material);
               this.mesh.position.set(x, size / 2 + 0.1, z);
               this.mesh.castShadow = false;
               this.mesh.receiveShadow = false;
               
               const glowGeo = new THREE.BoxGeometry(size * 1.3, size * 1.3, size * 1.3);
               const glowMat = new THREE.MeshBasicMaterial({ 
                   color: color, 
                   transparent: true, 
                   opacity: 0.3 
               });
               this.glow = new THREE.Mesh(glowGeo, glowMat);
               this.mesh.add(this.glow);

               // Enforce 10-item cap: remove oldest drop first
               while (drops.length >= 10) {
                   drops[0].removeSelf();
               }

               scene.add(this.mesh);
               drops.push(this);
               this.spawnTime = Date.now();
           }

           removeSelf() {
               this.collected = true;
               scene.remove(this.mesh);
               const index = drops.indexOf(this);
               if (index > -1) drops.splice(index, 1);
           }

           update(time) {
               // Items stay still — no bobbing or rotating
           }

           checkPickup(playerPos) {
               if (this.collected) return;
               
               const distance = this.mesh.position.distanceTo(playerPos);
               if (distance < 1.5) {
                   this.pickup();
               }
           }

           pickup() {
               this.collected = true;
               scene.remove(this.mesh);
               const index = drops.indexOf(this);
               if (index > -1) drops.splice(index, 1);

               switch(this.type) {
                   case 'ammo':
                       const ammoMult = perks.doublePickup.active ? 2 : 1;
                       getCurrentWeapon().totalAmmo += getCurrentWeaponDef().clipSize * ammoMult;
                       showNotification(ammoMult > 1 ? '+DOUBLE AMMO 🎒' : '+AMMO', '#ffcc00');
                       break;
                   case 'health':
                       const hpMult = perks.doublePickup.active ? 2 : 1;
                       gameState.health = Math.min(CONFIG.MAX_HEALTH, gameState.health + 25 * hpMult);
                       showNotification(hpMult > 1 ? '+50 HEALTH 🎒' : '+25 HEALTH', '#00ff00');
                       break;
                   case 'armor':
                       const armMult = perks.doublePickup.active ? 2 : 1;
                       gameState.armor = Math.min(CONFIG.MAX_ARMOR, gameState.armor + 25 * armMult);
                       showNotification(armMult > 1 ? '+50 ARMOR 🎒' : '+25 ARMOR', '#0088ff');
                       break;
                   case 'rocketLauncher':
                   case 'grenadeLauncher':
                   case 'freezeGun':
                   case 'shotgun':
                       addWeapon(this.type);
                       break;
               }

               updateUI();
               updateHealthBar();
           }
       }

       function spawnDrop(x, z, isBoss = false, isSuperBoss = false) {
           if (isSuperBoss) {
               const specialWeapons = ['rocketLauncher', 'grenadeLauncher', 'freezeGun', 'shotgun'];
               specialWeapons.forEach((w, i) => {
                   setTimeout(() => new Drop(x + (i - 1.5) * 1.5, z, w), i * 100);
               });
               new Drop(x, z + 2, 'health');
               new Drop(x, z - 2, 'armor');
               if (!gameState.flyUnlocked) {
                   gameState.flyUnlocked = true;
                   gameState.flyFuel = 100;
                   const jBtn = document.getElementById('jump-button');
                   jBtn.textContent = '🚀 FLY';
                   jBtn.classList.add('fly-mode');
                   document.getElementById('fuel-bar').style.display = 'block';
                   updateFuelBar();
                   showNotification('🚀 JETPACK UNLOCKED! Hold FLY to soar!', '#0af');
               } else {
                   gameState.flyFuel = 100;
                   updateFuelBar();
                   showNotification('⛽ JETPACK REFUELLED!', '#0af');
               }
               showNotification('💀 LEGENDARY DROPS! 💀', '#ff00ff');
               return;
           }
           if (isBoss) {
               const specialWeapons = ['rocketLauncher', 'grenadeLauncher', 'freezeGun', 'shotgun'];
               const randomWeapon = specialWeapons[Math.floor(Math.random() * specialWeapons.length)];
               new Drop(x, z, randomWeapon);
               showNotification('⭐ SPECIAL WEAPON DROP! ⭐', '#ff00ff');
               return;
           }

           const rand = Math.random();
           if (rand < CONFIG.DROP_CHANCE_AMMO) {
               new Drop(x, z, 'ammo');
           } else if (rand < CONFIG.DROP_CHANCE_AMMO + CONFIG.DROP_CHANCE_HEALTH) {
               new Drop(x, z, 'health');
           } else if (rand < CONFIG.DROP_CHANCE_AMMO + CONFIG.DROP_CHANCE_HEALTH + CONFIG.DROP_CHANCE_ARMOR) {
               new Drop(x, z, 'armor');
           }
       }

       // ==========================================
       // WEAPON MANAGEMENT
       // ==========================================
       function addWeapon(weaponType) {
           const existingIndex = gameState.weapons.findIndex(w => w.type === weaponType);
           if (existingIndex !== -1) {
               gameState.weapons[existingIndex].totalAmmo += WEAPONS[weaponType].maxAmmo;
               showNotification(`+${WEAPONS[weaponType].name} AMMO`, '#ff00ff');
               updateWeaponCycleButton();
               return;
           }

           if (gameState.weapons.length < gameState.maxWeaponSlots) {
               gameState.weapons.push({
                   type: weaponType,
                   ammo: WEAPONS[weaponType].clipSize,
                   totalAmmo: WEAPONS[weaponType].maxAmmo
               });
               showNotification(`NEW WEAPON: ${WEAPONS[weaponType].name}!`, '#ff00ff');
               updateWeaponCycleButton();
           } else {
               gameState.weapons[gameState.currentWeaponIndex] = {
                   type: weaponType,
                   ammo: WEAPONS[weaponType].clipSize,
                   totalAmmo: WEAPONS[weaponType].maxAmmo
               };
               showNotification(`REPLACED: ${WEAPONS[weaponType].name}!`, '#ff00ff');
               updateWeaponModel();
               updateWeaponCycleButton();
           }
       }

       function cycleWeapon() {
           if (gameState.weapons.length <= 1) return;
           
           gameState.isReloading = false;
           gameState.currentWeaponIndex = (gameState.currentWeaponIndex + 1) % gameState.weapons.length;
           
           updateWeaponModel();
           updateWeaponCycleButton();
           updateUI();
           
           const btn = document.getElementById('weapon-cycle-button');
           btn.classList.remove('weapon-switching');
           void btn.offsetWidth;
           btn.classList.add('weapon-switching');
           
           const weaponDef = getCurrentWeaponDef();
           let extraInfo = '';
           if (weaponDef.explosionRadius) {
               extraInfo = ` (💥${weaponDef.explosionRadius}m)`;
           }
           showNotification(`${weaponDef.icon} ${weaponDef.name}${extraInfo}`, '#0f0');
       }

       function updateWeaponCycleButton() {
           const weaponDef = getCurrentWeaponDef();
           
           document.getElementById('weapon-icon').textContent = weaponDef.icon;
           document.getElementById('weapon-name').textContent = weaponDef.name;
           document.getElementById('weapon-slot-indicator').textContent = 
               `${gameState.currentWeaponIndex + 1}/${gameState.weapons.length}`;
           
           const btn = document.getElementById('weapon-cycle-button');
           let borderColor = '#0f0';
           
           switch(getCurrentWeapon().type) {
               case 'rocketLauncher': borderColor = '#ff4400'; break;
               case 'grenadeLauncher': borderColor = '#ffcc00'; break;
               case 'freezeGun': borderColor = '#00ffff'; break;
               case 'shotgun': borderColor = '#8B4513'; break;
           }
           
           btn.style.borderColor = borderColor;
           btn.style.boxShadow = `0 0 15px ${borderColor}40`;
           document.getElementById('weapon-name').style.color = borderColor;
           document.getElementById('weapon-name').style.textShadow = `0 0 5px ${borderColor}`;
       }

       const weaponCycleButton = document.getElementById('weapon-cycle-button');
       
       weaponCycleButton.addEventListener('touchstart', (e) => {
           e.preventDefault();
           e.stopPropagation();
           cycleWeapon();
       }, { passive: false });

       weaponCycleButton.addEventListener('click', (e) => {
           e.preventDefault();
           cycleWeapon();
       });

       // ==========================================
       // PROJECTILES
       // ==========================================
       const projectiles = [];

       class Projectile {
           constructor(position, direction, weaponType) {
               this.weaponType = weaponType;
               this.weaponDef = WEAPONS[weaponType];
               this.direction = direction.clone().normalize();
               this.speed = this.weaponDef.projectileSpeed || 0.5;
               this.alive = true;
               this.age = 0;

               const size = weaponType === 'rocketLauncher' ? 0.3 : 0.2;
               const geometry = new THREE.SphereGeometry(size, 8, 8);
               const color = this.weaponDef.explosionColor || 0xff4400;
               const material = new THREE.MeshBasicMaterial({ color: color });
               
               this.mesh = new THREE.Mesh(geometry, material);
               this.mesh.position.copy(position);
               
               this.light = new THREE.PointLight(color, 3, 8);
               this.mesh.add(this.light);
               
               scene.add(this.mesh);
               projectiles.push(this);
           }

           update(deltaTime) {
               if (!this.alive) return;

               this.age += deltaTime;
               
               const movement = this.direction.clone().multiplyScalar(this.speed);
               
               if (this.weaponDef.arc) {
                   movement.y -= this.age * 0.00008;
               }

               // Store previous position for sweep check
               const prevPos = this.mesh.position.clone();
               this.mesh.position.add(movement);

               if (this.mesh.position.y < 0.2) {
                   this.explode();
                   return;
               }

               // Swept zombie collision — check along the path this frame, not just endpoint
               // Scale hit sphere by zombie sizeMult so superboss (5x) is always hittable
               for (const zombie of zombies) {
                   if (zombie.health <= 0) continue;
                   const sizeMult = zombie.sizeMult || 1;
                   const hitRadius = 1.2 * sizeMult;
                   // Check against zombie body centre scaled by size
                   const zombieCenter = zombie.group.position.clone();
                   zombieCenter.y = 1.0 * sizeMult;
                   // Find closest point on segment prevPos->currentPos to zombieCenter
                   const seg = this.mesh.position.clone().sub(prevPos);
                   const segLen = seg.length();
                   if (segLen < 0.001) continue;
                   const segDir = seg.clone().divideScalar(segLen);
                   const toCentre = zombieCenter.clone().sub(prevPos);
                   const t = Math.max(0, Math.min(segLen, toCentre.dot(segDir)));
                   const closest = prevPos.clone().add(segDir.clone().multiplyScalar(t));
                   if (closest.distanceTo(zombieCenter) < hitRadius) {
                       this.explode();
                       return;
                   }
               }

               for (const buildingData of buildings) {
                   const box = new THREE.Box3();
                   box.setFromCenterAndSize(
                       new THREE.Vector3(buildingData.x, buildingData.height / 2, buildingData.z),
                       new THREE.Vector3(buildingData.width, buildingData.height, buildingData.depth)
                   );
                   if (box.containsPoint(this.mesh.position)) {
                       this.explode();
                       return;
                   }
               }

               if (this.age > 5000) {
                   this.destroy();
               }
           }

           explode() {
               const radius = this.weaponDef.explosionRadius;
               const damage = this.weaponDef.damage;
               const pos = this.mesh.position.clone();
               const color = this.weaponDef.explosionColor || 0xff4400;

               let zombiesHit = 0;
               // Hit EVERY zombie in radius — no cap, account for boss/superboss body size
               for (const zombie of zombies) {
                   if (zombie.health <= 0) continue;
                   // Scale hit radius by zombie size so big bosses are easier to hit
                   const zombieBodyRadius = 0.6 * (zombie.sizeMult || 1);
                   const effectiveRadius = radius + zombieBodyRadius;
                   // Check distance to zombie body centre
                   const zombieCenter = zombie.group.position.clone();
                   zombieCenter.y = 1.0 * (zombie.sizeMult || 1);
                   const dist = pos.distanceTo(zombieCenter);
                   if (dist < effectiveRadius) {
                       const falloff = 1 - Math.max(0, (dist - zombieBodyRadius) / radius);
                       zombie.takeDamage(damage * falloff);
                       zombiesHit++;
                   }
               }

               if (zombiesHit > 0) {
                   showNotification(`💥 ${zombiesHit} HIT!`, '#ff6600');
               }

               createExplosion(pos.x, pos.y, pos.z, radius, color);
               this.destroy();
           }

           destroy() {
               this.alive = false;
               scene.remove(this.mesh);
               const index = projectiles.indexOf(this);
               if (index > -1) projectiles.splice(index, 1);
           }
       }

       function createExplosion(x, y, z, radius, color) {
           const explosionLight = new THREE.PointLight(color, 8, radius * 1.5);
           explosionLight.position.set(x, y + 1, z);
           scene.add(explosionLight);

           const explosionGeo = new THREE.SphereGeometry(radius * 0.3, 16, 16);
           const explosionMat = new THREE.MeshBasicMaterial({ 
               color: color, 
               transparent: true, 
               opacity: 0.8 
           });
           const explosionSphere = new THREE.Mesh(explosionGeo, explosionMat);
           explosionSphere.position.set(x, y + 0.5, z);
           scene.add(explosionSphere);

           const ringGeo = new THREE.RingGeometry(0.1, radius, 32);
           const ringMat = new THREE.MeshBasicMaterial({ 
               color: color, 
               transparent: true, 
               opacity: 0.5,
               side: THREE.DoubleSide
           });
           const ring = new THREE.Mesh(ringGeo, ringMat);
           ring.rotation.x = -Math.PI / 2;
           ring.position.set(x, 0.1, z);
           scene.add(ring);

           let scale = 0.3;
           let opacity = 0.8;
           let lightIntensity = 8;
           
           const animateExplosion = () => {
               scale += 0.15;
               opacity -= 0.04;
               lightIntensity -= 0.4;
               
               explosionSphere.scale.set(scale, scale, scale);
               explosionMat.opacity = Math.max(0, opacity);
               ringMat.opacity = Math.max(0, opacity * 0.5);
               explosionLight.intensity = Math.max(0, lightIntensity);
               
               if (opacity > 0) {
                   requestAnimationFrame(animateExplosion);
               } else {
                   scene.remove(explosionSphere);
                   scene.remove(explosionLight);
                   scene.remove(ring);
               }
           };
           
           animateExplosion();

           if (radius >= 20) {
               shakeScreen(radius / 10);
           }
       }

       function shakeScreen(intensity) {
           const originalPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
           let shakeTime = 0;
           
           const shake = () => {
               shakeTime += 16;
               if (shakeTime < 300) {
                   const decay = 1 - (shakeTime / 300);
                   camera.position.x = originalPos.x + (Math.random() - 0.5) * intensity * decay;
                   camera.position.z = originalPos.z + (Math.random() - 0.5) * intensity * decay;
                   requestAnimationFrame(shake);
               } else {
                   camera.position.x = originalPos.x;
                   camera.position.z = originalPos.z;
               }
           };
           
           shake();
       }

       // ==========================================
       // HIT EFFECT
       // ==========================================
       function createHitEffect(position) {
           const particleCount = 6; // Reduced from 8
           for (let i = 0; i < particleCount; i++) {
               const particleMat = new THREE.MeshBasicMaterial({ 
                   color: 0xff0000,
                   transparent: true,
                   opacity: 1
               });
               const particle = new THREE.Mesh(sharedHitParticleGeo, particleMat);
               particle.position.copy(position);
               
               const velocity = new THREE.Vector3(
                   (Math.random() - 0.5) * 0.2,
                   Math.random() * 0.15,
                   (Math.random() - 0.5) * 0.2
               );
               
               scene.add(particle);
               
               let life = 1;
               const animateParticle = () => {
                   life -= 0.05;
                   particle.position.add(velocity);
                   velocity.y -= 0.01;
                   particle.material.opacity = life;
                   
                   if (life > 0) {
                       requestAnimationFrame(animateParticle);
                   } else {
                       scene.remove(particle);
                   }
               };
               animateParticle();
           }
       }
