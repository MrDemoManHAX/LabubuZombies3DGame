// World geometry — ground, portals, grass, trees, buildings, doors, teleport
       // ==========================================
       // SHARED GEOMETRIES & MATERIALS (for performance)
       // ==========================================
       const sharedHitParticleGeo = new THREE.SphereGeometry(0.05, 4, 4);
       const sharedDeathParticleGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
       const sharedTeleportParticleGeo = new THREE.SphereGeometry(0.1, 4, 4);

       // ==========================================
       // GRASS GROUND
       // ==========================================
       const groundGeometry = new THREE.PlaneGeometry(150, 150, 10, 10);
       const vertices = groundGeometry.attributes.position.array;
       for (let i = 0; i < vertices.length; i += 3) {
           vertices[i + 2] += (Math.random() - 0.5) * 0.1;
       }
       groundGeometry.computeVertexNormals();

       const groundMaterial = new THREE.MeshStandardMaterial({ 
           color: 0x3a8c3a,
           roughness: 0.9,
           metalness: 0.0
       });
       const ground = new THREE.Mesh(groundGeometry, groundMaterial);
       ground.rotation.x = -Math.PI / 2;
       ground.receiveShadow = true;
       scene.add(ground);

       // ==========================================
       // PORTAL - centre of map, 4x4 on the floor
       // ==========================================
       (function createPortal() {
           const portalGroup = new THREE.Group();
           portalGroup.position.set(0, 0.05, 0);

           // Swirling disc layers
           const layers = [
               { radius: 2.0, color: 0x8800ff, opacity: 0.85, speed: 0.8  },
               { radius: 1.5, color: 0xaa00ff, opacity: 0.75, speed: -1.2 },
               { radius: 1.0, color: 0xcc44ff, opacity: 0.65, speed: 1.8  },
               { radius: 0.5, color: 0xffffff, opacity: 0.90, speed: -2.5 },
           ];

           const discs = [];
           layers.forEach(({ radius, color, opacity, speed }) => {
               const geo = new THREE.CircleGeometry(radius, 48);
               const mat = new THREE.MeshBasicMaterial({
                   color,
                   transparent: true,
                   opacity,
                   side: THREE.DoubleSide,
                   depthWrite: false,
               });
               const disc = new THREE.Mesh(geo, mat);
               disc.rotation.x = -Math.PI / 2;
               disc.userData.speed = speed;
               portalGroup.add(disc);
               discs.push(disc);
           });

           // Outer glowing ring (torus)
           const ringGeo = new THREE.TorusGeometry(2.0, 0.12, 16, 80);
           const ringMat = new THREE.MeshBasicMaterial({ color: 0xdd88ff });
           const ring = new THREE.Mesh(ringGeo, ringMat);
           ring.rotation.x = -Math.PI / 2;
           portalGroup.add(ring);

           // Inner ring
           const ring2Geo = new THREE.TorusGeometry(1.0, 0.07, 16, 60);
           const ring2Mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
           const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
           ring2.rotation.x = -Math.PI / 2;
           portalGroup.add(ring2);

           // Glow light underneath
           const portalLight = new THREE.PointLight(0xaa00ff, 3, 10);
           portalLight.position.set(0, 0.5, 0);
           portalGroup.add(portalLight);

           scene.add(portalGroup);

           // Animate — hook into the existing game loop via a self-updating function
           let portalTime = 0;
           const originalAnimate = window._portalAnimate;
           function animatePortal(dt) {
               portalTime += dt * 0.001;
               discs.forEach(disc => {
                   disc.rotation.z = portalTime * disc.userData.speed;
               });
               // Pulse the light and outer ring opacity
               const pulse = 0.5 + 0.5 * Math.sin(portalTime * 3);
               portalLight.intensity = 2 + pulse * 2;
               ring.material.color.setHSL(0.8 + pulse * 0.05, 1, 0.6 + pulse * 0.2);
           }
           // Store for the game loop to call
           window._portalAnimators = window._portalAnimators || [];
           window._portalAnimators.push(animatePortal);
       })();

       // ==========================================
       // PORTAL HOOP — white glowing swirly ring
       // Appears at map centre when Activate Portal perk is used
       // ==========================================
       (function createPortalHoop() {
           const hoopGroup = new THREE.Group();
           hoopGroup.position.set(0, 0.1, 0);
           hoopGroup.visible = false;
           scene.add(hoopGroup);

           // Main hoop torus — flat on the floor (rotated horizontal)
           const hoopGeo = new THREE.TorusGeometry(2.2, 0.18, 24, 100);
           const hoopMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
           const hoop = new THREE.Mesh(hoopGeo, hoopMat);
           hoop.rotation.x = -Math.PI / 2; // lay flat
           hoopGroup.add(hoop);

           // Inner swirl rings — also flat
           const swirlData = [
               { r: 1.6, tube: 0.07, color: 0xccffff, speed: 1.4 },
               { r: 1.0, tube: 0.05, color: 0xffffff, speed: -2.1 },
               { r: 0.5, tube: 0.04, color: 0xaaffff, speed: 3.0 },
           ];
           const swirls = swirlData.map(({ r, tube, color, speed }) => {
               const geo = new THREE.TorusGeometry(r, tube, 12, 60);
               const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75 });
               const mesh = new THREE.Mesh(geo, mat);
               mesh.rotation.x = -Math.PI / 2; // lay flat
               mesh.userData.speed = speed;
               hoopGroup.add(mesh);
               return mesh;
           });

           // White glow light in the centre of the hoop
           const hoopLight = new THREE.PointLight(0xffffff, 0, 12);
           hoopGroup.add(hoopLight);

           // Outer glow ring — also flat
           const glowGeo = new THREE.TorusGeometry(2.4, 0.32, 16, 100);
           const glowMat = new THREE.MeshBasicMaterial({ color: 0xaaffff, transparent: true, opacity: 0.3, depthWrite: false });
           const glowRing = new THREE.Mesh(glowGeo, glowMat);
           glowRing.rotation.x = -Math.PI / 2; // lay flat
           hoopGroup.add(glowRing);

           let hoopTime = 0;
           const BOUNCE_HEIGHT = 3.0; // bounce up 3m
           const FLOOR_Y = 0.1;
           function animateHoop(dt) {
               if (!hoopGroup.visible) return;
               hoopTime += dt * 0.001;
               // Ball-style bounce: Math.abs(sin) goes 0→1→0 repeatedly, hits floor then bounces back up
               hoopGroup.position.y = FLOOR_Y + Math.abs(Math.sin(hoopTime * 2.2)) * BOUNCE_HEIGHT;
               // Spin flat on Y axis (like a spinning coin on a table)
               hoopGroup.rotation.y = hoopTime * 0.6;
               // Counter-spin inner swirls on Y axis
               swirls.forEach(s => { s.rotation.y = hoopTime * s.userData.speed; });
               // Pulse the light and outer glow
               const pulse = 0.5 + 0.5 * Math.sin(hoopTime * 4);
               hoopLight.intensity = 3 + pulse * 3;
               glowRing.material.opacity = 0.2 + pulse * 0.25;
               glowRing.material.color.setHSL(0.5 + pulse * 0.05, 1, 0.8);
           }
           window._portalAnimators = window._portalAnimators || [];
           window._portalAnimators.push(animateHoop);

           // Expose so activatePerk can toggle it
           window._portalHoop = hoopGroup;
       })();

       function createGrassPatches() {
           // Use instanced mesh for grass instead of individual meshes
           const grassColors = [0x2d6b2d, 0x3a8c3a, 0x4a9c4a, 0x5aac5a, 0x2a5a2a];
           
           // Reduce from 500 patches to 80 merged into fewer draw calls
           for (let i = 0; i < 80; i++) {
               const patchGeo = new THREE.PlaneGeometry(
                   0.3 + Math.random() * 0.5,
                   0.3 + Math.random() * 0.5
               );
               const patchMat = new THREE.MeshStandardMaterial({
                   color: grassColors[Math.floor(Math.random() * grassColors.length)],
                   roughness: 1,
                   side: THREE.DoubleSide
               });
               const patch = new THREE.Mesh(patchGeo, patchMat);
               
               patch.position.set(
                   (Math.random() - 0.5) * 140,
                   0.01,
                   (Math.random() - 0.5) * 140
               );
               patch.rotation.x = -Math.PI / 2;
               patch.rotation.z = Math.random() * Math.PI;
               scene.add(patch);
           }

           // Reduce grass blades from 1000 to 150
           for (let i = 0; i < 150; i++) {
               const bladeGeo = new THREE.PlaneGeometry(0.05, 0.3 + Math.random() * 0.3);
               const bladeMat = new THREE.MeshStandardMaterial({
                   color: grassColors[Math.floor(Math.random() * grassColors.length)],
                   side: THREE.DoubleSide
               });
               const blade = new THREE.Mesh(bladeGeo, bladeMat);
               
               blade.position.set(
                   (Math.random() - 0.5) * 140,
                   0.15,
                   (Math.random() - 0.5) * 140
               );
               blade.rotation.y = Math.random() * Math.PI;
               blade.rotation.x = (Math.random() - 0.5) * 0.3;
               scene.add(blade);
           }
       }
       createGrassPatches();

       // ==========================================
       // TREES
       // ==========================================
       const trees = [];

       function createTree(x, z, scale = 1) {
           const treeGroup = new THREE.Group();
           
           const trunkHeight = 4 * scale;
           const trunkRadius = 0.4 * scale;
           const trunkGeo = new THREE.CylinderGeometry(
               trunkRadius * 0.7, 
               trunkRadius, 
               trunkHeight, 
               8
           );
           const trunkMat = new THREE.MeshStandardMaterial({ 
               color: 0x4a3728,
               roughness: 0.9
           });
           const trunk = new THREE.Mesh(trunkGeo, trunkMat);
           trunk.position.y = trunkHeight / 2;
           trunk.castShadow = true;
           trunk.receiveShadow = true;
           treeGroup.add(trunk);

           const foliageColors = [0x2d5a2d, 0x3a7a3a, 0x4a8a4a];
           
           for (let i = 0; i < 3; i++) {
               const foliageRadius = (2.5 - i * 0.5) * scale;
               const foliageHeight = (2 - i * 0.3) * scale;
               const foliageGeo = new THREE.ConeGeometry(foliageRadius, foliageHeight, 8);
               const foliageMat = new THREE.MeshStandardMaterial({ 
                   color: foliageColors[i],
                   roughness: 0.8
               });
               const foliage = new THREE.Mesh(foliageGeo, foliageMat);
               foliage.position.y = trunkHeight + i * foliageHeight * 0.6;
               foliage.castShadow = true;
               foliage.receiveShadow = true;
               treeGroup.add(foliage);
           }

           treeGroup.position.set(x, 0, z);
           scene.add(treeGroup);
           trees.push(treeGroup);
           
           return treeGroup;
       }

       const treePositions = [
           { x: -35, z: -35, scale: 1.5 },
           { x: 35, z: -35, scale: 1.8 },
           { x: -35, z: 35, scale: 1.6 },
           { x: 35, z: 35, scale: 1.7 },
           { x: 0, z: -40, scale: 1.4 },
           { x: 0, z: 40, scale: 1.5 },
           { x: -40, z: 0, scale: 1.6 },
           { x: 40, z: 0, scale: 1.5 },
           { x: -20, z: -30, scale: 1.3 },
           { x: 20, z: -30, scale: 1.4 },
           { x: -20, z: 30, scale: 1.3 },
           { x: 20, z: 30, scale: 1.4 },
           { x: -45, z: -20, scale: 1.2 },
           { x: 45, z: -20, scale: 1.3 },
           { x: -45, z: 20, scale: 1.2 },
           { x: 45, z: 20, scale: 1.3 },
           { x: -30, z: -45, scale: 1.1 },
           { x: 30, z: -45, scale: 1.2 },
           { x: -30, z: 45, scale: 1.1 },
           { x: 30, z: 45, scale: 1.2 },
       ];

       treePositions.forEach(pos => {
           createTree(pos.x, pos.z, pos.scale);
       });

       // ==========================================
       // BUILDINGS WITH DOORS
       // ==========================================
       const buildings = [];
       const doors = [];

       function createBuilding(x, z, width, height, depth, color = 0x666666) {
           const buildingGroup = new THREE.Group();
           
           const geometry = new THREE.BoxGeometry(width, height, depth);
           const material = new THREE.MeshStandardMaterial({ 
               color: color,
               roughness: 0.7
           });
           const building = new THREE.Mesh(geometry, material);
           building.position.y = height / 2;
           building.castShadow = true;
           building.receiveShadow = true;
           buildingGroup.add(building);

           const roofGeo = new THREE.BoxGeometry(width + 0.5, 0.3, depth + 0.5);
           const roofMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
           const roof = new THREE.Mesh(roofGeo, roofMat);
           roof.position.y = height + 0.15;
           roof.castShadow = true;
           buildingGroup.add(roof);

           buildingGroup.position.set(x, 0, z);
           scene.add(buildingGroup);
           
           const buildingData = {
               mesh: buildingGroup,
               x: x,
               z: z,
               width: width,
               height: height,
               depth: depth
           };
           buildings.push(buildingData);

           createDoorPair(x, z, width, height, depth, 'x');
           createDoorPair(x, z, width, height, depth, 'z');
           
           return buildingGroup;
       }

       function createDoorPair(buildingX, buildingZ, width, height, depth, axis) {
           const doorWidth = 1.2;
           const doorHeight = 2.2;
           const doorDepth = 0.3;
           
           let door1Pos, door2Pos, door1Rot, door2Rot;
           
           if (axis === 'x') {
               door1Pos = { x: buildingX, y: doorHeight / 2, z: buildingZ - depth / 2 - doorDepth / 2 };
               door2Pos = { x: buildingX, y: doorHeight / 2, z: buildingZ + depth / 2 + doorDepth / 2 };
               door1Rot = 0;
               door2Rot = 0;
           } else {
               door1Pos = { x: buildingX - width / 2 - doorDepth / 2, y: doorHeight / 2, z: buildingZ };
               door2Pos = { x: buildingX + width / 2 + doorDepth / 2, y: doorHeight / 2, z: buildingZ };
               door1Rot = Math.PI / 2;
               door2Rot = Math.PI / 2;
           }

           const doorGeo = new THREE.BoxGeometry(doorWidth, doorHeight, doorDepth);
           const doorMat = new THREE.MeshStandardMaterial({ 
               color: 0x8B4513,
               emissive: 0x221100,
               emissiveIntensity: 0.2
           });
           
           const door1 = new THREE.Mesh(doorGeo, doorMat.clone());
           door1.position.set(door1Pos.x, door1Pos.y, door1Pos.z);
           door1.rotation.y = door1Rot;
           door1.castShadow = true;
           scene.add(door1);

           const glowGeo = new THREE.BoxGeometry(doorWidth + 0.2, doorHeight + 0.2, doorDepth + 0.1);
           const glowMat = new THREE.MeshBasicMaterial({ 
               color: 0x00ffff,
               transparent: true,
               opacity: 0.3
           });
           const glow1 = new THREE.Mesh(glowGeo, glowMat);
           door1.add(glow1);

           const door2 = new THREE.Mesh(doorGeo, doorMat.clone());
           door2.position.set(door2Pos.x, door2Pos.y, door2Pos.z);
           door2.rotation.y = door2Rot;
           door2.castShadow = true;
           scene.add(door2);

           const glow2 = new THREE.Mesh(glowGeo, glowMat.clone());
           door2.add(glow2);

           const doorPair = {
               door1: {
                   mesh: door1,
                   position: door1Pos,
                   teleportTo: { x: door2Pos.x, z: door2Pos.z }
               },
               door2: {
                   mesh: door2,
                   position: door2Pos,
                   teleportTo: { x: door1Pos.x, z: door1Pos.z }
               },
               axis: axis,
               buildingX: buildingX,
               buildingZ: buildingZ,
               width: width,
               depth: depth
           };
           doors.push(doorPair);
       }

       createBuilding(-15, -15, 8, 6, 8, 0x777777);
       createBuilding(15, -15, 10, 8, 6, 0x666666);
       createBuilding(-15, 15, 6, 5, 10, 0x888888);
       createBuilding(15, 15, 8, 7, 8, 0x777777);
       createBuilding(0, -25, 12, 4, 6, 0x999999);
       createBuilding(-25, 0, 6, 6, 12, 0x666666);
       createBuilding(25, 0, 8, 5, 8, 0x888888);
       createBuilding(0, 25, 10, 6, 8, 0x777777);

       // ==========================================
       // DOOR TELEPORTATION SYSTEM
       // ==========================================
       function checkDoorTeleport(playerPos) {
           const now = Date.now();
           if (now - gameState.lastTeleportTime < CONFIG.TELEPORT_COOLDOWN) return;
           // Only trigger at ground level - prevents flying above doors from teleporting
           if (playerPos.y > CONFIG.PLAYER_HEIGHT + 1.5) return;

           for (const doorPair of doors) {
               const dist1 = Math.sqrt(
                   Math.pow(playerPos.x - doorPair.door1.position.x, 2) +
                   Math.pow(playerPos.z - doorPair.door1.position.z, 2)
               );
               
               if (dist1 < 0.6) {
                   teleportPlayer(doorPair.door1.teleportTo, doorPair);
                   return;
               }

               const dist2 = Math.sqrt(
                   Math.pow(playerPos.x - doorPair.door2.position.x, 2) +
                   Math.pow(playerPos.z - doorPair.door2.position.z, 2)
               );
               
               if (dist2 < 0.6) {
                   teleportPlayer(doorPair.door2.teleportTo, doorPair);
                   return;
               }
           }
       }

       function teleportPlayer(targetPos, doorPair) {
           let offsetX = 0, offsetZ = 0;
           
           if (doorPair.axis === 'x') {
               offsetZ = targetPos.z > doorPair.buildingZ ? 2 : -2;
           } else {
               offsetX = targetPos.x > doorPair.buildingX ? 2 : -2;
           }

           camera.position.x = targetPos.x + offsetX;
           camera.position.z = targetPos.z + offsetZ;
           
           gameState.lastTeleportTime = Date.now();
           showTeleportNotification();
           createTeleportEffect(camera.position.x, camera.position.z);
       }

       function showTeleportNotification() {
           const notif = document.getElementById('teleport-notification');
           notif.style.display = 'block';
           setTimeout(() => notif.style.display = 'none', 1000);
       }

       function createTeleportEffect(x, z) {
           const particleCount = 20;
           const particles = [];
           
           for (let i = 0; i < particleCount; i++) {
               const particleMat = new THREE.MeshBasicMaterial({ 
                   color: 0x00ffff,
                   transparent: true,
                   opacity: 1
               });
               const particle = new THREE.Mesh(sharedTeleportParticleGeo, particleMat);
               
               particle.position.set(x, CONFIG.PLAYER_HEIGHT, z);
               particle.userData.velocity = new THREE.Vector3(
                   (Math.random() - 0.5) * 0.3,
                   Math.random() * 0.2,
                   (Math.random() - 0.5) * 0.3
               );
               
               scene.add(particle);
               particles.push(particle);
           }

           let frame = 0;
           const animateParticles = () => {
               frame++;
               particles.forEach(p => {
                   p.position.add(p.userData.velocity);
                   p.material.opacity -= 0.03;
               });
               
               if (frame < 30) {
                   requestAnimationFrame(animateParticles);
               } else {
                   particles.forEach(p => scene.remove(p));
               }
           };
           animateParticles();
       }
