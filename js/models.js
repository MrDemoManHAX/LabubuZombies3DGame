// 3D Model Loading (GLB files)
       // ==========================================
       // LABUBU ZOMBIE MODEL (GLB)
       // ==========================================
       const labubuModelUrl = 'https://raw.githubusercontent.com/MrDemoManHAX/my-game-models/main/labubu_zombie.glb';
       const gltfLoader = new THREE.GLTFLoader();
       let labubuTemplate = null;
       let labubuLoaded = false;
       let labubuBaseHeight = 0; // Store the base height once
       let labubuModelHeight = 0;

       function loadLabubuModel() {
           return new Promise((resolve, reject) => {
               gltfLoader.load(
                   labubuModelUrl,
                   (gltf) => {
                       labubuTemplate = gltf.scene;
                       
                       // Fix all materials in the template ONCE
                       labubuTemplate.traverse((child) => {
                           if (child.isMesh) {
                               child.castShadow = true;
                               child.receiveShadow = true;
                               
                               // Fix material issues - ensure fully opaque
                               if (child.material) {
                                   // Handle both single materials and material arrays
                                   const materials = Array.isArray(child.material) ? child.material : [child.material];
                                   materials.forEach(mat => {
                                       mat.transparent = false;
                                       mat.opacity = 1;
                                       mat.alphaTest = 0;
                                       mat.depthWrite = true;
                                       mat.depthTest = true;
                                       mat.side = THREE.FrontSide;
                                       mat.needsUpdate = true;
                                   });
                               }
                           }
                       });
                       
                       // Calculate base height once from template
                       labubuTemplate.updateMatrixWorld(true);
                       const box = new THREE.Box3().setFromObject(labubuTemplate);
                       labubuBaseHeight = -box.min.y;
                       labubuModelHeight = box.max.y - box.min.y;
                       
                       labubuLoaded = true;
                       console.log('Labubu: baseHeight=', labubuBaseHeight, 'modelHeight=', labubuModelHeight);
                       resolve();
                   },
                   (progress) => {
                       if (progress.total > 0) {
                           console.log('Loading progress:', (progress.loaded / progress.total * 100).toFixed(1) + '%');
                       }
                   },
                   (error) => {
                       console.error('Error loading labubu model:', error);
                       resolve(); // Still resolve so game can use fallback
                   }
               );
           });
       }

       // WARRIOR PLAYER MODEL (GLB)
       // ==========================================
       const warriorModelUrl = 'https://raw.githubusercontent.com/MrDemoManHAX/LabubuZombies3DGame/main/warrior.glb';
       let warriorTemplate = null;
       let warriorLoaded = false;
       let warriorBaseHeight = 0;

       function loadWarriorModel() {
           return new Promise((resolve) => {
               gltfLoader.load(
                   warriorModelUrl,
                   (gltf) => {
                       warriorTemplate = gltf.scene;
                       warriorTemplate.traverse((child) => {
                           if (child.isMesh) {
                               child.castShadow = true;
                               child.receiveShadow = true;
                               if (child.material) {
                                   const materials = Array.isArray(child.material) ? child.material : [child.material];
                                   materials.forEach(mat => {
                                       mat.transparent = false;
                                       mat.opacity = 1;
                                       mat.alphaTest = 0;
                                       mat.depthWrite = true;
                                       mat.depthTest = true;
                                       mat.side = THREE.FrontSide;
                                       mat.needsUpdate = true;
                                   });
                               }
                           }
                       });
                       warriorTemplate.updateMatrixWorld(true);
                       const box = new THREE.Box3().setFromObject(warriorTemplate);
                       warriorBaseHeight = -box.min.y;
                       warriorLoaded = true;
                       console.log('Warrior player model loaded successfully');
                       resolve();
                   },
                   undefined,
                   (error) => {
                       console.error('Error loading warrior model:', error);
                       resolve();
                   }
               );
           });
       }

       // GOLEM BOSS MODEL (GLB)
       // ==========================================
       const golemModelUrl = 'https://raw.githubusercontent.com/MrDemoManHAX/LabubuZombies3DGame/main/golem.glb';
       let golemTemplate = null;
       let golemLoaded = false;
       let golemBaseHeight = 0;
       let golemModelHeight = 0;

       function loadGolemModel() {
           return new Promise((resolve) => {
               gltfLoader.load(
                   golemModelUrl,
                   (gltf) => {
                       golemTemplate = gltf.scene;
                       golemTemplate.traverse((child) => {
                           if (child.isMesh) {
                               child.castShadow = true;
                               child.receiveShadow = true;
                               if (child.material) {
                                   const materials = Array.isArray(child.material) ? child.material : [child.material];
                                   materials.forEach(mat => {
                                       mat.transparent = false;
                                       mat.opacity = 1;
                                       mat.alphaTest = 0;
                                       mat.depthWrite = true;
                                       mat.depthTest = true;
                                       mat.side = THREE.FrontSide;
                                       mat.needsUpdate = true;
                                   });
                               }
                           }
                       });
                       golemTemplate.updateMatrixWorld(true);
                       const box = new THREE.Box3().setFromObject(golemTemplate);
                       golemBaseHeight = -box.min.y;
                       golemModelHeight = box.max.y - box.min.y;
                       golemLoaded = true;
                       console.log('Golem: baseHeight=', golemBaseHeight, 'modelHeight=', golemModelHeight);
                       resolve();
                   },
                   undefined,
                   (error) => {
                       console.error('Error loading golem model:', error);
                       resolve();
                   }
               );
           });
       }

       // OVERLORD SUPER BOSS MODEL (GLB)
       // ==========================================
       const overlordModelUrl = 'https://raw.githubusercontent.com/MrDemoManHAX/LabubuZombies3DGame/main/overlord.glb';
       let overlordTemplate = null;
       let overlordLoaded = false;
       let overlordBaseHeight = 0;
       let overlordModelHeight = 0;

       function loadOverlordModel() {
           return new Promise((resolve) => {
               gltfLoader.load(
                   overlordModelUrl,
                   (gltf) => {
                       overlordTemplate = gltf.scene;
                       overlordTemplate.traverse((child) => {
                           if (child.isMesh) {
                               child.castShadow = true;
                               child.receiveShadow = true;
                               if (child.material) {
                                   const materials = Array.isArray(child.material) ? child.material : [child.material];
                                   materials.forEach(mat => {
                                       mat.transparent = false;
                                       mat.opacity = 1;
                                       mat.alphaTest = 0;
                                       mat.depthWrite = true;
                                       mat.depthTest = true;
                                       mat.side = THREE.FrontSide;
                                       mat.needsUpdate = true;
                                   });
                               }
                           }
                       });
                       overlordTemplate.updateMatrixWorld(true);
                       const box = new THREE.Box3().setFromObject(overlordTemplate);
                       overlordBaseHeight = -box.min.y;
                       overlordModelHeight = box.max.y - box.min.y;
                       overlordLoaded = true;
                       console.log('Overlord: baseHeight=', overlordBaseHeight, 'modelHeight=', overlordModelHeight);
                       resolve();
                   },
                   undefined,
                   (error) => {
                       console.error('Error loading overlord model:', error);
                       resolve();
                   }
               );
           });
       }

       // ==========================================
       // DEEP CLONE FUNCTION FOR GLTF
       // ==========================================
       function deepCloneGLTF(source) {
           const clone = source.clone(true);
           
           const sourceMaterials = [];
           source.traverse((child) => {
               if (child.isMesh && child.material) {
                   sourceMaterials.push({
                       uuid: child.uuid,
                       material: child.material
                   });
               }
           });
           
           clone.traverse((child) => {
               if (child.isMesh && child.material) {
                   // Deep clone the material
                   if (Array.isArray(child.material)) {
                       child.material = child.material.map(mat => {
                           const newMat = mat.clone();
                           newMat.transparent = false;
                           newMat.opacity = 1;
                           newMat.alphaTest = 0;
                           newMat.depthWrite = true;
                           newMat.depthTest = true;
                           newMat.needsUpdate = true;
                           return newMat;
                       });
                   } else {
                       child.material = child.material.clone();
                       child.material.transparent = false;
                       child.material.opacity = 1;
                       child.material.alphaTest = 0;
                       child.material.depthWrite = true;
                       child.material.depthTest = true;
                       child.material.needsUpdate = true;
                   }
                   
                   child.castShadow = true;
                   child.receiveShadow = true;
               }
           });
           
           return clone;
       }