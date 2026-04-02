/**
 * Interactive Components JavaScript - Shared across all course templates
 *
 * This file contains logic for:
 * - Knowledge checks / Quizzes
 * - Drag and drop activities
 * - Sorting activities
 * - Hot spot activities
 * - Case studies
 * - Branching scenarios
 * - Simulations
 *
 * Include this in all generated course HTML files with interactive content.
 */

(function() {
    'use strict';

    // ========================================================================
    // QUIZ STATE
    // ========================================================================

    let currentQuizQuestion = 1;
    let quizAnswers = {};

    // ========================================================================
    // KNOWLEDGE CHECK / SINGLE QUESTION
    // ========================================================================

    window.checkAnswer = function(questionIndex) {
        const question = document.querySelector(`[data-question-index="${questionIndex}"]`);
        if (!question) return;

        const selected = question.querySelector('input[type="radio"]:checked, input[type="checkbox"]:checked');
        if (!selected) {
            showAlert('Please select an answer');
            return;
        }

        const feedback = question.querySelector('.question-feedback');
        const isCorrect = selected.dataset.correct === 'true';

        // Show feedback
        if (feedback) {
            feedback.style.display = 'block';
            feedback.style.background = isCorrect ? '#d1fae5' : '#fee2e2';
            feedback.style.color = isCorrect ? '#065f46' : '#991b1b';
            feedback.textContent = selected.dataset.feedback || (isCorrect ? 'Correct!' : 'Incorrect.');
        }

        // Disable all options
        question.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(input => {
            input.disabled = true;
        });

        // Hide submit button
        const button = question.querySelector('button');
        if (button) {
            button.style.display = 'none';
        }

        // Mark selected option
        selected.closest('label')?.classList.add(isCorrect ? 'correct' : 'incorrect');
    };

    // ========================================================================
    // QUIZ NAVIGATION
    // ========================================================================

    window.nextQuestion = function() {
        const questions = document.querySelectorAll('.quiz-question');
        const totalQuestions = questions.length;

        // Require an answer before proceeding
        const currentQuestion = document.querySelector(`.quiz-question[data-question-number="${currentQuizQuestion}"]`);
        if (!currentQuestion) return;

        const selected = currentQuestion.querySelector('input[type="radio"]:checked');
        if (!selected) {
            showAlert('Please select an answer before continuing');
            return;
        }

        // Store answer
        const knowledgeCheck = currentQuestion.querySelector('.knowledge-check');
        const questionIndex = knowledgeCheck?.dataset.questionIndex;
        if (questionIndex) {
            quizAnswers[questionIndex] = {
                selected: selected.value,
                correct: selected.dataset.correct === 'true'
            };
        }

        // Hide current question
        currentQuestion.style.display = 'none';

        // Show next question
        currentQuizQuestion++;
        const nextQ = document.querySelector(`.quiz-question[data-question-number="${currentQuizQuestion}"]`);
        if (nextQ) {
            nextQ.style.display = 'block';
        }

        // Update progress
        const progressEl = document.getElementById('current-question');
        if (progressEl) {
            progressEl.textContent = currentQuizQuestion;
        }

        // Update navigation buttons
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const submitBtn = document.getElementById('submit-btn');

        if (prevBtn) prevBtn.style.display = 'inline-block';

        if (currentQuizQuestion === totalQuestions) {
            if (nextBtn) nextBtn.style.display = 'none';
            if (submitBtn) submitBtn.style.display = 'inline-block';
        }
    };

    window.previousQuestion = function() {
        if (currentQuizQuestion <= 1) return;

        // Hide current question
        const currentQuestion = document.querySelector(`.quiz-question[data-question-number="${currentQuizQuestion}"]`);
        if (currentQuestion) {
            currentQuestion.style.display = 'none';
        }

        // Show previous question
        currentQuizQuestion--;
        const prevQ = document.querySelector(`.quiz-question[data-question-number="${currentQuizQuestion}"]`);
        if (prevQ) {
            prevQ.style.display = 'block';
        }

        // Update progress
        const progressEl = document.getElementById('current-question');
        if (progressEl) {
            progressEl.textContent = currentQuizQuestion;
        }

        // Update navigation buttons
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const submitBtn = document.getElementById('submit-btn');

        if (currentQuizQuestion === 1 && prevBtn) {
            prevBtn.style.display = 'none';
        }

        if (nextBtn) nextBtn.style.display = 'inline-block';
        if (submitBtn) submitBtn.style.display = 'none';
    };

    window.submitQuiz = function() {
        const questions = document.querySelectorAll('.quiz-question');
        const totalQuestions = questions.length;

        // Require final answer
        const currentQuestion = document.querySelector(`.quiz-question[data-question-number="${currentQuizQuestion}"]`);
        const selected = currentQuestion?.querySelector('input[type="radio"]:checked');

        if (!selected) {
            showAlert('Please select an answer before submitting');
            return;
        }

        // Store final answer
        const knowledgeCheck = currentQuestion.querySelector('.knowledge-check');
        const questionIndex = knowledgeCheck?.dataset.questionIndex;
        if (questionIndex) {
            quizAnswers[questionIndex] = {
                selected: selected.value,
                correct: selected.dataset.correct === 'true'
            };
        }

        // Calculate score
        let correctCount = 0;
        Object.values(quizAnswers).forEach(answer => {
            if (answer.correct) correctCount++;
        });

        const percentage = Math.round((correctCount / totalQuestions) * 100);
        const passed = percentage >= 70;

        // Hide quiz questions and navigation
        questions.forEach(q => q.style.display = 'none');
        const quizNav = document.querySelector('.quiz-navigation');
        if (quizNav) quizNav.style.display = 'none';

        // Show result
        const resultDiv = document.querySelector('.quiz-result');
        if (resultDiv) {
            resultDiv.style.display = 'block';
            resultDiv.classList.add(passed ? 'passed' : 'failed');

            const scoreElement = resultDiv.querySelector('.quiz-score');
            if (scoreElement) {
                scoreElement.textContent = `${correctCount} / ${totalQuestions} (${percentage}%)`;
            }

            const messageElement = resultDiv.querySelector('.quiz-message');
            if (messageElement) {
                messageElement.textContent = passed
                    ? 'Congratulations! You passed the quiz.'
                    : 'You need 70% to pass. Please review the material and try again.';
            }
        }

        // Trigger celebration
        if (typeof window.showCelebration === 'function') {
            window.showCelebration(passed ? 'quiz-passed' : 'quiz-failed', {
                score: correctCount,
                total: totalQuestions,
                percentage: percentage
            });
        }

        // Track quiz completion via xAPI
        var quizContainer = document.querySelector('.quiz-container, .quiz-section, .quiz-result');
        xAPITracker.trackQuizComplete((quizContainer && quizContainer.id) || 'quiz', correctCount, totalQuestions, passed);
    };

    window.reviewQuiz = function() {
        // Hide result
        const resultDiv = document.querySelector('.quiz-result');
        if (resultDiv) resultDiv.style.display = 'none';

        // Show all questions with feedback
        const questions = document.querySelectorAll('.quiz-question');
        questions.forEach(question => {
            question.style.display = 'block';

            const knowledgeCheck = question.querySelector('.knowledge-check');
            const selected = knowledgeCheck?.querySelector('input[type="radio"]:checked');

            if (selected) {
                const feedback = knowledgeCheck.querySelector('.question-feedback');
                const isCorrect = selected.dataset.correct === 'true';

                if (feedback) {
                    feedback.style.display = 'block';
                    feedback.style.background = isCorrect ? '#d1fae5' : '#fee2e2';
                    feedback.style.color = isCorrect ? '#065f46' : '#991b1b';
                    feedback.textContent = selected.dataset.feedback || (isCorrect ? 'Correct!' : 'Incorrect.');
                }

                // Disable all inputs
                knowledgeCheck.querySelectorAll('input[type="radio"]').forEach(input => {
                    input.disabled = true;
                });

                // Mark selected
                selected.closest('label')?.classList.add(isCorrect ? 'correct' : 'incorrect');
            }
        });

        // Hide navigation since quiz is complete
        const quizNav = document.querySelector('.quiz-navigation');
        if (quizNav) quizNav.style.display = 'none';
    };

    // ========================================================================
    // DRAG AND DROP
    // ========================================================================

    function setupDragDrop() {
        document.querySelectorAll('.drag-drop-activity').forEach(activity => {
            const draggables = activity.querySelectorAll('.draggable-item');
            const dropZones = activity.querySelectorAll('.drop-area');
            const itemsContainer = activity.querySelector('.draggable-items');

            draggables.forEach(draggable => {
                draggable.addEventListener('dragstart', function(e) {
                    this.classList.add('dragging');
                    e.dataTransfer.setData('text/plain', this.dataset.itemId);
                });

                draggable.addEventListener('dragend', function() {
                    this.classList.remove('dragging');
                });
            });

            dropZones.forEach(zone => {
                zone.addEventListener('dragover', function(e) {
                    e.preventDefault();
                    this.closest('.drop-zone')?.classList.add('drag-over');
                });

                zone.addEventListener('dragleave', function() {
                    this.closest('.drop-zone')?.classList.remove('drag-over');
                });

                zone.addEventListener('drop', function(e) {
                    e.preventDefault();
                    this.closest('.drop-zone')?.classList.remove('drag-over');

                    const draggable = document.querySelector('.dragging');
                    if (draggable) {
                        this.appendChild(draggable);
                    }
                });
            });

            // Also allow dropping back to items container
            if (itemsContainer) {
                itemsContainer.addEventListener('dragover', function(e) {
                    e.preventDefault();
                });

                itemsContainer.addEventListener('drop', function(e) {
                    e.preventDefault();
                    const draggable = document.querySelector('.dragging');
                    if (draggable) {
                        this.appendChild(draggable);
                    }
                });
            }
        });
    }

    window.checkDragDrop = function(activityId) {
        const activity = document.querySelector(`[data-activity-id="${activityId}"]`);
        if (!activity) return;

        const dropZones = activity.querySelectorAll('.drop-zone');
        let correct = 0;
        let total = 0;

        dropZones.forEach(zone => {
            const category = zone.dataset.category;
            const items = zone.querySelectorAll('.draggable-item');

            items.forEach(item => {
                total++;
                const itemCategory = item.dataset.correctCategory || item.dataset.category;

                if (itemCategory === category) {
                    correct++;
                    item.classList.add('correct');
                    item.classList.remove('incorrect');
                } else {
                    item.classList.add('incorrect');
                    item.classList.remove('correct');
                }
            });
        });

        showActivityFeedback(activity, correct, total);

        // Track drag-drop interaction
        var ddScore = total > 0 ? Math.round((correct / total) * 100) : 0;
        recordToSCORM(activity, { correct: correct === total, score: total > 0 ? correct / total : 0 });
        trackInteraction(activityId, 'dragdrop', { completed: true, score: ddScore, correct: correct, total: total });
    };

    // Keyboard fallback: move item to selected category via <select>
    window.ddKbAssign = function(activityId, sel) {
        var item = sel.closest('.draggable-item');
        if (!item || !sel.value) return;
        var activity = document.querySelector('[data-activity-id="' + activityId + '"]');
        if (!activity) return;
        var zone = activity.querySelector('.drop-zone[data-category="' + sel.value + '"] .drop-area');
        if (zone) zone.appendChild(item);
    };

    // ========================================================================
    // SORTING
    // ========================================================================

    function setupSorting() {
        document.querySelectorAll('.sorting-activity').forEach(activity => {
            const list = activity.querySelector('.sortable-list');
            if (!list) return;

            const items = list.querySelectorAll('.sortable-item');

            items.forEach(item => {
                item.addEventListener('dragstart', function() {
                    this.classList.add('dragging');
                });

                item.addEventListener('dragend', function() {
                    this.classList.remove('dragging');
                });
            });

            list.addEventListener('dragover', function(e) {
                e.preventDefault();
                const dragging = list.querySelector('.dragging');
                const afterElement = getDragAfterElement(list, e.clientY);

                if (afterElement == null) {
                    list.appendChild(dragging);
                } else {
                    list.insertBefore(dragging, afterElement);
                }
            });
        });
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.sortable-item:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;

            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    window.checkSorting = function(activityId) {
        const activity = document.querySelector(`[data-activity-id="${activityId}"]`);
        if (!activity) return;

        const items = activity.querySelectorAll('.sortable-item');
        let correct = 0;

        items.forEach((item, currentIndex) => {
            const correctPosition = parseInt(item.dataset.correctPosition) - 1;

            if (currentIndex === correctPosition) {
                correct++;
                item.classList.add('correct');
                item.classList.remove('incorrect');
            } else {
                item.classList.add('incorrect');
                item.classList.remove('correct');
            }
        });

        showActivityFeedback(activity, correct, items.length);

        // Track sorting interaction
        var sortScore = items.length > 0 ? Math.round((correct / items.length) * 100) : 0;
        recordToSCORM(activity, { correct: correct === items.length, score: items.length > 0 ? correct / items.length : 0 });
        trackInteraction(activityId, 'sequencing', { completed: true, score: sortScore, correct: correct, total: items.length });
    };

    // ========================================================================
    // HOTSPOT (Quiz question type)
    // ========================================================================

    window.checkHotspot = function(activityId) {
        var activity = document.querySelector('[data-activity-id="' + activityId + '"]');
        if (!activity) return;

        var zonesData = [];
        try { zonesData = JSON.parse(activity.dataset.zones || '[]'); } catch(e) {}
        var selected = activity.querySelectorAll('.hotspot-zone.selected');
        var correctZones = zonesData.filter(function(z) { return z.correct !== false; });
        var correct = 0;

        for (var i = 0; i < selected.length; i++) {
            var zoneId = selected[i].dataset.zoneId;
            var zoneData = zonesData.find(function(z) { return z.id === zoneId; });
            if (zoneData && zoneData.correct !== false) {
                correct++;
                selected[i].classList.add('correct-zone');
            } else {
                selected[i].classList.add('incorrect-zone');
            }
        }

        showActivityFeedback(activity, correct, correctZones.length);
        recordToSCORM(activity, { correct: correct === correctZones.length, score: correctZones.length > 0 ? correct / correctZones.length : 0 });
    };

    // ========================================================================
    // CATEGORIZATION (Quiz question type)
    // ========================================================================

    window.checkCategorization = function(activityId) {
        var activity = document.querySelector('[data-activity-id="' + activityId + '"]');
        if (!activity) return;

        var buckets = activity.querySelectorAll('.cat-bucket');
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

        var unplaced = activity.querySelectorAll('.categorization-items .cat-item');
        total += unplaced.length;

        showActivityFeedback(activity, correct, total);
        recordToSCORM(activity, { correct: correct === total && unplaced.length === 0, score: total > 0 ? correct / total : 0 });
    };

    // ========================================================================
    // MATCHING (Quiz question type)
    // ========================================================================

    window.checkMatching = function(activityId) {
        var activity = document.querySelector('[data-activity-id="' + activityId + '"]');
        if (!activity) return;

        var pairsData = [];
        try { pairsData = JSON.parse(activity.dataset.pairs || '[]'); } catch(e) {}
        var pairTags = activity.querySelectorAll('.matching-pair-tag');
        var correct = 0;

        for (var i = 0; i < pairTags.length; i++) {
            var left = pairTags[i].dataset.left || '';
            var right = pairTags[i].dataset.right || '';
            var isCorrectPair = pairsData.some(function(p) { return p.left === left && p.right === right; });
            if (isCorrectPair) {
                correct++;
                pairTags[i].style.background = '#d1fae5';
                pairTags[i].style.borderColor = '#10b981';
            } else {
                pairTags[i].style.background = '#fee2e2';
                pairTags[i].style.borderColor = '#ef4444';
            }
        }

        var total = pairsData.length;
        showActivityFeedback(activity, correct, total);
        recordToSCORM(activity, { correct: correct === total, score: total > 0 ? correct / total : 0 });
    };

    // ========================================================================
    // WORD BANK / CLOZE (Quiz question type)
    // ========================================================================

    window.checkWordBankCloze = function(activityId) {
        var activity = document.querySelector('[data-activity-id="' + activityId + '"]');
        if (!activity) return;

        var correctWordsStr = activity.dataset.correctWords || '';
        var correctWords = correctWordsStr.split('|||');
        var blanks = activity.querySelectorAll('.cloze-blank');
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

        var chips = activity.querySelectorAll('.word-chip');
        for (var c = 0; c < chips.length; c++) chips[c].disabled = true;

        showActivityFeedback(activity, correct, blanks.length);
        recordToSCORM(activity, { correct: correct === blanks.length, score: blanks.length > 0 ? correct / blanks.length : 0 });
    };

    // ========================================================================
    // SCENARIO JUDGMENT (Quiz question type)
    // ========================================================================

    window.checkScenarioJudgment = function(activityId) {
        var activity = document.querySelector('[data-activity-id="' + activityId + '"]');
        if (!activity) return;

        var selected = activity.querySelector('input[type="radio"]:checked');
        if (!selected) {
            showAlert('Please select a response.');
            return;
        }

        var weight = parseFloat(selected.dataset.weight || '0');
        var feedback = selected.dataset.feedback || '';
        var inputs = activity.querySelectorAll('input[type="radio"]');
        for (var i = 0; i < inputs.length; i++) inputs[i].disabled = true;

        var label = selected.closest('label');
        if (label) label.classList.add(weight >= 0.5 ? 'correct' : 'incorrect');

        var feedbackEl = activity.querySelector('.activity-feedback');
        if (feedbackEl) {
            feedbackEl.style.display = 'block';
            feedbackEl.style.background = weight >= 0.5 ? '#d1fae5' : '#fee2e2';
            feedbackEl.style.color = weight >= 0.5 ? '#065f46' : '#991b1b';
            feedbackEl.textContent = feedback;
        }

        recordToSCORM(activity, { correct: weight >= 1, score: weight });
    };

    // ========================================================================
    // NUMERIC ENTRY (Quiz question type)
    // ========================================================================

    window.checkNumericEntry = function(activityId) {
        var activity = document.querySelector('[data-activity-id="' + activityId + '"]');
        if (!activity) return;

        var input = activity.querySelector('.numeric-entry input, input[type="number"]');
        if (!input || input.value === '') {
            showAlert('Please enter a number.');
            return;
        }

        var userVal = parseFloat(input.value);
        var correctVal = parseFloat(activity.dataset.correctValue || '0');
        var tolerance = parseFloat(activity.dataset.tolerance || '0.01');
        var diff = Math.abs(userVal - correctVal);
        var isCorrect;

        if (tolerance < 1) {
            isCorrect = correctVal === 0 ? diff === 0 : (diff / Math.abs(correctVal)) <= tolerance;
        } else {
            isCorrect = diff <= tolerance;
        }

        input.disabled = true;
        input.style.borderColor = isCorrect ? '#10b981' : '#ef4444';
        input.style.background = isCorrect ? '#d1fae5' : '#fee2e2';

        var feedbackEl = activity.querySelector('.activity-feedback');
        if (feedbackEl) {
            feedbackEl.style.display = 'block';
            feedbackEl.style.background = isCorrect ? '#d1fae5' : '#fee2e2';
            feedbackEl.style.color = isCorrect ? '#065f46' : '#991b1b';
            feedbackEl.textContent = isCorrect ? 'Correct!' : 'The correct answer is ' + correctVal + '.';
        }

        recordToSCORM(activity, { correct: isCorrect, score: isCorrect ? 1 : 0 });
    };

    // ========================================================================
    // SCORM INTERACTION RECORDING
    // ========================================================================

    function recordToSCORM(questionEl, result) {
        var typeMap = {
            'multiple-choice': 'choice', 'multiple-select': 'choice', 'true-false': 'true-false',
            'fill-blank': 'fill-in', 'drag-drop': 'performance', 'sequencing': 'sequencing',
            'hotspot': 'performance', 'categorization': 'matching', 'matching': 'matching',
            'word-bank-cloze': 'fill-in', 'scenario-judgment': 'choice', 'numeric-entry': 'numeric'
        };
        var qType = questionEl.dataset.questionType || 'multiple-choice';
        var idx = questionEl.dataset.questionIndex || questionEl.dataset.activityId || '0';
        try {
            var api = window.SCORM || window.scormAPI;
            if (api && typeof api.recordInteraction === 'function') {
                api.recordInteraction({
                    id: 'q-' + idx,
                    type: typeMap[qType] || 'other',
                    result: result.correct ? 'correct' : 'incorrect',
                    weighting: 1,
                    latency: 0,
                    description: questionEl.querySelector('p') ? questionEl.querySelector('p').textContent.substring(0, 200) : ''
                });
            }
        } catch(e) { /* ignore SCORM errors */ }
    }

    // ========================================================================
    // HOT SPOT (Interactive activity - legacy)
    // ========================================================================

    window.showHotSpotInfo = function(activityId, spotIndex) {
        const activity = document.querySelector(`[data-activity-id="${activityId}"]`);
        if (!activity) return;

        const details = document.getElementById(`${activityId}-details`);
        if (!details) return;

        // Get hot spot data from data attributes or predefined content
        const hotSpot = activity.querySelector(`[data-spot-id="spot-${spotIndex}"]`);
        const title = hotSpot?.dataset.title || `Hot Spot ${spotIndex + 1}`;
        const content = hotSpot?.dataset.content || 'Information about this area.';

        details.innerHTML = `
            <h3 style="color: #f59e0b; margin-bottom: 0.5rem;">${title}</h3>
            <p style="color: #374151;">${content}</p>
        `;

        // Highlight active spot
        activity.querySelectorAll('.hot-spot').forEach(spot => {
            spot.classList.remove('active');
        });
        hotSpot?.classList.add('active');
    };

    // ========================================================================
    // CASE STUDY
    // ========================================================================

    window.checkCaseStudy = function(activityId) {
        const activity = document.querySelector(`[data-activity-id="${activityId}"]`);
        if (!activity) return;

        const questions = activity.querySelectorAll('.case-question');
        let correct = 0;
        let total = 0;

        questions.forEach(question => {
            const radios = question.querySelectorAll('input[type="radio"]');
            const checkboxes = question.querySelectorAll('input[type="checkbox"]');

            if (radios.length > 0) {
                const selected = question.querySelector('input[type="radio"]:checked');
                if (selected) {
                    total++;
                    if (selected.dataset.correct === 'true') correct++;
                }
            }

            if (checkboxes.length > 0) {
                checkboxes.forEach(cb => {
                    total++;
                    const isChecked = cb.checked;
                    const shouldBeChecked = cb.dataset.correct === 'true';
                    if (isChecked === shouldBeChecked) correct++;
                });
            }
        });

        showActivityFeedback(activity, correct, total);
    };

    // ========================================================================
    // BRANCHING SCENARIO
    // ========================================================================

    window.makeBranchingChoice = function(activityId, choiceIndex) {
        const activity = document.querySelector(`[data-activity-id="${activityId}"]`);
        if (!activity) return;

        const contentDiv = document.getElementById(`${activityId}-content`);
        const choicesDiv = document.getElementById(`${activityId}-choices`);
        const feedbackDiv = document.getElementById(`${activityId}-feedback`);

        // Get choice data
        const choiceButton = choicesDiv?.querySelectorAll('button')[choiceIndex];
        const outcome = choiceButton?.dataset.outcome;
        const nextScenario = choiceButton?.dataset.nextScenario;
        const isEnd = choiceButton?.dataset.isEnd === 'true';

        if (feedbackDiv && outcome) {
            feedbackDiv.style.display = 'block';
            feedbackDiv.innerHTML = `<p>${outcome}</p>`;

            const isGood = choiceButton?.dataset.isGood === 'true';
            feedbackDiv.style.background = isGood ? '#d1fae5' : '#fee2e2';
            feedbackDiv.style.color = isGood ? '#065f46' : '#991b1b';
        }

        // If there's a next scenario, update content after a delay
        if (!isEnd && nextScenario && contentDiv) {
            setTimeout(() => {
                contentDiv.innerHTML = `<p style="color: #1e40af; line-height: 1.6;">${nextScenario}</p>`;
                feedbackDiv.style.display = 'none';
            }, 2000);
        }

        // Track scenario completion when it reaches an end state
        if (isEnd) {
            const isGood = choiceButton?.dataset.isGood === 'true';
            trackInteraction(activityId, 'scenario', { completed: true, score: isGood ? 100 : 0 });
        }
    };

    // ========================================================================
    // SIMULATION
    // ========================================================================

    window.selectSimulationResponse = function(activityId, responseIndex) {
        const activity = document.querySelector(`[data-activity-id="${activityId}"]`);
        if (!activity) return;

        const dialogueDiv = document.getElementById(`${activityId}-dialogue`);
        const responsesDiv = document.getElementById(`${activityId}-responses`);
        const feedbackDiv = document.getElementById(`${activityId}-feedback`);

        // Get response data
        const responseButton = responsesDiv?.querySelectorAll('button')[responseIndex];
        const responseText = responseButton?.textContent;
        const reply = responseButton?.dataset.reply;
        const feedback = responseButton?.dataset.feedback;

        // Add user response to dialogue
        if (dialogueDiv && responseText) {
            const messagesContainer = dialogueDiv.querySelector('.dialogue-messages');
            if (messagesContainer) {
                messagesContainer.innerHTML += `
                    <div style="background: #dbeafe; padding: 0.75rem 1rem; border-radius: 0.5rem; margin-left: 2rem;">
                        <strong>You:</strong> ${responseText}
                    </div>
                `;
            }
        }

        // Add system reply
        if (dialogueDiv && reply) {
            const messagesContainer = dialogueDiv.querySelector('.dialogue-messages');
            if (messagesContainer) {
                setTimeout(() => {
                    messagesContainer.innerHTML += `
                        <div style="background: #f3f4f6; padding: 0.75rem 1rem; border-radius: 0.5rem; margin-right: 2rem;">
                            ${reply}
                        </div>
                    `;
                    dialogueDiv.scrollTop = dialogueDiv.scrollHeight;
                }, 500);
            }
        }

        // Show feedback if it's the end
        if (feedbackDiv && feedback) {
            setTimeout(() => {
                feedbackDiv.style.display = 'block';
                feedbackDiv.innerHTML = `<p>${feedback}</p>`;
                feedbackDiv.style.background = '#d1fae5';
                feedbackDiv.style.color = '#065f46';
            }, 1000);
        }
    };

    // ========================================================================
    // HELPER FUNCTIONS
    // ========================================================================

    function showActivityFeedback(activity, correct, total) {
        const feedback = activity.querySelector('.activity-feedback');
        if (!feedback) return;

        const percentage = Math.round((correct / total) * 100);
        const passed = percentage >= 70;

        feedback.style.display = 'block';
        feedback.style.background = passed ? '#d1fae5' : '#fee2e2';
        feedback.style.color = passed ? '#065f46' : '#991b1b';
        feedback.textContent = `You got ${correct} out of ${total} correct (${percentage}%).`;

        // Trigger celebration for high-scoring activities
        if (percentage >= 70 && typeof window.showCelebration === 'function') {
            window.showCelebration('quiz-passed', {
                score: correct,
                total: total,
                percentage: percentage
            });
        }
    }

    function showAlert(message) {
        // Use a more accessible alert method if available
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, 'warning');
        } else {
            alert(message);
        }
    }

    // ========================================================================
    // ACCORDION
    // ========================================================================

    window.toggleAccordion = function(itemId) {
        const content = document.getElementById('accordion-' + itemId);
        if (!content) return;

        const trigger = content.previousElementSibling;
        const icon = trigger?.querySelector('.accordion-icon');
        const isExpanded = trigger?.getAttribute('aria-expanded') === 'true';

        if (isExpanded) {
            content.style.maxHeight = '0';
            trigger?.setAttribute('aria-expanded', 'false');
            if (icon) icon.style.transform = 'rotate(0deg)';
        } else {
            content.style.maxHeight = content.scrollHeight + 'px';
            trigger?.setAttribute('aria-expanded', 'true');
            if (icon) icon.style.transform = 'rotate(180deg)';
        }
    };

    window.handleAccordionKeydown = function(event, itemId) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggleAccordion(itemId);
        }
    };

    // ========================================================================
    // TABS
    // ========================================================================

    window.switchTab = function(tabId, containerId) {
        const container = document.querySelector(`[data-spec-id="${containerId}"]`) || document;

        // Hide all tab panels
        container.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
            panel.setAttribute('aria-hidden', 'true');
        });

        // Deactivate all tab buttons
        container.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
        });

        // Show selected panel
        const panel = document.getElementById('tab-panel-' + tabId);
        if (panel) {
            panel.classList.add('active');
            panel.setAttribute('aria-hidden', 'false');
        }

        // Activate selected button
        const button = document.querySelector(`[data-tab-id="${tabId}"]`);
        if (button) {
            button.classList.add('active');
            button.setAttribute('aria-selected', 'true');
        }
    };

    window.handleTabKeydown = function(event, tabId, containerId) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            switchTab(tabId, containerId);
        }
    };

    // ========================================================================
    // VENN DIAGRAM
    // ========================================================================

    window.showVennRegion = function(regionId) {
        // Hide all venn content
        document.querySelectorAll('.venn-content').forEach(el => {
            el.style.display = 'none';
            el.classList.remove('active');
        });

        // Show selected region
        const region = document.getElementById(regionId);
        if (region) {
            region.style.display = 'block';
            region.classList.add('active');
        }
    };

    // ========================================================================
    // SPECTRUM / CONTINUUM
    // ========================================================================

    window.showPointDetails = function(pointId) {
        // Hide all point details
        document.querySelectorAll('.point-details').forEach(el => {
            el.style.display = 'none';
            el.classList.remove('active');
        });

        // Show selected point
        const point = document.getElementById(pointId);
        if (point) {
            point.style.display = 'block';
            point.classList.add('active');
        }
    };

    // ========================================================================
    // CLICK-REVEAL SCENARIO
    // ========================================================================

    window.revealFeedback = function(feedbackId) {
        const feedback = document.getElementById(feedbackId);
        if (!feedback) return;

        if (feedback.style.display === 'none' || !feedback.classList.contains('revealed')) {
            feedback.style.display = 'block';
            feedback.classList.add('revealed');
        } else {
            feedback.style.display = 'none';
            feedback.classList.remove('revealed');
        }
    };

    // ========================================================================
    // TIMELINE
    // ========================================================================

    window.showTimelineEvent = function(eventId) {
        // Hide all event details
        document.querySelectorAll('.timeline-event-details').forEach(el => {
            el.style.display = 'none';
            el.classList.remove('active');
        });

        // Show selected event
        const event = document.getElementById(eventId);
        if (event) {
            event.style.display = 'block';
            event.classList.add('active');
        }
    };

    // ========================================================================
    // COMPARISON TABLE
    // ========================================================================

    window.highlightComparison = function(rowId, column) {
        const row = document.getElementById(rowId);
        if (!row) return;

        // Remove highlights from all cells in table
        const table = row.closest('.comparison-table');
        if (table) {
            table.querySelectorAll('.highlighted').forEach(cell => {
                cell.classList.remove('highlighted');
            });
        }

        // Highlight the clicked cell
        const cell = row.querySelector(`[data-column="${column}"]`);
        if (cell) {
            cell.classList.add('highlighted');
        }
    };

    // ========================================================================
    // ANTI-PATTERN
    // ========================================================================

    window.showAntiPatternFeedback = function(patternId, isCorrect) {
        const feedback = document.getElementById('feedback-' + patternId);
        if (!feedback) return;

        feedback.style.display = 'block';

        if (isCorrect) {
            feedback.classList.remove('incorrect');
            feedback.classList.add('correct');
        } else {
            feedback.classList.remove('correct');
            feedback.classList.add('incorrect');
        }
    };

    // ========================================================================
    // TOGGLE / LAYER VIEW
    // ========================================================================

    window.toggleLayer = function(layerId) {
        const layer = document.getElementById(layerId);
        if (!layer) return;

        const isVisible = layer.classList.contains('visible');

        if (isVisible) {
            layer.classList.remove('visible');
            layer.style.display = 'none';
        } else {
            layer.classList.add('visible');
            layer.style.display = 'block';
        }
    };

    window.showLayer = function(layerId, containerId) {
        const container = document.querySelector(`[data-spec-id="${containerId}"]`) || document;

        // Hide all layers
        container.querySelectorAll('.toggle-layer').forEach(layer => {
            layer.classList.remove('visible');
            layer.style.display = 'none';
        });

        // Show selected layer
        const layer = document.getElementById(layerId);
        if (layer) {
            layer.classList.add('visible');
            layer.style.display = 'block';
        }
    };

    // ========================================================================
    // COMPONENT-LEVEL DRAG AND DROP (for component-generators)
    // ========================================================================

    window.dragStart = function(event) {
        if (event.target && event.target.dataset) {
            event.dataTransfer.setData('itemId', event.target.dataset.itemId || '');
            event.dataTransfer.setData('correctCategory', event.target.dataset.correctCategory || '');
            event.target.classList.add('dragging');
        }
    };

    window.allowDrop = function(event) {
        event.preventDefault();
        event.currentTarget?.classList.add('drag-over');
    };

    window.drop = function(event, specId) {
        event.preventDefault();
        event.currentTarget?.classList.remove('drag-over');

        const itemId = event.dataTransfer.getData('itemId');
        const correctCategory = event.dataTransfer.getData('correctCategory');
        const dropCategory = event.currentTarget?.dataset.categoryId;
        const draggedItem = document.querySelector('[data-item-id="' + itemId + '"]');

        if (!draggedItem) return;

        // Remove dragging class
        draggedItem.classList.remove('dragging');

        // Add to dropped items
        const droppedItems = event.currentTarget?.querySelector('.dropped-items');
        if (droppedItems) {
            droppedItems.appendChild(draggedItem);
        }

        // Check if correct and show feedback
        const feedback = document.getElementById('drag-drop-feedback-' + specId);
        if (feedback) {
            feedback.style.display = 'block';

            if (dropCategory === correctCategory) {
                draggedItem.classList.add('correct');
                draggedItem.classList.remove('incorrect');
                feedback.classList.add('correct');
                feedback.classList.remove('incorrect');
            } else {
                draggedItem.classList.add('incorrect');
                draggedItem.classList.remove('correct');
                feedback.classList.add('incorrect');
                feedback.classList.remove('correct');
            }
        }

        // Track component drag-drop
        var isCorrectDrop = (dropCategory === correctCategory);
        trackInteraction(specId, 'dragdrop', { completed: true, score: isCorrectDrop ? 100 : 0 });
    };

    // ========================================================================
    // COURSE TRACKER INTEGRATION
    // ========================================================================

    /**
     * Extract container/week number from page context.
     * Looks for data-container or data-week on a page element, or falls back
     * to parsing the filename (e.g., lesson-2-3.html → container 2).
     */
    function getPageContainerNum() {
        var el = document.querySelector('[data-container]') || document.querySelector('[data-week]');
        if (el) return parseInt(el.dataset.container || el.dataset.week, 10) || 1;

        // Fallback: parse from URL path (lesson-2-3.html → 2)
        var match = window.location.pathname.match(/lesson-(\d+)-/);
        if (match) return parseInt(match[1], 10);

        return 1;
    }

    /**
     * Record an interactive component engagement to CourseTracker.
     * Safely no-ops when CourseTracker is not available (standalone preview).
     */
    function trackInteraction(specId, type, data) {
        if (window.CourseTracker && typeof window.CourseTracker.recordInteraction === 'function') {
            var containerNum = getPageContainerNum();
            window.CourseTracker.recordInteraction(containerNum, specId, type, data);
        }
    }

    // ========================================================================
    // FLASHCARD TRACKING
    // ========================================================================

    function setupFlashcardTracking() {
        document.querySelectorAll('.flashcards-container, .flashcard-deck').forEach(container => {
            const specId = container.dataset.specId || container.id || 'flashcards-' + Math.random().toString(36).substr(2, 6);
            const cards = container.querySelectorAll('.flashcard');
            if (cards.length === 0) return;

            if (!container._flippedCards) container._flippedCards = new Set();

            cards.forEach((card, index) => {
                card.addEventListener('click', function() {
                    container._flippedCards.add(index);
                    if (container._flippedCards.size >= cards.length) {
                        trackInteraction(specId, 'flashcards', { completed: true, flipped: container._flippedCards.size, total: cards.length });
                    }
                });
            });
        });
    }

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    function init() {
        setupDragDrop();
        setupSorting();
        setupAccordions();
        setupTabs();

        // Setup flashcard tracking
        setupFlashcardTracking();

        // Add click handlers to quiz option labels for better UX
        document.querySelectorAll('.knowledge-check label').forEach(label => {
            label.addEventListener('click', function() {
                const container = this.closest('.knowledge-check');
                container?.querySelectorAll('label').forEach(l => l.classList.remove('selected'));
                this.classList.add('selected');
            });
        });

        // Auto-configure xAPI if config is present via meta tags
        var xapiConfig = document.querySelector('meta[name="xapi-endpoint"]');
        if (xapiConfig) {
            var authMeta = document.querySelector('meta[name="xapi-auth"]');
            var nameMeta = document.querySelector('meta[name="xapi-actor-name"]');
            var emailMeta = document.querySelector('meta[name="xapi-actor-email"]');
            xAPITracker.configure({
                endpoint: xapiConfig.content,
                auth: authMeta ? authMeta.content : null,
                actor: {
                    name: nameMeta ? nameMeta.content : 'Learner',
                    email: emailMeta ? emailMeta.content : 'learner@example.com'
                }
            });
        }

        // Track lesson view via xAPI
        xAPITracker.trackLessonView(document.body.dataset.lessonId);
    }

    function setupAccordions() {
        // Auto-setup accordions that use CSS classes
        document.querySelectorAll('.accordion-container').forEach(container => {
            const specId = container.dataset.specId || container.id || 'accordion-' + Math.random().toString(36).substr(2, 6);
            const triggers = container.querySelectorAll('.accordion-trigger');

            // Track which panels have been opened
            if (!container._openedPanels) container._openedPanels = new Set();

            triggers.forEach((trigger, index) => {
                // Ensure keyboard navigation
                trigger.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.click();
                    }
                });

                // Track accordion panel open
                trigger.addEventListener('click', function() {
                    container._openedPanels.add(index);
                    if (container._openedPanels.size >= triggers.length) {
                        trackInteraction(specId, 'accordion', { completed: true, opened: container._openedPanels.size, total: triggers.length });
                    }
                });
            });
        });
    }

    function setupTabs() {
        // Auto-setup tabs that use CSS classes
        document.querySelectorAll('.tabs-container').forEach(container => {
            const buttons = container.querySelectorAll('.tab-button');
            const panels = container.querySelectorAll('.tab-panel');
            const specId = container.dataset.specId || container.id || 'tabs-' + Math.random().toString(36).substr(2, 6);

            // Track which tabs have been viewed
            if (!container._viewedTabs) container._viewedTabs = new Set();

            buttons.forEach((button, index) => {
                button.addEventListener('click', function() {
                    // Deactivate all
                    buttons.forEach(b => {
                        b.classList.remove('active');
                        b.setAttribute('aria-selected', 'false');
                    });
                    panels.forEach(p => {
                        p.classList.remove('active');
                        p.setAttribute('aria-hidden', 'true');
                    });

                    // Activate current
                    this.classList.add('active');
                    this.setAttribute('aria-selected', 'true');
                    const panelId = this.getAttribute('aria-controls');
                    const panel = document.getElementById(panelId);
                    if (panel) {
                        panel.classList.add('active');
                        panel.setAttribute('aria-hidden', 'false');
                    }

                    // Track tab view
                    container._viewedTabs.add(index);
                    if (container._viewedTabs.size >= buttons.length) {
                        trackInteraction(specId, 'tabs', { completed: true, viewed: container._viewedTabs.size, total: buttons.length });
                    }
                });

                // Keyboard navigation
                button.addEventListener('keydown', function(e) {
                    let targetIndex = index;

                    if (e.key === 'ArrowRight') {
                        targetIndex = (index + 1) % buttons.length;
                    } else if (e.key === 'ArrowLeft') {
                        targetIndex = (index - 1 + buttons.length) % buttons.length;
                    } else if (e.key === 'Home') {
                        targetIndex = 0;
                    } else if (e.key === 'End') {
                        targetIndex = buttons.length - 1;
                    } else {
                        return;
                    }

                    e.preventDefault();
                    buttons[targetIndex].focus();
                    buttons[targetIndex].click();
                });
            });
        });
    }

    // ========================================================================
    // xAPI TRACKING
    // ========================================================================

    var xAPITracker = {
        endpoint: null,
        auth: null,
        actor: null,
        configured: false,

        configure: function(config) {
            // config = { endpoint, auth, actor: { name, email } }
            if (!config || !config.endpoint) return;
            this.endpoint = config.endpoint;
            this.auth = config.auth;
            this.actor = {
                objectType: 'Agent',
                name: config.actor.name,
                mbox: 'mailto:' + config.actor.email
            };
            this.configured = true;
        },

        send: function(verb, activity, result) {
            if (!this.configured) return;
            var statement = {
                actor: this.actor,
                verb: verb,
                object: activity,
                timestamp: new Date().toISOString()
            };
            if (result) statement.result = result;

            // Fire and forget
            try {
                var xhr = new XMLHttpRequest();
                xhr.open('POST', this.endpoint + '/statements', true);
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.setRequestHeader('X-Experience-API-Version', '1.0.3');
                if (this.auth) xhr.setRequestHeader('Authorization', this.auth);
                xhr.send(JSON.stringify(statement));
            } catch(e) { /* silent fail - tracking is non-critical */ }
        },

        trackQuizComplete: function(quizId, score, total, passed) {
            this.send(
                { id: 'http://adlnet.gov/expapi/verbs/' + (passed ? 'passed' : 'failed'), display: {'en-US': passed ? 'passed' : 'failed'} },
                { objectType: 'Activity', id: window.location.href + '#' + quizId, definition: { type: 'http://adlnet.gov/expapi/activities/assessment', name: {'en-US': quizId} } },
                { score: { scaled: total > 0 ? score/total : 0, raw: score, min: 0, max: total }, completion: true, success: passed }
            );
        },

        trackLessonView: function(lessonId) {
            this.send(
                { id: 'http://adlnet.gov/expapi/verbs/experienced', display: {'en-US': 'experienced'} },
                { objectType: 'Activity', id: window.location.href, definition: { type: 'http://adlnet.gov/expapi/activities/lesson', name: {'en-US': lessonId || document.title} } }
            );
        }
    };
    window.xAPITracker = xAPITracker;

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
