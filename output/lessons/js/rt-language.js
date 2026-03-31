/* ===== Founder's Road Trip — Bilingual Language System ===== */
/* Reads language preference from rt-progress (set during onboarding),
   exposes window.rtLanguage, renders a compact toggle in lessons,
   and syncs Spanish audio over muted English-track avatar videos. */
(function() {
  'use strict';

  var STORAGE_KEY = 'rt-progress';

  // ── Read preference ──
  function getProgress() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch(e) { return {}; }
  }

  function saveProgress(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
    catch(e) {}
  }

  var progress = getProgress();
  var lang = progress.language || 'en';

  // Expose globally
  window.rtLanguage = lang;

  // Set document lang attribute
  document.documentElement.lang = lang === 'es' ? 'es' : 'en';

  // ── Audio path helper (still useful for other scripts) ──
  window.rtAudioPath = function(originalPath) {
    if (window.rtLanguage !== 'es') return originalPath;
    return originalPath.replace(/\/audio\/scenes\//, '/audio/scenes-es/');
  };

  // ── Spanish video swap for avatar MP4 videos ──
  // When Spanish is selected, swaps the video source to the Spanish-audio MP4.
  function setupSpanishVideo() {
    if (lang !== 'es') return;

    var video = document.querySelector('.avatar-video-wrap video');
    if (!video) return;

    // Detect lesson ID
    var lessonId = document.body.getAttribute('data-lesson-id');
    if (!lessonId) {
      var match = window.location.pathname.match(/(lesson-\d+-\d+)/);
      if (match) lessonId = match[1];
    }
    if (!lessonId) return;

    // Swap to Spanish MP4 (has Spanish audio baked in)
    var esSource = '../media/video/avatars/' + lessonId + '-avatar-es.mp4';
    var sourceEl = video.querySelector('source');
    if (sourceEl) {
      sourceEl.src = esSource;
    } else {
      video.src = esSource;
    }
    video.load();
  }

  // ── Swap [data-es] text elements when Spanish is active ──
  function applySpanishText() {
    if (lang !== 'es') return;
    document.querySelectorAll('[data-es]').forEach(function(el) {
      el.textContent = el.getAttribute('data-es');
    });
  }

  // ── Render language toggle ──
  function renderToggle() {
    var mount = document.getElementById('rt-lang-mount');
    if (!mount) return;

    mount.innerHTML =
      '<div class="rt-lang-switch" role="radiogroup" aria-label="Language">' +
        '<button class="rt-lang-sw-btn' + (lang === 'en' ? ' rt-lang-sw-btn--active' : '') + '" data-lang="en" role="radio" aria-checked="' + (lang === 'en') + '">EN</button>' +
        '<button class="rt-lang-sw-btn' + (lang === 'es' ? ' rt-lang-sw-btn--active' : '') + '" data-lang="es" role="radio" aria-checked="' + (lang === 'es') + '">ES</button>' +
      '</div>';

    var btns = mount.querySelectorAll('.rt-lang-sw-btn');
    btns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var newLang = this.dataset.lang;
        if (newLang === lang) return;

        var p = getProgress();
        p.language = newLang;
        saveProgress(p);

        window.location.reload();
      });
    });
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      renderToggle();
      setupSpanishVideo();
      applySpanishText();
    });
  } else {
    renderToggle();
    setupSpanishVideo();
    applySpanishText();
  }
})();
