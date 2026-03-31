/* ===== Founder's Road Trip — Lesson Interactivity ===== */
(function() {
  'use strict';

  // Knowledge check handler
  window.checkKC = function(btn) {
    var step = btn.closest('.rt-kc-step') || btn.closest('.rt-knowledge-check');
    var options = step.querySelectorAll('.rt-kc-option');
    var explanation = step.querySelector('.rt-kc-explanation');
    var nextBtn = step.querySelector('.rt-kc-next');
    var isCorrect = btn.dataset.correct === 'true';

    options.forEach(function(o) {
      o.disabled = true;
      o.classList.remove('rt-kc-selected');
      if (o.dataset.correct === 'true') o.classList.add('rt-kc-correct');
    });
    btn.classList.add('rt-kc-selected');
    if (!isCorrect) btn.classList.add('rt-kc-incorrect');
    if (explanation) explanation.hidden = false;
    if (nextBtn) nextBtn.hidden = false;
  };

  window.kcNext = function(stepperId, currentStep) {
    var stepper = document.getElementById(stepperId);
    if (!stepper) return;
    var current = stepper.querySelector('[data-step="' + currentStep + '"]');
    var next = stepper.querySelector('[data-step="' + (currentStep + 1) + '"]');
    if (current) current.hidden = true;
    if (next) next.hidden = false;
    var counter = stepper.querySelector('.rt-kc-current');
    if (counter) counter.textContent = currentStep + 2;
  };

  // Infographic step-through
  window.igNext = function(igId) {
    var ig = document.getElementById(igId);
    if (!ig) return;
    var total = parseInt(ig.dataset.igTotal) || 1;
    var visible = ig.querySelectorAll('.rt-ig-step:not([hidden])');
    var shown = visible.length;
    if (shown >= total) return;
    var next = ig.querySelector('[data-ig-step="' + shown + '"]');
    if (next) {
      next.hidden = false;
      next.classList.add('rt-ig-step--active');
      next.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setTimeout(function() { next.classList.remove('rt-ig-step--active'); }, 800);
    }
    var cur = ig.querySelector('.rt-ig-cur');
    if (cur) cur.textContent = shown + 1;
    var fill = ig.querySelector('.rt-ig-progress-fill');
    if (fill) fill.style.width = ((shown + 1) / total * 100).toFixed(1) + '%';
    if (shown + 1 >= total) {
      var btn = ig.querySelector('.rt-ig-btn');
      if (btn) { btn.textContent = 'All steps revealed!'; btn.disabled = true; }
      var footer = ig.querySelector('.rt-ig-footer');
      if (footer) footer.style.display = 'block';
    }
  };

  // Branching scenario
  window.makeBranchingChoice = function(scenarioId, choiceIndex) {
    var container = document.querySelector('[data-scenario-id="' + scenarioId + '"]');
    if (!container) return;
    var buttons = container.querySelectorAll('.scenario-choice');
    var feedback = document.getElementById(scenarioId + '-feedback');
    var chosen = buttons[choiceIndex];
    if (!chosen) return;

    var isGood = chosen.dataset.isGood === 'true';
    var outcome = chosen.dataset.outcome || '';

    buttons.forEach(function(btn) {
      btn.disabled = true;
      btn.classList.remove('scenario-correct', 'scenario-incorrect');
      if (btn.dataset.isGood === 'true') btn.classList.add('scenario-correct');
    });
    if (!isGood) chosen.classList.add('scenario-incorrect');

    if (feedback && outcome) {
      feedback.innerHTML = (isGood ? '<strong>Good call!</strong> ' : '<strong>Not quite.</strong> ') + outcome;
      feedback.classList.add('show');
    }
  };

  // Tabs
  window.switchTab = function(tabsId, index) {
    var container = document.querySelector('[data-tabs-id="' + tabsId + '"]');
    if (!container) return;
    container.querySelectorAll('.rt-tab-btn').forEach(function(btn, i) {
      btn.classList.toggle('rt-tab-btn--active', i === index);
      btn.setAttribute('aria-selected', i === index);
    });
    container.querySelectorAll('.rt-tab-panel').forEach(function(panel, i) {
      panel.classList.toggle('rt-tab-panel--active', i === index);
      panel.hidden = i !== index;
    });
  };

  // Accordion
  window.toggleAccordion = function(btn) {
    var expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', !expanded);
    var content = document.getElementById(btn.getAttribute('aria-controls'));
    if (content) content.hidden = expanded;
  };

  // Flashcards
  window.flipCard = function(card) {
    card.classList.toggle('rt-flashcard--flipped');
  };

  // Checklist
  window.saveChecklist = function(clId) {
    try {
      var container = document.querySelector('[data-checklist-id="' + clId + '"]');
      if (!container) return;
      var checks = [];
      container.querySelectorAll('.rt-checklist-input').forEach(function(cb) { checks.push(cb.checked); });
      localStorage.setItem('rt-cl-' + clId, JSON.stringify(checks));
    } catch(e) {}
  };

  function loadChecklists() {
    document.querySelectorAll('.rt-checklist').forEach(function(cl) {
      try {
        var id = cl.dataset.checklistId;
        var saved = JSON.parse(localStorage.getItem('rt-cl-' + id) || '[]');
        cl.querySelectorAll('.rt-checklist-input').forEach(function(cb, i) { if (saved[i]) cb.checked = true; });
      } catch(e) {}
    });
  }

  // Scroll progress
  window.addEventListener('scroll', function() {
    var bar = document.querySelector('.rt-scroll-progress');
    if (!bar) return;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
  });

  // Mark lesson visited
  try {
    var lid = document.body.dataset.lessonId;
    if (lid) {
      var key = 'rt-progress';
      var progress = JSON.parse(localStorage.getItem(key) || '{}');
      if (!progress.visited) progress.visited = [];
      if (progress.visited.indexOf(lid) === -1) progress.visited.push(lid);
      localStorage.setItem(key, JSON.stringify(progress));
    }
  } catch(e) {}

  // Init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadChecklists);
  } else {
    loadChecklists();
  }
})();
