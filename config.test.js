// Unit tests for config.js
// Simple tests that can be run in browser console

const tests = {
  'CONFIG has PLAYER_SPEED': () => typeof CONFIG.PLAYER_SPEED === 'number',
  'CONFIG has MAX_HEALTH': () => CONFIG.MAX_HEALTH === 1000,
  'CONFIG has ZOMBIE_SPEED': () => typeof CONFIG.ZOMBIE_SPEED === 'number',
  'WEAPONS has rifle': () => typeof WEAPONS.rifle === 'object',
  'WEAPONS has shotgun': () => typeof WEAPONS.shotgun === 'object',
  'WEAPONS.rifle has damage': () => typeof WEAPONS.rifle.damage === 'number',
  'gameState initializes health': () => gameState.health === CONFIG.MAX_HEALTH,
  'gameState has weapons array': () => Array.isArray(gameState.weapons),
};

let passed = 0, failed = 0;
for (const [name, test] of Object.entries(tests)) {
  try {
    if (test()) { console.log('✅', name); passed++; }
    else { console.log('❌', name); failed++; }
  } catch(e) {
    console.log('❌', name, '-', e.message); failed++;
  }
}
console.log(`\n${passed} passed, ${failed} failed`);
