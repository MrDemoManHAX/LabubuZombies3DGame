// Perk shop system
       // ==========================================
       // PERK SHOP SYSTEM
       // ==========================================
       const PERK_DEFS = [
           {
               id: 'doublePickup',
               icon: '🎒',
               name: 'Scavenger',
               desc: 'Double all med kit, armour & ammo pickups + 2x coins from kills',
               cost: 50,
               duration: 90000   // 90 seconds
           },
           {
               id: 'invisibility',
               icon: '🌀',
               name: 'Activate Portal',
               desc: 'Labubus can\'t see you — they flock to the map centre',
               cost: 100,
               duration: 60000   // 60 seconds
           },
           {
               id: 'adrenaline',
               icon: '👟',
               name: 'Adrenaline Boots',
               desc: 'Move 30% faster',
               cost: 200,
               duration: 90000
           },
           {
               id: 'hollowPoints',
               icon: '🔥',
               name: 'Hollow Points',
               desc: 'All weapons deal 25% more damage',
               cost: 350,
               duration: 90000
           },
           {
               id: 'doubleTap',
               icon: '⚡',
               name: 'Double Tap',
               desc: 'Fire rate doubled on all weapons',
               cost: 600,
               duration: 60000
           }
       ];

       const perks = {};
       PERK_DEFS.forEach(p => {
           perks[p.id] = { active: false, endsAt: 0, timerEl: null, badgeEl: null };
       });

       let shopOpen = false;

       function openShop() {
           shopOpen = true;
           document.getElementById('shop-overlay').classList.add('open');
           renderShop();
       }

       function closeShop() {
           shopOpen = false;
           lastTime = performance.now(); // prevent huge deltaTime spike after pause
           document.getElementById('shop-overlay').classList.remove('open');
       }

       function renderShop() {
           document.getElementById('shop-coins-display').textContent = gameState.coins;
           const container = document.getElementById('shop-perks');
           container.innerHTML = '';

           PERK_DEFS.forEach(def => {
               const state = perks[def.id];
               const isActive = state.active;
               const canAfford = gameState.coins >= def.cost;

               const card = document.createElement('div');
               card.className = 'perk-card' +
                   (isActive ? ' active-perk' : (canAfford ? ' affordable' : ' cant-afford'));

               const remaining = isActive ? Math.ceil((state.endsAt - Date.now()) / 1000) : 0;

               card.innerHTML = `
                   <div class="perk-left">
                       <div class="perk-icon">${def.icon}</div>
                       <div class="perk-info">
                           <div class="perk-name">${def.name}</div>
                           <div class="perk-desc">${def.desc}</div>
                           <div class="perk-timer" style="display:${isActive ? 'block' : 'none'}">
                               ⏱ ${remaining}s remaining
                           </div>
                       </div>
                   </div>
                   <div class="perk-cost ${isActive ? 'active-cost' : ''}">
                       ${isActive ? '✅ ACTIVE' : '💰 ' + def.cost}
                   </div>`;

               if (!isActive && canAfford) {
                   card.addEventListener('click', () => buyPerk(def.id));
                   card.addEventListener('touchstart', (e) => { e.preventDefault(); buyPerk(def.id); }, { passive: false });
               }

               container.appendChild(card);
           });
       }

       function buyPerk(id) {
           const def = PERK_DEFS.find(p => p.id === id);
           if (!def || gameState.coins < def.cost) return;
           if (perks[id].active) return;

           gameState.coins -= def.cost;
           activatePerk(id, def);
           renderShop();
       }

       function activatePerk(id, def) {
           const state = perks[id];
           // Clear any existing timer
           if (state._timeout) clearTimeout(state._timeout);
           if (state._interval) clearInterval(state._interval);
           if (state.badgeEl) state.badgeEl.remove();

           state.active = true;
           state.endsAt = Date.now() + def.duration;

           // HUD badge
           const hud = document.getElementById('active-perks-hud');
           const badge = document.createElement('div');
           badge.className = 'hud-perk-badge';
           badge.id = 'perk-badge-' + id;
           hud.appendChild(badge);
           state.badgeEl = badge;

           // Notification
           showNotification(`${def.icon} ${def.name.toUpperCase()} ACTIVE!`, '#00ffcc');
           if (id === 'invisibility') {
               showNotification('🌀 PORTAL ACTIVATED!', '#cc88ff');
               if (window._portalHoop) window._portalHoop.visible = true;
           }

           // Countdown tick
           function tick() {
               const left = Math.ceil((state.endsAt - Date.now()) / 1000);
               if (state.badgeEl) state.badgeEl.textContent = `${def.icon} ${left}s`;
               if (shopOpen) renderShop();
           }
           tick();
           state._interval = setInterval(tick, 500);

           // Expiry
           state._timeout = setTimeout(() => {
               state.active = false;
               clearInterval(state._interval);
               if (state.badgeEl) { state.badgeEl.remove(); state.badgeEl = null; }
               showNotification(`${def.icon} ${def.name} EXPIRED`, '#ff6644');
               if (id === 'invisibility' && window._portalHoop) window._portalHoop.visible = false;
               if (shopOpen) renderShop();
           }, def.duration);
       }

       // Speed multiplier accessed in updatePlayer
       function getSpeedMultiplier() {
           return perks.adrenaline.active ? 1.3 : 1.0;
       }

       document.getElementById('shop-button').addEventListener('click', openShop);
       document.getElementById('shop-button').addEventListener('touchstart', (e) => {
           e.preventDefault(); e.stopPropagation(); openShop();
       }, { passive: false });

       document.getElementById('shop-close').addEventListener('click', closeShop);
       document.getElementById('shop-close').addEventListener('touchstart', (e) => {
           e.preventDefault(); closeShop();
       }, { passive: false });

       // Jump / Fly button
       const jumpBtn = document.getElementById('jump-button');
       const onBtnStart = (e) => {
           e.preventDefault();
           e.stopPropagation();
           if (gameState.flyUnlocked) {
               gameState.flyHeld = true;
           } else {
               gameState.jumpRequested = true;
           }
       };
       const onBtnEnd = (e) => {
           e.preventDefault();
           e.stopPropagation();
           gameState.flyHeld = false;
       };
       jumpBtn.addEventListener('touchstart', onBtnStart, { passive: false });
       jumpBtn.addEventListener('touchend',   onBtnEnd,   { passive: false });
       jumpBtn.addEventListener('mousedown',  onBtnStart);
       jumpBtn.addEventListener('mouseup',    onBtnEnd);
