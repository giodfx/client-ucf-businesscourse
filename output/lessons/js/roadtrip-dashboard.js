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
  if (hasCompletedStartHere()) {
    showDashboard();
  } else {
    showStartScreen();
  }
})();
