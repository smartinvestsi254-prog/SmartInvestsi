/**
 * SmartInvestsi Theme Toggle
 * Switches between dark and light modes with localStorage persistence
 */

(function () {
    'use strict';

    const THEME_KEY = 'smartinvestsi-theme';
    const DARK_MODE = 'dark-mode';
    const LIGHT_MODE = 'light-mode';

    /**
     * Get the saved theme from localStorage or fall back to system preference
     */
    function getSavedTheme() {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved) return saved;
        // Fall back to system preference
        return window.matchMedia('(prefers-color-scheme: light)').matches ? LIGHT_MODE : DARK_MODE;
    }

    /**
     * Apply the theme to the body element
     */
    function applyTheme(theme) {
        const body = document.body;
        if (theme === LIGHT_MODE) {
            body.classList.add(LIGHT_MODE);
            body.classList.remove(DARK_MODE);
        } else {
            body.classList.add(DARK_MODE);
            body.classList.remove(LIGHT_MODE);
        }
        // Update toggle button icon if present
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            const icon = toggleBtn.querySelector('i') || toggleBtn;
            if (theme === LIGHT_MODE) {
                icon.className = 'fas fa-sun';
                toggleBtn.setAttribute('aria-label', 'Switch to dark mode');
            } else {
                icon.className = 'fas fa-moon';
                toggleBtn.setAttribute('aria-label', 'Switch to light mode');
            }
        }
    }

    /**
     * Toggle between dark and light modes
     */
    function toggleTheme() {
        const current = getSavedTheme();
        const next = current === LIGHT_MODE ? DARK_MODE : LIGHT_MODE;
        localStorage.setItem(THEME_KEY, next);
        applyTheme(next);
    }

    /**
     * Initialize theme on page load
     */
    function initTheme() {
        const savedTheme = getSavedTheme();
        applyTheme(savedTheme);

        // Attach click handler to toggle button
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggleTheme);
        }
    }

    // Run immediately if DOM is ready, otherwise wait
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTheme);
    } else {
        initTheme();
    }

    // Export for external use
    window.ThemeToggle = {
        toggle: toggleTheme,
        apply: applyTheme,
        getTheme: getSavedTheme
    };
})();