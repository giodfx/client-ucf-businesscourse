/**
 * Quiz Engine — All 12 Question Types
 *
 * Handles answer checking, feedback display, SCORM recording, and quiz navigation
 * for: multiple-choice, multiple-select, true-false, fill-blank, sequencing,
 * drag-drop, hotspot, categorization, matching, word-bank-cloze,
 * scenario-judgment, numeric-entry.
 *
 * Globals exposed: checkAnswer, nextQuestion, previousQuestion, submitQuiz,
 * reviewQuiz, removeMatchPair (called from onclick handlers in HTML).
 */
(function () {
  'use strict';

  var currentQuizQuestion = 1;
  var quizAnswers = {};

  function checkAnswer(questionIndex) {
    var question = document.querySelector('[data-question-index="' + questionIndex + '"]');
    if (!question) return;
    var type = question.dataset.questionType || 'multiple-choice';
    var result;
    switch (type) {
      case 'multiple-choice': result = checkMC(question); break;
      case 'multiple-select': result = checkMS(question); break;
      case 'true-false': result = checkTF(question); break;
      case 'fill-blank': result = checkFillBlank(question); break;
      case 'sequencing': result = checkSequencing(question); break;
      case 'drag-drop': result = checkDragDrop(question); break;
      case 'hotspot': result = checkHotspot(question); break;
      case 'categorization': result = checkCategorization(question); break;
      case 'matching': result = checkMatching(question); break;
      case 'word-bank-cloze': result = checkWordBankCloze(question); break;
      case 'scenario-judgment': result = checkScenarioJudgment(question); break;
      case 'numeric-entry': result = checkNumericEntry(question); break;
      default: result = checkMC(question); break;
    }
    showFeedback(question, result);
    quizAnswers[questionIndex] = result;
    // scorm-api.js exposes the wrapper as window.SCORM; legacy scormAPI
    // fallback retained in case an older revision of the script is loaded.
    if (window.SCORM || window.scormAPI) recordInteraction(question, result);
  }

  // ── Per-type checkers ──

  function checkMC(question) {
    var selected = question.querySelector('input[type="radio"]:checked');
    if (!selected) return { correct: false, score: 0, feedback: 'Please select an answer.' };
    var isCorrect = selected.dataset.correct === 'true';
    var feedback = selected.dataset.feedback || (isCorrect ? 'Correct!' : 'Incorrect.');
    var inputs = question.querySelectorAll('input[type="radio"]');
    for (var i = 0; i < inputs.length; i++) inputs[i].disabled = true;
    selected.closest('label').classList.add(isCorrect ? 'correct-answer' : 'incorrect-answer');
    return { correct: isCorrect, score: isCorrect ? 1 : 0, feedback: feedback, selected: selected.value };
  }

  function checkMS(question) {
    var correctIndicesStr = question.dataset.correctIndices || '';
    var correctSet = {};
    correctIndicesStr.split(',').forEach(function (idx) { if (idx !== '') correctSet[idx.trim()] = true; });
    var checkboxes = question.querySelectorAll('input[type="checkbox"]');
    var totalCorrect = 0;
    var totalWrong = 0;
    for (var i = 0; i < checkboxes.length; i++) {
      var cb = checkboxes[i];
      var shouldBeChecked = !!correctSet[cb.value];
      if (cb.checked === shouldBeChecked) totalCorrect++;
      else totalWrong++;
      cb.disabled = true;
      if (cb.checked) {
        cb.closest('label').classList.add(shouldBeChecked ? 'correct-answer' : 'incorrect-answer');
      }
    }
    var score = totalCorrect / (totalCorrect + totalWrong);
    var isCorrect = totalWrong === 0;
    return { correct: isCorrect, score: score, feedback: isCorrect ? 'All correct!' : 'Some selections were incorrect.' };
  }

  function checkTF(question) {
    var selected = question.querySelector('input[type="radio"]:checked');
    if (!selected) return { correct: false, score: 0, feedback: 'Please select True or False.' };
    var isCorrect = selected.dataset.correct === 'true';
    var feedback = selected.dataset.feedback || (isCorrect ? 'Correct!' : 'Incorrect.');
    var inputs = question.querySelectorAll('input[type="radio"]');
    for (var i = 0; i < inputs.length; i++) inputs[i].disabled = true;
    selected.closest('label').classList.add(isCorrect ? 'correct-answer' : 'incorrect-answer');
    return { correct: isCorrect, score: isCorrect ? 1 : 0, feedback: feedback };
  }

  function checkFillBlank(question) {
    var input = question.querySelector('.fill-blank-input input');
    if (!input || !input.value.trim()) return { correct: false, score: 0, feedback: 'Please type your answer.' };
    var userAnswer = input.value.trim().toLowerCase();
    var correctAnswer = (input.dataset.correctAnswer || '').toLowerCase();
    var acceptable = (input.dataset.acceptable || correctAnswer).split(',').map(function (a) { return a.trim().toLowerCase(); });
    var isCorrect = acceptable.indexOf(userAnswer) >= 0;
    input.disabled = true;
    input.classList.add(isCorrect ? 'correct-answer' : 'incorrect-answer');
    return { correct: isCorrect, score: isCorrect ? 1 : 0, feedback: isCorrect ? 'Correct!' : 'The correct answer is: ' + correctAnswer };
  }

  function checkSequencing(question) {
    var correctOrderStr = question.dataset.correctOrder || '';
    var correctOrder = correctOrderStr.split('|||');
    var items = question.querySelectorAll('.sequencing-item');
    var correct = 0;
    for (var i = 0; i < items.length; i++) {
      var itemText = items[i].dataset.item || '';
      if (itemText === correctOrder[i]) {
        correct++;
        items[i].classList.add('correct-position');
        items[i].classList.remove('incorrect-position');
      } else {
        items[i].classList.add('incorrect-position');
        items[i].classList.remove('correct-position');
      }
      items[i].setAttribute('draggable', 'false');
      items[i].classList.add('answered');
    }
    var score = items.length > 0 ? correct / items.length : 0;
    return { correct: correct === items.length, score: score, feedback: correct + ' of ' + items.length + ' in correct position.' };
  }

  function checkDragDrop(question) {
    var zones = question.querySelectorAll('.dd-zone');
    var correct = 0;
    var total = 0;
    for (var z = 0; z < zones.length; z++) {
      var catId = zones[z].dataset.categoryId;
      var items = zones[z].querySelectorAll('.dd-item');
      for (var i = 0; i < items.length; i++) {
        total++;
        if (items[i].dataset.correctCategory === catId) {
          correct++;
          items[i].classList.add('correct');
          items[i].classList.remove('incorrect');
        } else {
          items[i].classList.add('incorrect');
          items[i].classList.remove('correct');
        }
        items[i].setAttribute('draggable', 'false');
      }
    }
    var pool = question.querySelectorAll('.dd-items-pool .dd-item');
    total += pool.length;
    var score = total > 0 ? correct / total : 0;
    return { correct: correct === total && pool.length === 0, score: score, feedback: correct + ' of ' + total + ' correctly placed.' };
  }

  function checkHotspot(question) {
    var selected = question.querySelectorAll('.hotspot-zone.selected');
    var zonesData = [];
    try { zonesData = JSON.parse(question.dataset.zones || '[]'); } catch (e) { /* ignore */ }
    var correctZones = zonesData.filter(function (z) { return z.correct !== false; });
    var correct = 0;
    for (var i = 0; i < selected.length; i++) {
      var zoneId = selected[i].dataset.zoneId;
      var zoneData = zonesData.find(function (z) { return z.id === zoneId; });
      if (zoneData && zoneData.correct !== false) {
        correct++;
        selected[i].classList.add('correct-zone');
      } else {
        selected[i].classList.add('incorrect-zone');
      }
    }
    var score = correctZones.length > 0 ? correct / correctZones.length : 0;
    return { correct: correct === correctZones.length && selected.length === correctZones.length, score: score, feedback: correct + ' of ' + correctZones.length + ' correct areas identified.' };
  }

  function checkCategorization(question) {
    var buckets = question.querySelectorAll('.cat-bucket');
    var correct = 0;
    var total = 0;
    for (var b = 0; b < buckets.length; b++) {
      var bucketName = buckets[b].dataset.bucketName;
      var items = buckets[b].querySelectorAll('.cat-item');
      for (var i = 0; i < items.length; i++) {
        total++;
        if (items[i].dataset.correctBucket === bucketName) {
          correct++;
          items[i].classList.add('correct');
          items[i].classList.remove('incorrect');
        } else {
          items[i].classList.add('incorrect');
          items[i].classList.remove('correct');
        }
        items[i].setAttribute('draggable', 'false');
      }
    }
    var unplaced = question.querySelectorAll('.categorization-items .cat-item');
    total += unplaced.length;
    var score = total > 0 ? correct / total : 0;
    return { correct: correct === total && unplaced.length === 0, score: score, feedback: correct + ' of ' + total + ' correctly categorized.' };
  }

  function checkMatching(question) {
    var pairsData = [];
    try { pairsData = JSON.parse(question.dataset.pairs || '[]'); } catch (e) { /* ignore */ }
    var pairTags = question.querySelectorAll('.matching-pair-tag');
    var correct = 0;
    for (var i = 0; i < pairTags.length; i++) {
      var left = pairTags[i].dataset.left || '';
      var right = pairTags[i].dataset.right || '';
      var isCorrectPair = pairsData.some(function (p) { return p.left === left && p.right === right; });
      if (isCorrectPair) {
        correct++;
        pairTags[i].classList.add('correct-match');
      } else {
        pairTags[i].classList.add('incorrect-match');
      }
    }
    var leftItems = question.querySelectorAll('.matching-left-item');
    var rightItems = question.querySelectorAll('.matching-right-item');
    for (var j = 0; j < leftItems.length; j++) leftItems[j].disabled = true;
    for (var k = 0; k < rightItems.length; k++) rightItems[k].disabled = true;
    var total = pairsData.length;
    var score = total > 0 ? correct / total : 0;
    return { correct: correct === total, score: score, feedback: correct + ' of ' + total + ' pairs matched correctly.' };
  }

  function checkWordBankCloze(question) {
    var correctWordsStr = question.dataset.correctWords || '';
    var correctWords = correctWordsStr.split('|||');
    var blanks = question.querySelectorAll('.cloze-blank');
    var correct = 0;
    for (var i = 0; i < blanks.length; i++) {
      var placedWord = blanks[i].dataset.placedWord || '';
      var expected = correctWords[i] || '';
      if (placedWord.toLowerCase().trim() === expected.toLowerCase().trim()) {
        correct++;
        blanks[i].classList.add('correct-word');
        blanks[i].classList.remove('incorrect-word');
      } else {
        blanks[i].classList.add('incorrect-word');
        blanks[i].classList.remove('correct-word');
      }
    }
    var chips = question.querySelectorAll('.word-chip');
    for (var c = 0; c < chips.length; c++) chips[c].disabled = true;
    var score = blanks.length > 0 ? correct / blanks.length : 0;
    return { correct: correct === blanks.length, score: score, feedback: correct + ' of ' + blanks.length + ' blanks filled correctly.' };
  }

  function checkScenarioJudgment(question) {
    var selected = question.querySelector('input[type="radio"]:checked');
    if (!selected) return { correct: false, score: 0, feedback: 'Please select a response.' };
    var weight = parseFloat(selected.dataset.weight || '0');
    var feedback = selected.dataset.feedback || '';
    var inputs = question.querySelectorAll('input[type="radio"]');
    for (var i = 0; i < inputs.length; i++) inputs[i].disabled = true;
    var labelClass = weight >= 0.5 ? 'correct-answer' : 'incorrect-answer';
    selected.closest('label').classList.add(labelClass);
    return { correct: weight >= 1, score: weight, feedback: feedback };
  }

  function checkNumericEntry(question) {
    var input = question.querySelector('.numeric-entry input');
    if (!input || input.value === '') return { correct: false, score: 0, feedback: 'Please enter a number.' };
    var userVal = parseFloat(input.value);
    var correctVal = parseFloat(question.dataset.correctValue || '0');
    var tolerance = parseFloat(question.dataset.tolerance || '0.01');
    var diff = Math.abs(userVal - correctVal);
    var isCorrect;
    if (tolerance < 1) {
      isCorrect = correctVal === 0 ? diff === 0 : (diff / Math.abs(correctVal)) <= tolerance;
    } else {
      isCorrect = diff <= tolerance;
    }
    input.disabled = true;
    input.classList.add(isCorrect ? 'correct-answer' : 'incorrect-answer');
    return { correct: isCorrect, score: isCorrect ? 1 : 0, feedback: isCorrect ? 'Correct!' : 'The correct answer is ' + correctVal + '.' };
  }

  // ── Feedback display ──

  function showFeedback(question, result) {
    var feedback = question.querySelector('.question-feedback');
    if (!feedback) return;
    // Use CSS classes instead of inline styles
    feedback.classList.remove('correct', 'incorrect', 'partial');
    if (result.score >= 1) {
      feedback.classList.add('correct');
    } else if (result.score >= 0.5) {
      feedback.classList.add('partial');
    } else {
      feedback.classList.add('incorrect');
    }
    feedback.textContent = result.feedback;
    // Hide submit button
    var btn = question.querySelector(':scope > button');
    if (btn) btn.style.display = 'none';
  }

  // ── SCORM recording ──

  function recordInteraction(question, result) {
    var typeMap = {
      'multiple-choice': 'choice', 'multiple-select': 'choice', 'true-false': 'true-false',
      'fill-blank': 'fill-in', 'drag-drop': 'matching', 'sequencing': 'sequencing',
      'hotspot': 'performance', 'categorization': 'matching', 'matching': 'matching',
      'word-bank-cloze': 'fill-in', 'scenario-judgment': 'choice', 'numeric-entry': 'numeric'
    };
    var qType = question.dataset.questionType || 'multiple-choice';
    var idx = question.dataset.questionIndex || '0';
    try {
      // scorm-api.js exposes the wrapper as window.SCORM. Keep the legacy
      // scormAPI fallback so older packages still work.
      var api = window.SCORM || window.scormAPI;
      if (api && typeof api.recordInteraction === 'function') {
        api.recordInteraction({
          id: 'q-' + idx,
          type: typeMap[qType] || 'other',
          learnerResponse: result.correct ? 'correct' : 'incorrect',
          correctResponse: 'correct',
          result: result.correct ? 'correct' : 'incorrect',
          weighting: 1,
          description: question.querySelector('p') ? question.querySelector('p').textContent.substring(0, 200) : ''
        });
      }
    } catch (e) {
      // Log rather than swallow — silent catches hid a real bug before.
      console.warn('[quiz] recordInteraction failed:', e);
    }
  }

  // ── Quiz Navigation ──

  function nextQuestion() {
    var questions = document.querySelectorAll('.quiz-question');
    var totalQuestions = questions.length;
    var current = document.querySelector('.quiz-question[data-question-number="' + currentQuizQuestion + '"]');
    if (!current) return;
    var kc = current.querySelector('.knowledge-check');
    var qIdx = kc ? kc.dataset.questionIndex : '0';
    if (!quizAnswers[qIdx]) {
      checkAnswer(parseInt(qIdx));
      if (!quizAnswers[qIdx]) {
        alert('Please answer the question before continuing.');
        return;
      }
    }
    current.style.display = 'none';
    currentQuizQuestion++;
    var next = document.querySelector('.quiz-question[data-question-number="' + currentQuizQuestion + '"]');
    if (next) next.style.display = 'block';
    var progress = document.getElementById('current-question');
    if (progress) progress.textContent = currentQuizQuestion;
    var prevBtn = document.getElementById('prev-btn');
    var nextBtn = document.getElementById('next-btn');
    var submitBtn = document.getElementById('submit-btn');
    if (prevBtn) prevBtn.style.display = 'inline-block';
    if (currentQuizQuestion === totalQuestions) {
      if (nextBtn) nextBtn.style.display = 'none';
      if (submitBtn) submitBtn.style.display = 'inline-block';
    }
  }

  function previousQuestion() {
    if (currentQuizQuestion <= 1) return;
    var current = document.querySelector('.quiz-question[data-question-number="' + currentQuizQuestion + '"]');
    if (current) current.style.display = 'none';
    currentQuizQuestion--;
    var prev = document.querySelector('.quiz-question[data-question-number="' + currentQuizQuestion + '"]');
    if (prev) prev.style.display = 'block';
    var progress = document.getElementById('current-question');
    if (progress) progress.textContent = currentQuizQuestion;
    var prevBtn = document.getElementById('prev-btn');
    var nextBtn = document.getElementById('next-btn');
    var submitBtn = document.getElementById('submit-btn');
    if (currentQuizQuestion === 1 && prevBtn) prevBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'inline-block';
    if (submitBtn) submitBtn.style.display = 'none';
  }

  function submitQuiz() {
    var questions = document.querySelectorAll('.quiz-question');
    var totalQuestions = questions.length;
    var current = document.querySelector('.quiz-question[data-question-number="' + currentQuizQuestion + '"]');
    if (current) {
      var kc = current.querySelector('.knowledge-check');
      var qIdx = kc ? kc.dataset.questionIndex : '0';
      if (!quizAnswers[qIdx]) {
        checkAnswer(parseInt(qIdx));
        if (!quizAnswers[qIdx]) {
          alert('Please answer the question before submitting.');
          return;
        }
      }
    }
    var correctCount = 0;
    var totalScore = 0;
    var keys = Object.keys(quizAnswers);
    for (var k = 0; k < keys.length; k++) {
      var ans = quizAnswers[keys[k]];
      if (ans.correct) correctCount++;
      totalScore += (ans.score || 0);
    }
    var percentage = Math.round((totalScore / totalQuestions) * 100);
    var passed = percentage >= 70;
    for (var q = 0; q < questions.length; q++) questions[q].style.display = 'none';
    var quizNav = document.querySelector('.quiz-navigation');
    if (quizNav) quizNav.style.display = 'none';
    var resultDiv = document.querySelector('.quiz-result');
    if (resultDiv) {
      resultDiv.style.display = 'block';
      resultDiv.classList.remove('passed', 'failed');
      resultDiv.classList.add(passed ? 'passed' : 'failed');
      var scoreEl = resultDiv.querySelector('.quiz-score');
      if (scoreEl) {
        scoreEl.textContent = correctCount + ' / ' + totalQuestions + ' (' + percentage + '%)';
      }
      var msgEl = resultDiv.querySelector('.quiz-message');
      if (msgEl) {
        msgEl.textContent = passed ? 'Congratulations! You passed the quiz.' : 'You need 70% to pass. Please review the material and try again.';
      }
    }
    // scorm-api.js exposes the wrapper as window.SCORM; legacy fallback kept.
    var api = window.SCORM || window.scormAPI;
    if (api && typeof api.setScore === 'function') {
      try {
        api.setScore(percentage, 100, 0);
        // Lesson-level status is managed by course-tracker based on overall
        // progress; don't override here. A single failed quiz shouldn't
        // flip the whole lesson to 'failed'.
      } catch (e) {
        console.warn('[quiz] setScore failed:', e);
      }
    }

    // Dispatch quizComplete event — CourseTracker.recordQuizScore() listens
    // for this to persist the score into suspend_data. Without this event,
    // progress.quizScores never populates and SCORM score fields stay empty.
    // Root cause of 'all score fields empty' in the MentaLIFE gradebook.
    try {
      document.dispatchEvent(
        new CustomEvent('quizComplete', {
          detail: {
            percent: percentage,
            correct: correctCount,
            total: totalQuestions,
            passed: passed
          }
        })
      );
    } catch (e) {
      console.warn('[quiz] quizComplete dispatch failed:', e);
    }
  }

  function reviewQuiz() {
    var resultDiv = document.querySelector('.quiz-result');
    if (resultDiv) resultDiv.style.display = 'none';
    var questions = document.querySelectorAll('.quiz-question');
    for (var q = 0; q < questions.length; q++) questions[q].style.display = 'block';
    var quizNav = document.querySelector('.quiz-navigation');
    if (quizNav) quizNav.style.display = 'none';
  }

  // ── Interactive Setup Functions ──

  function setupSequencing() {
    var lists = document.querySelectorAll('.sequencing-list');
    for (var l = 0; l < lists.length; l++) {
      (function (list) {
        var items = list.querySelectorAll('.sequencing-item');
        for (var i = 0; i < items.length; i++) {
          (function (item) {
            item.addEventListener('dragstart', function () { this.classList.add('dragging'); });
            item.addEventListener('dragend', function () {
              this.classList.remove('dragging');
              renumberSequencing(list);
            });
          })(items[i]);
          var upBtn = items[i].querySelector('.seq-up');
          var downBtn = items[i].querySelector('.seq-down');
          if (upBtn) {
            (function (item) {
              upBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                var prev = item.previousElementSibling;
                if (prev) {
                  list.insertBefore(item, prev);
                  renumberSequencing(list);
                }
              });
            })(items[i]);
          }
          if (downBtn) {
            (function (item) {
              downBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                var next = item.nextElementSibling;
                if (next) {
                  list.insertBefore(next, item);
                  renumberSequencing(list);
                }
              });
            })(items[i]);
          }
        }
        list.addEventListener('dragover', function (e) {
          e.preventDefault();
          var dragging = list.querySelector('.dragging');
          if (!dragging) return;
          var siblings = Array.from(list.querySelectorAll('.sequencing-item:not(.dragging)'));
          var after = null;
          for (var s = 0; s < siblings.length; s++) {
            var box = siblings[s].getBoundingClientRect();
            var offset = e.clientY - box.top - box.height / 2;
            if (offset < 0) { after = siblings[s]; break; }
          }
          if (after) list.insertBefore(dragging, after);
          else list.appendChild(dragging);
        });
      })(lists[l]);
    }
  }

  function renumberSequencing(list) {
    var items = list.querySelectorAll('.sequencing-item');
    for (var i = 0; i < items.length; i++) {
      var num = items[i].querySelector('.seq-number');
      if (num) num.textContent = (i + 1);
    }
  }

  function setupQuizDragDrop() {
    var containers = document.querySelectorAll('[data-question-type="drag-drop"]');
    for (var c = 0; c < containers.length; c++) {
      (function (container) {
        var items = container.querySelectorAll('.dd-item');
        var zones = container.querySelectorAll('.dd-drop-area');
        var pool = container.querySelector('.dd-items-pool');
        for (var i = 0; i < items.length; i++) {
          items[i].addEventListener('dragstart', function () { this.classList.add('dragging'); });
          items[i].addEventListener('dragend', function () { this.classList.remove('dragging'); });
        }
        for (var z = 0; z < zones.length; z++) {
          zones[z].addEventListener('dragover', function (e) {
            e.preventDefault();
            this.closest('.dd-zone').classList.add('drag-over');
          });
          zones[z].addEventListener('dragleave', function () {
            this.closest('.dd-zone').classList.remove('drag-over');
          });
          zones[z].addEventListener('drop', function (e) {
            e.preventDefault();
            this.closest('.dd-zone').classList.remove('drag-over');
            var dragging = document.querySelector('.dd-item.dragging');
            if (dragging) this.appendChild(dragging);
          });
        }
        if (pool) {
          pool.addEventListener('dragover', function (e) { e.preventDefault(); this.classList.add('drag-over'); });
          pool.addEventListener('dragleave', function () { this.classList.remove('drag-over'); });
          pool.addEventListener('drop', function (e) {
            e.preventDefault(); this.classList.remove('drag-over');
            var dragging = document.querySelector('.dd-item.dragging');
            if (dragging) this.appendChild(dragging);
          });
        }
      })(containers[c]);
    }
  }

  function setupCategorization() {
    var containers = document.querySelectorAll('[data-question-type="categorization"]');
    for (var c = 0; c < containers.length; c++) {
      (function (container) {
        var items = container.querySelectorAll('.cat-item');
        var buckets = container.querySelectorAll('.bucket-items');
        var pool = container.querySelector('.categorization-items');
        for (var i = 0; i < items.length; i++) {
          items[i].addEventListener('dragstart', function () { this.classList.add('dragging'); });
          items[i].addEventListener('dragend', function () { this.classList.remove('dragging'); });
        }
        for (var b = 0; b < buckets.length; b++) {
          var bucket = buckets[b].closest('.cat-bucket');
          bucket.addEventListener('dragover', function (e) { e.preventDefault(); this.classList.add('drag-over'); });
          bucket.addEventListener('dragleave', function () { this.classList.remove('drag-over'); });
          bucket.addEventListener('drop', function (e) {
            e.preventDefault(); this.classList.remove('drag-over');
            var dragging = document.querySelector('.cat-item.dragging');
            if (dragging) this.querySelector('.bucket-items').appendChild(dragging);
          });
        }
        if (pool) {
          pool.addEventListener('dragover', function (e) { e.preventDefault(); this.classList.add('drag-over'); });
          pool.addEventListener('dragleave', function () { this.classList.remove('drag-over'); });
          pool.addEventListener('drop', function (e) {
            e.preventDefault(); this.classList.remove('drag-over');
            var dragging = document.querySelector('.cat-item.dragging');
            if (dragging) this.appendChild(dragging);
          });
        }
      })(containers[c]);
    }
  }

  function setupMatching() {
    var containers = document.querySelectorAll('[data-question-type="matching"]');
    for (var c = 0; c < containers.length; c++) {
      (function (container) {
        var selectedLeft = null;
        var leftItems = container.querySelectorAll('.matching-left-item');
        var rightItems = container.querySelectorAll('.matching-right-item');
        var display = container.querySelector('.matching-pairs-display');

        function handleLeftClick() {
          for (var l = 0; l < leftItems.length; l++) leftItems[l].classList.remove('selected-match');
          this.classList.add('selected-match');
          selectedLeft = this;
        }

        function handleRightClick() {
          if (!selectedLeft) {
            alert('Click a term on the left first, then click its match on the right.');
            return;
          }
          var leftText = selectedLeft.dataset.matchLeft;
          var rightText = this.dataset.matchRight;
          var tag = document.createElement('span');
          tag.className = 'matching-pair-tag';
          tag.dataset.left = leftText;
          tag.dataset.right = rightText;
          tag.innerHTML = leftText + ' &#8594; ' + rightText + ' <button onclick="removeMatchPair(this)" class="matching-remove-btn" aria-label="Remove pair">&times;</button>';
          if (display) display.appendChild(tag);
          selectedLeft.classList.add('paired');
          selectedLeft.classList.remove('selected-match');
          this.classList.add('paired');
          selectedLeft = null;
        }

        for (var l = 0; l < leftItems.length; l++) leftItems[l].addEventListener('click', handleLeftClick);
        for (var r = 0; r < rightItems.length; r++) rightItems[r].addEventListener('click', handleRightClick);
      })(containers[c]);
    }
  }

  function removeMatchPair(btn) {
    var tag = btn.closest('.matching-pair-tag');
    if (!tag) return;
    var container = tag.closest('.knowledge-check');
    var leftText = tag.dataset.left;
    var rightText = tag.dataset.right;
    var leftItem = container.querySelector('[data-match-left="' + leftText + '"]');
    var rightItem = container.querySelector('[data-match-right="' + rightText + '"]');
    if (leftItem) leftItem.classList.remove('paired');
    if (rightItem) rightItem.classList.remove('paired');
    tag.remove();
  }

  function setupWordBankCloze() {
    var containers = document.querySelectorAll('[data-question-type="word-bank-cloze"]');
    for (var c = 0; c < containers.length; c++) {
      (function (container) {
        var selectedChip = null;
        var chips = container.querySelectorAll('.word-chip');
        var blanks = container.querySelectorAll('.cloze-blank');

        function handleChipClick() {
          if (this.classList.contains('used')) return;
          for (var ch = 0; ch < chips.length; ch++) chips[ch].classList.remove('selected-match');
          this.classList.add('selected-match');
          selectedChip = this;
        }

        function handleBlankClick() {
          if (!selectedChip) return;
          var word = selectedChip.dataset.word;
          if (this.dataset.placedWord) {
            var oldWord = this.dataset.placedWord;
            var oldChip = container.querySelector('.word-chip[data-word="' + oldWord + '"]');
            if (oldChip) oldChip.classList.remove('used');
          }
          this.textContent = word;
          this.dataset.placedWord = word;
          this.classList.add('filled');
          selectedChip.classList.add('used');
          selectedChip.classList.remove('selected-match');
          selectedChip = null;
        }

        for (var ch = 0; ch < chips.length; ch++) chips[ch].addEventListener('click', handleChipClick);
        for (var bl = 0; bl < blanks.length; bl++) blanks[bl].addEventListener('click', handleBlankClick);
      })(containers[c]);
    }
  }

  function setupHotspot() {
    var containers = document.querySelectorAll('[data-question-type="hotspot"]');
    for (var c = 0; c < containers.length; c++) {
      (function (container) {
        var zones = container.querySelectorAll('.hotspot-zone');
        for (var z = 0; z < zones.length; z++) {
          zones[z].addEventListener('click', function () {
            this.classList.toggle('selected');
          });
        }
      })(containers[c]);
    }
  }

  // ── Master init ──
  document.addEventListener('DOMContentLoaded', function () {
    setupSequencing();
    setupQuizDragDrop();
    setupCategorization();
    setupMatching();
    setupWordBankCloze();
    setupHotspot();
  });

  // ── Expose globals for onclick handlers ──
  window.checkAnswer = checkAnswer;
  window.nextQuestion = nextQuestion;
  window.previousQuestion = previousQuestion;
  window.submitQuiz = submitQuiz;
  window.reviewQuiz = reviewQuiz;
  window.removeMatchPair = removeMatchPair;
})();
