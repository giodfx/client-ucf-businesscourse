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
  log('script loaded — version 2026-04-30-v5');

  // Heartbeat marker — proves the tracker is actually running (vs. cached
  // old HTML). Writes a timestamp into rt-progress.engagementTrackerLoadedAt
  // so a quick D1 inspection confirms whether the iframe ever loaded this.
  // Also runs a one-time KC migration on upgrade from <v4: pre-v4 trackers
  // counted wrong answers as correct (the reveal-marker `.rt-kc-correct`
  // short-circuited the count) so kcSummary and ix.kc-* entries from those
  // sessions can't be trusted. Wipe them once so v4 rebuilds clean.
  try {
    var bootP = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    var priorVersion = bootP.engagementTrackerVersion || '';
    var needsKcReset = priorVersion === '' || priorVersion < '2026-04-30-v5';
    if (needsKcReset) {
      log('KC migration: clearing stale kcSummary/ix from prior version', priorVersion || '(none)');
      delete bootP.kcSummary;
      delete bootP.ix;
    }
    bootP.engagementTrackerLoadedAt = new Date().toISOString();
    bootP.engagementTrackerVersion = '2026-04-30-v5';
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
  // Note: rt-bookend.js creates <video> elements DYNAMICALLY at
  // DOMContentLoaded — sometimes after this tracker runs. We use a
  // MutationObserver to attach listeners to videos added later.
  var videoListenersAttached = new WeakSet();

  function attachVideoListenersTo(videos, lid, state) {
    var attached = 0;
    videos.forEach(function(v, idx) {
      if (videoListenersAttached.has(v)) return;
      videoListenersAttached.add(v);
      attached++;
      v.addEventListener('play', function() {
        state.lastTime = v.currentTime;
        state.sceneSet.add(idx);
        state.hasActivity = true;
        log('video: play event scene', idx, 'on lesson', lid);
      });
      v.addEventListener('timeupdate', function() {
        if (v.paused || v.ended) return;
        var delta = v.currentTime - state.lastTime;
        if (delta > 0 && delta < 2) state.watchedSeconds += delta;
        state.lastTime = v.currentTime;
        state.flush();
      });
      v.addEventListener('pause', function() { state.flush(); });
      v.addEventListener('ended', function() {
        state.sceneSet.add(idx);
        if (state.sceneSet.size >= state.totalScenes()) state.doneFlag = true;
        state.flush();
      });
    });
    if (attached > 0) {
      log('video: attached listeners to', attached, 'new video(s) (total tracked:', videos.length, ')');
    }
  }

  function setupVideoTracking() {
    var lid = getLessonId();
    if (!lid) { log('video: no lesson id, skipping'); return; }

    var state = {
      watchedSeconds: 0,
      lastTime: 0,
      lastSavedAt: 0,
      sceneSet: new Set(),
      doneFlag: false,
      hasActivity: false,
      totalScenes: function() { return document.querySelectorAll('video').length; },
      flush: function() {
        var now = Date.now();
        if (now - state.lastSavedAt < VIDEO_FLUSH_MS && !state.doneFlag) return;
        // Don't write phantom vp entries if no actual video activity has
        // occurred yet on this lesson. Without this gate, the visibilitychange
        // handler writes { sc: [], tot: N, wt: 0 } the moment the user tabs
        // away from a lesson that has a video — even if they never pressed
        // play — making the gradebook show "Module N — 0/1".
        var p = getProgress();
        var existed = !!(p.vp && p.vp[lid]);
        if (!state.hasActivity && !existed) return;
        state.lastSavedAt = now;
        if (!p.vp) p.vp = {};
        var prior = p.vp[lid] || { sc: [], tot: state.totalScenes(), wt: 0, done: false };
        var mergedSc = new Set(prior.sc || []);
        state.sceneSet.forEach(function(i) { mergedSc.add(i); });
        p.vp[lid] = {
          sc: Array.from(mergedSc),
          tot: Math.max(state.totalScenes(), prior.tot || 0),
          wt: Math.round((prior.wt || 0) + state.watchedSeconds),
          done: prior.done || state.doneFlag
        };
        state.watchedSeconds = 0;
        if (!p.videoMinutes) p.videoMinutes = {};
        p.videoMinutes[lid] = p.vp[lid].wt;
        saveProgress(p);
      }
    };

    // Initial scan.
    var initialVideos = document.querySelectorAll('video');
    log('video: initial scan found', initialVideos.length, 'video(s) on lesson', lid);
    attachVideoListenersTo(initialVideos, lid, state);

    // Watch for videos added later (rt-bookend.js creates them dynamically).
    if (window.MutationObserver) {
      var mo = new MutationObserver(function(mutations) {
        var found = false;
        for (var i = 0; i < mutations.length; i++) {
          var added = mutations[i].addedNodes;
          for (var j = 0; j < added.length; j++) {
            var n = added[j];
            if (!n || n.nodeType !== 1) continue;
            if (n.tagName === 'VIDEO') { found = true; }
            else if (n.querySelector && n.querySelector('video')) { found = true; }
          }
        }
        if (found) {
          attachVideoListenersTo(document.querySelectorAll('video'), lid, state);
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });
    }

    // Also retry every 500ms for the first 5 seconds — covers edge cases
    // where MutationObserver attachment misses early mutations.
    var retries = 0;
    var retryInterval = setInterval(function() {
      retries++;
      attachVideoListenersTo(document.querySelectorAll('video'), lid, state);
      if (retries >= 10) clearInterval(retryInterval);
    }, 500);

    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'hidden') {
        state.lastSavedAt = 0;
        state.flush();
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
      // UCF actual answer markers (verified against interactive.js + quiz.js +
      // roadtrip-lesson.js):
      //   - roadtrip-lesson.js: .rt-kc-correct / .rt-kc-incorrect on the button
      //   - interactive.js:     .correct / .incorrect on a child <label>
      //   - quiz.js:            .correct-answer / .incorrect-answer on <label>
      var CORRECT_SELECTORS   = '.rt-kc-correct, label.correct, label.correct-answer';
      var INCORRECT_SELECTORS = '.rt-kc-incorrect, label.incorrect, label.incorrect-answer';
      var correct = 0;
      var answered = 0;
      blocks.forEach(function(kc, i) {
        var v = kc.dataset.answered;
        var hasCorrect = v === 'correct' || !!kc.querySelector(CORRECT_SELECTORS) || kc.classList.contains('rt-kc-correct');
        var hasIncorrect = v === 'incorrect' || !!kc.querySelector(INCORRECT_SELECTORS) || kc.classList.contains('rt-kc-incorrect');
        // Incorrect-wins precedence: when a learner picks wrong, the UI
        // usually adds `.incorrect` to their selection AND `.correct` to
        // reveal the right answer. If we let `.correct` short-circuit, every
        // wrong answer counts as correct (the gradebook 100% bug). Treat
        // any presence of `.incorrect` as "they got it wrong" first.
        if (hasIncorrect) { answered++; }
        else if (hasCorrect) { correct++; answered++; }
        // record per-block in ix
        if (hasCorrect || hasIncorrect) {
          var p2 = ensureBlocks();
          var key = 'kc-' + i;
          p2.ix[lid][key] = {
            t: 'kc',
            c: hasCorrect,
            s: hasCorrect ? 100 : 0
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

      // Drag-drop completion. Actual interactive.js markers:
      //   - .correct-zone / .incorrect-zone on drop targets
      //   - .answered on items
      document.querySelectorAll('.drag-drop, .rt-drag-drop, [data-drag-drop-id]').forEach(function(dd, i) {
        var zones = dd.querySelectorAll('.drop-zone, .rt-drag-target');
        var correctZones = dd.querySelectorAll('.correct-zone');
        var done = dd.classList.contains('rt-drag-drop--complete') ||
                   dd.dataset.completed === 'true' ||
                   (zones.length > 0 && correctZones.length === zones.length) ||
                   dd.querySelectorAll('.answered').length > 0;
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

  // One-time sweep: remove any vp entries that look like phantoms — written
  // by an older version of this tracker before the hasActivity gate landed.
  // Phantom = sc:[] AND wt:0 AND done!==true. After sweep, the next
  // server PATCH will replace the bad blob in dlcs_learner_state.
  function cleanPhantomVpEntries() {
    var p = getProgress();
    if (!p.vp || typeof p.vp !== 'object') return;
    var changed = false;
    Object.keys(p.vp).forEach(function(lid) {
      var v = p.vp[lid] || {};
      var noScenes = !v.sc || v.sc.length === 0;
      var noTime = !v.wt || v.wt === 0;
      var notDone = v.done !== true;
      if (noScenes && noTime && notDone) {
        log('video: removing phantom vp entry for lesson', lid);
        delete p.vp[lid];
        changed = true;
      }
    });
    if (changed) saveProgress(p);
  }

  function init() {
    cleanPhantomVpEntries();
    setupVideoTracking();
    setupInteractiveTracking();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
