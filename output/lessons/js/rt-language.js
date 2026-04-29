/* ===== Founder's Road Trip — Bilingual Language System + Lesson Settings ===== */
/* Reads language preference from rt-progress (set during onboarding),
   exposes window.rtLanguage, renders a settings (gear) button on every
   lesson with a dropdown containing the EN/ES toggle + Reset Progress,
   and swaps Spanish text + video when ES is selected. The settings
   button mirrors the dashboard's chrome bar pattern from
   video-dashboard.js (vd-settings-*) so the lesson UX matches. */
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
    var esSrc = wrap.getAttribute('data-video-es');
    if (!esSrc) {
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

  // ── Inline styles for the lesson settings widget. Self-contained so
  // we don't need to ship a new CSS file. Mirrors the visual style of
  // the dashboard's vd-settings-* tokens. ──
  function injectSettingsStyles() {
    if (document.getElementById('rt-lesson-settings-css')) return;
    var s = document.createElement('style');
    s.id = 'rt-lesson-settings-css';
    s.textContent = [
      '.rt-ls-wrap{position:fixed;top:14px;right:18px;z-index:50;font-family:inherit;}',
      '.rt-ls-btn{width:42px;height:42px;border-radius:50%;border:1px solid rgba(255,255,255,0.25);background:rgba(20,30,42,0.85);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);transition:transform 120ms,background 120ms;}',
      '.rt-ls-btn:hover{background:rgba(40,55,75,0.95);transform:rotate(15deg);}',
      '.rt-ls-btn:focus{outline:2px solid #f4a83b;outline-offset:2px;}',
      '.rt-ls-btn svg{width:22px;height:22px;}',
      '.rt-ls-dropdown{position:absolute;top:52px;right:0;min-width:240px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.18);padding:12px;display:none;color:#1f2937;}',
      '.rt-ls-dropdown[data-open="true"]{display:block;}',
      '.rt-ls-item{display:flex;align-items:center;justify-content:space-between;padding:8px 4px;}',
      '.rt-ls-label{font-size:13px;font-weight:500;color:#374151;}',
      '.rt-ls-divider{height:1px;background:#e5e7eb;margin:8px 0;}',
      '.rt-ls-action{display:block;width:100%;text-align:left;padding:8px 4px;border:0;background:transparent;color:#374151;font-size:13px;cursor:pointer;border-radius:6px;}',
      '.rt-ls-action:hover{background:#f3f4f6;}',
      '.rt-ls-action--danger{color:#b91c1c;}',
      '.rt-ls-switch{display:inline-flex;border:1px solid #d1d5db;border-radius:999px;overflow:hidden;}',
      '.rt-ls-sw-btn{padding:4px 12px;border:0;background:transparent;color:#6b7280;font-size:12px;font-weight:600;cursor:pointer;}',
      '.rt-ls-sw-btn--active{background:#f4a83b;color:#fff;}',
      '#rt-lang-mount{display:none !important;}', // hide the legacy inline toggle
      '@media (max-width: 600px){.rt-ls-wrap{top:8px;right:10px;}.rt-ls-btn{width:36px;height:36px;}.rt-ls-btn svg{width:18px;height:18px;}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── Render settings (gear) button + dropdown on every lesson page ──
  function renderSettings() {
    if (document.getElementById('rt-ls-wrap')) return;
    injectSettingsStyles();

    var labels = {
      en: { settings: 'Settings', language: 'Language', resetProgress: 'Reset Progress', resetConfirm: 'Reset all course progress? This will clear completed lessons. Your language preference will be kept.' },
      es: { settings: 'Configuración', language: 'Idioma', resetProgress: 'Restablecer Progreso', resetConfirm: '¿Restablecer todo el progreso del curso? Esto borrará las lecciones completadas. Su preferencia de idioma se mantendrá.' }
    };
    var t = labels[lang === 'es' ? 'es' : 'en'];

    var wrap = document.createElement('div');
    wrap.id = 'rt-ls-wrap';
    wrap.className = 'rt-ls-wrap';
    wrap.innerHTML = [
      '<button type="button" class="rt-ls-btn" id="rt-ls-btn" aria-label="' + t.settings + '" aria-expanded="false" aria-controls="rt-ls-dropdown">',
      '  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
      '    <circle cx="12" cy="12" r="3"></circle>',
      '    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>',
      '  </svg>',
      '</button>',
      '<div class="rt-ls-dropdown" id="rt-ls-dropdown" role="menu" aria-label="' + t.settings + '">',
      '  <div class="rt-ls-item">',
      '    <span class="rt-ls-label">' + t.language + '</span>',
      '    <div class="rt-ls-switch" role="radiogroup" aria-label="' + t.language + '">',
      '      <button class="rt-ls-sw-btn' + (lang === 'en' ? ' rt-ls-sw-btn--active' : '') + '" data-lang="en" role="radio" aria-checked="' + (lang === 'en') + '">EN</button>',
      '      <button class="rt-ls-sw-btn' + (lang === 'es' ? ' rt-ls-sw-btn--active' : '') + '" data-lang="es" role="radio" aria-checked="' + (lang === 'es') + '">ES</button>',
      '    </div>',
      '  </div>',
      '  <div class="rt-ls-divider"></div>',
      '  <button type="button" class="rt-ls-action rt-ls-action--danger" id="rt-ls-reset" role="menuitem">' + t.resetProgress + '</button>',
      '</div>'
    ].join('\n');

    document.body.appendChild(wrap);

    var btn = document.getElementById('rt-ls-btn');
    var dropdown = document.getElementById('rt-ls-dropdown');

    function setOpen(open) {
      if (!dropdown || !btn) return;
      dropdown.setAttribute('data-open', open ? 'true' : 'false');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var open = dropdown.getAttribute('data-open') === 'true';
      setOpen(!open);
    });

    document.addEventListener('click', function(e) {
      if (dropdown.getAttribute('data-open') !== 'true') return;
      if (!dropdown.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
        setOpen(false);
      }
    });

    // Language toggle inside dropdown
    wrap.querySelectorAll('.rt-ls-sw-btn').forEach(function(b) {
      b.addEventListener('click', function() {
        var newLang = this.dataset.lang;
        if (newLang === lang) return;
        var p = getProgress();
        p.language = newLang;
        saveProgress(p);
        window.location.reload();
      });
    });

    // Reset progress
    var resetBtn = document.getElementById('rt-ls-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function() {
        if (!window.confirm(t.resetConfirm)) return;
        var p = getProgress();
        var keep = { language: p.language };
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(keep)); } catch (_) {}
        try { localStorage.removeItem('ucf-bip-checklist'); } catch (_) {}
        try { localStorage.removeItem('ucf-bip-worksheet'); } catch (_) {}
        window.location.reload();
      });
    }
  }

  // Run on DOM ready
  function initLanguage() {
    renderSettings();
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
