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

  /* ── Restore dashboard state when returning via Back button (bfcache) ──
     When a user navigates back from a lesson, the browser may restore the page
     from its back/forward cache with video paused and the transition layer
     still visible. Reset everything so the looping background video plays again. */
  window.addEventListener('pageshow', function (e) {
    // Only intervene on bfcache restores — fresh loads already autoplay correctly
    if (!e.persisted) return;

    // Reset transition layer (in case user came back mid-transition)
    if (transLayer) {
      transLayer.classList.remove('is-playing');
      transLayer.setAttribute('aria-hidden', 'true');
    }
    if (transVideo) {
      try { transVideo.pause(); transVideo.removeAttribute('src'); transVideo.load(); } catch (err) {}
    }
    transitioning = false;

    // Restart the looping background video
    if (video) {
      try {
        video.currentTime = 0;
        var p = video.play();
        if (p && typeof p.catch === 'function') p.catch(function () {});
      } catch (err) {}
    }
  });

  /* ── Settings dropdown ── */

  var btnSettings = document.getElementById('btnSettings');
  var settingsDropdown = document.getElementById('settingsDropdown');

  function toggleSettings(forceClose) {
    if (!settingsDropdown || !btnSettings) return;
    var isOpen = settingsDropdown.classList.contains('is-open');
    if (forceClose || isOpen) {
      settingsDropdown.classList.remove('is-open');
      btnSettings.setAttribute('aria-expanded', 'false');
    } else {
      settingsDropdown.classList.add('is-open');
      btnSettings.setAttribute('aria-expanded', 'true');
    }
  }

  if (btnSettings) {
    btnSettings.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleSettings();
    });
  }

  // Close on outside click
  document.addEventListener('click', function (e) {
    if (settingsDropdown && settingsDropdown.classList.contains('is-open')) {
      if (!settingsDropdown.contains(e.target) && e.target !== btnSettings) {
        toggleSettings(true);
      }
    }
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

  /* ── Rewatch / Disclaimer buttons ── */

  var btnRewatch = document.getElementById('btnRewatch');
  var btnDisclaimer = document.getElementById('btnDisclaimer');
  var obGate = document.getElementById('obGate');

  function showOnboardingStep(stepNum) {
    toggleSettings(true);
    if (!obGate) return;
    obGate.hidden = false;
    obGate.style.opacity = '1';
    obGate.style.transition = '';
    // Hide all steps, show target
    document.querySelectorAll('.ob-step').forEach(function (s) {
      s.classList.remove('ob-step--active');
    });
    var target = document.getElementById('obStep' + stepNum);
    if (target) target.classList.add('ob-step--active');

    // Sync intro video source + caption track to current language
    if (stepNum === 2) {
      var introVid = document.getElementById('obIntroVideo');
      if (introVid) {
        var curLang = (window.rtLanguage === 'es') ? 'es' : 'en';
        var src = introVid.querySelector('source');
        if (src) src.src = 'videos/bookend/course-intro-' + curLang + '.mp4';
        var trk = introVid.querySelector('track');
        if (trk) {
          trk.src = 'videos/bookend/course-intro-' + curLang + '.vtt';
          trk.srclang = curLang;
          trk.label = curLang === 'es' ? 'Subtítulos' : 'Captions';
        }
        try { introVid.load(); } catch (e) {}
      }
    }

    // Stop the intro video whenever the modal closes (X, Escape, overlay click)
    function stopIntroVideo() {
      var introVid = document.getElementById('obIntroVideo');
      if (introVid) {
        try { introVid.pause(); introVid.currentTime = 0; } catch (e) {}
      }
    }

    // Inject a visible close button into the active card
    var card = target ? target.querySelector('.ob-card') : null;
    if (card && !card.querySelector('.ob-close-btn')) {
      card.style.position = 'relative';
      var closeBtn = document.createElement('button');
      closeBtn.className = 'ob-close-btn';
      closeBtn.setAttribute('aria-label', 'Close');
      closeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
      card.insertBefore(closeBtn, card.firstChild);
      closeBtn.addEventListener('click', function () {
        stopIntroVideo();
        obGate.hidden = true;
        closeBtn.remove();
        document.removeEventListener('keydown', closeHandler);
        obGate.removeEventListener('click', closeHandler);
      });
    }

    // ESC or clicking overlay background closes
    var closeHandler = function (e) {
      if (e.key === 'Escape' || e.target === obGate) {
        stopIntroVideo();
        obGate.hidden = true;
        var btn = obGate.querySelector('.ob-close-btn');
        if (btn) btn.remove();
        document.removeEventListener('keydown', closeHandler);
        obGate.removeEventListener('click', closeHandler);
      }
    };
    document.addEventListener('keydown', closeHandler);
    obGate.addEventListener('click', closeHandler);
  }

  if (btnRewatch) {
    btnRewatch.addEventListener('click', function () { showOnboardingStep(2); });
  }
  if (btnDisclaimer) {
    btnDisclaimer.addEventListener('click', function () { showOnboardingStep(3); });
  }

  /* ── Progress calculation for destination cards ── */

  /* ── Reset Progress action — clears visited lessons + resourcesVisited flag,
        keeps language/theme/onboarding-acknowledgment so the user isn't
        forced through the intro modal again. ── */
  var btnResetProgress = document.getElementById('btnResetProgress');
  if (btnResetProgress) {
    btnResetProgress.addEventListener('click', function () {
      var msg = (window.rtLanguage === 'es')
        ? '¿Reiniciar todo el progreso del curso? Se borrarán las lecciones completadas, los puntajes de los cuestionarios y el progreso del video. Sus preferencias de idioma y tema se mantendrán.'
        : 'Reset all course progress? This will clear completed lessons, quiz scores, and video progress. Your language and theme preferences will be kept.';
      if (!confirm(msg)) return;
      try {
        var p = JSON.parse(localStorage.getItem('rt-progress') || '{}');
        // Wipe progress fields, preserve user preferences
        var keep = {
          language: p.language,
          theme: p.theme,
          obAcknowledged: p.obAcknowledged,
        };
        localStorage.setItem('rt-progress', JSON.stringify(keep));
        // Also wipe any per-resource state
        try { localStorage.removeItem('ucf-bip-checklist'); } catch (e) {}
        try { localStorage.removeItem('ucf-bip-worksheet'); } catch (e) {}
      } catch (e) {}
      window.location.reload();
    });
  }

  function updateCardProgress() {
    var progress;
    try { progress = JSON.parse(localStorage.getItem('rt-progress') || '{}'); } catch (e) { progress = {}; }
    var visited = progress.visited || [];

    // Resources tile — has data-resources="true" and no data-lesson-ids.
    // Mark complete when user has visited resources.html (sets progress.resourcesVisited).
    document.querySelectorAll('.vd-dest[data-resources="true"]').forEach(function (card) {
      if (progress.resourcesVisited) {
        card.classList.add('vd-dest--complete');
      } else {
        card.classList.remove('vd-dest--complete');
      }
    });

    document.querySelectorAll('.vd-dest[data-lesson-ids]').forEach(function (card) {
      var lessonIds = (card.getAttribute('data-lesson-ids') || '').split(',').filter(Boolean);
      var total = lessonIds.length;
      if (total === 0) return;

      var done = 0;
      lessonIds.forEach(function (lid) {
        if (visited.indexOf(lid) !== -1) done++;
      });

      var pct = Math.round((done / total) * 100);
      var fillEl = card.querySelector('.vd-dest-progress-fill');

      if (fillEl) fillEl.style.width = pct + '%';

      if (pct >= 100) {
        card.classList.add('vd-dest--complete');
      } else {
        card.classList.remove('vd-dest--complete');
      }
    });
  }

  // Run on load
  updateCardProgress();

})();
