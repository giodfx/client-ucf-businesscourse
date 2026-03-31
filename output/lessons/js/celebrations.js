/**
 * Celebration & Milestone UX JavaScript
 *
 * Provides emotional design feedback when learners complete quizzes, lessons,
 * and milestones. Creates overlay modals with confetti, score animations,
 * and encouraging messages.
 *
 * API:
 *   window.showCelebration(type, data)
 *     type: 'quiz-passed' | 'quiz-failed' | 'lesson-complete' | 'milestone' | 'course-complete'
 *     data: { score, total, percentage, lessonTitle, milestoneText }
 *
 * Dispatches CustomEvents:
 *   'quiz-completed'    - { detail: { score, percentage, passed } }
 *   'lesson-completed'  - { detail: { lessonId } }
 *   'milestone-reached' - { detail: { milestone } }
 */

(function() {
    'use strict';

    // ========================================================================
    // CONFIGURATION
    // ========================================================================

    var CONFETTI_COUNT = 45;
    var AUTO_DISMISS_QUIZ = 4000;
    var AUTO_DISMISS_MILESTONE = 3000;
    var CONFETTI_CLEANUP_DELAY = 3500;
    var SCORE_ANIMATION_DURATION = 1000;

    var CONFETTI_COLORS = [
        '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7',
        '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#e11d48',
        '#84cc16', '#d946ef', '#06b6d4', '#fbbf24', '#34d399'
    ];

    // ========================================================================
    // REDUCED MOTION CHECK
    // ========================================================================

    function prefersReducedMotion() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    // ========================================================================
    // FOCUS TRAP
    // ========================================================================

    var previousFocusElement = null;

    function trapFocus(modal) {
        var focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        var focusableElements = modal.querySelectorAll(focusableSelectors);
        var firstFocusable = focusableElements[0];
        var lastFocusable = focusableElements[focusableElements.length - 1];

        function handleTab(e) {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                if (document.activeElement === firstFocusable) {
                    e.preventDefault();
                    lastFocusable.focus();
                }
            } else {
                if (document.activeElement === lastFocusable) {
                    e.preventDefault();
                    firstFocusable.focus();
                }
            }
        }

        modal.addEventListener('keydown', handleTab);
        modal._removeTrapFocus = function() {
            modal.removeEventListener('keydown', handleTab);
        };

        // Focus first button
        if (firstFocusable) {
            firstFocusable.focus();
        } else {
            modal.focus();
        }
    }

    // ========================================================================
    // CONFETTI CREATION
    // ========================================================================

    function createConfetti() {
        if (prefersReducedMotion()) return null;

        var container = document.createElement('div');
        container.className = 'celebration-confetti';
        container.setAttribute('aria-hidden', 'true');

        for (var i = 0; i < CONFETTI_COUNT; i++) {
            var particle = document.createElement('div');
            particle.className = 'confetti-particle';

            // For particles beyond the CSS nth-child rules, set inline styles
            if (i >= 30) {
                var color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
                var left = Math.random() * 95;
                var size = 5 + Math.random() * 8;
                var delay = Math.random() * 0.8;
                var duration = 2.4 + Math.random() * 1.2;
                var shape = Math.random();

                particle.style.left = left + '%';
                particle.style.background = color;
                particle.style.width = (shape > 0.6 ? 4 : size) + 'px';
                particle.style.height = (shape > 0.6 ? size + 4 : size) + 'px';
                particle.style.borderRadius = shape > 0.3 ? '50%' : '2px';
                particle.style.animationDelay = delay + 's';
                particle.style.animationDuration = duration + 's';
            }

            container.appendChild(particle);
        }

        document.body.appendChild(container);

        // Auto-remove confetti after animation completes
        setTimeout(function() {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
        }, CONFETTI_CLEANUP_DELAY);

        return container;
    }

    // ========================================================================
    // SCORE COUNT-UP ANIMATION
    // ========================================================================

    function animateScore(element, targetValue, suffix) {
        if (prefersReducedMotion()) {
            element.textContent = targetValue + (suffix || '');
            return;
        }

        var startTime = null;
        var startValue = 0;

        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            var elapsed = timestamp - startTime;
            var progress = Math.min(elapsed / SCORE_ANIMATION_DURATION, 1);

            // Ease-out cubic
            var eased = 1 - Math.pow(1 - progress, 3);
            var current = Math.round(startValue + (targetValue - startValue) * eased);

            element.textContent = current + (suffix || '');

            if (progress < 1) {
                requestAnimationFrame(step);
            }
        }

        requestAnimationFrame(step);
    }

    // ========================================================================
    // DISMISS CELEBRATION
    // ========================================================================

    var activeOverlay = null;
    var autoDismissTimer = null;

    function dismissCelebration() {
        if (autoDismissTimer) {
            clearTimeout(autoDismissTimer);
            autoDismissTimer = null;
        }

        if (activeOverlay) {
            // Remove focus trap
            var modal = activeOverlay.querySelector('.celebration-modal');
            if (modal && modal._removeTrapFocus) {
                modal._removeTrapFocus();
            }

            if (activeOverlay.parentNode) {
                activeOverlay.parentNode.removeChild(activeOverlay);
            }
            activeOverlay = null;
        }

        // Remove any lingering confetti containers
        var confettiContainers = document.querySelectorAll('.celebration-confetti');
        for (var i = 0; i < confettiContainers.length; i++) {
            if (confettiContainers[i].parentNode) {
                confettiContainers[i].parentNode.removeChild(confettiContainers[i]);
            }
        }

        // Restore focus
        if (previousFocusElement && previousFocusElement.focus) {
            previousFocusElement.focus();
            previousFocusElement = null;
        }
    }

    // ========================================================================
    // BUILD MODAL CONTENT
    // ========================================================================

    function buildModalContent(type, data) {
        var icon = '';
        var message = '';
        var submessage = '';
        var showScore = false;
        var buttons = [];

        var score = data.score || 0;
        var total = data.total || 0;
        var percentage = data.percentage || 0;

        switch (type) {
            case 'quiz-passed':
                icon = '\u2B50'; // star
                message = 'Great Job!';
                submessage = 'You passed the quiz with flying colors.';
                showScore = true;
                buttons = [
                    { text: 'Continue', className: 'celebration-btn-primary', action: 'dismiss' }
                ];
                break;

            case 'quiz-failed':
                icon = '\uD83D\uDCAA'; // flexed biceps
                message = 'Keep Going!';
                submessage = 'You\'re making progress. Review the material and try again.';
                showScore = true;
                buttons = [
                    { text: 'Review Material', className: 'celebration-btn-secondary', action: 'dismiss' },
                    { text: 'Try Again', className: 'celebration-btn-primary', action: 'retry' }
                ];
                break;

            case 'lesson-complete':
                icon = '\u2705'; // check mark
                message = 'Lesson Complete!';
                submessage = data.lessonTitle ? ('You\'ve completed "' + data.lessonTitle + '".') : 'Great work finishing this lesson.';
                buttons = [
                    { text: 'Next Lesson', className: 'celebration-btn-primary', action: 'dismiss' }
                ];
                break;

            case 'milestone':
                icon = '\uD83C\uDFC6'; // trophy
                message = data.milestoneText || 'Milestone Reached!';
                submessage = 'You\'re making excellent progress through the course.';
                buttons = [
                    { text: 'Keep Going', className: 'celebration-btn-primary', action: 'dismiss' }
                ];
                break;

            case 'course-complete':
                icon = '\uD83C\uDF93'; // graduation cap
                message = 'Course Complete!';
                submessage = 'Congratulations on completing the entire course. Your dedication and hard work have paid off.';
                buttons = [
                    { text: 'View Certificate', className: 'celebration-btn-primary', action: 'dismiss' }
                ];
                break;

            default:
                icon = '\uD83C\uDF89'; // party popper
                message = 'Well Done!';
                buttons = [
                    { text: 'Continue', className: 'celebration-btn-primary', action: 'dismiss' }
                ];
        }

        return {
            icon: icon,
            message: message,
            submessage: submessage,
            showScore: showScore,
            score: score,
            total: total,
            percentage: percentage,
            buttons: buttons
        };
    }

    // ========================================================================
    // SHOW CELEBRATION (Main API)
    // ========================================================================

    window.showCelebration = function(type, data) {
        data = data || {};

        // Dismiss any existing celebration
        dismissCelebration();

        // Save current focus
        previousFocusElement = document.activeElement;

        var content = buildModalContent(type, data);
        var showConfetti = (type === 'quiz-passed' || type === 'milestone' || type === 'course-complete');

        // Create confetti (if applicable)
        if (showConfetti) {
            createConfetti();
        }

        // Create overlay
        var overlay = document.createElement('div');
        overlay.className = 'celebration-overlay celebration-type-' + type;
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', content.message);

        // Create modal
        var modal = document.createElement('div');
        modal.className = 'celebration-modal';
        modal.setAttribute('tabindex', '-1');

        // Close button for screen readers
        var closeBtn = document.createElement('button');
        closeBtn.className = 'celebration-close-sr';
        closeBtn.setAttribute('aria-label', 'Close celebration');
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', dismissCelebration);
        modal.appendChild(closeBtn);

        // Icon
        var iconEl = document.createElement('div');
        iconEl.className = 'celebration-icon';
        iconEl.setAttribute('aria-hidden', 'true');
        iconEl.textContent = content.icon;
        modal.appendChild(iconEl);

        // Message
        var messageEl = document.createElement('div');
        messageEl.className = 'celebration-message';
        messageEl.textContent = content.message;
        modal.appendChild(messageEl);

        // Score (if applicable)
        if (content.showScore) {
            var scoreLabel = document.createElement('div');
            scoreLabel.className = 'celebration-score-label';
            scoreLabel.textContent = 'Your Score';
            modal.appendChild(scoreLabel);

            var scoreEl = document.createElement('div');
            scoreEl.className = 'celebration-score';
            scoreEl.setAttribute('aria-live', 'polite');
            scoreEl.textContent = '0%';
            modal.appendChild(scoreEl);

            var scoreDetail = document.createElement('div');
            scoreDetail.className = 'celebration-score-detail';
            scoreDetail.textContent = content.score + ' out of ' + content.total + ' correct';
            modal.appendChild(scoreDetail);

            // Animate the score after a short delay
            setTimeout(function() {
                animateScore(scoreEl, content.percentage, '%');
            }, 300);
        }

        // Submessage
        if (content.submessage) {
            var submessageEl = document.createElement('div');
            submessageEl.className = 'celebration-submessage';
            submessageEl.textContent = content.submessage;
            modal.appendChild(submessageEl);
        }

        // Buttons
        if (content.buttons.length > 0) {
            var actionsEl = document.createElement('div');
            actionsEl.className = 'celebration-actions';

            for (var i = 0; i < content.buttons.length; i++) {
                var btnConfig = content.buttons[i];
                var btn = document.createElement('button');
                btn.className = btnConfig.className;
                btn.textContent = btnConfig.text;

                if (btnConfig.action === 'retry') {
                    btn.addEventListener('click', function() {
                        dismissCelebration();
                        // Try to find and trigger the retry mechanism
                        var retryBtn = document.querySelector('.quiz-retry-btn, [data-action="retry-quiz"]');
                        if (retryBtn) {
                            retryBtn.click();
                        } else if (typeof window.retryQuiz === 'function') {
                            window.retryQuiz();
                        }
                    });
                } else {
                    btn.addEventListener('click', dismissCelebration);
                }

                actionsEl.appendChild(btn);
            }

            modal.appendChild(actionsEl);
        }

        overlay.appendChild(modal);

        // Click overlay backdrop to dismiss
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                dismissCelebration();
            }
        });

        // Escape to dismiss
        overlay.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                dismissCelebration();
            }
        });

        // Add to DOM
        document.body.appendChild(overlay);
        activeOverlay = overlay;

        // Set up focus trap
        trapFocus(modal);

        // Auto-dismiss based on type
        var autoDismissDelay = 0;
        if (type === 'quiz-passed' || type === 'quiz-failed') {
            autoDismissDelay = AUTO_DISMISS_QUIZ;
        } else if (type === 'milestone') {
            autoDismissDelay = AUTO_DISMISS_MILESTONE;
        } else if (type === 'lesson-complete') {
            autoDismissDelay = AUTO_DISMISS_MILESTONE;
        }
        // course-complete does NOT auto-dismiss

        if (autoDismissDelay > 0) {
            autoDismissTimer = setTimeout(dismissCelebration, autoDismissDelay);
        }

        // Dispatch custom events
        dispatchCelebrationEvents(type, data);
    };

    // ========================================================================
    // CUSTOM EVENT DISPATCH
    // ========================================================================

    function dispatchCelebrationEvents(type, data) {
        try {
            if (type === 'quiz-passed' || type === 'quiz-failed') {
                document.dispatchEvent(new CustomEvent('quiz-completed', {
                    detail: {
                        score: data.percentage || 0,
                        percentage: data.percentage || 0,
                        passed: type === 'quiz-passed'
                    },
                    bubbles: true
                }));
            }

            if (type === 'lesson-complete') {
                var lessonId = document.body.dataset.lessonId ||
                    window.location.pathname.split('/').pop() ||
                    'unknown';

                document.dispatchEvent(new CustomEvent('lesson-completed', {
                    detail: {
                        lessonId: lessonId,
                        lessonTitle: data.lessonTitle || ''
                    },
                    bubbles: true
                }));
            }

            if (type === 'milestone' || type === 'course-complete') {
                document.dispatchEvent(new CustomEvent('milestone-reached', {
                    detail: {
                        milestone: data.milestoneText || type
                    },
                    bubbles: true
                }));
            }
        } catch (e) {
            // CustomEvent may not be supported in very old browsers; fail silently
        }
    }

    // ========================================================================
    // CONVENIENCE: DISMISS API
    // ========================================================================

    window.dismissCelebration = dismissCelebration;

})();
