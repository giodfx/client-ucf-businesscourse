/* ===== Founder's Road Trip — Bookend Video Embed (accessible custom player) =====
   Auto-injects intro/outro avatar videos with a custom WCAG 2.1 AA control bar:
   play/pause, scrubber, time, mute/volume, captions toggle, speed dropdown,
   fullscreen. Native <video> is the source of truth — controls are hidden
   and replaced. If JS fails, the native controls remain usable.

   Tracks playback to CourseTracker (recordVideoScene + recordVideoTime), keyed
   as "bk-{video-id}" so it counts toward the 10% video weight in progress. */
(function() {
  'use strict';

  var PLACEMENTS = {
    'lesson-0-1': { id: 'course-intro',     position: 'top',    titleEn: 'Welcome',                 titleEs: 'Bienvenida' },
    'lesson-1-1': { id: 'module-1-intro',   position: 'top',    titleEn: 'Module Introduction',     titleEs: 'Introducción del Módulo' },
    'lesson-2-1': { id: 'module-2-intro',   position: 'top',    titleEn: 'Module Introduction',     titleEs: 'Introducción del Módulo' },
    'lesson-3-1': { id: 'module-3-intro',   position: 'top',    titleEn: 'Module Introduction',     titleEs: 'Introducción del Módulo' },
    'lesson-4-1': { id: 'module-4-intro',   position: 'top',    titleEn: 'Module Introduction',     titleEs: 'Introducción del Módulo' },
    'lesson-5-1': { id: 'module-5-intro',   position: 'top',    titleEn: 'Module Introduction',     titleEs: 'Introducción del Módulo' },
    'lesson-6-1': { id: 'module-6-intro',   position: 'top',    titleEn: 'Module Introduction',     titleEs: 'Introducción del Módulo' },
    'lesson-7-1': { id: 'module-7-intro',   position: 'top',    titleEn: 'Module Introduction',     titleEs: 'Introducción del Módulo' },
    'lesson-8-1': { id: 'module-8-intro',   position: 'top',    titleEn: 'Module Introduction',     titleEs: 'Introducción del Módulo' },
    'lesson-1-3': { id: 'module-1-outro',   position: 'bottom', titleEn: 'Module Recap',            titleEs: 'Resumen del Módulo' },
    'lesson-2-3': { id: 'module-2-outro',   position: 'bottom', titleEn: 'Module Recap',            titleEs: 'Resumen del Módulo' },
    'lesson-3-3': { id: 'module-3-outro',   position: 'bottom', titleEn: 'Module Recap',            titleEs: 'Resumen del Módulo' },
    'lesson-4-3': { id: 'module-4-outro',   position: 'bottom', titleEn: 'Module Recap',            titleEs: 'Resumen del Módulo' },
    'lesson-5-2': { id: 'module-5-outro',   position: 'bottom', titleEn: 'Module Recap',            titleEs: 'Resumen del Módulo' },
    'lesson-6-3': { id: 'module-6-outro',   position: 'bottom', titleEn: 'Module Recap',            titleEs: 'Resumen del Módulo' },
    'lesson-7-4': { id: 'module-7-outro',   position: 'bottom', titleEn: 'Module Recap',            titleEs: 'Resumen del Módulo' },
    'lesson-8-3': { id: 'module-8-outro',   position: 'bottom', titleEn: 'Course Wrap-Up',          titleEs: 'Cierre del Curso' }
  };

  var SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
  var CC_PREF_KEY = 'rt-bookend-cc-mode';     // 'showing' | 'hidden'
  var SPEED_PREF_KEY = 'rt-bookend-speed';    // number

  var I18N = {
    en: {
      play: 'Play', pause: 'Pause', mute: 'Mute', unmute: 'Unmute',
      seek: 'Seek video', volume: 'Volume',
      cc: 'Captions', ccOn: 'Captions on', ccOff: 'Captions off',
      speed: 'Playback speed', speedCurrent: 'Current speed',
      fullscreen: 'Fullscreen', exitFullscreen: 'Exit fullscreen',
      controls: 'Video controls'
    },
    es: {
      play: 'Reproducir', pause: 'Pausar', mute: 'Silenciar', unmute: 'Activar sonido',
      seek: 'Buscar en el video', volume: 'Volumen',
      cc: 'Subtítulos', ccOn: 'Subtítulos activados', ccOff: 'Subtítulos desactivados',
      speed: 'Velocidad', speedCurrent: 'Velocidad actual',
      fullscreen: 'Pantalla completa', exitFullscreen: 'Salir de pantalla completa',
      controls: 'Controles de video'
    }
  };

  function init() {
    var lessonId = document.body.getAttribute('data-lesson-id');
    if (!lessonId) return;
    var p = PLACEMENTS[lessonId];
    if (!p) return;

    var lang = (window.rtLanguage === 'es') ? 'es' : 'en';
    var src = 'videos/bookend/' + p.id + '-' + lang + '.mp4';
    var vtt = 'videos/bookend/' + p.id + '-' + lang + '.vtt';
    var label = (lang === 'es') ? p.titleEs : p.titleEn;

    var wrap = buildPlayer({
      videoId: p.id,
      lang: lang,
      src: src,
      vtt: vtt,
      label: label
    });
    wrap.classList.add('rt-bookend-video--' + p.position);

    if (p.position === 'top') {
      var moduleIntro = document.querySelector('.rt-module-intro');
      if (moduleIntro && moduleIntro.parentNode) {
        moduleIntro.parentNode.insertBefore(wrap, moduleIntro.nextSibling);
        return;
      }
      var article = document.querySelector('article.rt-lesson-content');
      if (article) article.insertBefore(wrap, article.firstChild);
    } else {
      var article2 = document.querySelector('article.rt-lesson-content');
      if (article2) article2.appendChild(wrap);
    }
  }

  function buildPlayer(opts) {
    var t = I18N[opts.lang] || I18N.en;

    var section = document.createElement('section');
    section.className = 'rt-bookend-video';
    section.setAttribute('aria-label', opts.label);

    var stage = document.createElement('div');
    stage.className = 'rt-bk-stage';
    section.appendChild(stage);

    // <video> — native element, our control bar drives it. No `controls`
    // attribute so the browser's UI is hidden; native fallback shown only
    // when JS is broken (CSS class flips on init).
    // preload=auto so the first frame paints (preload=metadata leaves the
    // video black until play). No `crossorigin` — we serve same-origin from
    // file:// or the LMS, and crossorigin=anonymous outright blocks the load
    // under file:// in Chromium.
    var video = document.createElement('video');
    video.className = 'rt-bk-video';
    video.preload = 'auto';
    video.playsInline = true;

    var source = document.createElement('source');
    source.src = opts.src;
    source.type = 'video/mp4';
    video.appendChild(source);

    // Native <track> kept for assistive tech / accessibility tree, but the
    // visible captions come from our own JS renderer below — file:// blocks
    // native track loading entirely under Chromium's local CORS rules.
    var track = document.createElement('track');
    track.kind = 'captions';
    track.label = (opts.lang === 'es') ? 'Español' : 'English';
    track.srclang = opts.lang;
    track.src = opts.vtt;
    video.appendChild(track);

    stage.appendChild(video);

    // Captions overlay — JS-rendered, sits above controls, hidden until cue.
    var captionBox = document.createElement('div');
    captionBox.className = 'rt-bk-captions';
    captionBox.setAttribute('aria-live', 'polite');
    captionBox.setAttribute('aria-atomic', 'true');
    stage.appendChild(captionBox);

    var controls = buildControls(video, opts.videoId, t, captionBox, opts.vtt);
    stage.appendChild(controls);

    // Big play overlay on the poster — clearer affordance than a tiny play
    // button in the corner of the control bar.
    var overlay = document.createElement('button');
    overlay.type = 'button';
    overlay.className = 'rt-bk-overlay-play';
    overlay.setAttribute('aria-label', t.play);
    overlay.innerHTML = svgIcon('play', 32);
    overlay.addEventListener('click', function(){ video.play(); });
    video.addEventListener('play', function(){ stage.classList.add('rt-bk-stage--started'); });
    stage.appendChild(overlay);

    wireKeyboard(stage, video, controls, t);
    wireTracking(video, opts.videoId);
    applySavedPrefs(video);

    return section;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Controls
  // ─────────────────────────────────────────────────────────────────────────

  function buildControls(video, videoId, t, captionBox, vttUrl) {
    var bar = document.createElement('div');
    bar.className = 'rt-bk-controls';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', t.controls);

    bar.appendChild(makePlayPause(video, t));
    bar.appendChild(makeTime(video));
    bar.appendChild(makeScrubber(video, t));
    bar.appendChild(makeVolume(video, t));
    bar.appendChild(makeCC(video, t, captionBox, vttUrl));
    bar.appendChild(makeSpeed(video, t));
    bar.appendChild(makeFullscreen(video, t));

    return bar;
  }

  function makePlayPause(video, t) {
    var btn = btnEl('rt-bk-btn rt-bk-play', t.play, svgIcon('play', 20));
    btn.setAttribute('aria-pressed', 'false');
    function sync() {
      var paused = video.paused;
      btn.setAttribute('aria-label', paused ? t.play : t.pause);
      btn.setAttribute('aria-pressed', paused ? 'false' : 'true');
      btn.innerHTML = paused ? svgIcon('play', 20) : svgIcon('pause', 20);
    }
    btn.addEventListener('click', function(){ video.paused ? video.play() : video.pause(); });
    video.addEventListener('play', sync);
    video.addEventListener('pause', sync);
    sync();
    return btn;
  }

  function makeTime(video) {
    var el = document.createElement('span');
    el.className = 'rt-bk-time';
    el.setAttribute('aria-hidden', 'true');  // duplicates scrubber's aria-valuetext
    el.textContent = '0:00 / 0:00';
    function sync() {
      el.textContent = fmt(video.currentTime) + ' / ' + fmt(video.duration || 0);
    }
    video.addEventListener('loadedmetadata', sync);
    video.addEventListener('timeupdate', sync);
    return el;
  }

  function makeScrubber(video, t) {
    var input = document.createElement('input');
    input.type = 'range';
    input.className = 'rt-bk-scrubber';
    input.min = '0';
    input.max = '100';
    input.step = '0.1';
    input.value = '0';
    input.setAttribute('aria-label', t.seek);
    input.setAttribute('aria-valuemin', '0');
    input.setAttribute('aria-valuemax', '100');

    function syncFromVideo() {
      if (input.matches(':active')) return;
      var pct = video.duration ? (video.currentTime / video.duration) * 100 : 0;
      input.value = String(pct);
      input.setAttribute('aria-valuenow', pct.toFixed(1));
      input.setAttribute('aria-valuetext', fmt(video.currentTime) + ' of ' + fmt(video.duration || 0));
      input.style.setProperty('--rt-bk-progress', pct + '%');
    }
    input.addEventListener('input', function() {
      if (!video.duration) return;
      video.currentTime = (parseFloat(input.value) / 100) * video.duration;
      input.style.setProperty('--rt-bk-progress', input.value + '%');
    });
    video.addEventListener('timeupdate', syncFromVideo);
    video.addEventListener('loadedmetadata', syncFromVideo);
    return input;
  }

  function makeVolume(video, t) {
    var wrap = document.createElement('div');
    wrap.className = 'rt-bk-volume-wrap';

    var btn = btnEl('rt-bk-btn rt-bk-mute', t.mute, svgIcon('volume-high', 20));
    btn.setAttribute('aria-pressed', 'false');

    var slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'rt-bk-volume';
    slider.min = '0';
    slider.max = '1';
    slider.step = '0.05';
    slider.value = '1';
    slider.setAttribute('aria-label', t.volume);

    function sync() {
      var muted = video.muted || video.volume === 0;
      btn.setAttribute('aria-label', muted ? t.unmute : t.mute);
      btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
      var icon = muted ? 'volume-mute' : (video.volume < 0.5 ? 'volume-low' : 'volume-high');
      btn.innerHTML = svgIcon(icon, 20);
      slider.value = String(muted ? 0 : video.volume);
      slider.setAttribute('aria-valuetext', Math.round((muted ? 0 : video.volume) * 100) + '%');
      slider.style.setProperty('--rt-bk-progress', ((muted ? 0 : video.volume) * 100) + '%');
    }
    btn.addEventListener('click', function() {
      video.muted = !video.muted;
      if (!video.muted && video.volume === 0) video.volume = 1;
    });
    slider.addEventListener('input', function() {
      video.volume = parseFloat(slider.value);
      video.muted = video.volume === 0;
    });
    video.addEventListener('volumechange', sync);
    sync();

    wrap.appendChild(btn);
    wrap.appendChild(slider);
    return wrap;
  }

  function makeCC(video, t, captionBox, vttUrl) {
    var btn = btnEl('rt-bk-btn rt-bk-cc', t.cc, svgIcon('cc', 20));
    btn.setAttribute('aria-pressed', 'false');

    // Captions DEFAULT OFF — only show when learner asks for them.
    // Source of cues: window.RT_BOOKEND_CAPTIONS (preloaded captions.js).
    // Reading from a global avoids file:// CORS that blocks fetch + <track>.
    var key = vttUrl.replace(/^.*\/|\.vtt$/g, ''); // "course-intro-en"
    var bag = (typeof window !== 'undefined' && window.RT_BOOKEND_CAPTIONS) || {};
    var cues = bag[key] || [];
    // Captions ON by default — user must explicitly turn them off.
    var on = true;
    var saved = null;
    try { saved = localStorage.getItem(CC_PREF_KEY); } catch (_) {}
    if (saved === 'hidden') on = false;

    function syncBtn() {
      btn.setAttribute('aria-label', on ? t.ccOn : t.ccOff);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.classList.toggle('rt-bk-btn--active', on);
      captionBox.classList.toggle('rt-bk-captions--off', !on);
      if (!on) captionBox.textContent = '';
    }
    syncBtn();

    btn.addEventListener('click', function() {
      on = !on;
      try { localStorage.setItem(CC_PREF_KEY, on ? 'showing' : 'hidden'); } catch (_) {}
      syncBtn();
      renderCue();
    });

    function renderCue() {
      if (!on || cues.length === 0) { captionBox.textContent = ''; return; }
      var tnow = video.currentTime;
      var active = null;
      for (var i = 0; i < cues.length; i++) {
        if (cues[i].start <= tnow && cues[i].end > tnow) { active = cues[i]; break; }
      }
      captionBox.textContent = active ? active.text : '';
    }

    video.addEventListener('timeupdate', renderCue);
    video.addEventListener('seeked', renderCue);

    // If captions.js wasn't loaded for some reason, log a single warning.
    if (cues.length === 0) {
      console.warn('[rt-bookend] No cues for ' + key + ' (window.RT_BOOKEND_CAPTIONS missing entry)');
      btn.disabled = true;
    }

    return btn;
  }

  function makeSpeed(video, t) {
    var wrap = document.createElement('div');
    wrap.className = 'rt-bk-speed-wrap';

    var btn = btnEl('rt-bk-btn rt-bk-speed', t.speed, '1×');
    btn.setAttribute('aria-haspopup', 'menu');
    btn.setAttribute('aria-expanded', 'false');

    var menu = document.createElement('ul');
    menu.className = 'rt-bk-speed-menu';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', t.speed);
    menu.hidden = true;

    SPEEDS.forEach(function(rate) {
      var li = document.createElement('li');
      li.setAttribute('role', 'none');
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'rt-bk-speed-item';
      item.setAttribute('role', 'menuitemradio');
      item.setAttribute('aria-checked', rate === 1 ? 'true' : 'false');
      item.dataset.rate = String(rate);
      item.textContent = formatRate(rate);
      item.addEventListener('click', function() {
        applyRate(rate);
        closeMenu(true);
      });
      li.appendChild(item);
      menu.appendChild(li);
    });

    function applyRate(rate) {
      video.playbackRate = rate;
      btn.textContent = formatRate(rate);
      btn.setAttribute('aria-label', t.speedCurrent + ': ' + formatRate(rate));
      Array.prototype.forEach.call(menu.querySelectorAll('[role="menuitemradio"]'), function(it) {
        it.setAttribute('aria-checked', parseFloat(it.dataset.rate) === rate ? 'true' : 'false');
      });
      try { localStorage.setItem(SPEED_PREF_KEY, String(rate)); } catch (_) {}
    }

    var savedRate = null;
    try { savedRate = parseFloat(localStorage.getItem(SPEED_PREF_KEY)); } catch (_) {}
    if (savedRate && SPEEDS.indexOf(savedRate) >= 0) applyRate(savedRate);

    function openMenu() {
      menu.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      var checked = menu.querySelector('[aria-checked="true"]') || menu.querySelector('[role="menuitemradio"]');
      if (checked) checked.focus();
      document.addEventListener('click', onOutside, true);
      document.addEventListener('keydown', onKey, true);
    }
    function closeMenu(returnFocus) {
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('click', onOutside, true);
      document.removeEventListener('keydown', onKey, true);
      if (returnFocus) btn.focus();
    }
    function onOutside(e) {
      if (!wrap.contains(e.target)) closeMenu(false);
    }
    function onKey(e) {
      var items = Array.prototype.slice.call(menu.querySelectorAll('[role="menuitemradio"]'));
      var idx = items.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); closeMenu(true); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); items[(idx + 1) % items.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); items[(idx - 1 + items.length) % items.length].focus(); }
      else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
      else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (document.activeElement && document.activeElement.dataset.rate) {
          applyRate(parseFloat(document.activeElement.dataset.rate));
          closeMenu(true);
        }
      }
    }
    btn.addEventListener('click', function() {
      menu.hidden ? openMenu() : closeMenu(true);
    });
    btn.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (menu.hidden) openMenu();
      }
    });

    wrap.appendChild(btn);
    wrap.appendChild(menu);
    return wrap;
  }

  function makeFullscreen(video, t) {
    var btn = btnEl('rt-bk-btn rt-bk-fullscreen', t.fullscreen, svgIcon('expand', 20));

    function getStage() { return video.closest('.rt-bk-stage'); }
    function isFs() { return !!(document.fullscreenElement); }
    function sync() {
      var on = isFs();
      btn.setAttribute('aria-label', on ? t.exitFullscreen : t.fullscreen);
      btn.innerHTML = svgIcon(on ? 'compress' : 'expand', 20);
    }
    btn.addEventListener('click', function() {
      if (isFs()) {
        if (document.exitFullscreen) document.exitFullscreen();
      } else {
        var el = getStage() || video;
        if (el.requestFullscreen) el.requestFullscreen();
      }
    });
    document.addEventListener('fullscreenchange', sync);
    sync();
    return btn;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Keyboard shortcuts on the player stage (when focus is inside)
  // ─────────────────────────────────────────────────────────────────────────

  function wireKeyboard(stage, video, controls, t) {
    stage.tabIndex = 0;
    stage.setAttribute('aria-label', 'Video player. Use space to play, arrow keys to seek and adjust volume, C for captions, F for fullscreen.');

    stage.addEventListener('keydown', function(e) {
      // Don't hijack when focus is inside a slider or menu — those have own handlers.
      var tag = (e.target.tagName || '').toUpperCase();
      var isControl = e.target.classList && (e.target.classList.contains('rt-bk-scrubber') || e.target.classList.contains('rt-bk-volume') || e.target.closest('.rt-bk-speed-menu'));
      if (isControl) return;

      switch (e.key) {
        case ' ': case 'k':
          e.preventDefault();
          video.paused ? video.play() : video.pause();
          break;
        case 'ArrowLeft': case 'j':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 5);
          break;
        case 'ArrowRight': case 'l':
          e.preventDefault();
          video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          video.volume = Math.min(1, video.volume + 0.05);
          if (video.volume > 0) video.muted = false;
          break;
        case 'ArrowDown':
          e.preventDefault();
          video.volume = Math.max(0, video.volume - 0.05);
          break;
        case 'm':
          video.muted = !video.muted;
          break;
        case 'c':
          var ccBtn = controls.querySelector('.rt-bk-cc');
          if (ccBtn) ccBtn.click();
          break;
        case 'f':
          var fsBtn = controls.querySelector('.rt-bk-fullscreen');
          if (fsBtn) fsBtn.click();
          break;
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CourseTracker hooks (wired in earlier — kept for SCORM progress weight)
  // ─────────────────────────────────────────────────────────────────────────

  function wireTracking(video, videoId) {
    if (!window.CourseTracker) return;
    var key = 'bk-' + videoId;
    var lastReported = 0;
    var EVERY = 30;
    var startedRecorded = false, completedRecorded = false;

    video.addEventListener('play', function() {
      if (startedRecorded) return;
      startedRecorded = true;
      if (typeof CourseTracker.recordVideoScene === 'function') {
        CourseTracker.recordVideoScene(key, 0, 1);
      }
    });
    video.addEventListener('timeupdate', function() {
      var delta = video.currentTime - lastReported;
      if (delta >= EVERY && typeof CourseTracker.recordVideoTime === 'function') {
        CourseTracker.recordVideoTime(key, delta);
        lastReported = video.currentTime;
      }
    });
    video.addEventListener('ended', function() {
      if (completedRecorded) return;
      completedRecorded = true;
      var rem = (video.duration || 0) - lastReported;
      if (rem > 0 && typeof CourseTracker.recordVideoTime === 'function') {
        CourseTracker.recordVideoTime(key, rem);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  function applySavedPrefs(video) {
    // Speed and CC are applied inside their builders. Volume is browser-default.
  }

  function btnEl(cls, label, html) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.setAttribute('aria-label', label);
    b.innerHTML = html;
    return b;
  }

  function fmt(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function formatRate(r) {
    return (r === 1 ? '1' : r.toString().replace(/^0/, '')) + '\u00d7'; // U+00D7 ×
  }

  function svgIcon(name, size) {
    var s = String(size || 20);
    var paths = {
      'play':        '<path d="M8 5v14l11-7z"/>',
      'pause':       '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>',
      'volume-high': '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.23v2.06a7 7 0 0 1 0 13.42v2.06a9 9 0 0 0 0-17.54z"/>',
      'volume-low':  '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/>',
      'volume-mute': '<path d="M16.5 12A4.5 4.5 0 0 0 14 8v2.18l2.45 2.45A4.51 4.51 0 0 0 16.5 12zM19 12a7 7 0 0 1-1 3.55l1.5 1.5A8.94 8.94 0 0 0 21 12c0-4.28-3-7.86-7-8.77v2.06A7 7 0 0 1 19 12zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.17v2.06a8.94 8.94 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9zM12 4 9.91 6.09 12 8.18z"/>',
      'cc':          '<path d="M19 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1z"/>',
      'expand':      '<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>',
      'compress':    '<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>'
    };
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">' + (paths[name] || '') + '</svg>';
  }

  // Public API — lets pages without data-lesson-id (e.g., index.html intro)
  // build the same custom player. Caller passes {videoId, src, vtt, lang, label}
  // and inserts the returned element wherever they want.
  window.rtBookend = {
    buildPlayer: buildPlayer,
    init: init
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
