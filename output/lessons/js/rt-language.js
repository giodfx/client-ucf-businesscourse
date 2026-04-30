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

  // ── Hide [data-show-only="<lang>"] elements when active language doesn't match ──
  // Used for LATAM resource callouts that are kept in Spanish only per Brian's
  // April 29 direction. Reload-driven, so no listener for live switches.
  function applyShowOnly() {
    document.querySelectorAll('[data-show-only]').forEach(function(el) {
      var only = el.getAttribute('data-show-only');
      if (only && only !== lang) el.style.display = 'none';
    });
  }

  // ── Inline styles for the lesson settings widget. Self-contained so
  // we don't need to ship a new CSS file. Mirrors the visual style of
  // the dashboard's vd-settings-* tokens. ──
  function injectSettingsStyles() {
    if (document.getElementById('rt-lesson-settings-css')) return;
    var s = document.createElement('style');
    s.id = 'rt-lesson-settings-css';
    // Dark theme matching the dashboard's vd-settings-dropdown look —
    // translucent dark panel, white text, pill toggles, proper SVG icons.
    s.textContent = [
      '.rt-ls-wrap{position:fixed;top:18px;right:20px;z-index:50;font-family:inherit;}',
      // !important on width/min-width/padding defeats responsive.css button{padding}
      // and accessibility.css button{min-width:48px} which would otherwise squeeze
      // the content box and collapse the SVG. box-sizing:border-box ensures the
      // explicit width/height aren't increased by padding/border.
      '.rt-ls-btn{width:44px !important;height:44px !important;min-width:44px !important;min-height:44px !important;padding:0 !important;box-sizing:border-box !important;border-radius:50%;border:1px solid rgba(255,255,255,0.18);background:rgba(20,28,40,0.88);color:#fff;cursor:pointer;display:flex !important;align-items:center;justify-content:center;backdrop-filter:blur(10px);box-shadow:0 4px 12px rgba(0,0,0,0.3);transition:transform 200ms ease, background 200ms ease;}',
      '.rt-ls-btn:hover{background:rgba(40,55,75,0.95);transform:rotate(20deg);}',
      '.rt-ls-btn:focus-visible{outline:2px solid #f4a83b;outline-offset:3px;}',
      // !important needed because base.css sets svg{height:auto} globally,
      // which collapses the gear icon to almost-zero height inside the button.
      // max-width:none defeats base.css svg{max-width:100%} which clamps the
      // SVG to the parent's content-box width. Without this, the gear collapses.
      '.rt-ls-btn svg{width:22px !important;height:22px !important;max-width:none !important;max-height:none !important;display:block !important;fill:currentColor;}',
      '.rt-ls-btn svg path{fill:currentColor;}',
      '.rt-ls-dropdown{position:absolute;top:56px;right:0;min-width:280px;background:rgba(20,28,40,0.96);border:1px solid rgba(255,255,255,0.1);border-radius:14px;box-shadow:0 12px 32px rgba(0,0,0,0.4);padding:14px;display:none;color:#e5e7eb;backdrop-filter:blur(12px);}',
      '.rt-ls-dropdown[data-open="true"]{display:block;}',
      '.rt-ls-item{display:flex;align-items:center;justify-content:space-between;padding:10px 6px;gap:12px;}',
      '.rt-ls-label{font-size:14px;font-weight:500;color:#e5e7eb;}',
      '.rt-ls-divider{height:1px;background:rgba(255,255,255,0.1);margin:6px 0;}',
      '.rt-ls-switch{display:inline-flex;background:rgba(255,255,255,0.08);border-radius:999px;padding:3px;border:1px solid rgba(255,255,255,0.12);}',
      '.rt-ls-sw-btn{display:inline-flex;align-items:center;justify-content:center;min-width:36px;padding:6px 12px;border:0;background:transparent;color:rgba(255,255,255,0.6);font-size:12px;font-weight:600;cursor:pointer;border-radius:999px;transition:background 150ms,color 150ms;}',
      '.rt-ls-sw-btn:hover{color:#fff;}',
      '.rt-ls-sw-btn--active{background:#f4a83b;color:#1a1a1a;}',
      '.rt-ls-sw-btn svg{display:block !important;width:14px !important;height:14px !important;max-width:none !important;max-height:none !important;fill:currentColor;}',
      // Light-theme overrides — flip the floating gear surface colors so
      // the widget reads in light mode without losing the orange accent.
      'html[data-theme="light"] .rt-ls-btn{background:rgba(255,255,255,0.92);border-color:rgba(0,0,0,0.12);color:#1e293b;box-shadow:0 4px 12px rgba(0,0,0,0.12);}',
      'html[data-theme="light"] .rt-ls-btn:hover{background:#fff;}',
      'html[data-theme="light"] .rt-ls-dropdown{background:rgba(255,255,255,0.96);border-color:rgba(0,0,0,0.08);color:#0f172a;box-shadow:0 12px 32px rgba(0,0,0,0.18);}',
      'html[data-theme="light"] .rt-ls-label{color:#1e293b;}',
      'html[data-theme="light"] .rt-ls-divider{background:rgba(0,0,0,0.08);}',
      'html[data-theme="light"] .rt-ls-switch{background:rgba(0,0,0,0.05);border-color:rgba(0,0,0,0.12);}',
      'html[data-theme="light"] .rt-ls-sw-btn{color:rgba(30,40,60,0.55);}',
      'html[data-theme="light"] .rt-ls-sw-btn:hover{color:#1e293b;}',
      'html[data-theme="light"] .rt-ls-sw-btn--active{background:#f4a83b;color:#1a1a1a;}',
      '@media (max-width: 600px){.rt-ls-wrap{top:10px;right:12px;}.rt-ls-btn{width:38px;height:38px;}.rt-ls-btn svg{width:18px;height:18px;}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── Render settings (gear) button + dropdown on every lesson page ──
  function renderSettings() {
    if (document.getElementById('rt-ls-wrap')) return;
    injectSettingsStyles();

    var labels = {
      en: { settings: 'Settings', language: 'Language', theme: 'Theme', resetProgress: 'Reset Progress', resetConfirm: 'Reset all course progress? This will clear completed lessons. Your language and theme preferences will be kept.' },
      es: { settings: 'Configuración', language: 'Idioma', theme: 'Tema', resetProgress: 'Restablecer Progreso', resetConfirm: '¿Restablecer todo el progreso del curso? Esto borrará las lecciones completadas. Sus preferencias de idioma y tema se mantendrán.' }
    };

    // Read current theme from localStorage (matches video-dashboard.js
    // convention: 'vd-theme' primary, 'theme-mode' fallback). Apply to
    // document so the lesson respects the user's choice immediately.
    var THEME_KEY = 'vd-theme';
    var currentTheme = 'dark';
    try {
      currentTheme = localStorage.getItem(THEME_KEY) || localStorage.getItem('theme-mode') || 'dark';
    } catch (_) {}
    if (currentTheme !== 'light' && currentTheme !== 'dark') currentTheme = 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    var t = labels[lang === 'es' ? 'es' : 'en'];

    var wrap = document.createElement('div');
    wrap.id = 'rt-ls-wrap';
    wrap.className = 'rt-ls-wrap';
    wrap.innerHTML = [
      '<button type="button" class="rt-ls-btn" id="rt-ls-btn" aria-label="' + t.settings + '" aria-expanded="false" aria-controls="rt-ls-dropdown">',
      '  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">',
      '    <path d="M19.43 12.98c.04-.32.07-.64.07-.98 0-.34-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65A.488.488 0 0 0 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98 0 .33.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5z"/>',
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
      '  <div class="rt-ls-item">',
      '    <span class="rt-ls-label">' + t.theme + '</span>',
      '    <div class="rt-ls-switch" role="radiogroup" aria-label="' + t.theme + '">',
      '      <button class="rt-ls-sw-btn' + (currentTheme === 'light' ? ' rt-ls-sw-btn--active' : '') + '" data-theme="light" role="radio" aria-checked="' + (currentTheme === 'light') + '" aria-label="Light"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1z"/></svg></button>',
      '      <button class="rt-ls-sw-btn' + (currentTheme === 'dark' ? ' rt-ls-sw-btn--active' : '') + '" data-theme="dark" role="radio" aria-checked="' + (currentTheme === 'dark') + '" aria-label="Dark"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/></svg></button>',
      '    </div>',
      '  </div>',
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
    wrap.querySelectorAll('.rt-ls-sw-btn[data-lang]').forEach(function(b) {
      b.addEventListener('click', function() {
        var newLang = this.dataset.lang;
        if (newLang === lang) return;
        var p = getProgress();
        p.language = newLang;
        saveProgress(p);
        window.location.reload();
      });
    });

    // Theme toggle inside dropdown — matches video-dashboard.js applyTheme
    wrap.querySelectorAll('.rt-ls-sw-btn[data-theme]').forEach(function(b) {
      b.addEventListener('click', function() {
        var newTheme = this.dataset.theme;
        if (newTheme === currentTheme) return;
        currentTheme = newTheme;
        document.documentElement.setAttribute('data-theme', newTheme);
        try {
          localStorage.setItem(THEME_KEY, newTheme);
          localStorage.setItem('theme-mode', newTheme);
        } catch (_) {}
        // Update button visual state
        wrap.querySelectorAll('.rt-ls-sw-btn[data-theme]').forEach(function(btn) {
          var isActive = btn.dataset.theme === newTheme;
          btn.classList.toggle('rt-ls-sw-btn--active', isActive);
          btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
        });
      });
    });

  }

  // ── Legacy renderToggle: fill the dashboard's #rt-lang-mount with EN/ES
  // buttons. The dashboard's video-dashboard.js settings dropdown
  // references this mount; we don't replace it on dashboard pages so
  // the dashboard's existing settings UX (with Theme + Rewatch + Disclaimer)
  // stays intact. Lesson pages don't have rt-lang-mount; they get the
  // gear-button rendered by renderSettings() above.
  function renderToggle() {
    var mount = document.getElementById('rt-lang-mount');
    if (!mount) return;
    mount.innerHTML =
      '<div class="rt-lang-switch" role="radiogroup" aria-label="Language">' +
        '<button class="rt-lang-sw-btn' + (lang === 'en' ? ' rt-lang-sw-btn--active' : '') + '" data-lang="en" role="radio" aria-checked="' + (lang === 'en') + '">EN</button>' +
        '<button class="rt-lang-sw-btn' + (lang === 'es' ? ' rt-lang-sw-btn--active' : '') + '" data-lang="es" role="radio" aria-checked="' + (lang === 'es') + '">ES</button>' +
      '</div>';
    mount.querySelectorAll('.rt-lang-sw-btn').forEach(function(btn) {
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
    // Dashboard has data-total-lessons; lesson pages have data-lesson-id.
    // Dashboard uses its own settings dropdown (vd-settings) which contains
    // #rt-lang-mount for our EN/ES toggle. Lesson pages get a fresh gear
    // button (top-right) with Language + Theme.
    var isDashboard = document.body.hasAttribute('data-total-lessons');
    var isLesson = document.body.hasAttribute('data-lesson-id');
    // Pages that already have the dashboard's vd-settings UI (resources.html
    // ships its own gear via video-dashboard.js + a #btnSettings element)
    // should NOT get a second gear from us. Detect ONLY by #btnSettings —
    // not by #rt-lang-mount, because every lesson page has that mount in
    // its header.
    var hasDashboardSettings = !!document.getElementById('btnSettings');

    if (hasDashboardSettings) {
      // Resources / dashboard / hybrid page — let the existing vd-settings
      // dropdown own the UI; we just fill its language mount with EN/ES.
      renderToggle();
    } else if (isLesson) {
      // Plain lesson page — inject our gear with Language + Theme.
      // Hide the inline #rt-lang-mount (only on lesson pages, scoped) so
      // the EN/ES toggle doesn't appear inline at the top of content.
      var mount = document.getElementById('rt-lang-mount');
      if (mount) mount.style.display = 'none';
      renderSettings();
    } else if (isDashboard) {
      renderToggle();
    } else {
      // Fallback for older HTML / unknown contexts.
      if (document.getElementById('rt-lang-mount')) renderToggle();
      else renderSettings();
    }

    setupSpanishVideo();
    applySpanishText();
    applySpanishHTML();
    applySpanishPlaceholders();
    applySpanishOutcomes();
    applyShowOnly();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLanguage);
  } else {
    initLanguage();
  }
})();
