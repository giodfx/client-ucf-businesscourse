/* ===== Founder's Road Trip — Bilingual Language System ===== */
/* Reads language preference from rt-progress (set during onboarding),
   exposes window.rtLanguage, renders a compact toggle in lessons,
   and swaps Spanish text + video when ES is selected. */
(function() {
  'use strict';

  var STORAGE_KEY = 'rt-progress';

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

  // ── Audio path helper ──
  window.rtAudioPath = function(originalPath) {
    if (window.rtLanguage !== 'es') return originalPath;
    return originalPath.replace(/\/audio\/scenes\//, '/audio/scenes-es/');
  };

  // ── Spanish video swap for avatar MP4 videos ──
  function setupSpanishVideo() {
    if (lang !== 'es') return;

    var wrap = document.querySelector('.avatar-video-wrap');
    if (!wrap) return;

    var video = wrap.querySelector('video');
    if (!video) return;

    // Use data-video-es attribute if available
    var esSrc = wrap.getAttribute('data-video-es');
    if (!esSrc) {
      // Fallback: derive from lesson ID
      var lessonId = document.body.getAttribute('data-lesson-id');
      if (!lessonId) {
        var match = window.location.pathname.match(/(lesson-\d+-\d+)/);
        if (match) lessonId = match[1];
      }
      if (lessonId) esSrc = '../media/video/avatars/' + lessonId + '-avatar-es.mp4';
    }

    if (esSrc) {
      var sourceEl = video.querySelector('source');
      if (sourceEl) sourceEl.src = esSrc;
      else video.src = esSrc;
      video.load();
    }
  }

  // ── Swap [data-es] text elements when Spanish is active ──
  function applySpanishText() {
    if (lang !== 'es') return;
    document.querySelectorAll('[data-es]').forEach(function(el) {
      el.textContent = el.getAttribute('data-es');
    });
  }

  // ── Swap [data-es-html] rich content when Spanish is active ──
  function applySpanishHTML() {
    if (lang !== 'es') return;
    var ta = document.createElement('textarea');
    document.querySelectorAll('[data-es-html]').forEach(function(el) {
      ta.innerHTML = el.getAttribute('data-es-html');
      el.innerHTML = ta.value;
    });
  }

  // ── Swap [data-es-placeholder] on textareas ──
  function applySpanishPlaceholders() {
    if (lang !== 'es') return;
    document.querySelectorAll('[data-es-placeholder]').forEach(function(el) {
      el.setAttribute('placeholder', el.getAttribute('data-es-placeholder'));
    });
  }

  // ── Swap [data-outcome-es] on scenario buttons ──
  function applySpanishOutcomes() {
    if (lang !== 'es') return;
    document.querySelectorAll('[data-outcome-es]').forEach(function(el) {
      el.setAttribute('data-outcome', el.getAttribute('data-outcome-es'));
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
  function initLanguage() {
    renderToggle();
    setupSpanishVideo();
    applySpanishText();
    applySpanishHTML();
    applySpanishPlaceholders();
    applySpanishOutcomes();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLanguage);
  } else {
    initLanguage();
  }
})();
