/* ============================================================
   Video Dashboard — Anchor tracking + destination overlay
   ============================================================ */
(function () {
  'use strict';

  var ANCHOR_X_DEFAULT = 0.54;
  var ANCHOR_Y_DEFAULT = 0.69;

  var video   = document.getElementById('sceneVideo');
  var stage   = document.getElementById('stage');
  var layerUi = document.getElementById('layerUi');
  var btnNav  = document.getElementById('btnNav');
  var overlay = document.getElementById('layerOverlay');
  var btnClose = document.getElementById('btnClose');

  /* ── Anchor tracking ──
     Keeps the DESTINATIONS button pinned to a specific point
     in the video's native frame, compensating for object-fit:cover scaling. */

  function parseAnchor(attr, fallback) {
    var n = parseFloat(attr);
    return Number.isFinite(n) ? n : fallback;
  }

  function updateAnchor() {
    if (!video || !layerUi || !stage) return;
    var vw = video.videoWidth;
    var vh = video.videoHeight;
    if (!vw || !vh) return;

    var ax = parseAnchor(video.getAttribute('data-anchor-x'), ANCHOR_X_DEFAULT);
    var ay = parseAnchor(video.getAttribute('data-anchor-y'), ANCHOR_Y_DEFAULT);

    var cw = stage.clientWidth;
    var ch = stage.clientHeight;
    if (!cw || !ch) return;

    // object-fit: cover math
    var scale = Math.max(cw / vw, ch / vh);
    var ox = (cw - vw * scale) * 0.5;
    var oy = (ch - vh * scale) * 0.5;
    var sx = ox + ax * vw * scale;
    var sy = oy + ay * vh * scale;

    layerUi.style.setProperty('--btn-x', (sx / cw * 100) + '%');
    layerUi.style.setProperty('--btn-y', (sy / ch * 100) + '%');
  }

  if (video) {
    if (video.readyState >= 1) updateAnchor();
    video.addEventListener('loadedmetadata', updateAnchor);
    window.addEventListener('resize', updateAnchor);
    if (typeof ResizeObserver !== 'undefined' && stage) {
      new ResizeObserver(updateAnchor).observe(stage);
    }
  }

  /* ── Menu open / close ── */

  function openMenu() {
    if (!overlay) return;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    if (btnClose) btnClose.focus();
  }

  function closeMenu() {
    if (!overlay) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    if (btnNav) btnNav.focus();
  }

  if (btnNav) {
    btnNav.addEventListener('click', openMenu);
  }

  if (btnClose) {
    btnClose.addEventListener('click', function (e) {
      e.stopPropagation();
      closeMenu();
    });
  }

  if (overlay) {
    // Close on backdrop click
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeMenu();
    });
  }

  // Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay && overlay.classList.contains('is-open')) {
      closeMenu();
    }
  });

  /* ── Focus trap inside overlay when open ── */
  if (overlay) {
    overlay.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var focusable = overlay.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      var first = focusable[0];
      var last  = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  /* ── Transition video ──
     Destinations with data-transition="video/xxx.mp4" play that video
     full-screen before navigating. Others navigate directly. */

  var transLayer = document.getElementById('vdTransition');
  var transVideo = document.getElementById('vdTransitionVideo');
  var HOLD_MS = 400; // brief hold on last frame before navigating
  var transitioning = false;

  function playTransition(videoSrc, href) {
    if (transitioning || !transLayer || !transVideo) return false;
    transitioning = true;

    // Close the menu overlay first
    closeMenu();

    // Pause the looping background video
    if (video) video.pause();

    // Set source and play
    transVideo.src = videoSrc;
    transVideo.currentTime = 0;
    transLayer.setAttribute('aria-hidden', 'false');

    // Fade in the transition layer
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        transLayer.classList.add('is-playing');
      });
    });

    // When transition video ends, hold briefly then navigate
    transVideo.onended = function () {
      transVideo.onended = null;
      transVideo.pause();
      setTimeout(function () {
        window.location.href = href;
      }, HOLD_MS);
    };

    // Attempt play
    var playPromise = transVideo.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(function () {
        // If autoplay blocked, just navigate directly
        window.location.href = href;
      });
    }

    // Fallback if video errors
    transVideo.addEventListener('error', function () {
      transLayer.classList.remove('is-playing');
      window.location.href = href;
    }, { once: true });

    return true;
  }

  // Intercept clicks on destination items with transition videos
  var destItems = document.querySelectorAll('.vd-dest[data-transition]');
  destItems.forEach(function (item) {
    item.addEventListener('click', function (e) {
      var src = item.getAttribute('data-transition');
      var href = item.getAttribute('href');
      if (src && href) {
        e.preventDefault();
        playTransition(src, href);
      }
    });
  });

  /* ── Theme toggle (dark / light) ── */

  var THEME_KEY = 'vd-theme';
  var btnTheme = document.getElementById('btnTheme');

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
      localStorage.setItem('theme-mode', theme);
    } catch (e) { /* ignore */ }
  }

  // Restore saved preference (check both keys for cross-page sync)
  var saved = null;
  try { saved = localStorage.getItem(THEME_KEY) || localStorage.getItem('theme-mode'); } catch (e) { /* ignore */ }
  if (saved === 'light' || saved === 'dark') {
    applyTheme(saved);
  }

  if (btnTheme) {
    btnTheme.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme');
      applyTheme(current === 'light' ? 'dark' : 'light');
    });
  }
})();
