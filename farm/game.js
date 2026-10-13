/* ============================================================
   OUR LITTLE FARM  --  game engine
   Vanilla JS + canvas. No backend. Saves to localStorage.
   Edit gameConfig.js (not this file) to personalize text.
   ============================================================ */
(function () {
  'use strict';

  var CFG = window.GAME_CONFIG;
  var P = CFG.palette;

  var TILE = 16;
  var VIEW_W = 320, VIEW_H = 180;
  var WORLD_W = 40, WORLD_H = 26;
  var WORLD_PX_W = WORLD_W * TILE, WORLD_PX_H = WORLD_H * TILE;
  var SAVE_KEY = 'ourLittleFarmSave_v1';

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  /* ---------------- tiny draw helpers ---------------- */
  function R(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); }
  function RR(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function hash(x, y) {
    var n = (x * 374761393 + y * 668265263) | 0;
    n = (n ^ (n >> 13)) * 1274126177;
    return ((n ^ (n >> 16)) >>> 0) / 4294967295;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ---------------- world layout ---------------- */
  var HOUSE = { x: 5, y: 3, w: 6, h: 5 };     // tiles
  var POND = { cx: 7.5, cy: 19, rx: 5, ry: 3.2 };
  var DOOR_TILE = { x: 8, y: 7 };
  var GATE = { x: 30, y: 6 };
  var SECRET = { x0: 31, y0: 4, x1: 36, y1: 8 };
  var FINAL_TILE = { x: 34, y: 7 };

  var solid = [];                             // solid[y][x]
  var plotMap = {};                           // "x,y" -> plot
  var objects = [];                           // drawable solid/decor objects
  var collectibles = [];                      // {id,x,y,got}

  function inPond(tx, ty) {
    var dx = (tx + 0.5 - POND.cx) / POND.rx;
    var dy = (ty + 0.5 - POND.cy) / POND.ry;
    return dx * dx + dy * dy <= 1;
  }
  function inHouse(tx, ty) {
    return tx >= HOUSE.x && tx < HOUSE.x + HOUSE.w && ty >= HOUSE.y && ty < HOUSE.y + HOUSE.h;
  }
  function isPath(tx, ty) {
    if (tx === 8 && ty >= 8 && ty <= 13) return true;             // below door
    if (ty === 13 && tx >= 8 && tx <= 20) return true;           // across
    if (tx === 20 && ty >= 13 && ty <= 21) return true;          // to mailbox
    if (tx === 15 && ty >= 7 && ty <= 8) return true;            // into garden
    return false;
  }
  function isSecretBorder(tx, ty) {
    if (tx === GATE.x && ty === GATE.y) return false;
    var l = SECRET.x0 - 1, r = SECRET.x1 + 1, t = SECRET.y0 - 1, b = SECRET.y1 + 1;
    if (tx >= l && tx <= r && (ty === t || ty === b)) return true;
    if (ty >= t && ty <= b && (tx === l || tx === r)) return true;
    return false;
  }
  function isSecretInterior(tx, ty) {
    return tx >= SECRET.x0 && tx <= SECRET.x1 && ty >= SECRET.y0 && ty <= SECRET.y1;
  }

  function addObj(type, tx, ty, solidTile) { objects.push({ type: type, tx: tx, ty: ty, solid: solidTile !== false }); }

  function buildWorld() {
    solid = [];
    for (var y = 0; y < WORLD_H; y++) {
      solid[y] = [];
      for (var x = 0; x < WORLD_W; x++) {
        solid[y][x] = inPond(x, y) || inHouse(x, y) || isSecretBorder(x, y);
      }
    }

    // garden plots
    for (var px = 14; px <= 17; px++) {
      for (var py = 8; py <= 10; py++) {
        plotMap[px + ',' + py] = { tilled: false, crop: null, growth: 0, watered: false, mature: false };
      }
    }

    objects = [];
    addObj('houseTiles', 0, 0, false); // placeholder marker; house drawn specially
    objects.pop();

    // trees
    var trees = [[1,1],[3,2],[12,1],[24,1],[28,2],[31,1],[36,1],[38,3],[38,7],[38,12],[38,18],[38,24],
                 [1,24],[6,24],[13,24],[26,24],[34,24],[1,12],[1,18],[2,6],
                 [26,6],[27,8],[25,16],[18,19],[15,21],[30,14],[33,16],[22,3]];
    trees.forEach(function (t) { addObj('tree', t[0], t[1], true); });

    // rocks
    [[18,5],[27,16],[9,14],[33,20],[3,21]].forEach(function (t) { addObj('rock', t[0], t[1], true); });

    // shrubs
    [[14,3],[35,11],[2,15]].forEach(function (t) { addObj('shrub', t[0], t[1], true); });

    // top fence
    for (var fx = 13; fx <= 27; fx++) addObj('fence', fx, 2, true);

    // mushrooms (decor)
    [[16,16],[28,11],[5,15]].forEach(function (t) { addObj('mushroom', t[0], t[1], false); });

    // decorations: flowers, grass
    [[3,13],[11,13],[21,17],[19,8],[10,20],[32,12],[6,11],[23,20],[29,21]].forEach(function (t) {
      addObj('flowerDeco', t[0], t[1], false);
    });

    // secret garden hedge (leave the gate tile open)
    function hedge(tx, ty) {
      if (tx === GATE.x && ty === GATE.y) return;
      addObj('hedge', tx, ty, true);
    }
    for (var hx = SECRET.x0 - 1; hx <= SECRET.x1 + 1; hx++) {
      hedge(hx, SECRET.y0 - 1);
      hedge(hx, SECRET.y1 + 1);
    }
    for (var hy = SECRET.y0; hy <= SECRET.y1; hy++) {
      hedge(SECRET.x0 - 1, hy);
      hedge(SECRET.x1 + 1, hy);
    }
    // gate object (handled specially)
    objects.push({ type: 'gate', tx: GATE.x, ty: GATE.y, solid: false });

    // special in-world points
    objects.push({ type: 'mailbox', tx: 20, ty: 21, solid: true });
    objects.push({ type: 'seedbox', tx: 12, ty: 10, solid: true });
    objects.push({ type: 'sign', tx: 24, ty: 12, solid: true });
    objects.push({ type: 'door', tx: DOOR_TILE.x, ty: DOOR_TILE.y, solid: false, hidden: true });
    objects.push({ type: 'finalLetter', tx: FINAL_TILE.x, ty: FINAL_TILE.y, solid: false, hidden: true });

    // secret garden interior flowers
    [[32,4],[35,4],[32,8],[35,8],[33,6],[35,6]].forEach(function (t) {
      objects.push({ type: 'heartFlower', tx: t[0], ty: t[1], solid: false });
    });

    // collectibles
    collectibles = [
      { id: 'flower', tx: 13, ty: 15 },
      { id: 'heart', tx: 4, ty: 9 },
      { id: 'shell', tx: 12, ty: 17 },
      { id: 'photo', tx: 23, ty: 13 },
      { id: 'ribbon', tx: 27, ty: 7 },
      { id: 'key', tx: 17, ty: 4 },
      { id: 'locket', tx: 21, ty: 22 }
    ];
  }

  /* ---------------- game state ---------------- */
  var state;
  function freshState() {
    var s = {
      day: 1,
      coins: 0,
      items: { carrot: 0, strawberry: 0, flower: 0 },
      seeds: { carrot: 5, strawberry: 3, flower: 2 },
      selected: 'carrot',
      plots: {},
      collected: {},
      gateOpen: false,
      ending: false,
      seenIntro: false,
      muted: false,
      player: { x: 8 * TILE + 8, y: 12 * TILE + 8, dir: 'down', step: 0, moving: false },
      playTime: 0
    };
    collectibles.forEach(function (c) { s.collected[c.id] = false; });
    return s;
  }

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        day: state.day, coins: state.coins, items: state.items, seeds: state.seeds,
        selected: state.selected, plots: state.plots, collected: state.collected,
        gateOpen: state.gateOpen, ending: state.ending, seenIntro: state.seenIntro,
        player: { x: state.player.x, y: state.player.y, dir: state.player.dir }
      }));
    } catch (e) { /* ignore */ }
  }
  function load() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  /* ---------------- collision ---------------- */
  function tileSolid(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= WORLD_W || ty >= WORLD_H) return true;
    return !!solid[ty][tx];
  }
  function applyGate() {
    solid[GATE.y][GATE.x] = !state.gateOpen;
  }
  function posSolid(px, py) {
    var tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
    return tileSolid(tx, ty);
  }
  function canStand(px, py) {
    var hw = 5, hh = 3;
    return !(posSolid(px - hw, py - hh) || posSolid(px + hw, py - hh) ||
             posSolid(px - hw, py) || posSolid(px + hw, py));
  }

  /* ---------------- input ---------------- */
  var keys = { up: false, down: false, left: false, right: false };
  function keyDir(k) {
    k = k.toLowerCase();
    if (k === 'w' || k === 'arrowup') return 'up';
    if (k === 's' || k === 'arrowdown') return 'down';
    if (k === 'a' || k === 'arrowleft') return 'left';
    if (k === 'd' || k === 'arrowright') return 'right';
    return null;
  }
  window.addEventListener('keydown', function (e) {
    var d = keyDir(e.key);
    if (d) { keys[d] = true; e.preventDefault(); return; }
    if (e.key === 'e' || e.key === 'E' || e.key === ' ') { e.preventDefault(); doAction(); return; }
    if (e.key === 'Escape') { e.preventDefault(); toggleMenu(); return; }
    if (e.key === '1') selectSeed('carrot');
    if (e.key === '2') selectSeed('strawberry');
    if (e.key === '3') selectSeed('flower');
    if (e.key === 'm' || e.key === 'M') Sound.toggleMuteUI();
  });
  window.addEventListener('keyup', function (e) {
    var d = keyDir(e.key);
    if (d) { keys[d] = false; e.preventDefault(); }
  });

  // touch
  document.querySelectorAll('.dbtn').forEach(function (b) {
    var dir = b.getAttribute('data-dir');
    function on(e) { e.preventDefault(); keys[dir] = true; }
    function off(e) { e.preventDefault(); keys[dir] = false; }
    b.addEventListener('touchstart', on, { passive: false });
    b.addEventListener('touchend', off, { passive: false });
    b.addEventListener('touchcancel', off, { passive: false });
    b.addEventListener('mousedown', on);
    b.addEventListener('mouseup', off);
    b.addEventListener('mouseleave', off);
  });
  var actBtn = document.getElementById('actBtn');
  actBtn.addEventListener('click', function (e) { e.preventDefault(); doAction(); });
  window.addEventListener('touchmove', function (e) {
    if (e.target.closest && (e.target.closest('.dpad') || e.target.closest('.act-btn'))) e.preventDefault();
  }, { passive: false });

  /* ---------------- audio (WebAudio synth) ---------------- */
  var Sound = {
    ctx: null, master: null, muted: false, ambientTimer: null,
    init: function () {
      if (this.ctx) return;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.45;
      this.master.connect(this.ctx.destination);
    },
    tone: function (freq, dur, type, vol, when) {
      if (!this.ctx || this.muted) return;
      var o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type || 'square';
      o.frequency.value = freq;
      var t = (when || this.ctx.currentTime);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + dur + 0.02);
    },
    play: function (name) {
      if (!this.ctx || this.muted) return;
      var t = this.ctx.currentTime;
      if (name === 'step') this.tone(150, 0.06, 'triangle', 0.05);
      else if (name === 'till') { this.tone(120, 0.12, 'square', 0.09); this.tone(90, 0.16, 'sawtooth', 0.05, t + 0.03); }
      else if (name === 'plant') { this.tone(520, 0.08, 'triangle', 0.1); this.tone(660, 0.08, 'triangle', 0.08, t + 0.06); }
      else if (name === 'water') { this.tone(400, 0.18, 'sine', 0.08); this.tone(300, 0.22, 'sine', 0.06, t + 0.05); }
      else if (name === 'harvest') { this.tone(660, 0.09, 'triangle', 0.1); this.tone(880, 0.12, 'triangle', 0.1, t + 0.07); this.tone(1100, 0.14, 'triangle', 0.08, t + 0.15); }
      else if (name === 'discover') { this.tone(740, 0.1, 'sine', 0.1); this.tone(988, 0.12, 'sine', 0.1, t + 0.09); this.tone(1318, 0.18, 'sine', 0.09, t + 0.19); }
      else if (name === 'letter') { this.tone(523, 0.2, 'sine', 0.09); this.tone(659, 0.22, 'sine', 0.09, t + 0.16); this.tone(784, 0.3, 'sine', 0.1, t + 0.33); }
      else if (name === 'open') this.tone(600, 0.09, 'square', 0.07);
      else if (name === 'blocked') this.tone(140, 0.1, 'square', 0.07);
      else if (name === 'coin') { this.tone(988, 0.07, 'square', 0.09); this.tone(1318, 0.1, 'square', 0.08, t + 0.05); }
    },
    startAmbient: function () {
      if (!this.ctx || this.ambientTimer) return;
      var self = this;
      var notes = [261.6, 329.6, 392.0, 329.6, 293.7, 349.2, 440.0, 349.2];
      var i = 0;
      this.ambientTimer = setInterval(function () {
        if (self.muted) return;
        var n = notes[i % notes.length];
        self.tone(n, 1.6, 'sine', 0.035);
        self.tone(n / 2, 1.8, 'sine', 0.02);
        i++;
      }, 1700);
    },
    toggleMute: function () {
      this.muted = !this.muted;
      if (this.master) this.master.gain.value = this.muted ? 0 : 0.45;
      return this.muted;
    }
  };

  /* ---------------- dialogue ---------------- */
  var dlg = { open: false, who: '', lines: [], idx: 0, shown: 0, typing: false, onDone: null };
  var dlgEl = document.getElementById('dialogue');
  var dlgText = document.getElementById('dlgText');
  var dlgWho = document.getElementById('dlgWho');
  var dlgCont = document.getElementById('dlgCont');

  function say(who, lines, onDone) {
    if (typeof lines === 'string') lines = [lines];
    dlg.open = true; dlg.who = who || ''; dlg.lines = lines.slice(); dlg.idx = 0;
    dlg.shown = 0; dlg.typing = true; dlg.onDone = onDone || null;
    dlgWho.textContent = who || '';
    dlgWho.style.display = who ? '' : 'none';
    dlgEl.classList.add('show');
    renderDlgLine();
  }
  function renderDlgLine() {
    dlgText.innerHTML = '<span id="dlgBody"></span><span class="cursor" id="dlgCur">▌</span>';
    dlg.shown = 0;
    dlgCont.classList.add('hidden');
  }
  function advanceDlg() {
    if (!dlg.open) return;
    var line = dlg.lines[dlg.idx] || '';
    if (dlg.typing && dlg.shown < line.length) {
      dlg.shown = line.length; updateDlgText(); dlg.typing = false; finishLine(); return;
    }
    dlg.idx++;
    if (dlg.idx >= dlg.lines.length) {
      dlg.open = false;
      dlgEl.classList.remove('show');
      var cb = dlg.onDone; dlg.onDone = null;
      if (cb) cb();
      save();
    } else {
      dlg.typing = true; renderDlgLine();
    }
  }
  function updateDlgText() {
    var body = document.getElementById('dlgBody');
    if (!body) return;
    body.textContent = (dlg.lines[dlg.idx] || '').slice(0, dlg.shown);
  }
  function finishLine() { dlgCont.classList.remove('hidden'); }

  function tickDialogue(dt) {
    if (!dlg.open || !dlg.typing) return;
    var line = dlg.lines[dlg.idx] || '';
    dlg.shown += dt * 45;
    if (dlg.shown >= line.length) { dlg.shown = line.length; dlg.typing = false; finishLine(); }
    updateDlgText();
  }

  /* ---------------- UI wiring ---------------- */
  var invEl = document.getElementById('inventory');
  var hintEl = document.getElementById('hint');
  var hudEl = document.getElementById('hud');
  var touchEl = document.getElementById('touch');
  var menuEl = document.getElementById('menu');
  var shopEl = document.getElementById('shop');
  var titleEl = document.getElementById('title');
  var endEl = document.getElementById('ending');
  var controlsEl = document.getElementById('controls');

  function buildInventory() {
    invEl.innerHTML = '';
    ['carrot', 'strawberry', 'flower'].forEach(function (k, i) {
      var slot = document.createElement('button');
      slot.className = 'slot' + (state.selected === k ? ' active' : '');
      slot.setAttribute('data-seed', k);
      slot.setAttribute('aria-label', 'Select ' + CFG.cropNames[k] + ' seed');
      var cv = document.createElement('canvas'); cv.width = 16; cv.height = 16;
      var c2 = cv.getContext('2d'); c2.imageSmoothingEnabled = false;
      drawSeedIcon(c2, k);
      slot.appendChild(cv);
      var num = document.createElement('span'); num.className = 'num'; num.textContent = (i + 1); slot.appendChild(num);
      var cnt = document.createElement('span'); cnt.className = 'count'; cnt.textContent = state.seeds[k]; cnt.setAttribute('data-count', k); slot.appendChild(cnt);
      slot.addEventListener('click', function () { selectSeed(k); });
      invEl.appendChild(slot);
    });
  }
  function refreshInventory() {
    ['carrot', 'strawberry', 'flower'].forEach(function (k) {
      var el = invEl.querySelector('[data-count="' + k + '"]');
      if (el) el.textContent = state.seeds[k];
      var slot = invEl.querySelector('[data-seed="' + k + '"]');
      if (slot) slot.classList.toggle('active', state.selected === k);
    });
  }
  function selectSeed(k) {
    state.selected = k;
    refreshInventory();
    Sound.play('open');
  }
  function updateHud() {
    document.getElementById('dayLabel').textContent = 'Day ' + state.day;
    document.getElementById('coinLabel').textContent = state.coins;
    var got = collectibles.filter(function (c) { return state.collected[c.id]; }).length;
    document.getElementById('keepLabel').textContent = got + ' / 7 keepsakes';
    var sb = document.getElementById('soundBtn');
    sb.textContent = '♪ ' + (Sound.muted ? 'off' : 'on');
    document.getElementById('menuSoundBtn').textContent = '♪ sound: ' + (Sound.muted ? 'off' : 'on');
  }

  document.getElementById('soundBtn').addEventListener('click', function () { Sound.toggleMute(); updateHud(); });
  document.getElementById('menuBtn').addEventListener('click', function () { openMenu(); });
  document.getElementById('resumeBtn').addEventListener('click', function () { closeMenu(); });
  document.getElementById('menuSoundBtn').addEventListener('click', function () { Sound.toggleMute(); updateHud(); });
  document.getElementById('restartBtn').addEventListener('click', function () {
    if (confirm('Start the farm over? This clears your saved progress.')) restart();
  });
  document.getElementById('controlsBtn').addEventListener('click', function () { showPanel(controlsEl); });
  document.getElementById('controlsBack').addEventListener('click', function () { hidePanel(controlsEl); });
  document.getElementById('shopClose').addEventListener('click', function () { hidePanel(shopEl); });
  document.getElementById('startBtn').addEventListener('click', function () { startNew(); });
  document.getElementById('continueBtn').addEventListener('click', function () { startContinue(); });
  document.getElementById('keepPlaying').addEventListener('click', function () { hidePanel(endEl); state.ending = true; save(); });
  document.getElementById('endRestart').addEventListener('click', function () { restart(); });

  document.getElementById('controlsText').innerHTML =
    '• Move: <b>WASD</b> or arrow keys / on-screen pad<br>' +
    '• Interact: <b>E</b> or space / big button<br>' +
    '• Pick seed: <b>1</b> carrot · <b>2</b> strawberry · <b>3</b> moonflower<br>' +
    '• Menu: <b>Esc</b> · Sound: <b>M</b><br>' +
    '1. Walk to a soil patch and press E to till it.<br>' +
    '2. Press E again to plant your chosen seed.<br>' +
    '3. Press E on the crop to water it (it must be watered).<br>' +
    '4. Stand at the cottage door and press E to sleep.<br>' +
    '5. Watered crops grow each night. Harvest when full-grown.<br>' +
    'Find all 7 keepsakes to open the hidden garden.';

  function showPanel(el) { el.classList.add('show'); }
  function hidePanel(el) { el.classList.remove('show'); }
  function openMenu() { showPanel(menuEl); }
  function closeMenu() { hidePanel(menuEl); }
  function toggleMenu() {
    if (dlg.open) { advanceDlg(); return; }
    if (shopEl.classList.contains('show')) { hidePanel(shopEl); return; }
    if (controlsEl.classList.contains('show')) { hidePanel(controlsEl); return; }
    if (endEl.classList.contains('show')) return;
    if (titleEl.classList.contains('show')) return;
    if (menuEl.classList.contains('show')) closeMenu(); else openMenu();
  }

  /* ---------------- shop ---------------- */
  var SEED_COST = { carrot: 3, strawberry: 5, flower: 4 };
  function openShop() {
    buildShop();
    showPanel(shopEl);
  }
  function buildShop() {
    var list = document.getElementById('shopList');
    list.innerHTML = '';
    ['carrot', 'strawberry', 'flower'].forEach(function (k) {
      var row = document.createElement('div'); row.className = 'shop-row';
      var left = document.createElement('div'); left.className = 'seed';
      var cv = document.createElement('canvas'); cv.width = 16; cv.height = 16;
      var c2 = cv.getContext('2d'); c2.imageSmoothingEnabled = false; drawSeedIcon(c2, k);
      left.appendChild(cv);
      var nm = document.createElement('span'); nm.textContent = CFG.cropNames[k]; left.appendChild(nm);
      var price = document.createElement('span'); price.className = 'price'; price.textContent = '◆ ' + SEED_COST[k];
      var buy = document.createElement('button'); buy.className = 'btn buy'; buy.textContent = 'buy';
      buy.addEventListener('click', function () {
        if (state.coins < SEED_COST[k]) { Sound.play('blocked'); return; }
        state.coins -= SEED_COST[k]; state.seeds[k]++; Sound.play('coin');
        updateHud(); refreshInventory(); buildShop(); save();
      });
      row.appendChild(left); row.appendChild(price); row.appendChild(buy);
      list.appendChild(row);
    });
  }

  /* ---------------- actions / interaction ---------------- */
  function doAction() {
    if (titleEl.classList.contains('show') || endEl.classList.contains('show')) return;
    if (menuEl.classList.contains('show') || shopEl.classList.contains('show') || controlsEl.classList.contains('show')) return;
    if (dlg.open) { advanceDlg(); return; }
    interact();
  }

  function frontTile() {
    var dx = 0, dy = 0, d = state.player.dir;
    if (d === 'up') dy = -1; else if (d === 'down') dy = 1; else if (d === 'left') dx = -1; else dx = 1;
    var tx = Math.floor(state.player.x / TILE) + dx;
    var ty = Math.floor(state.player.y / TILE) + dy;
    return { x: tx, y: ty };
  }
  function hereTile() { return { x: Math.floor(state.player.x / TILE), y: Math.floor(state.player.y / TILE) }; }

  function objAt(tx, ty) {
    for (var i = 0; i < objects.length; i++) {
      if (objects[i].tx === tx && objects[i].ty === ty) return objects[i];
    }
    return null;
  }
  function collectibleAt(tx, ty) {
    for (var i = 0; i < collectibles.length; i++) {
      var c = collectibles[i];
      if (c.tx === tx && c.ty === ty && !state.collected[c.id]) return c;
    }
    return null;
  }

  function interact() {
    var f = frontTile(), h = hereTile();
    // collectibles first (front, then here)
    var c = collectibleAt(f.x, f.y) || collectibleAt(h.x, h.y);
    if (c) { pickCollectible(c); return; }

    // plots
    var pk = plotKey(f.x, f.y) || plotKey(h.x, h.y);
    if (pk) { tendPlot(pk); return; }

    // objects in front
    var o = objAt(f.x, f.y) || objAt(h.x, h.y);
    if (o) {
      if (o.type === 'door') { sleep(); return; }
      if (o.type === 'mailbox') { say('mailbox', CFG.openingLetter.lines, null); Sound.play('open'); return; }
      if (o.type === 'seedbox') { openShop(); Sound.play('open'); return; }
      if (o.type === 'sign') { say('the sign', [CFG.farmName + '\n' + '-- ' + CFG.milestone + ' --'], null); return; }
      if (o.type === 'gate') { gateInteract(); return; }
      if (o.type === 'finalLetter') { doEnding(); return; }
    }
    // water tiles can't be interacted
  }

  function plotKey(tx, ty) { return plotMap[tx + ',' + ty] ? (tx + ',' + ty) : null; }

  function tendPlot(key) {
    var p = state.plots[key];
    if (!p) { state.plots[key] = { tilled: false, crop: null, growth: 0, watered: false, mature: false }; p = state.plots[key]; }
    var name = state.selected;
    if (!p.tilled) { p.tilled = true; Sound.play('till'); flash(key); return; }
    if (!p.crop) {
      if (state.seeds[name] <= 0) { say('', ['No ' + CFG.cropNames[name].toLowerCase() + ' seeds left. Try the seed box near the cottage.'], null); return; }
      p.crop = name; p.growth = 0; p.watered = false;
      state.seeds[name]--; refreshInventory(); Sound.play('plant'); flash(key); save(); return;
    }
    if (p.mature) { harvest(key, p); return; }
    if (!p.watered) { p.watered = true; Sound.play('water'); flash(key); return; }
    say('', ['It is growing happily. Sleep at the cottage to help it along.'], null);
  }

  function harvest(key, p) {
    var c = p.crop;
    var coins = c === 'carrot' ? 4 : c === 'strawberry' ? 7 : 5;
    state.items[c]++; state.coins += coins;
    p.crop = null; p.growth = 0; p.watered = false; p.mature = false;
    Sound.play('harvest'); updateHud(); flash(key); save();
    say('', ['Harvested ' + CFG.cropNames[c] + '!  +' + coins + ' coins'], null);
  }

  function flash(key) {
    var parts = key.split(','); var tx = +parts[0], ty = +parts[1];
    fx.push({ x: tx * TILE + 8, y: ty * TILE + 6, t: 0 });
  }

  function gateInteract() {
    if (state.gateOpen) { say('', [CFG.gateOpenMessage], null); return; }
    var got = collectibles.filter(function (c) { return state.collected[c.id]; }).length;
    if (got >= 7) { openGate(); }
    else { say('', [CFG.gateLockedMessage, 'Keepsakes found: ' + got + ' / 7'], null); }
  }
  function openGate() {
    state.gateOpen = true; applyGate();
    Sound.play('discover');
    say('', [CFG.gateOpenMessage], null);
    save();
  }

  function pickCollectible(c) {
    state.collected[c.id] = true;
    var info = CFG.collectibles[c.id];
    Sound.play('discover');
    var got = collectibles.filter(function (x) { return state.collected[x.id]; }).length;
    var lines = [info.name + '\n\n' + info.text];
    say(CFG.recipientName !== '[HER NICKNAME]' ? CFG.recipientName : 'a keepsake', lines, function () {
      updateHud();
      if (got >= 7 && !state.gateOpen) openGate();
    });
    updateHud();
    save();
  }

  function doEnding() {
    Sound.play('letter');
    say(CFG.fromName !== '[YOUR NAME]' ? CFG.fromName : 'a letter', CFG.finalLetter.lines, function () {
      document.getElementById('endTitle').textContent = CFG.finalSceneTitle;
      document.getElementById('endSub').textContent = CFG.finalSceneSubtitle;
      showPanel(endEl);
    });
  }

  function sleep() {
    state.day++;
    var matured = 0;
    Object.keys(state.plots).forEach(function (k) {
      var p = state.plots[k];
      if (p.crop) {
        if (p.watered) { p.growth = Math.min(3, p.growth + 1); }
        p.watered = false;
        p.mature = p.growth >= 3;
        if (p.mature) matured++;
      }
    });
    Sound.play('open');
    var msg = 'A new day begins. You drifted off with the window open.';
    if (matured) msg = matured + (matured === 1 ? ' crop is' : ' crops are') + ' ready to harvest!';
    updateHud();
    say('', ['Day ' + state.day + '. ' + msg], null);
    save();
  }

  /* ---------------- floating effects ---------------- */
  var fx = [];
  var floaters = []; // sparkles for collectibles

  /* ---------------- rendering: sprites ---------------- */
  function drawSeedIcon(c, k) {
    c.clearRect(0, 0, 16, 16);
    if (k === 'carrot') { c.fillStyle = '#e08a3c'; c.fillRect(6, 8, 4, 6); c.fillStyle = '#f0a95a'; c.fillRect(6, 8, 2, 6); c.fillStyle = '#5f9b46'; c.fillRect(5, 4, 6, 4); c.fillStyle = '#78b95a'; c.fillRect(6, 3, 4, 2); }
    else if (k === 'strawberry') { c.fillStyle = '#c8404b'; c.fillRect(5, 6, 6, 7); c.fillStyle = '#e2545f'; c.fillRect(6, 6, 4, 6); c.fillStyle = '#5f9b46'; c.fillRect(6, 4, 4, 3); c.fillStyle = '#fff2d0'; c.fillRect(6, 8, 1, 1); c.fillRect(9, 9, 1, 1); c.fillRect(7, 11, 1, 1); }
    else { c.fillStyle = '#5f9b46'; c.fillRect(7, 8, 2, 6); c.fillStyle = '#e6b84a'; c.fillRect(5, 5, 6, 5); c.fillStyle = '#f3d27a'; c.fillRect(6, 4, 4, 4); }
  }

  function drawTree(x, y) {
    var bx = x * TILE, by = y * TILE;
    var sway = Math.round(Math.sin(perfNow * 0.001 + x) * 0.7);
    // trunk + roots
    R(bx + 6, by + 9, 4, 11, P.woodDark);
    R(bx + 6, by + 9, 2, 11, P.wood);
    R(bx + 4, by + 18, 8, 2, P.woodDark);
    // layered canopy
    R(bx + 1, by + 5 + sway, 14, 11, P.grassDark);
    R(bx + 2, by + 2 + sway, 12, 12, P.grass);
    R(bx + 4, by + 1 + sway, 8, 8, P.grassLite);
    R(bx + 5, by + 1 + sway, 5, 5, P.sage);
    R(bx + 2, by + 6 + sway, 2, 2, P.grassLite);
    R(bx + 11, by + 8 + sway, 2, 2, P.grassDark);
    // blossom dots on some trees
    if (hash(x, y) > 0.55) { R(bx + 4, by + 5 + sway, 2, 2, P.pinkSoft); R(bx + 9, by + 9 + sway, 2, 2, P.pinkSoft); }
  }
  function drawRock(x, y) {
    var bx = x * TILE, by = y * TILE;
    R(bx + 2, by + 8, 12, 6, P.stoneDark);
    R(bx + 3, by + 5, 10, 6, P.stone);
    R(bx + 5, by + 4, 6, 4, '#b3b3ad');
    R(bx + 4, by + 11, 8, 2, P.stoneDark);
  }
  function drawShrub(x, y) {
    var bx = x * TILE, by = y * TILE;
    R(bx + 2, by + 6, 12, 9, P.grassDark);
    R(bx + 3, by + 5, 10, 8, P.grass);
    R(bx + 5, by + 4, 6, 5, P.sage);
    R(bx + 8, by + 7, 3, 3, '#c96f8a');
  }
  function drawFence(x, y) {
    var bx = x * TILE, by = y * TILE;
    R(bx + 2, by + 4, 3, 11, P.wood);
    R(bx + 10, by + 4, 3, 11, P.wood);
    R(bx, by + 6, 16, 2, P.woodDark);
    R(bx, by + 10, 16, 2, P.wood);
    R(bx + 2, by + 4, 1, 11, P.woodDark);
  }
  function drawMushroom(x, y) {
    var bx = x * TILE, by = y * TILE;
    R(bx + 6, by + 9, 4, 5, P.cream);
    R(bx + 4, by + 5, 8, 5, P.red);
    R(bx + 5, by + 4, 6, 2, P.red);
    R(bx + 6, by + 6, 1, 1, P.cream); R(bx + 9, by + 7, 1, 1, P.cream);
  }
  function drawFlowerDeco(x, y, color) {
    var bx = x * TILE, by = y * TILE;
    R(bx + 7, by + 8, 2, 6, P.grassDark);
    R(bx + 5, by + 5, 3, 3, color);
    R(bx + 9, by + 5, 3, 3, color);
    R(bx + 7, by + 3, 3, 3, color);
    R(bx + 7, by + 7, 3, 3, color);
    R(bx + 8, by + 6, 1, 1, P.gold);
  }
  function drawSign(x, y) {
    var bx = x * TILE, by = y * TILE;
    R(bx + 7, by + 10, 2, 6, P.woodDark);
    R(bx + 1, by + 3, 14, 9, P.wood);
    R(bx + 1, by + 3, 14, 2, P.woodDark);
    R(bx + 3, by + 6, 10, 1, P.cream);
    R(bx + 3, by + 8, 7, 1, P.cream);
  }
  function drawMailbox(x, y) {
    var bx = x * TILE, by = y * TILE;
    R(bx + 7, by + 9, 2, 7, P.woodDark);
    R(bx + 3, by + 4, 10, 6, P.wood);
    R(bx + 3, by + 3, 10, 4, P.woodDark);
    R(bx + 4, by + 5, 4, 3, P.cream);
    R(bx + 11, by + 5, 1, 4, P.red);
    R(bx + 10, by + 4, 3, 2, P.red);
  }
  function drawSeedbox(x, y) {
    var bx = x * TILE, by = y * TILE;
    R(bx + 2, by + 7, 12, 8, P.wood);
    R(bx + 2, by + 7, 12, 2, P.woodDark);
    R(bx + 3, by + 10, 10, 1, P.woodDark);
    R(bx + 6, by + 5, 4, 2, '#5f9b46');
    R(bx + 5, by + 4, 2, 2, P.gold);
    R(bx + 9, by + 4, 2, 2, P.pink);
  }
  function drawHedge(x, y) {
    var bx = x * TILE, by = y * TILE;
    R(bx, by + 2, 16, 14, P.grassDark);
    for (var i = 0; i < 5; i++) {
      var gx = bx + (i * 3 + ((x + y) % 2));
      R(gx, by + 3 + (i % 2), 3, 3, P.grass);
    }
    R(bx, by + 2, 16, 2, P.grass);
  }
  function drawGate(x, y) {
    var bx = x * TILE, by = y * TILE;
    R(bx + 1, by + 2, 3, 14, P.woodDark);
    R(bx + 12, by + 2, 3, 14, P.woodDark);
    if (state.gateOpen) {
      R(bx + 4, by + 3, 2, 12, P.wood);
      R(bx + 9, by + 4, 2, 10, P.wood);
    } else {
      for (var i = 0; i < 4; i++) R(bx + 3, by + 4 + i * 3, 10, 2, P.wood);
      R(bx + 6, by + 8, 3, 3, P.gold);
    }
  }
  function drawHeartFlower(x, y) {
    var bx = x * TILE, by = y * TILE;
    R(bx + 7, by + 9, 2, 5, P.grassDark);
    R(bx + 5, by + 4, 3, 3, P.pink);
    R(bx + 9, by + 4, 3, 3, P.pink);
    R(bx + 7, by + 2, 3, 3, P.pinkSoft);
    R(bx + 7, by + 7, 3, 3, P.pink);
    R(bx + 8, by + 6, 1, 1, P.gold);
  }

  function drawHouse() {
    var x = HOUSE.x * TILE, y = HOUSE.y * TILE, w = HOUSE.w * TILE;
    R(x + 4, y + 74, w - 8, 8, P.shadow);
    // walls
    R(x, y + 34, w, 46, P.cream);
    R(x, y + 34, w, 3, P.creamDark);
    for (var i = 0; i < 7; i++) R(x, y + 40 + i * 6, w, 1, P.creamDark);
    R(x, y, 4, 80, P.creamDark); R(x + w - 4, y, 4, 80, P.creamDark);
    // roof
    var cx = x + w / 2;
    for (var r = 0; r < 40; r++) {
      var half = 6 + (r / 40) * (w / 2 + 2);
      R(cx - half, y - 4 + r, half * 2, 1, (r % 10 < 5) ? P.roof : P.roofDark);
    }
    R(cx - 8, y - 6, 16, 4, P.roofDark); // ridge
    // chimney
    R(x + 12, y - 2, 8, 14, P.stoneDark);
    R(x + 12, y - 2, 8, 3, P.stone);
    // windows
    function window_(wx, wy) {
      R(wx, wy, 14, 14, P.woodDark);
      R(wx + 2, wy + 2, 10, 10, P.sky);
      R(wx + 7, wy + 2, 1, 10, P.woodDark);
      R(wx + 2, wy + 7, 10, 1, P.woodDark);
      // flower box
      R(wx - 1, wy + 15, 16, 3, P.wood);
      R(wx + 1, wy + 14, 2, 2, P.pink);
      R(wx + 6, wy + 14, 2, 2, P.pink);
      R(wx + 11, wy + 14, 2, 2, P.pink);
    }
    window_(x + 12, y + 42);
    window_(x + w - 26, y + 42);
    // door (centred on DOOR_TILE so it lines up with the path)
    var dcx = DOOR_TILE.x * TILE + 8;
    var dtop = DOOR_TILE.y * TILE - 16;
    R(dcx - 9, dtop - 1, 18, 31, P.woodDark);
    R(dcx - 7, dtop + 1, 14, 28, P.wood);
    R(dcx - 7, dtop + 1, 14, 2, '#a97a4e');
    R(dcx - 1, dtop + 12, 1, 16, P.woodDark);
    R(dcx + 3, dtop + 15, 2, 2, P.gold);
    // small stone doorstep
    R(dcx - 8, dtop + 29, 16, 3, P.stoneDark);
    R(dcx - 8, dtop + 29, 16, 1, P.stone);
  }

  function drawCrop(x, y, p) {
    var bx = x * TILE, by = y * TILE;
    // soil
    if (!p || !p.tilled) {
      // untilled garden soil marker (light)
      R(bx + 1, by + 1, 14, 14, '#7a5b41');
      R(bx + 1, by + 1, 14, 2, '#8a6a4d');
      R(bx + 3, by + 5, 2, 2, '#6b4a34');
      R(bx + 10, by + 9, 2, 2, '#6b4a34');
      return;
    }
    var base = p.watered ? P.soilWet : P.soil;
    R(bx, by, 16, 16, base);
    for (var i = 0; i < 3; i++) R(bx + 1 + i * 5, by + 2, 3, 12, p.watered ? '#3f2b1d' : '#5d4130');
    if (p.crop) {
      var cx = bx + 8, g = p.growth;
      if (p.crop === 'carrot') {
        if (g === 0) { R(cx - 1, by + 8, 2, 4, P.grassDark); }
        else if (g === 1) { R(cx - 2, by + 7, 4, 5, P.grass); }
        else if (g === 2) { R(cx - 3, by + 6, 6, 6, P.grass); R(cx - 1, by + 5, 2, 2, P.grassLite); }
        else { R(cx - 3, by + 4, 6, 6, P.grass); R(cx - 1, by + 4, 2, 2, P.grassLite); R(cx - 2, by + 10, 4, 4, '#e08a3c'); R(cx - 2, by + 10, 2, 4, '#f0a95a'); }
      } else if (p.crop === 'strawberry') {
        if (g === 0) { R(cx - 1, by + 9, 2, 3, P.grassDark); }
        else if (g === 1) { R(cx - 3, by + 8, 6, 4, P.grass); }
        else if (g === 2) { R(cx - 4, by + 6, 8, 6, P.grass); }
        else { R(cx - 4, by + 5, 8, 7, P.grass); R(cx - 3, by + 8, 2, 2, P.red); R(cx + 1, by + 7, 2, 2, P.red); R(cx - 1, by + 10, 2, 2, '#e2545f'); }
      } else {
        if (g === 0) { R(cx - 1, by + 9, 2, 3, P.grassDark); }
        else if (g === 1) { R(cx - 1, by + 7, 2, 5, P.grass); }
        else if (g === 2) { R(cx - 1, by + 6, 2, 6, P.grass); R(cx - 3, by + 7, 2, 2, P.grass); }
        else { R(cx - 1, by + 5, 2, 7, P.grass); R(cx - 3, by + 3, 3, 3, P.gold); R(cx + 1, by + 3, 3, 3, P.gold); R(cx - 1, by + 1, 3, 3, P.gold); R(cx - 1, by + 3, 3, 3, '#f3d27a'); }
      }
    }
  }

  function drawCollectible(c) {
    var bx = c.tx * TILE + 8, by = c.ty * TILE + 6 + Math.sin(perfNow * 0.004 + c.tx) * 1.2;
    var i = c.id;
    if (i === 'flower') { R(bx - 3, by - 4, 3, 3, P.pink); R(bx + 1, by - 4, 3, 3, P.pink); R(bx - 1, by - 6, 3, 3, P.pinkSoft); R(bx - 1, by - 2, 3, 3, P.pink); R(bx - 1, by + 1, 1, 3, P.grassDark); }
    else if (i === 'heart') { R(bx - 4, by - 4, 3, 3, P.pink); R(bx + 1, by - 4, 3, 3, P.pink); R(bx - 5, by - 2, 10, 3, P.pink); R(bx - 3, by + 1, 6, 2, P.pink); R(bx - 1, by + 3, 2, 2, P.pink); }
    else if (i === 'shell') { R(bx - 4, by - 2, 8, 5, P.cream); R(bx - 3, by - 3, 6, 3, P.pinkSoft); R(bx - 2, by - 1, 1, 3, P.creamDark); R(bx, by - 1, 1, 3, P.creamDark); R(bx + 2, by - 1, 1, 3, P.creamDark); }
    else if (i === 'photo') { R(bx - 4, by - 5, 8, 10, P.cream); R(bx - 3, by - 4, 6, 6, P.sky); R(bx - 3, by + 3, 6, 2, P.pinkSoft); }
    else if (i === 'ribbon') { R(bx - 4, by - 3, 3, 3, P.pink); R(bx + 1, by - 3, 3, 3, P.pink); R(bx - 1, by - 1, 2, 2, P.pinkSoft); R(bx - 3, by + 1, 2, 4, P.pink); R(bx + 1, by + 1, 2, 4, P.pink); }
    else if (i === 'key') { R(bx - 4, by - 3, 4, 4, P.gold); R(bx - 2, by - 2, 1, 1, P.woodDark); R(bx, by - 1, 4, 2, P.gold); R(bx + 2, by + 1, 1, 2, P.gold); }
    else if (i === 'locket') { R(bx - 3, by - 4, 6, 3, P.gold); R(bx - 4, by - 2, 8, 4, P.gold); R(bx - 3, by, 6, 2, P.gold); R(bx - 1, by, 2, 2, P.red); }
  }

  function drawPlayer() {
    var p = state.player;
    var x = p.x, y = p.y, d = p.dir;
    var frame = p.moving ? (Math.floor(p.step) % 2) : 0;
    var skin = '#f6d2ac', hair = '#7a4a2b', hairD = '#5d3519', dress = P.pink, dressD = '#a9586f';
    R(x - 6, y - 2, 12, 3, P.shadow);
    var bob = (p.moving && frame) ? -1 : 0;
    y += bob;
    var lo = (p.moving && frame) ? 1 : 0;
    // boots + legs
    R(x - 4, y - 2 + lo, 3, 3, '#5a3a25');
    R(x + 1, y - 2, 3, 3, '#5a3a25');
    R(x - 4, y - 5 + lo, 3, 4 - lo, skin);
    R(x + 1, y - 5, 3, 4, skin);
    // flared dress
    R(x - 6, y - 12, 12, 7, dress);
    R(x - 7, y - 6, 14, 3, dress);
    R(x - 7, y - 3, 14, 1, dressD);
    R(x - 6, y - 12, 12, 2, dressD);
    // cream apron
    R(x - 3, y - 10, 6, 6, P.cream);
    R(x - 3, y - 10, 6, 1, P.creamDark);
    // arms
    R(x - 7, y - 11, 2, 5, skin);
    R(x + 5, y - 11, 2, 5, skin);
    // head
    R(x - 4, y - 19, 8, 7, skin);
    // long hair
    R(x - 5, y - 20, 10, 4, hair);
    R(x - 5, y - 20, 10, 1, hairD);
    R(x - 5, y - 16, 2, 9, hair);
    R(x + 3, y - 16, 2, 9, hair);
    if (d === 'up') { R(x - 5, y - 20, 10, 9, hair); R(x - 5, y - 20, 10, 1, hairD); }
    else {
      R(x - 4, y - 16, 8, 1, hair); // fringe
      if (d === 'down') {
        R(x - 2, y - 15, 1, 1, P.ink); R(x + 1, y - 15, 1, 1, P.ink);
        R(x - 3, y - 14, 1, 1, P.pinkSoft); R(x + 2, y - 14, 1, 1, P.pinkSoft);
      } else if (d === 'left') { R(x - 3, y - 15, 1, 1, P.ink); }
      else if (d === 'right') { R(x + 2, y - 15, 1, 1, P.ink); }
    }
    // little flower tucked in her hair
    R(x + 4, y - 19, 2, 2, P.gold);
    R(x + 3, y - 20, 1, 1, P.pinkSoft); R(x + 6, y - 20, 1, 1, P.pinkSoft);
  }

  /* ---------------- ground ---------------- */
  function drawGround() {
    var t0x = Math.floor(camX / TILE), t1x = Math.ceil((camX + VIEW_W) / TILE);
    var t0y = Math.floor(camY / TILE), t1y = Math.ceil((camY + VIEW_H) / TILE);
    for (var ty = t0y; ty < t1y; ty++) {
      for (var tx = t0x; tx < t1x; tx++) {
        var bx = tx * TILE, by = ty * TILE;
        if (inPond(tx, ty)) {
          R(bx, by, TILE, TILE, P.water);
          R(bx, by, TILE, TILE, 'rgba(63,136,166,0.20)');
          var sh = Math.sin(perfNow * 0.002 + tx * 0.7 + ty * 0.5);
          if (sh > 0.15) { R(bx + 2, by + 4, 10, 1, P.waterLite); R(bx + 5, by + 5, 5, 1, P.waterLite); }
          if (sh < -0.15) R(bx + 3, by + 11, 9, 1, P.waterLite);
          if (!inPond(tx, ty - 1)) { R(bx, by, 16, 3, P.sand); R(bx, by + 3, 16, 1, '#ccb884'); }
          if (!inPond(tx, ty + 1)) { R(bx, by + 13, 16, 3, P.sand); R(bx, by + 12, 16, 1, '#ccb884'); }
          if (!inPond(tx - 1, ty)) { R(bx, by, 3, 16, P.sand); R(bx + 3, by, 1, 16, '#ccb884'); }
          if (!inPond(tx + 1, ty)) { R(bx + 13, by, 3, 16, P.sand); R(bx + 12, by, 1, 16, '#ccb884'); }
        } else if (isPath(tx, ty)) {
          R(bx, by, TILE, TILE, P.creamDark);
          R(bx, by, TILE, TILE, 'rgba(176,132,86,0.12)');
          if (hash(tx, ty) > 0.6) R(bx + 3 + (tx % 3), by + 6, 3, 2, '#cdb886');
          if (hash(tx + 5, ty) > 0.8) R(bx + 9, by + 3, 2, 2, '#d8c79c');
          if (hash(tx, ty + 9) > 0.85) R(bx + 5, by + 11, 2, 1, '#c3ac79');
        } else {
          var h = hash(tx, ty);
          R(bx, by, TILE, TILE, h > 0.5 ? P.grass : P.grassDark);
          if (h > 0.42) R(bx + 1, by + 1, 14, 14, P.grass);
          var b1 = hash(tx + 21, ty + 13);
          if (b1 > 0.55) { R(bx + 3, by + 6, 1, 3, P.grassLite); R(bx + 4, by + 7, 1, 2, P.grassLite); }
          if (b1 > 0.8) R(bx + 10, by + 9, 1, 3, P.grassLite);
          if (b1 < 0.12) R(bx + 8, by + 4, 1, 2, P.grassDark);
          var fl = hash(tx + 7, ty + 2);
          if (fl > 0.94) {
            var fc = hash(tx + 3, ty + 5) > 0.5 ? P.pink : P.gold;
            R(bx + 6, by + 8, 1, 3, P.grassDark); R(bx + 5, by + 6, 3, 2, fc);
          } else if (fl < 0.05) {
            R(bx + 11, by + 5, 2, 2, P.stone); R(bx + 10, by + 7, 3, 1, P.stoneDark);
          }
          if (isSecretInterior(tx, ty) && hash(tx + 7, ty + 3) > 0.55) R(bx + 6, by + 10, 2, 3, P.grassDark);
        }
      }
    }
  }

  /* ---------------- main render ---------------- */
  var camX = 0, camY = 0;
  var perfNow = 0;

  function computeCamera() {
    var p = state.player;
    camX = clamp(p.x - VIEW_W / 2, 0, WORLD_PX_W - VIEW_W);
    camY = clamp((p.y - 8) - VIEW_H / 2, 0, WORLD_PX_H - VIEW_H);
  }

  function render() {
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    ctx.save();
    ctx.translate(-Math.round(camX), -Math.round(camY));

    drawGround();

    // garden plots drawn with ground
    Object.keys(plotMap).forEach(function (k) {
      var parts = k.split(','); var tx = +parts[0], ty = +parts[1];
      if (tx * TILE > camX - TILE && tx * TILE < camX + VIEW_W && ty * TILE > camY - TILE && ty * TILE < camY + VIEW_H) {
        drawCrop(tx, ty, state.plots[k]);
      }
    });
    // secret interior flower arrangement
    if (state.gateOpen) { /* flowers already objects */ }

    // depth-sorted drawables
    var drawables = [];
    objects.forEach(function (o) {
      if (o.hidden) return;
      var baseline = (o.ty + 1) * TILE;
      if (o.tx * TILE > camX - 32 && o.tx * TILE < camX + VIEW_W + 32 && o.ty * TILE > camY - 48 && o.ty * TILE < camY + VIEW_H + 16) {
        drawables.push({ o: o, y: baseline });
      }
    });
    collectibles.forEach(function (c) {
      if (state.collected[c.id]) return;
      drawables.push({ coll: c, y: (c.ty + 1) * TILE });
    });
    drawables.push({ player: true, y: state.player.y });
    drawables.sort(function (a, b) { return a.y - b.y; });

    drawables.forEach(function (it) {
      if (it.player) { drawPlayer(); return; }
      if (it.coll) { drawCollectible(it.coll); return; }
      var o = it.o;
      switch (o.type) {
        case 'tree': drawTree(o.tx, o.ty); break;
        case 'rock': drawRock(o.tx, o.ty); break;
        case 'shrub': drawShrub(o.tx, o.ty); break;
        case 'fence': drawFence(o.tx, o.ty); break;
        case 'mushroom': drawMushroom(o.tx, o.ty); break;
        case 'flowerDeco': drawFlowerDeco(o.tx, o.ty, (hash(o.tx, o.ty) > 0.5 ? P.pink : P.gold)); break;
        case 'sign': drawSign(o.tx, o.ty); break;
        case 'mailbox': drawMailbox(o.tx, o.ty); break;
        case 'seedbox': drawSeedbox(o.tx, o.ty); break;
        case 'hedge': drawHedge(o.tx, o.ty); break;
        case 'gate': drawGate(o.tx, o.ty); break;
        case 'heartFlower': drawHeartFlower(o.tx, o.ty); break;
        case 'finalLetter': if (state.gateOpen) drawFinalLetter(o.tx, o.ty); break;
      }
    });

    // house drawn as one big piece (baseline at its bottom)
    drawHouse();

    // fx flashes
    fx.forEach(function (f) {
      var a = 1 - f.t;
      ctx.globalAlpha = Math.max(0, a);
      R(f.x - 8, f.y - 10 - f.t * 10, 16, 16, 'rgba(243,232,207,0.6)');
      ctx.globalAlpha = 1;
    });

    ctx.restore();
  }

  function drawFinalLetter(x, y) {
    var bx = x * TILE, by = y * TILE;
    R(bx + 3, by + 5, 10, 8, P.cream);
    R(bx + 3, by + 5, 10, 2, P.pinkSoft);
    R(bx + 5, by + 8, 6, 1, P.woodDark);
    R(bx + 5, by + 10, 4, 1, P.woodDark);
    var pulse = 0.5 + 0.5 * Math.sin(perfNow * 0.005);
    ctx.globalAlpha = pulse * 0.5;
    R(bx + 1, by + 3, 14, 12, 'rgba(230,184,74,0.35)');
    ctx.globalAlpha = 1;
  }

  /* ---------------- title art ---------------- */
  function drawTitleArt() {
    var c = document.getElementById('titleArt');
    var g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    var W = c.width, H = c.height;
    for (var yy = 0; yy < H; yy++) { g.fillStyle = yy < 60 ? P.sky : (yy < 74 ? P.sage : P.grass); g.fillRect(0, yy, W, 1); }
    // sun
    g.fillStyle = P.gold; g.fillRect(250, 16, 16, 16); g.fillRect(252, 12, 12, 24); g.fillRect(246, 20, 24, 8);
    // hills
    g.fillStyle = P.grassDark;
    for (var i = 0; i < W; i++) { var hh = 74 + Math.sin(i * 0.05) * 5 + Math.sin(i * 0.13) * 3; g.fillRect(i, hh, 1, H - hh); }
    // simple farm vignette
    drawMini(g, 30, 60, 'tree');
    drawMini(g, 70, 62, 'tree');
    drawMini(g, 200, 58, 'tree');
    drawMini(g, 240, 64, 'tree');
    // house
    g.fillStyle = P.cream; g.fillRect(120, 60, 70, 40);
    g.fillStyle = P.roof;
    for (var r = 0; r < 22; r++) { var half = 4 + r * 1.7; g.fillRect(155 - half, 40 + r, half * 2, 1); }
    g.fillStyle = P.woodDark; g.fillRect(150, 76, 14, 24);
    // crops row
    for (var cx2 = 0; cx2 < 6; cx2++) { g.fillStyle = P.soil; g.fillRect(150 + cx2 * 10, 116, 10, 12); g.fillStyle = P.grass; g.fillRect(152 + cx2 * 10, 110, 6, 6); }
    // two little hearts
    g.fillStyle = P.pink; g.fillRect(158, 30, 4, 4); g.fillRect(164, 30, 4, 4); g.fillRect(156, 32, 16, 4); g.fillRect(160, 36, 8, 3); g.fillRect(162, 39, 4, 2);
  }
  function drawMini(g, x, y, t) {
    g.fillStyle = P.woodDark; g.fillRect(x + 5, y + 10, 4, 10);
    g.fillStyle = P.grassDark; g.fillRect(x, y, 14, 12);
    g.fillStyle = P.grass; g.fillRect(x + 1, y - 1, 12, 12);
    g.fillStyle = P.grassLite; g.fillRect(x + 3, y - 3, 8, 8);
  }

  /* ---------------- update loop ---------------- */
  var lastT = 0, stepTimer = 0;
  var paused = function () {
    return titleEl.classList.contains('show') || menuEl.classList.contains('show') || shopEl.classList.contains('show') ||
           controlsEl.classList.contains('show') || endEl.classList.contains('show');
  };

  function update(dt) {
    tickDialogue(dt);
    if (paused() || dlg.open) { updateHint(); return; }

    var p = state.player;
    var speed = 52;
    var dx = 0, dy = 0;
    if (keys.left) dx -= 1;
    if (keys.right) dx += 1;
    if (keys.up) dy -= 1;
    if (keys.down) dy += 1;
    if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }

    p.moving = !!(dx || dy);
    if (p.moving) {
      if (Math.abs(dx) > Math.abs(dy)) p.dir = dx < 0 ? 'left' : 'right';
      else p.dir = dy < 0 ? 'up' : 'down';

      var nx = p.x + dx * speed * dt;
      if (canStand(nx, p.y)) p.x = nx;
      var ny = p.y + dy * speed * dt;
      if (canStand(p.x, ny)) p.y = ny;

      p.step += dt * 6;
      stepTimer += dt;
      if (stepTimer > 0.32) { stepTimer = 0; Sound.play('step'); }
    } else {
      p.step += dt * 2;
    }
    state.playTime += dt;

    updateHint();
    updateFx(dt);
  }
  function updateFx(dt) {
    for (var i = fx.length - 1; i >= 0; i--) { fx[i].t += dt * 1.6; if (fx[i].t >= 1) fx.splice(i, 1); }
  }

  var lastHint = '';
  function updateHint() {
    if (dlg.open || paused()) { hintEl.classList.remove('show'); return; }
    var f = frontTile();
    var txt = '';
    var c = collectibleAt(f.x, f.y);
    var pk = plotKey(f.x, f.y);
    var o = objAt(f.x, f.y);
    if (c) txt = '<span class="key">E</span> pick up ' + CFG.collectibles[c.id].name;
    else if (pk) {
      var p = state.plots[pk];
      var nm = CFG.cropNames[state.selected];
      if (!p || !p.tilled) txt = '<span class="key">E</span> till the soil';
      else if (!p.crop) txt = '<span class="key">E</span> plant ' + nm + ' (' + state.seeds[state.selected] + ')';
      else if (p.mature) txt = '<span class="key">E</span> harvest';
      else if (!p.watered) txt = '<span class="key">E</span> water';
      else txt = 'growing... sleep to help it grow';
    } else if (o) {
      if (o.type === 'door') txt = '<span class="key">E</span> sleep here';
      else if (o.type === 'mailbox') txt = '<span class="key">E</span> read the letter';
      else if (o.type === 'seedbox') txt = '<span class="key">E</span> open the seed box';
      else if (o.type === 'sign') txt = '<span class="key">E</span> read the sign';
      else if (o.type === 'gate') txt = state.gateOpen ? 'the garden gate is open' : '<span class="key">E</span> try the gate';
      else if (o.type === 'finalLetter') txt = '<span class="key">E</span> open the letter';
    }
    if (txt && txt !== lastHint) { hintEl.innerHTML = txt; lastHint = txt; }
    hintEl.classList.toggle('show', !!txt);
  }

  function loop(t) {
    perfNow = t;
    var dt = Math.min(0.05, (t - lastT) / 1000 || 0);
    lastT = t;
    computeCamera();
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  /* ---------------- flow: start / continue / restart ---------------- */
  function showGame() {
    hudEl.style.display = '';
    invEl.style.display = '';
    buildInventory();
    updateHud();
    detectTouch();
  }
  function detectTouch() {
    var isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    touchEl.classList.toggle('on', isTouch);
  }

  function startNew() {
    Sound.init();
    state = freshState();
    buildWorld(); applyGate();
    hidePanel(titleEl);
    showGame();
    Sound.startAmbient();
    updateHud();
    say('a letter for you', CFG.openingLetter.lines, function () {
      state.seenIntro = true; save();
    });
  }
  function startContinue() {
    Sound.init();
    var data = load();
    state = freshState();
    if (data) {
      state.day = data.day || 1; state.coins = data.coins || 0;
      state.items = data.items || state.items; state.seeds = data.seeds || state.seeds;
      state.selected = data.selected || 'carrot'; state.plots = data.plots || {};
      state.collected = data.collected || state.collected;
      state.gateOpen = !!data.gateOpen; state.ending = !!data.ending; state.seenIntro = !!data.seenIntro;
      if (data.player) { state.player.x = data.player.x; state.player.y = data.player.y; state.player.dir = data.player.dir || 'down'; }
    }
    buildWorld(); applyGate();
    hidePanel(titleEl);
    showGame();
    Sound.startAmbient();
  }
  function restart() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
    hidePanel(endEl); hidePanel(menuEl); hidePanel(shopEl); hidePanel(controlsEl);
    state = freshState();
    buildWorld(); applyGate();
    showGame();
    Sound.startAmbient();
    updateHud();
    say('a letter for you', CFG.openingLetter.lines, function () { state.seenIntro = true; save(); });
  }

  /* ---------------- boot ---------------- */
  function boot() {
    document.getElementById('titleName').textContent = CFG.title;
    document.getElementById('titleSub').textContent = CFG.subtitle;
    drawTitleArt();
    resize();
    window.addEventListener('resize', resize);

    var data = load();
    if (data) {
      var cont = document.getElementById('continueBtn');
      cont.style.display = '';
      document.getElementById('startBtn').textContent = '▶ new farm';
    }
    state = freshState();
    buildWorld(); applyGate();
    // draw one frame of the world behind the title
    computeCamera();
    render();
    requestAnimationFrame(loop);
  }

  function resize() {
    var vw = window.innerWidth, vh = window.innerHeight;
    var s = Math.min(vw / VIEW_W, vh / VIEW_H);
    if (s >= 1) s = Math.floor(s * 2) / 2; // half-steps for smoother fit on desktop
    s = Math.max(s, 0.4);
    canvas.style.width = Math.round(VIEW_W * s) + 'px';
    canvas.style.height = Math.round(VIEW_H * s) + 'px';
  }

  // optional debug handle (add ?debug=1 to the URL); harmless in normal play
  if (/[?&]debug=1/.test(location.search)) {
    window.Farm = {
      get state() { return state; },
      get collectibles() { return collectibles; }, get objects() { return objects; }, get plotMap() { return plotMap; },
      front: frontTile, here: hereTile, objAt: objAt,
      tileSolid: tileSolid, canStand: canStand,
      _cls: function (tx, ty) { return { pond: inPond(tx, ty), house: inHouse(tx, ty), border: isSecretBorder(tx, ty), path: isPath(tx, ty) }; },
      place: function (tx, ty, dir) { state.player.x = tx * TILE + 8; state.player.y = ty * TILE + 8; state.player.dir = dir || 'down'; },
      doAction: doAction, interact: interact, tendPlot: tendPlot, harvest: harvest,
      sleep: sleep, pickCollectible: pickCollectible, openGate: openGate, doEnding: doEnding,
      openShop: openShop, save: save
    };
  }

  // global safety: surface errors so they are not silent during development
  window.__errs = window.__errs || [];
  window.addEventListener('error', function (e) {
    window.__errs.push(String(e.message));
    var h = document.getElementById('hint');
    if (h) { h.textContent = 'error: ' + e.message; h.classList.add('show'); }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();
