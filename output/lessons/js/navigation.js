/**
 * Navigation JavaScript - Shared across all course templates
 *
 * This file contains:
 * - Sidebar toggle (desktop and mobile)
 * - Module/week expand/collapse
 * - Progress tracking localStorage
 * - Theme toggle
 *
 * Include this in all generated course HTML files.
 */

(function() {
    'use strict';

    // ========================================================================
    // DESKTOP SIDEBAR TOGGLE
    // ========================================================================

    window.toggleDesktopSidebar = function() {
        const body = document.body;
        body.classList.toggle('sidebar-hidden');

        // Save preference to localStorage
        const isHidden = body.classList.contains('sidebar-hidden');
        localStorage.setItem('sidebarHidden', isHidden.toString());
    };

    // ========================================================================
    // MOBILE MENU TOGGLE
    // ========================================================================

    window.toggleMobileMenu = function() {
        const sidebar = document.querySelector('.sidebar, .lesson-sidebar');
        if (sidebar) {
            sidebar.classList.toggle('active');
        }

        // Toggle hamburger animation
        const hamburger = document.querySelector('.hamburger');
        if (hamburger) {
            hamburger.classList.toggle('active');
        }

        // Prevent body scroll when menu is open
        document.body.classList.toggle('menu-open');
    };

    // Close mobile menu when clicking outside
    document.addEventListener('click', function(e) {
        const sidebar = document.querySelector('.sidebar.active, .lesson-sidebar.active');
        const menuToggle = document.querySelector('.mobile-menu-toggle');

        if (sidebar && !sidebar.contains(e.target) && !menuToggle?.contains(e.target)) {
            sidebar.classList.remove('active');
            document.body.classList.remove('menu-open');
            const hamburger = document.querySelector('.hamburger');
            if (hamburger) {
                hamburger.classList.remove('active');
            }
        }
    });

    // ========================================================================
    // MODULE/WEEK EXPAND/COLLAPSE
    // ========================================================================

    window.toggleSidebarModule = function(moduleNum) {
        const module = document.querySelector(`[data-module="${moduleNum}"]`);
        if (!module) return;

        const lessons = document.getElementById(`nav-module-${moduleNum}`);
        const trigger = module.querySelector('.nav-module-trigger, .week-toggle');

        if (!lessons || !trigger) return;

        const isExpanded = trigger.getAttribute('aria-expanded') === 'true';

        if (isExpanded) {
            // Collapse
            lessons.style.maxHeight = '0px';
            lessons.style.opacity = '0';
            lessons.classList.remove('expanded');
            trigger.setAttribute('aria-expanded', 'false');
            module.classList.remove('active', 'expanded');
        } else {
            // Expand
            lessons.style.maxHeight = lessons.scrollHeight + 'px';
            lessons.style.opacity = '1';
            lessons.classList.add('expanded');
            trigger.setAttribute('aria-expanded', 'true');
            module.classList.add('active', 'expanded');
        }

        // Save expanded state
        saveExpandedModules();
    };

    // Toggle week (alias for module toggle)
    window.toggleWeek = function(weekNum) {
        const weekItem = document.querySelector(`.week-item[data-week="${weekNum}"]`);
        if (!weekItem) return;

        const moduleList = weekItem.querySelector('.module-list');
        if (!moduleList) return;

        const isExpanded = weekItem.classList.contains('expanded');

        if (isExpanded) {
            weekItem.classList.remove('expanded');
            moduleList.hidden = true;
        } else {
            weekItem.classList.add('expanded');
            moduleList.hidden = false;
        }
    };

    // ========================================================================
    // EXPANDED STATE PERSISTENCE
    // ========================================================================

    function saveExpandedModules() {
        const expandedModules = [];
        document.querySelectorAll('.nav-module.active, .nav-module.expanded').forEach(module => {
            const moduleNum = module.dataset.module;
            if (moduleNum) {
                expandedModules.push(moduleNum);
            }
        });
        localStorage.setItem('expandedModules', JSON.stringify(expandedModules));
    }

    function restoreExpandedModules() {
        const stored = localStorage.getItem('expandedModules');
        if (!stored) return;

        try {
            const expandedModules = JSON.parse(stored);
            expandedModules.forEach(moduleNum => {
                const module = document.querySelector(`[data-module="${moduleNum}"]`);
                const lessons = document.getElementById(`nav-module-${moduleNum}`);
                const trigger = module?.querySelector('.nav-module-trigger, .week-toggle');

                if (module && lessons && trigger) {
                    lessons.style.maxHeight = lessons.scrollHeight + 'px';
                    lessons.style.opacity = '1';
                    lessons.classList.add('expanded');
                    trigger.setAttribute('aria-expanded', 'true');
                    module.classList.add('active', 'expanded');
                }
            });
        } catch (e) {
            console.warn('Could not restore expanded modules:', e);
        }
    }

    // ========================================================================
    // THEME TOGGLE (Light/Dark Mode)
    // ========================================================================

    /**
     * Get the base theme from the HTML element or default
     * Base themes: default, government, corporate, education, healthcare, high-contrast
     */
    function getBaseTheme() {
        return document.documentElement.dataset.baseTheme || 'default';
    }

    /**
     * Check if current theme is dark mode
     */
    function isDarkMode() {
        const theme = document.documentElement.getAttribute('data-theme') || '';
        return theme.endsWith('-dark') || theme === 'dark';
    }

    /**
     * Get the theme name for a given mode
     * @param {string} baseTheme - The base theme (e.g., 'government')
     * @param {boolean} dark - Whether to use dark mode
     */
    function getThemeName(baseTheme, dark) {
        if (baseTheme === 'default' || !baseTheme) {
            return dark ? 'dark' : 'light';
        }
        return dark ? `${baseTheme}-dark` : baseTheme;
    }

    /**
     * Toggle between light and dark mode for the current base theme
     */
    window.toggleTheme = function() {
        const baseTheme = getBaseTheme();
        const currentlyDark = isDarkMode();
        const newTheme = getThemeName(baseTheme, !currentlyDark);

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme-mode', currentlyDark ? 'light' : 'dark');

        // Update toggle button
        updateThemeToggleButton(!currentlyDark);
    };

    /**
     * Set the theme to a specific mode
     * @param {boolean} dark - Whether to use dark mode
     */
    window.setThemeMode = function(dark) {
        const baseTheme = getBaseTheme();
        const newTheme = getThemeName(baseTheme, dark);

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme-mode', dark ? 'dark' : 'light');

        updateThemeToggleButton(dark);
    };

    /**
     * Update the theme toggle button appearance
     */
    function updateThemeToggleButton(isDark) {
        const toggleBtn = document.querySelector('.theme-toggle-btn');
        if (!toggleBtn) return;

        const sunIcon = toggleBtn.querySelector('.theme-icon-sun');
        const moonIcon = toggleBtn.querySelector('.theme-icon-moon');
        const label = toggleBtn.querySelector('.theme-toggle-label');

        if (isDark) {
            toggleBtn.setAttribute('aria-pressed', 'true');
            toggleBtn.classList.add('dark-mode');
            toggleBtn.classList.remove('light-mode');
            if (sunIcon) sunIcon.style.display = 'block';
            if (moonIcon) moonIcon.style.display = 'none';
            if (label) label.textContent = 'Light Mode';
        } else {
            toggleBtn.setAttribute('aria-pressed', 'false');
            toggleBtn.classList.remove('dark-mode');
            toggleBtn.classList.add('light-mode');
            if (sunIcon) sunIcon.style.display = 'none';
            if (moonIcon) moonIcon.style.display = 'block';
            if (label) label.textContent = 'Dark Mode';
        }
    }

    /**
     * Restore theme from localStorage or system preference
     */
    function restoreTheme() {
        const baseTheme = getBaseTheme();
        const savedMode = localStorage.getItem('theme-mode');

        let useDark;
        if (savedMode) {
            useDark = savedMode === 'dark';
        } else {
            // Check system preference
            useDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        }

        const themeName = getThemeName(baseTheme, useDark);
        document.documentElement.setAttribute('data-theme', themeName);

        // Update button state after DOM is ready
        setTimeout(() => updateThemeToggleButton(useDark), 0);
    }

    // Listen for system preference changes
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
            // Only auto-switch if user hasn't set a preference
            if (!localStorage.getItem('theme-mode')) {
                setThemeMode(e.matches);
            }
        });
    }

    // ========================================================================
    // SIDEBAR STATE PERSISTENCE
    // ========================================================================

    function restoreSidebarState() {
        const sidebarHidden = localStorage.getItem('sidebarHidden') === 'true';
        if (sidebarHidden) {
            document.body.classList.add('sidebar-hidden');
        }
    }

    // ========================================================================
    // ACTIVE LESSON HIGHLIGHTING
    // ========================================================================

    function highlightActiveLesson() {
        // Get current page filename
        const currentPath = window.location.pathname;
        const currentFile = currentPath.substring(currentPath.lastIndexOf('/') + 1);

        // Find and mark the active lesson link
        document.querySelectorAll('.nav-lesson-link').forEach(link => {
            const linkHref = link.getAttribute('href');
            if (linkHref && linkHref.includes(currentFile)) {
                link.classList.add('current');

                // Expand the parent module
                const parentModule = link.closest('.nav-module, [data-module]');
                if (parentModule) {
                    const moduleNum = parentModule.dataset.module;
                    const lessons = document.getElementById(`nav-module-${moduleNum}`);
                    const trigger = parentModule.querySelector('.nav-module-trigger, .week-toggle');

                    if (lessons && trigger) {
                        lessons.style.maxHeight = lessons.scrollHeight + 'px';
                        lessons.style.opacity = '1';
                        lessons.classList.add('expanded');
                        trigger.setAttribute('aria-expanded', 'true');
                        parentModule.classList.add('active', 'expanded');
                    }
                }
            }
        });
    }

    // ========================================================================
    // SCROLL PROGRESS INDICATOR
    // ========================================================================

    function initScrollProgress() {
        const progressBar = document.querySelector('.lesson-progress-fill');
        if (!progressBar) return;

        window.addEventListener('scroll', function() {
            const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height) * 100;
            progressBar.style.width = scrolled + '%';
        });
    }

    // ========================================================================
    // KEYBOARD NAVIGATION
    // ========================================================================

    document.addEventListener('keydown', function(e) {
        // ESC to close mobile menu
        if (e.key === 'Escape') {
            const sidebar = document.querySelector('.sidebar.active, .lesson-sidebar.active');
            if (sidebar) {
                sidebar.classList.remove('active');
                document.body.classList.remove('menu-open');
            }
        }

        // Toggle sidebar with Ctrl+B (or Cmd+B on Mac)
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            toggleDesktopSidebar();
        }
    });

    // ========================================================================
    // ADAPTIVE QUIZ BRANCHING
    // ========================================================================

    function checkForFailedPrerequisites() {
        try {
            var results = JSON.parse(localStorage.getItem('quizResults') || '{}');
            var currentPath = window.location.pathname;
            var currentFile = currentPath.substring(currentPath.lastIndexOf('/') + 1).replace('.html', '');

            // Parse lesson number to find previous lesson
            var match = currentFile.match(/lesson-(\d+)-(\d+)/);
            if (!match) return;

            var moduleNum = parseInt(match[1]);
            var lessonNum = parseInt(match[2]);

            // Check if previous lesson quiz was failed
            var prevLessonId;
            if (lessonNum > 1) {
                prevLessonId = 'lesson-' + moduleNum + '-' + (lessonNum - 1) + '.html';
            } else if (moduleNum > 1) {
                // Last lesson of previous module - find it from sidebar
                var prevModuleLessons = document.querySelectorAll('[data-module="' + (moduleNum - 1) + '"] .nav-lesson-link');
                if (prevModuleLessons.length > 0) {
                    var lastLink = prevModuleLessons[prevModuleLessons.length - 1].getAttribute('href');
                    prevLessonId = lastLink;
                }
            }

            if (prevLessonId && results[prevLessonId] && !results[prevLessonId].passed) {
                showReviewBanner(prevLessonId, results[prevLessonId]);
            }
        } catch(e) { /* ignore */ }
    }

    function showReviewBanner(lessonId, quizResult) {
        // Find lesson name from sidebar
        var lessonName = 'the previous lesson';
        var lessonLink = document.querySelector('a[href*="' + lessonId.replace('.html', '') + '"]');
        if (lessonLink) {
            lessonName = lessonLink.textContent.trim();
        }

        var banner = document.createElement('div');
        banner.className = 'review-banner';
        banner.setAttribute('role', 'alert');
        banner.innerHTML =
            '<div class="review-banner-content">' +
                '<span class="review-banner-icon">&#x1F4DD;</span>' +
                '<span class="review-banner-text">You scored ' + quizResult.score + '% on <strong>' + lessonName + '</strong>. Consider reviewing before continuing.</span>' +
                '<a href="' + lessonId + '" class="review-banner-link">Review Lesson</a>' +
                '<button class="review-banner-dismiss" onclick="this.closest(\'.review-banner\').remove()" aria-label="Dismiss">&times;</button>' +
            '</div>';

        // Insert at top of main content
        var mainContent = document.querySelector('.lesson-content, .main-content, main');
        if (mainContent) {
            mainContent.insertBefore(banner, mainContent.firstChild);
        }
    }

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    function init() {
        restoreTheme();
        restoreSidebarState();
        highlightActiveLesson();
        restoreExpandedModules();
        initScrollProgress();

        // Collapse all non-active modules initially
        document.querySelectorAll('.nav-module:not(.active), [data-module]:not(.active)').forEach(module => {
            const moduleNum = module.dataset.module;
            const lessons = document.getElementById(`nav-module-${moduleNum}`);
            if (lessons && !lessons.classList.contains('expanded')) {
                lessons.style.maxHeight = '0px';
                lessons.style.opacity = '0';
            }
        });

        // Check for failed prerequisite quizzes and show review banner
        checkForFailedPrerequisites();

        // Listen for lesson completion events
        document.addEventListener('quiz-completed', function(e) {
            if (e.detail && e.detail.passed) {
                // Store quiz result for adaptive branching
                try {
                    var results = JSON.parse(localStorage.getItem('quizResults') || '{}');
                    var lessonId = document.body.dataset.lessonId || window.location.pathname.split('/').pop();
                    results[lessonId] = {
                        score: e.detail.percentage,
                        passed: e.detail.passed,
                        timestamp: Date.now()
                    };
                    localStorage.setItem('quizResults', JSON.stringify(results));
                } catch(err) { /* ignore storage errors */ }
            }
        });
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
