/* ===== Roadtrip Engagement Tracker (DLCS native) =====
   Mirrors MentaLIFE's SCORM course-tracker shape so the LMS gradebook's
   existing video/interactive/KC parsers pick up DLCS data identically.

   Writes into localStorage.rt-progress (which roadtrip-lesson.js then
   POSTs to /api/courses/<id>/native-progress inside
   assessmentResults.courseProgress):

     rt-progress = {
       visited: [...],
       lessonScores: { "lesson-1-1": 80 },     // quiz.js writes this
       quizScores:    { "lesson-1-1": 80 },    // mirror for SCORM-shape readers
       quizAttempts:  { "lesson-1-1": 2 },
       vp: {                                    // Video progress (mentalife shape)
         "lesson-1-1": { sc: [0,1,2], tot: 3, wt: 240, done: true }
       },
       ix: {                                    // Interactive engagement
         "lesson-1-1": {
           "kc-1":   { t: "kc",       c: true, s: 100 },
           "drag-1": { t: "drag",     c: true },
           "scn-1":  { t: "scenario", c: true }
         }
       },
       kcSummary: { answered: 12, correct: 5 }, // course-wide KC totals
       lastVisitedAt, lastLessonId, totalLessons, totalModules, completedModules
     }

   Standalone (file://) renders work — tracker still writes to
   localStorage. Server PATCH only fires from roadtrip-lesson.js when URL
   matches /api/courses/<id>/asset/. */

(function() {
  'use strict';

  var STORAGE_KEY = 'rt-progress';
  // How often to flush video watch-time updates (ms). 5s is plenty —
  // we only care about minutes-resolution engagement.
  var VIDEO_FLUSH_MS = 5000;
  var DEBUG = true;
  function log() {
    if (!DEBUG) return;
    try { console.log.apply(console, ['[rt-engagement]'].concat(Array.from(arguments))); } catch (_) {}
  }
  log('script loaded — version 2026-04-30-v2');

  // Heartbeat marker — proves the tracker is actually running (vs. cached
  // old HTML). Writes a timestamp into rt-progress.engagementTrackerLoadedAt
  // so a quick D1 inspection confirms whether the iframe ever loaded this.
  try {
    var bootP = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    bootP.engagementTrackerLoadedAt = new Date().toISOString();
    bootP.engagementTrackerVersion = '2026-04-30-v2';
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bootP));
  } catch (_) {}

  function getProgress() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function saveProgress(p) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }
    catch (e) { /* quota / disabled — silent */ }
  }

  function getLessonId() {
    return (document.body && document.body.dataset && document.body.dataset.lessonId) || null;
  }

  // ─── Video watch-time tracking ──────────────────────────────────────────
  function setupVideoTracking() {
    var lid = getLessonId();
    if (!lid) { log('video: no lesson id, skipping'); return; }
    var videos = document.querySelectorAll('video');
    log('video: found', videos.length, 'video(s) on lesson', lid);
    if (!videos.length) return;

    var watchedSeconds = 0;
    var lastTime = 0;
    var lastSavedAt = 0;
    var sceneSet = new Set();
    var doneFlag = false;
    var totalScenes = videos.length; // each <video> on the page = a scene

    function flush() {
      var now = Date.now();
      if (now - lastSavedAt < VIDEO_FLUSH_MS && !doneFlag) return;
      lastSavedAt = now;
      var p = getProgress();
      if (!p.vp) p.vp = {};
      // Accumulate across visits — sum into existing.
      var prior = p.vp[lid] || { sc: [], tot: totalScenes, wt: 0, done: false };
      // Merge scene set
      var mergedSc = new Set(prior.sc || []);
      sceneSet.forEach(function(i) { mergedSc.add(i); });
      p.vp[lid] = {
        sc: Array.from(mergedSc),
        tot: Math.max(totalScenes, prior.tot || 0),
        wt: Math.round((prior.wt || 0) + watchedSeconds),
        done: prior.done || doneFlag
      };
      watchedSeconds = 0;
      // Also mirror into legacy videoMinutes for any reader that prefers a
      // simple seconds-per-lesson map.
      if (!p.videoMinutes) p.videoMinutes = {};
      p.videoMinutes[lid] = p.vp[lid].wt;
      saveProgress(p);
    }

    videos.forEach(function(v, idx) {
      v.addEventListener('play', function() {
        lastTime = v.currentTime;
        sceneSet.add(idx);
      });
      v.addEventListener('timeupdate', function() {
        if (v.paused || v.ended) return;
        var delta = v.currentTime - lastTime;
        // Skip negative deltas (scrubbed back) and large jumps (scrubbed forward);
        // only credit normal playback (~0.25s ticks).
        if (delta > 0 && delta < 2) watchedSeconds += delta;
        lastTime = v.currentTime;
        flush();
      });
      v.addEventListener('pause', function() { flush(); });
      v.addEventListener('ended', function() {
        sceneSet.add(idx);
        if (sceneSet.size >= totalScenes) doneFlag = true;
        flush();
      });
    });

    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'hidden') {
        lastSavedAt = 0;
        flush();
      }
    });
  }

  // ─── Knowledge-check + Interactive engagement tracking ──────────────────
  function setupInteractiveTracking() {
    var lid = getLessonId();
    if (!lid) { log('interactives: no lesson id, skipping'); return; }
    var kcCount = document.querySelectorAll('.knowledge-check, .rt-knowledge-check, .rt-kc-step').length;
    var ddCount = document.querySelectorAll('.drag-drop, .rt-drag-drop').length;
    var scCount = document.querySelectorAll('.scenario, .rt-branching-scenario, [data-scenario-id]').length;
    var fcCount = document.querySelectorAll('.flashcard, .rt-flashcard').length;
    log('interactives: lesson', lid, '— kc:', kcCount, 'drag:', ddCount, 'scenario:', scCount, 'flashcard:', fcCount);

    function ensureBlocks() {
      var p = getProgress();
      if (!p.ix) p.ix = {};
      if (!p.ix[lid]) p.ix[lid] = {};
      if (!p.kcSummary) p.kcSummary = { answered: 0, correct: 0 };
      return p;
    }

    // Snapshot the current per-lesson kc state so we can compute deltas
    // against it and update the course-wide kcSummary correctly.
    var lastKcCorrect = 0;
    var lastKcAnswered = 0;

    function tickKnowledgeChecks() {
      var blocks = document.querySelectorAll(
        '.knowledge-check, .rt-knowledge-check, .rt-kc-step'
      );
      if (!blocks.length) return;
      var correct = 0;
      var answered = 0;
      blocks.forEach(function(kc, i) {
        var v = kc.dataset.answered;
        if (v === 'correct') { correct++; answered++; }
        else if (v === 'incorrect') { answered++; }
        // also check for the visual signals quiz.js / interactive.js use
        if (!v) {
          if (kc.querySelector('.rt-kc-correct, .quiz-correct, .knowledge-check-correct')) {
            correct++; answered++;
          } else if (kc.querySelector('.rt-kc-incorrect, .quiz-incorrect, .knowledge-check-incorrect')) {
            answered++;
          }
        }
        // record per-block in ix
        if (answered > 0 || v) {
          var p2 = ensureBlocks();
          var key = 'kc-' + i;
          p2.ix[lid][key] = {
            t: 'kc',
            c: !!(v === 'correct' || kc.querySelector('.rt-kc-correct, .quiz-correct, .knowledge-check-correct')),
            s: (v === 'correct' || kc.querySelector('.rt-kc-correct, .quiz-correct, .knowledge-check-correct')) ? 100 : 0
          };
          saveProgress(p2);
        }
      });
      // Update course-wide kcSummary from the delta against last snapshot
      var dCorrect = correct - lastKcCorrect;
      var dAnswered = answered - lastKcAnswered;
      if (dCorrect !== 0 || dAnswered !== 0) {
        var p = ensureBlocks();
        p.kcSummary.correct = (p.kcSummary.correct || 0) + dCorrect;
        p.kcSummary.answered = (p.kcSummary.answered || 0) + dAnswered;
        // Clamp to non-negative
        if (p.kcSummary.correct < 0) p.kcSummary.correct = 0;
        if (p.kcSummary.answered < 0) p.kcSummary.answered = 0;
        saveProgress(p);
      }
      lastKcCorrect = correct;
      lastKcAnswered = answered;
    }

    function tickInteractives() {
      var p = ensureBlocks();
      var changed = false;

      // Drag-drop completion
      document.querySelectorAll('.drag-drop, .rt-drag-drop, [data-drag-drop-id]').forEach(function(dd, i) {
        var done = dd.classList.contains('rt-drag-drop--complete') ||
                   dd.dataset.completed === 'true' ||
                   (dd.querySelectorAll('.drop-correct, .rt-drag-correct').length > 0 &&
                    dd.querySelectorAll('.drop-zone, .rt-drag-target').length ===
                    dd.querySelectorAll('.drop-correct, .rt-drag-correct').length);
        if (done) {
          var k = 'drag-' + i;
          if (!p.ix[lid][k] || !p.ix[lid][k].c) {
            p.ix[lid][k] = { t: 'drag', c: true };
            changed = true;
          }
        }
      });

      // Branching scenarios
      document.querySelectorAll('.scenario, .rt-branching-scenario, [data-scenario-id]').forEach(function(s, i) {
        var resultEl = s.querySelector(
          '.scenario-result, .rt-scenario-outcome, [data-scenario-outcome-visible="true"], .rt-bs-result'
        );
        var done = (resultEl && resultEl.offsetParent !== null) ||
                   s.querySelector('.scenario-choice[data-clicked="true"], button[data-scenario-choice][data-clicked="true"]');
        if (done) {
          var k = 'scn-' + i;
          if (!p.ix[lid][k] || !p.ix[lid][k].c) {
            p.ix[lid][k] = { t: 'scenario', c: true };
            changed = true;
          }
        }
      });

      // Flashcards
      document.querySelectorAll('.flashcard, .rt-flashcard').forEach(function(c, i) {
        var flipped = c.classList.contains('flipped') ||
                      c.classList.contains('rt-flashcard--flipped');
        if (flipped) {
          var k = 'flash-' + i;
          if (!p.ix[lid][k]) {
            p.ix[lid][k] = { t: 'flashcard', c: true };
            changed = true;
          }
        }
      });

      // Tabs / accordions opened
      document.querySelectorAll('.rt-tab-panel, .accordion-content, .rt-accordion-content').forEach(function(panel, i) {
        var opened = panel.classList.contains('active') ||
                     panel.classList.contains('open') ||
                     panel.getAttribute('aria-hidden') === 'false';
        if (opened) {
          var k = 'tab-' + i;
          if (!p.ix[lid][k]) {
            p.ix[lid][k] = { t: 'tab', c: true };
            changed = true;
          }
        }
      });

      // Reflections (textarea with content)
      document.querySelectorAll('.reflection, .rt-reflection, [data-reflection-id]').forEach(function(r, i) {
        var ta = r.querySelector('textarea');
        var hasContent = ta && ta.value && ta.value.trim().length > 10;
        var explicit = r.dataset.submitted === 'true';
        if (hasContent || explicit) {
          var k = 'refl-' + i;
          if (!p.ix[lid][k]) {
            p.ix[lid][k] = { t: 'reflection', c: true };
            changed = true;
          }
        }
      });

      // Self-assessment widgets (custom: rt-sa-quiz on lesson 8-1)
      document.querySelectorAll('.rt-sa-quiz').forEach(function(sa, i) {
        var done = sa.querySelector('.rt-sa-step[data-step="8"].rt-sa-step--active');
        if (done) {
          var k = 'self-assess-' + i;
          if (!p.ix[lid][k]) {
            p.ix[lid][k] = { t: 'self-assess', c: true };
            changed = true;
          }
        }
      });

      if (changed) saveProgress(p);
    }

    function tickAll() {
      try { tickKnowledgeChecks(); } catch (_) {}
      try { tickInteractives(); } catch (_) {}
    }

    tickAll();
    document.addEventListener('click', function() {
      // Defer one tick so DOM mutations from the click handler land first.
      setTimeout(tickAll, 100);
    });
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible') tickAll();
    });
    document.addEventListener('blur', function(e) {
      if (e.target && e.target.tagName === 'TEXTAREA') tickAll();
    }, true);
  }

  function init() {
    setupVideoTracking();
    setupInteractiveTracking();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
