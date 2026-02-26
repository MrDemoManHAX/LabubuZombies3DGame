// Zombie class & enemy AI
       // ==========================================
       // ZOMBIE CLASS - FIXED MATERIALS AND ANIMATION
       // ==========================================
       const zombies = [];

       class Zombie {
           constructor(x, z, isBoss = false, isSuperBoss = false) {
               this.isBoss = isBoss || isSuperBoss;
               this.isSuperBoss = isSuperBoss;
               this.isAgro = !this.isBoss && Math.random() < CONFIG.ZOMBIE_AGRO_CHANCE;
               this.frozen = false;
               this.frozenUntil = 0;
               this.isMoving = false;
               
               this.group = new THREE.Group();
               this.group.userData.zombie = this;

               const sizeMult = isSuperBoss ? CONFIG.SUPER_BOSS_SIZE_MULT : (isBoss ? CONFIG.BOSS_SIZE_MULT : 1);
               this.sizeMult = sizeMult;

               const usesOverlord = isSuperBoss && overlordLoaded && overlordTemplate;
               const usesGolem = !isSuperBoss && isBoss && golemLoaded && golemTemplate;
               const activeTemplate = usesOverlord ? overlordTemplate : (usesGolem ? golemTemplate : labubuTemplate);
               const activeBaseHeight = usesOverlord ? overlordBaseHeight : (usesGolem ? golemBaseHeight : labubuBaseHeight);
               const activeModelHeight = usesOverlord ? overlordModelHeight : (usesGolem ? golemModelHeight : labubuModelHeight);
               const activeLoaded = usesOverlord ? overlordLoaded : (usesGolem ? golemLoaded : labubuLoaded);

               if (activeLoaded && activeTemplate) {
                   const model = deepCloneGLTF(activeTemplate);
                   model.scale.set(sizeMult, sizeMult, sizeMult);
                   model.rotation.y = Math.PI;
                   this.modelBaseY = activeBaseHeight * sizeMult;
                   this.modelHeight = activeModelHeight * sizeMult;
                   model.position.y = this.modelBaseY;

                   // Boss/SuperBoss: restore original model colours, just brighten with emissive
                   if (isSuperBoss) {
                       model.traverse((child) => {
                           if (child.isMesh && child.material) {
                               const mats = Array.isArray(child.material) ? child.material : [child.material];
                               mats.forEach(m => {
                                   m.color.setHex(0xffffff);
                                   if (m.emissive) m.emissive.setHex(0xffffff);
                                   m.emissiveIntensity = 0.5;
                                   m.needsUpdate = true;
                               });
                           }
                           child.userData.zombie = this;
                       });
                   } else if (isBoss) {
                       model.traverse((child) => {
                           if (child.isMesh && child.material) {
                               const mats = Array.isArray(child.material) ? child.material : [child.material];
                               mats.forEach(m => {
                                   m.color.setHex(0xffffff);
                                   if (m.emissive) m.emissive.setHex(0xffffff);
                                   m.emissiveIntensity = 0.4;
                                   m.needsUpdate = true;
                               });
                           }
                           child.userData.zombie = this;
                       });
                   } else {
                       // Regular zombies: subtle white emissive to brighten just the model, no scene lighting
                       model.traverse((child) => {
                           if (child.isMesh && child.material) {
                               const mats = Array.isArray(child.material) ? child.material : [child.material];
                               mats.forEach(m => {
                                   if (!m.emissive) m.emissive = new THREE.Color();
                                   m.emissive.setHex(0xffffff);
                                   m.emissiveIntensity = 0.35;
                               });
                           }
                           child.userData.zombie = this;
                       });
                   }
                   
                   this.group.add(model);
                   this.model = model;
                   this.isLabubu = true;
                   
               } else {
                   this.createProceduralZombie(sizeMult, isBoss, isSuperBoss);
                   this.isLabubu = false;
               }

               this.walkCycle = Math.random() * Math.PI * 2;
               this.walkSpeed = (this.isAgro ? 12 : 8) * (isSuperBoss ? 1.2 : (isBoss ? 0.7 : 1));

               // Pink pulsing glow light for bosses
               this.bossGlowLight = null;
               if (isBoss || isSuperBoss) {
                   const glowColor = isSuperBoss ? 0xff00ff : 0xff69b4;
                   const glowIntensity = isSuperBoss ? 6 : 3;
                   const glowDist = isSuperBoss ? 18 : 10;
                   this.bossGlowLight = new THREE.PointLight(glowColor, glowIntensity, glowDist);
                   this.bossGlowLight.position.set(0, 1.5 * sizeMult, 0);
                   this.group.add(this.bossGlowLight);
               }

               this.group.position.set(x, 0, z);
               
               if (isSuperBoss) {
                   this.health = 100 * CONFIG.SUPER_BOSS_HEALTH_MULT;
               } else if (isBoss) {
                   this.health = 100 * CONFIG.BOSS_HEALTH_MULT;
               } else {
                   this.health = 100;
               }
               this.maxHealth = this.health;
               
               if (isSuperBoss) {
                   this.damage = CONFIG.ZOMBIE_DAMAGE * CONFIG.SUPER_BOSS_DAMAGE_MULT;
               } else if (isBoss) {
                   this.damage = CONFIG.ZOMBIE_DAMAGE * CONFIG.BOSS_DAMAGE_MULT;
               } else {
                   this.damage = CONFIG.ZOMBIE_DAMAGE * (this.isAgro ? CONFIG.ZOMBIE_AGRO_DAMAGE_MULT : 1);
               }
               this.speed = CONFIG.ZOMBIE_SPEED * (this.isAgro ? CONFIG.ZOMBIE_AGRO_SPEED_MULT : 1) * (isSuperBoss ? 1.4 : (isBoss ? 0.7 : 1));
               
               this.lastAttackTime = 0;
               
               scene.add(this.group);
               zombies.push(this);
           }

           createProceduralZombie(sizeMult, isBoss, isSuperBoss = false) {
               const zombieColor = isSuperBoss ? 0xff00cc : (isBoss ? 0xff69b4 : (this.isAgro ? 0x664422 : 0x228822));
               const darkColor   = isSuperBoss ? 0xcc0099 : (isBoss ? 0xff1493 : (this.isAgro ? 0x443311 : 0x115511));
               const emissiveColor = isSuperBoss ? 0xff00ff : (isBoss ? 0xff1493 : 0x000000);
               const emissiveIntensity = isSuperBoss ? 1.2 : (isBoss ? 0.8 : 0);
               const isTransparent = false;
               const opacity = 1.0;

               // Body
               const bodyHeight = 1.2 * sizeMult;
               const bodyWidth = 0.6 * sizeMult;
               const bodyGeo = new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyWidth * 0.5);
               const bodyMat = new THREE.MeshStandardMaterial({
                   color: zombieColor,
                   emissive: new THREE.Color(emissiveColor),
                   emissiveIntensity: emissiveIntensity,
                   transparent: isTransparent,
                   opacity: opacity
               });
               this.body = new THREE.Mesh(bodyGeo, bodyMat);
               this.body.position.y = bodyHeight / 2 + 0.6 * sizeMult;
               this.body.castShadow = true;
               this.body.userData.zombie = this;
               this.group.add(this.body);
               
               // Head
               const headSize = 0.4 * sizeMult;
               const headGeo = new THREE.SphereGeometry(headSize, 8, 8);
               const headMat = new THREE.MeshStandardMaterial({ color: darkColor, transparent: isTransparent, opacity: opacity });
               this.head = new THREE.Mesh(headGeo, headMat);
               this.head.position.y = bodyHeight + 0.6 * sizeMult + headSize;
               this.head.castShadow = true;
               this.head.userData.zombie = this;
               this.group.add(this.head);
               
               // Left Leg
               const legHeight = 0.6 * sizeMult;
               const legWidth = 0.15 * sizeMult;
               const legGeo = new THREE.BoxGeometry(legWidth, legHeight, legWidth);
               const legMat = new THREE.MeshStandardMaterial({ color: darkColor, transparent: isTransparent, opacity: opacity });
               
               this.leftLegPivot = new THREE.Group();
               this.leftLegPivot.position.set(-0.15 * sizeMult, 0.6 * sizeMult, 0);
               this.leftLeg = new THREE.Mesh(legGeo, legMat.clone());
               this.leftLeg.position.y = -legHeight / 2;
               this.leftLeg.castShadow = true;
               this.leftLeg.userData.zombie = this;
               this.leftLegPivot.add(this.leftLeg);
               this.group.add(this.leftLegPivot);
               
               // Right Leg
               this.rightLegPivot = new THREE.Group();
               this.rightLegPivot.position.set(0.15 * sizeMult, 0.6 * sizeMult, 0);
               this.rightLeg = new THREE.Mesh(legGeo, legMat.clone());
               this.rightLeg.position.y = -legHeight / 2;
               this.rightLeg.castShadow = true;
               this.rightLeg.userData.zombie = this;
               this.rightLegPivot.add(this.rightLeg);
               this.group.add(this.rightLegPivot);
               
               // Left Arm
               const armHeight = 0.5 * sizeMult;
               const armWidth = 0.1 * sizeMult;
               const armGeo = new THREE.BoxGeometry(armWidth, armHeight, armWidth);
               
               this.leftArmPivot = new THREE.Group();
               this.leftArmPivot.position.set(-0.35 * sizeMult, 1.4 * sizeMult, 0);
               this.leftArm = new THREE.Mesh(armGeo, legMat.clone());
               this.leftArm.position.y = -armHeight / 2;
               this.leftArm.castShadow = true;
               this.leftArm.userData.zombie = this;
               this.leftArmPivot.add(this.leftArm);
               this.group.add(this.leftArmPivot);
               
               // Right Arm
               this.rightArmPivot = new THREE.Group();
               this.rightArmPivot.position.set(0.35 * sizeMult, 1.4 * sizeMult, 0);
               this.rightArm = new THREE.Mesh(armGeo, legMat.clone());
               this.rightArm.position.y = -armHeight / 2;
               this.rightArm.castShadow = true;
               this.rightArm.userData.zombie = this;
               this.rightArmPivot.add(this.rightArm);
               this.group.add(this.rightArmPivot);
               
               this.model = this.body;
               this.hasProceduralLimbs = true;
               this.modelBaseY = 0;
           }

           update(playerPos, deltaTime) {
               if (this.health <= 0) return;

               if (this.frozen) {
                   if (Date.now() > this.frozenUntil) {
                       this.frozen = false;
                       this.unfreezeEffect();
                   } else {
                       return;
                   }
               }

               const direction = new THREE.Vector3();
               // Invisibility perk: zombies walk toward map centre instead of player
               const targetPos = perks.invisibility.active
                   ? new THREE.Vector3(0, 0, 0)
                   : playerPos;
               direction.subVectors(targetPos, this.group.position);
               direction.y = 0;
               const distance = direction.length();
               // Also check full 3D distance — if player is flying above, zombies can't reach them
               const fullDistance = this.group.position.distanceTo(targetPos);
               direction.normalize();

               // Only attack player if not invisible AND player is within reach (including vertically)
               if (!perks.invisibility.active && distance < CONFIG.ZOMBIE_ATTACK_RANGE && fullDistance < CONFIG.ZOMBIE_ATTACK_RANGE) {
                   this.isMoving = false;
                   const now = Date.now();
                   if (now - this.lastAttackTime > CONFIG.ZOMBIE_ATTACK_COOLDOWN) {
                       this.attack();
                       this.lastAttackTime = now;
                   }
                   this.playAttackAnimation(deltaTime);
               } else {
                   this.isMoving = true;
                   const PAD = 1.0; // clearance from building walls
                   const myPos = this.group.position;

                   // Returns true if point is inside any building
                   const inBuilding = (px, pz) => {
                       for (const b of buildings) {
                           if (px > b.x - b.width/2 - PAD && px < b.x + b.width/2 + PAD &&
                               pz > b.z - b.depth/2 - PAD && pz < b.z + b.depth/2 + PAD) return true;
                       }
                       return false;
                   };

                   // If somehow spawned/pushed inside a building, eject outward immediately
                   if (inBuilding(myPos.x, myPos.z)) {
                       // Push toward map centre to escape
                       const ex = myPos.x === 0 ? 0.1 : -myPos.x * 0.05;
                       const ez = myPos.z === 0 ? 0.1 : -myPos.z * 0.05;
                       this.group.position.x += ex;
                       this.group.position.z += ez;
                       this.playWalkAnimation(deltaTime);
                       this.group.lookAt(targetPos.x, this.group.position.y, targetPos.z);
                       this.group.rotation.y += Math.PI;
                       return;
                   }

                   const step = this.speed;
                   const dx = direction.x * step;
                   const dz = direction.z * step;

                   const directBlocked = inBuilding(myPos.x + dx, myPos.z + dz);

                   if (!directBlocked) {
                       this.group.position.x += dx;
                       this.group.position.z += dz;
                       // Only reset turn dir after 60 clear frames to prevent corner oscillation
                       this._clearTimer = (this._clearTimer || 0) + 1;
                       if (this._clearTimer > 60) {
                           this._wallFollowDir = undefined;
                           this._clearTimer = 0;
                       }
                   } else {
                       this._clearTimer = 0;

                       // Pick turn direction ONCE per obstacle by scoring each building corner
                       if (this._wallFollowDir === undefined) {
                           let bestScore = Infinity;
                           let bestSide = 1;
                           for (const b of buildings) {
                               // Only look at the building actually blocking the next step
                               const nx = myPos.x + dx, nz = myPos.z + dz;
                               if (!(nx > b.x - b.width/2 - PAD && nx < b.x + b.width/2 + PAD &&
                                     nz > b.z - b.depth/2 - PAD && nz < b.z + b.depth/2 + PAD)) continue;
                               const hw = b.width/2 + PAD + 0.3;
                               const hd = b.depth/2 + PAD + 0.3;
                               const corners = [
                                   [b.x - hw, b.z - hd],
                                   [b.x + hw, b.z - hd],
                                   [b.x - hw, b.z + hd],
                                   [b.x + hw, b.z + hd],
                               ];
                               for (const [cx, cz] of corners) {
                                   if (inBuilding(cx, cz)) continue;
                                   const score = Math.hypot(cx - myPos.x, cz - myPos.z)
                                               + Math.hypot(cx - targetPos.x, cz - targetPos.z);
                                   if (score < bestScore) {
                                       bestScore = score;
                                       // Cross product sign = which side of our direction this corner is on
                                       const cross = direction.x * (cz - myPos.z) - direction.z * (cx - myPos.x);
                                       bestSide = cross >= 0 ? 1 : -1;
                                   }
                               }
                           }
                           this._wallFollowDir = bestSide;
                       }

                       // Sweep angles in the committed direction only — no flipping mid-obstacle
                       let moved = false;
                       for (let deg = 15; deg < 180; deg += 15) {
                           const rad = deg * this._wallFollowDir * Math.PI / 180;
                           const cos = Math.cos(rad), sin = Math.sin(rad);
                           const nx = (direction.x * cos - direction.z * sin) * step;
                           const nz = (direction.x * sin + direction.z * cos) * step;
                           if (!inBuilding(myPos.x + nx, myPos.z + nz)) {
                               this.group.position.x += nx;
                               this.group.position.z += nz;
                               moved = true;
                               break;
                           }
                       }
                       // Last resort: try opposite side
                       if (!moved) {
                           for (let deg = 15; deg <= 180; deg += 15) {
                               const rad = deg * -this._wallFollowDir * Math.PI / 180;
                               const cos = Math.cos(rad), sin = Math.sin(rad);
                               const nx = (direction.x * cos - direction.z * sin) * step;
                               const nz = (direction.x * sin + direction.z * cos) * step;
                               if (!inBuilding(myPos.x + nx, myPos.z + nz)) {
                                   this.group.position.x += nx;
                                   this.group.position.z += nz;
                                   moved = true;
                                   break;
                               }
                           }
                       }
                   }
                   this.playWalkAnimation(deltaTime);
               }

               this.group.lookAt(targetPos.x, this.group.position.y, targetPos.z);
               this.group.rotation.y += Math.PI;
           }

           playWalkAnimation(deltaTime) {
               this.walkCycle += deltaTime * 0.001 * this.walkSpeed;

               // Pulse pink glow light for bosses
               if (this.bossGlowLight) {
                   const pulse = 0.6 + 0.4 * Math.sin(this.walkCycle * 3);
                   this.bossGlowLight.intensity = (this.isSuperBoss ? 6 : 3) * pulse;
               }
               
               if (this.isLabubu && this.model) {
                   // Walking animation for Labubu model
                   // Use the pre-calculated base Y and only add small offsets
                   const bobAmount = 0.08 * this.sizeMult;
                   const bobOffset = Math.abs(Math.sin(this.walkCycle * 2)) * bobAmount;
                   
                   // Keep Y position stable, just add bob
                   this.model.position.y = this.modelBaseY + bobOffset;
                   
                   // Forward lean while walking
                   this.model.rotation.x = Math.sin(this.walkCycle) * 0.08;
                   
                   // Side-to-side tilt (alternating with steps)
                   this.model.rotation.z = Math.sin(this.walkCycle) * 0.06;
                   
               } else if (this.hasProceduralLimbs) {
                   const legSwing = Math.sin(this.walkCycle) * 0.6;
                   const armSwing = Math.sin(this.walkCycle) * 0.4;
                   
                   this.leftLegPivot.rotation.x = legSwing;
                   this.rightLegPivot.rotation.x = -legSwing;
                   
                   this.leftArmPivot.rotation.x = -armSwing;
                   this.rightArmPivot.rotation.x = armSwing;
                   
                   this.leftArmPivot.rotation.z = 0.2 + Math.abs(Math.sin(this.walkCycle)) * 0.1;
                   this.rightArmPivot.rotation.z = -0.2 - Math.abs(Math.sin(this.walkCycle)) * 0.1;
                   
                   const bobAmount = 0.08;
                   const baseBodyY = 1.2 * this.sizeMult;
                   const baseHeadY = 1.9 * this.sizeMult;
                   this.body.position.y = baseBodyY + Math.abs(Math.sin(this.walkCycle * 2)) * bobAmount;
                   this.head.position.y = baseHeadY + Math.abs(Math.sin(this.walkCycle * 2)) * bobAmount;
                   
                   this.body.rotation.y = Math.sin(this.walkCycle) * 0.1;
                   this.head.rotation.y = Math.sin(this.walkCycle) * 0.05;
               }
           }

           playAttackAnimation(deltaTime) {
               const attackPhase = (Date.now() % 500) / 500;
               
               if (this.isLabubu && this.model) {
                   // Lunge forward attack
                   this.model.rotation.x = Math.sin(attackPhase * Math.PI) * 0.4;
                   // Keep Y stable during attack
                   this.model.position.y = this.modelBaseY;
               } else if (this.hasProceduralLimbs) {
                   const reachAngle = Math.sin(attackPhase * Math.PI) * 1.2;
                   this.leftArmPivot.rotation.x = -reachAngle;
                   this.rightArmPivot.rotation.x = -reachAngle;
                   this.leftArmPivot.rotation.z = 0.1;
                   this.rightArmPivot.rotation.z = -0.1;
                   this.body.rotation.x = Math.sin(attackPhase * Math.PI) * 0.2;
               }
           }

           attack() {
               let damage = this.damage;
               
               if (gameState.armor > 0) {
                   const armorDamage = Math.min(gameState.armor, damage * 0.7);
                   gameState.armor -= armorDamage;
                   damage -= armorDamage;
               }
               
               gameState.health -= damage;
               updateHealthBar();
               showDamageFlash();
               
               if (gameState.health <= 0) {
                   gameOver();
               }
           }

           takeDamage(damage, isFreeze = false) {
               this.health -= damage;
               
               this.flashDamage();

               if (isFreeze && !this.isBoss) {
                   this.frozen = true;
                   this.frozenUntil = Date.now() + WEAPONS.freezeGun.freezeDuration;
                   this.applyFreezeEffect();
               }

               if (this.health <= 0) {
                   this.die();
               }
           }

           flashDamage() {
               // Super boss: restore to zero emissive (original model texture shows through)
               // Boss: restore to pink emissive. Regular: restore to white emissive
               const restoreEmissive = this.isSuperBoss ? 0x000000 : (this.isBoss ? 0xff1493 : 0xffffff);
               const restoreIntensity = this.isSuperBoss ? 0 : (this.isBoss ? 0.8 : 0.35);
               this.group.traverse((child) => {
                   // Don't flash the pink overlay sphere itself
                   if (child.userData && child.userData.isPinkOverlay) return;
                   if (child.isMesh && child.material) {
                       const mats = Array.isArray(child.material) ? child.material : [child.material];
                       mats.forEach(mat => {
                           mat.emissive = new THREE.Color(0xff0000);
                           mat.emissiveIntensity = 0.8;
                       });
                       setTimeout(() => {
                           mats.forEach(mat => {
                               if (mat && !this.frozen) {
                                   mat.emissive = new THREE.Color(restoreEmissive);
                                   mat.emissiveIntensity = restoreIntensity;
                               }
                           });
                       }, 100);
                   }
               });
           }

           applyFreezeEffect() {
               this.group.traverse((child) => {
                   if (child.userData && child.userData.isPinkOverlay) return;
                   if (child.isMesh && child.material) {
                       const mats = Array.isArray(child.material) ? child.material : [child.material];
                       mats.forEach(mat => {
                           if (!mat.userData) mat.userData = {};
                           mat.userData.originalColor = mat.color.getHex();
                           mat.color.setHex(0xaaddff);
                           mat.emissive = new THREE.Color(0x00ffff);
                           mat.emissiveIntensity = 0.4;
                       });
                   }
               });
           }

           unfreezeEffect() {
               const restoreEmissive = this.isSuperBoss ? 0x000000 : (this.isBoss ? 0xff1493 : 0xffffff);
               const restoreIntensity = this.isSuperBoss ? 0 : (this.isBoss ? 0.8 : 0.35);
               this.group.traverse((child) => {
                   if (child.userData && child.userData.isPinkOverlay) return;
                   if (child.isMesh && child.material) {
                       const mats = Array.isArray(child.material) ? child.material : [child.material];
                       mats.forEach(mat => {
                           if (mat.userData && mat.userData.originalColor !== undefined) {
                               mat.color.setHex(mat.userData.originalColor);
                           }
                           mat.emissive = new THREE.Color(restoreEmissive);
                           mat.emissiveIntensity = restoreIntensity;
                       });
                   }
               });
           }

           die() {
               const dropX = this.group.position.x;
               const dropZ = this.group.position.z;
               
               this.createDeathEffect();
               
               scene.remove(this.group);
               const index = zombies.indexOf(this);
               if (index > -1) zombies.splice(index, 1);
               
               gameState.kills++;
               
               // Combo system
               const now = Date.now();
               if (now - gameState.lastKillTime < 3000) {
                   gameState.killStreak++;
                   gameState.comboMultiplier = Math.min(5, 1 + Math.floor(gameState.killStreak / 3));
               } else {
                   gameState.killStreak = 1;
                   gameState.comboMultiplier = 1;
               }
               gameState.lastKillTime = now;
               
               const baseScore = this.isSuperBoss ? 2000 : (this.isBoss ? 500 : (this.isAgro ? 150 : 100));
               const bonusScore = Math.floor(baseScore * gameState.comboMultiplier);
               gameState.score += bonusScore;
               // Award coins: superboss=2000, boss=50, agro=15, normal=10
               const coinsEarned = this.isSuperBoss ? 2000 : (this.isBoss ? 50 : (this.isAgro ? 15 : 10));
               gameState.coins += coinsEarned * (perks.doublePickup.active ? 2 : 1);
               
               if (gameState.comboMultiplier >= 2) {
                   showComboFlash(gameState.comboMultiplier, bonusScore);
               }
               
               if (gameState.score > gameState.highScore) {
                   gameState.highScore = gameState.score;
                   localStorage.setItem('zombieHighScore', gameState.highScore);
               }
               
               spawnDrop(dropX, dropZ, this.isBoss, this.isSuperBoss);
               
               updateUI();

               if (this.isBoss) {
                   gameState.bossDefeated = true;
                   gameState.bossKilled = true;
                   if (this.isSuperBoss) {
                       showNotification('💀 SUPER BOSS DEFEATED! +2000 💰', '#ff00ff');
                   } else {
                       showNotification('🏆 BOSS DEFEATED! 🏆', '#ffcc00');
                   }
                   checkWaveComplete();
               } else {
                   gameState.regularZombiesKilled++;
                   const _curLimit = window._modZombieLimit !== undefined ? window._modZombieLimit : MAX_ZOMBIES_ON_GROUND;
                   // Zombies remaining in this wave = total - killed
                   const _zombiesLeftInWave = gameState.regularZombiesTotal - gameState.regularZombiesKilled;
                   // Respawn if: wave not done AND map is under limit
                   // Use killed count not spawned count so lowering the limit mid-wave still works
                   if (_zombiesLeftInWave > 0 && zombies.length < _curLimit) {
                       setTimeout(() => spawnOneRegularZombie(), 500);
                   }
                   // Trigger boss once all regular zombies are cleared
                   checkSpawnBoss();
                   // In case boss was already killed somehow, check wave complete
                   checkWaveComplete();
               }
           }

           createDeathEffect() {
               const pos = this.group.position.clone();
               
               for (let i = 0; i < 10; i++) { // Reduced from 15
                   const particleMat = new THREE.MeshBasicMaterial({ 
                       color: this.isBoss ? 0xff0000 : 0x00ff00,
                       transparent: true,
                       opacity: 1
                   });
                   const particle = new THREE.Mesh(sharedDeathParticleGeo, particleMat);
                   particle.position.copy(pos);
                   particle.position.y += Math.random() * 2;
                   
                   const velocity = new THREE.Vector3(
                       (Math.random() - 0.5) * 0.3,
                       Math.random() * 0.2,
                       (Math.random() - 0.5) * 0.3
                   );
                   
                   scene.add(particle);
                   
                   let life = 1;
                   const animateParticle = () => {
                       life -= 0.03;
                       particle.position.add(velocity);
                       velocity.y -= 0.01;
                       particle.material.opacity = life;
                       particle.rotation.x += 0.1;
                       particle.rotation.y += 0.1;
                       
                       if (life > 0) {
                           requestAnimationFrame(animateParticle);
                       } else {
                           scene.remove(particle);
                       }
                   };
                   animateParticle();
               }
           }
       }
