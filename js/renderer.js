// THREE.js Scene, Camera, Renderer & Lights
       // ==========================================
       // THREE.JS SETUP
       // ==========================================
       const canvas = document.getElementById('gameCanvas');
       const scene = new THREE.Scene();
       
       scene.background = new THREE.Color(0x87CEEB);
       scene.fog = new THREE.Fog(0x87CEEB, 30, 100);
       
       const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
       camera.position.set(0, CONFIG.PLAYER_HEIGHT, 5);

       const renderer = new THREE.WebGLRenderer({ 
           canvas: canvas, 
           antialias: false,
           powerPreference: "high-performance",
           stencil: false,
           depth: true
       });
       renderer.setSize(window.innerWidth, window.innerHeight);
       renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
       renderer.shadowMap.enabled = true;
       renderer.shadowMap.type = THREE.BasicShadowMap;
       renderer.sortObjects = false;

       const ambientLight = new THREE.AmbientLight(0x6699cc, 0.7);
       scene.add(ambientLight);

       const sunLight = new THREE.DirectionalLight(0xffffcc, 1.0);
       sunLight.position.set(30, 50, 20);
       sunLight.castShadow = true;
       sunLight.shadow.mapSize.width = 1024;
       sunLight.shadow.mapSize.height = 1024;
       sunLight.shadow.camera.near = 0.5;
       sunLight.shadow.camera.far = 100;
       sunLight.shadow.camera.left = -50;
       sunLight.shadow.camera.right = 50;
       sunLight.shadow.camera.top = 50;
       sunLight.shadow.camera.bottom = -50;
       scene.add(sunLight);

       const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x3a5f0b, 0.6);
       scene.add(hemiLight);
