/**
 * CELEBRATIONS.JS — Standalone celebrations module
 * Champions Dashboard PSG Cosmos
 *
 * Usage:
 *   <link rel="stylesheet" href="/celebrations.css">
 *   <script src="/celebrations.js"></script>
 *
 * Public API:
 *   Celebrations.confetti({ count?, colors? })
 *   Celebrations.flares({ count?, color? })
 *   Celebrations.fireworks({ duration? })
 *   Celebrations.fire({ on: boolean })
 *   Celebrations.goalBanner({ text? })
 *   Celebrations.celebrateAll()
 *
 * DOM Events (dispatch on window):
 *   window.dispatchEvent(new CustomEvent('celebrate:goal',      { detail: { text: 'BUUUT !' } }))
 *   window.dispatchEvent(new CustomEvent('celebrate:confetti',  { detail: { count: 160 } }))
 *   window.dispatchEvent(new CustomEvent('celebrate:flares',    { detail: { count: 5 } }))
 *   window.dispatchEvent(new CustomEvent('celebrate:fireworks', { detail: { duration: 2000 } }))
 *   window.dispatchEvent(new CustomEvent('celebrate:fire',      { detail: { on: true } }))
 *   window.dispatchEvent(new CustomEvent('celebrate:all'))
 */
(function (global) {
  'use strict';

  // ── Constants ──────────────────────────────────────────────────────────────
  var PSG_COLORS = ['#dc283c', '#ffffff', '#3a5ad0', '#1a2980', '#ffd866', '#ff6470', '#c84048'];
  var DEFAULT_SMOKE_COLOR = 'rgba(220, 40, 60, 0.75)';

  // ── Internal state ─────────────────────────────────────────────────────────
  var fireActive = false;
  var fireEl = null;
  var fireTimers = [];
  var activeTimers = [];

  // ── Helpers ────────────────────────────────────────────────────────────────
  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
  }

  function randItem(arr) {
    return arr[randInt(0, arr.length - 1)];
  }

  function getFxLayer() {
    var layer = document.querySelector('.fx-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'fx-layer';
      document.body.appendChild(layer);
    }
    return layer;
  }

  function safeRemove(el) {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  }

  function trackTimer(id) {
    activeTimers.push(id);
    return id;
  }

  function clearAllTimers() {
    activeTimers.forEach(function (id) { clearTimeout(id); clearInterval(id); });
    activeTimers = [];
  }

  // ── CSS Loader (auto-load celebrations.css if not already present) ─────────
  function ensureCSS() {
    if (document.querySelector('link[href*="celebrations.css"]')) return;
    // Try to detect script src to build CSS path
    var scripts = document.querySelectorAll('script[src*="celebrations.js"]');
    var cssHref = '/celebrations.css';
    if (scripts.length > 0) {
      cssHref = scripts[0].src.replace('celebrations.js', 'celebrations.css');
    }
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssHref;
    document.head.appendChild(link);
  }

  // ── Confetti ───────────────────────────────────────────────────────────────
  function spawnConfetti(opts) {
    opts = opts || {};
    var count = opts.count || 120;
    var colors = opts.colors || PSG_COLORS;
    var layer = getFxLayer();

    for (var i = 0; i < count; i++) {
      (function (delay) {
        var t = trackTimer(setTimeout(function () {
          var el = document.createElement('div');
          el.className = 'confetti';
          el.style.left = rand(0, 100) + 'vw';
          el.style.backgroundColor = randItem(colors);
          var dur = rand(2.2, 4.8);
          el.style.animationDuration = dur + 's';
          el.style.animationDelay = '0s';
          el.style.width = rand(6, 12) + 'px';
          el.style.height = rand(10, 20) + 'px';
          // Randomize shape — some are circles/diamonds
          var shapes = ['2px', '50%', '0'];
          el.style.borderRadius = randItem(shapes);
          layer.appendChild(el);
          var removeT = trackTimer(setTimeout(function () { safeRemove(el); }, dur * 1000 + 200));
        }, delay));
      })(i * 30 + rand(0, 200));
    }

    // Auto-cleanup layer after all confetti done
    trackTimer(setTimeout(function () {
      var remaining = layer.querySelectorAll('.confetti');
      if (remaining.length === 0) safeRemove(layer);
    }, count * 30 + 6000));
  }

  // ── Flares / Fumigènes ─────────────────────────────────────────────────────
  function spawnFlares(opts) {
    opts = opts || {};
    var count = opts.count || 5;
    var smokeColor = opts.color || DEFAULT_SMOKE_COLOR;

    var layer = getFxLayer();
    var positions = [];
    for (var i = 0; i < count; i++) {
      positions.push((i + 0.5) / count * 100);
    }

    positions.forEach(function (pct, idx) {
      trackTimer(setTimeout(function () {
        // Create flare source torch
        var source = document.createElement('div');
        source.className = 'flare-source';
        source.style.left = pct + 'vw';
        source.style.bottom = '0';
        layer.appendChild(source);

        // Emit smoke puffs from this source
        var puffCount = randInt(18, 28);
        for (var p = 0; p < puffCount; p++) {
          (function (pDelay) {
            trackTimer(setTimeout(function () {
              var puff = document.createElement('div');
              puff.className = 'smoke-puff';
              var size = rand(40, 100);
              puff.style.width = size + 'px';
              puff.style.height = size + 'px';
              puff.style.left = (pct + rand(-4, 4)) + 'vw';
              puff.style.bottom = rand(10, 40) + 'px';
              puff.style.background = smokeColor;
              var dur = rand(5, 9);
              puff.style.setProperty('--dur', dur + 's');
              puff.style.setProperty('--dx', rand(-60, 60) + 'px');
              puff.style.setProperty('--dy', rand(-200, -100) + 'px');
              puff.style.setProperty('--sc', rand(1.2, 2.2));
              layer.appendChild(puff);
              trackTimer(setTimeout(function () { safeRemove(puff); }, dur * 1000 + 200));
            }, pDelay));
          })(p * rand(80, 160));
        }

        // Remove source after a while
        trackTimer(setTimeout(function () { safeRemove(source); }, 5000));
      }, idx * 220));
    });

    // Cleanup layer
    trackTimer(setTimeout(function () {
      safeRemove(layer);
    }, 12000));
  }

  // ── Fireworks ──────────────────────────────────────────────────────────────
  function spawnFireworks(opts) {
    opts = opts || {};
    var duration = opts.duration || 2000;
    var intervalMs = 250;
    var bursts = Math.floor(duration / intervalMs);

    var layer = getFxLayer();

    var interval = trackTimer(setInterval(function () {
      if (bursts-- <= 0) {
        clearInterval(interval);
        trackTimer(setTimeout(function () { safeRemove(layer); }, 2000));
        return;
      }

      // 3 fireworks per burst
      for (var j = 0; j < 3; j++) {
        var fw = document.createElement('div');
        fw.className = 'firework';
        var x = rand(15, 85);
        var y = rand(10, 60);
        fw.style.left = x + 'vw';
        fw.style.top = y + 'vh';
        fw.style.backgroundColor = randItem(PSG_COLORS);
        fw.style.boxShadow = '0 0 6px 2px ' + randItem(PSG_COLORS);
        fw.style.setProperty('--fx', (Math.random() * 2 - 1).toFixed(2));
        fw.style.setProperty('--fy', (Math.random() * 2 - 1).toFixed(2));
        fw.style.animationDuration = rand(1.0, 1.8) + 's';
        layer.appendChild(fw);
        trackTimer(setTimeout(function (el) { safeRemove(el); }, 2000, fw));
      }
    }, intervalMs));
  }

  // ── Fire ───────────────────────────────────────────────────────────────────
  function setFire(opts) {
    opts = opts || {};
    var on = opts.on !== undefined ? opts.on : true;

    if (on && !fireActive) {
      fireActive = true;
      document.body.setAttribute('data-fire', 'on');

      fireEl = document.createElement('div');
      fireEl.className = 'fire-flames';

      var flameCount = 7;
      for (var i = 0; i < flameCount; i++) {
        var wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.flexShrink = '0';

        // Outer flame
        var flame = document.createElement('div');
        flame.className = 'flame';
        var scale = rand(0.7, 1.3);
        flame.style.setProperty('--dur', rand(0.45, 0.75) + 's');
        flame.style.transform = 'scaleX(' + scale + ')';

        // Inner flame
        var inner = document.createElement('div');
        inner.className = 'flame inner';
        inner.style.setProperty('--dur', rand(0.3, 0.5) + 's');

        wrapper.appendChild(flame);
        wrapper.appendChild(inner);

        // Embers
        var emberCount = randInt(3, 7);
        for (var e = 0; e < emberCount; e++) {
          var ember = document.createElement('div');
          ember.className = 'ember';
          ember.style.left = rand(10, 70) + 'px';
          ember.style.bottom = rand(60, 120) + 'px';
          ember.style.setProperty('--dur', rand(2, 4) + 's');
          ember.style.setProperty('--ex', rand(-30, 30) + 'px');
          ember.style.animationDelay = rand(0, 2) + 's';
          wrapper.appendChild(ember);
        }

        // Smoke
        for (var s = 0; s < 2; s++) {
          var smoke = document.createElement('div');
          smoke.className = 'fire-smoke';
          var smokeSize = rand(60, 120);
          smoke.style.width = smokeSize + 'px';
          smoke.style.height = smokeSize + 'px';
          smoke.style.left = rand(0, 60) + 'px';
          smoke.style.setProperty('--dur', rand(6, 10) + 's');
          smoke.style.animationDelay = rand(0, 3) + 's';
          wrapper.appendChild(smoke);
        }

        fireEl.appendChild(wrapper);
      }

      document.body.appendChild(fireEl);

      // Continuous smoke refresh
      var smokeInterval = trackTimer(setInterval(function () {
        if (!fireActive) {
          clearInterval(smokeInterval);
          return;
        }
        var smokes = fireEl ? fireEl.querySelectorAll('.fire-smoke') : [];
        smokes.forEach(function (s) {
          if (parseFloat(s.style.animationDelay || '0') < 0) {
            s.style.animationDelay = '0s';
          }
        });
      }, 3000));

    } else if (!on && fireActive) {
      fireActive = false;
      document.body.removeAttribute('data-fire');
      fireTimers.forEach(function (t) { clearTimeout(t); clearInterval(t); });
      fireTimers = [];
      if (fireEl) {
        safeRemove(fireEl);
        fireEl = null;
      }
    }
  }

  // ── Goal Banner ────────────────────────────────────────────────────────────
  function showGoalBanner(opts) {
    opts = opts || {};
    var text = opts.text || 'BUUUT !';

    // Screen flash
    var flash = document.createElement('div');
    flash.className = 'objective-flash';
    document.body.appendChild(flash);
    trackTimer(setTimeout(function () { safeRemove(flash); }, 900));

    var banner = document.createElement('div');
    banner.className = 'goal-banner';
    banner.textContent = text;
    document.body.appendChild(banner);
    trackTimer(setTimeout(function () { safeRemove(banner); }, 2500));
  }

  // ── Celebrate All ──────────────────────────────────────────────────────────
  function celebrateAll(opts) {
    opts = opts || {};
    var bannerText = opts.text || 'OBJECTIF !';

    showGoalBanner({ text: bannerText });
    spawnFlares({ count: 5 });
    trackTimer(setTimeout(function () { spawnConfetti({ count: 160 }); }, 200));
    trackTimer(setTimeout(function () { spawnFireworks({ duration: 2400 }); }, 400));
  }

  // ── Stop All ───────────────────────────────────────────────────────────────
  function stopAll() {
    clearAllTimers();
    setFire({ on: false });

    // Remove all fx layers
    var layers = document.querySelectorAll('.fx-layer');
    layers.forEach(function (l) { safeRemove(l); });

    // Remove banners
    var banners = document.querySelectorAll('.goal-banner, .objective-flash, .fire-flames');
    banners.forEach(function (b) { safeRemove(b); });

    document.body.removeAttribute('data-fire');
  }

  // ── DOM Event Listeners ────────────────────────────────────────────────────
  function bindEvents() {
    window.addEventListener('celebrate:goal', function (e) {
      var detail = (e && e.detail) || {};
      showGoalBanner({ text: detail.text });
    });

    window.addEventListener('celebrate:confetti', function (e) {
      var detail = (e && e.detail) || {};
      spawnConfetti({ count: detail.count, colors: detail.colors });
    });

    window.addEventListener('celebrate:flares', function (e) {
      var detail = (e && e.detail) || {};
      spawnFlares({ count: detail.count, color: detail.color });
    });

    window.addEventListener('celebrate:fireworks', function (e) {
      var detail = (e && e.detail) || {};
      spawnFireworks({ duration: detail.duration });
    });

    window.addEventListener('celebrate:fire', function (e) {
      var detail = (e && e.detail) || {};
      setFire({ on: detail.on !== undefined ? detail.on : true });
    });

    window.addEventListener('celebrate:all', function (e) {
      var detail = (e && e.detail) || {};
      celebrateAll({ text: detail.text });
    });

    window.addEventListener('celebrate:stop', function () {
      stopAll();
    });
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    ensureCSS();
    bindEvents();
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  var Celebrations = {
    confetti:     spawnConfetti,
    flares:       spawnFlares,
    fireworks:    spawnFireworks,
    fire:         setFire,
    goalBanner:   showGoalBanner,
    celebrateAll: celebrateAll,
    stopAll:      stopAll,
    _init:        init,
  };

  // Expose globally
  global.Celebrations = Celebrations;

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(typeof window !== 'undefined' ? window : this);
