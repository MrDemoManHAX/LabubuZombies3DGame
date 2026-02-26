// Game Configuration, Weapons & State
       // ==========================================
       // GAME CONFIGURATION
       // ==========================================
       const CONFIG = {
           PLAYER_SPEED: 0.100,
           PLAYER_HEIGHT: 1.6,
           
           LOOK_SENSITIVITY_X: 0.008,
           LOOK_SENSITIVITY_Y: 0.008,
           
           ZOMBIE_SPEED: 0.04,
           ZOMBIE_DAMAGE: 10,
           ZOMBIE_ATTACK_RANGE: 2,
           ZOMBIE_ATTACK_COOLDOWN: 1000,
           ZOMBIE_AGRO_CHANCE: 0.15,
           ZOMBIE_AGRO_SPEED_MULT: 2,
           ZOMBIE_AGRO_DAMAGE_MULT: 1.5,
           
           BOSS_HEALTH_MULT: 10,
           BOSS_SIZE_MULT: 2.5,
           BOSS_DAMAGE_MULT: 2,
           SUPER_BOSS_HEALTH_MULT: 20,
           SUPER_BOSS_SIZE_MULT: 5,
           SUPER_BOSS_DAMAGE_MULT: 4,
           
           MAX_HEALTH: 1000,
           MAX_ARMOR: 1000,
           
           DROP_CHANCE_AMMO: 0.4,
           DROP_CHANCE_HEALTH: 0.25,
           DROP_CHANCE_ARMOR: 0.2,

           TELEPORT_COOLDOWN: 1000
       };

       // ==========================================
       // WEAPONS DEFINITIONS
       // ==========================================
       const WEAPONS = {
           rifle: {
               name: 'RIFLE',
               icon: '🔫',
               damage: 34,
               fireRate: 100,
               clipSize: 30,
               maxAmmo: 120,
               color: 0x333333,
               recoil: 0.05,
               spread: 0,
               projectile: false
           },
           shotgun: {
               name: 'SHOTGUN',
               icon: '🔫',
               damage: 25,
               fireRate: 600,
               clipSize: 8,
               maxAmmo: 40,
               color: 0x8B4513,
               recoil: 0.15,
               spread: 0.1,
               pellets: 6,
               projectile: false
           },
           rocketLauncher: {
               name: 'ROCKET',
               icon: '🚀',
               damage: 800,
               fireRate: 1500,
               clipSize: 2,
               maxAmmo: 10,
               color: 0x006400,
               recoil: 0.25,
               spread: 0,
               projectile: true,
               explosionRadius: 40,
               projectileSpeed: 0.8,
               explosionColor: 0xff4400
           },
           grenadeLauncher: {
               name: 'GRENADE',
               icon: '💣',
               damage: 300,
               fireRate: 1000,
               clipSize: 4,
               maxAmmo: 16,
               color: 0x4a4a00,
               recoil: 0.12,
               spread: 0,
               projectile: true,
               explosionRadius: 10,
               projectileSpeed: 0.5,
               arc: true,
               explosionColor: 0xffcc00
           },
           freezeGun: {
               name: 'FREEZE',
               icon: '❄️',
               damage: 5,
               fireRate: 50,
               clipSize: 100,
               maxAmmo: 300,
               color: 0x00FFFF,
               recoil: 0.02,
               spread: 0.05,
               projectile: false,
               freezeDuration: 3000
           }
       };

       // ==========================================
       // GAME STATE
       // ==========================================
       const gameState = {
           health: CONFIG.MAX_HEALTH,
           armor: CONFIG.MAX_ARMOR,
           kills: 0,
           score: 0,
           coins: 0,
           wave: 1,
           isReloading: false,
           isGameOver: false,
           zombiesThisWave: 5,
           bossSpawned: false,
           bossDefeated: false,
           regularZombiesTotal: 5,
           regularZombiesSpawned: 0,
           regularZombiesKilled: 0,
           bossKilled: false,
           lastTeleportTime: 0,
           gameStarted: false,
           killStreak: 0,
           lastKillTime: 0,
           comboMultiplier: 1,
           highScore: parseInt(localStorage.getItem('zombieHighScore') || '0'),
           
           weapons: [
               { type: 'rifle', ammo: 30, totalAmmo: 120 }
           ],
           currentWeaponIndex: 0,
           maxWeaponSlots: 5,
           jumpVy: 0,
           jumpRequested: false,
           flyUnlocked: false,
           flyFuel: 100,
           flyHeld: false,
       };

       function getCurrentWeapon() {
           return gameState.weapons[gameState.currentWeaponIndex];
       }

       function getCurrentWeaponDef() {
           return WEAPONS[getCurrentWeapon().type];
       }