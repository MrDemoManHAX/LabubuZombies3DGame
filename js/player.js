// Player movement, jumping, flying
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
       // KEYBOARD CONTROLS (Desktop)
       // ==========================================
       const keys = {};
       document.addEventListener('keydown', (e) => {
           keys[e.code] = true;
           if (e.code === 'KeyR') reload();
           if (e.code === 'KeyQ' || e.code === 'Tab') { e.preventDefault(); cycleWeapon(); }
           if (e.code === 'Space') {
               e.preventDefault();
               if (gameState.flyUnlocked) { gameState.flyHeld = true; }
               else { gameState.jumpRequested = true; }
           }
       });
       document.addEventListener('keyup', (e) => {
           keys[e.code] = false;
           if (e.code === 'Space') gameState.flyHeld = false;
       });

       // Pointer lock for desktop mouse look
       canvas.addEventListener('click', () => {
           if (!document.pointerLockElement) canvas.requestPointerLock();
       });
       document.addEventListener('mousemove', (e) => {
           if (document.pointerLockElement === canvas) {
               lookState.rotationY -= e.movementX * CONFIG.LOOK_SENSITIVITY_X;
               lookState.rotationX -= e.movementY * CONFIG.LOOK_SENSITIVITY_Y;
               lookState.rotationX = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, lookState.rotationX));
               camera.rotation.order = 'YXZ';
               camera.rotation.y = lookState.rotationY;
               camera.rotation.x = lookState.rotationX;
           }
       });
       document.addEventListener('mousedown', (e) => {
           if (document.pointerLockElement === canvas && e.button === 0) isShooting = true;
       });
       document.addEventListener('mouseup', (e) => {
           if (e.button === 0) isShooting = false;
       });

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