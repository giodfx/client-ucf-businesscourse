/* ===== Founder's Road Trip — Dashboard JS ===== */
(function() {
  'use strict';

  var STORAGE_KEY = 'rt-progress';
  var totalLessons = parseInt(document.body.dataset.totalLessons || '0', 10);
  var startLessonId = document.body.dataset.startLesson || 'lesson-0-1';

  var startScreen = document.getElementById('rt-start-screen');
  var dashboard = document.getElementById('rt-dashboard');
  var skipBtn = document.getElementById('rt-skip-start');

  function getProgress() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch(e) {
      return {};
    }
  }

  function saveProgress(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch(e) {}
  }

  // ─── LMS Progress Bridge ───
  // When this course is loaded inside the LearningPlatform (via the
  // /api/courses/<id>/asset/... endpoint), hydrate localStorage from the
  // server before rendering. Makes progress survive across devices,
  // browsers, and incognito sessions. When loaded standalone (visualizer
  // public share URL, file://) the regex below doesn't match — we fall
  // back to localStorage-only behavior unchanged.
  var lmsCourseIdMatch = window.location.pathname.match(/\/api\/courses\/([^/]+)\/asset\//);
  var lmsCourseId = lmsCourseIdMatch ? lmsCourseIdMatch[1] : null;

  function hydrateFromServer() {
    if (!lmsCourseId) return Promise.resolve();
    return fetch('/api/courses/' + lmsCourseId + '/native-content', {
      credentials: 'same-origin'
    })
      .then(function(res) { return res.ok ? res.json() : null; })
      .then(function(data) {
        if (!data || !data.progress) return;
        var local = getProgress();
        var serverVisited = data.progress.completedNodes || [];
        local.visited = local.visited || [];
        // Union: server's known completions + any local-only progress.
        // Server is authoritative for previously-known visits; local is
        // authoritative for visits made since last sync (offline / racing).
        serverVisited.forEach(function(id) {
          if (local.visited.indexOf(id) === -1) local.visited.push(id);
        });
        saveProgress(local);
      })
      .catch(function() { /* offline / 401 / 404 — silent fallback */ });
  }

  /* ---- Start Here gating ---- */
  function hasCompletedStartHere() {
    var progress = getProgress();
    var visited = progress.visited || [];
    return visited.indexOf(startLessonId) !== -1 || progress.startHereSkipped;
  }

  function showDashboard() {
    if (startScreen) startScreen.classList.add('rt-hidden');
    if (dashboard) dashboard.style.display = '';
    updateDashboard();
  }

  function showStartScreen() {
    if (startScreen) startScreen.classList.remove('rt-hidden');
    if (dashboard) dashboard.style.display = 'none';
  }

  // Skip button
  if (skipBtn) {
    skipBtn.addEventListener('click', function() {
      var progress = getProgress();
      progress.startHereSkipped = true;
      saveProgress(progress);
      showDashboard();
    });
  }

  /* ---- Dashboard update ---- */
  function updateDashboard() {
    var progress = getProgress();
    var visited = progress.visited || [];

    // Update GPS pins
    var pins = document.querySelectorAll('.rt-gps-pin');
    pins.forEach(function(pin) {
      var lessonIds = (pin.dataset.lessonIds || '').split(',').filter(Boolean);
      var totalInModule = parseInt(pin.dataset.totalLessons || '0', 10);
      var completedInModule = 0;

      lessonIds.forEach(function(lid) {
        if (visited.indexOf(lid) !== -1) completedInModule++;
      });

      var statusEl = pin.querySelector('.rt-pin-status');
      if (!statusEl) return;

      if (completedInModule >= totalInModule && totalInModule > 0) {
        statusEl.dataset.status = 'explored';
      } else if (completedInModule > 0) {
        statusEl.dataset.status = 'in-progress';
      } else {
        statusEl.dataset.status = 'not-visited';
      }
    });

    // Mini progress in header
    var overallPct = totalLessons > 0 ? Math.round((visited.length / totalLessons) * 100) : 0;
    var miniPct = document.getElementById('rt-mini-pct');
    if (miniPct) miniPct.textContent = String(overallPct);
  }

  /* ---- Init ---- */
  hydrateFromServer().then(function() {
    if (hasCompletedStartHere()) {
      showDashboard();
    } else {
      showStartScreen();
    }
  });
})();
