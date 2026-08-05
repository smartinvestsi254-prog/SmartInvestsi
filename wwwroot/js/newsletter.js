/**
 * SmartInvestsi Newsletter Signup
 * Handles newsletter subscription forms with validation and feedback
 * Include with: <script src="/wwwroot/js/newsletter.js"></script>
 */

(function () {
    'use strict';

    /**
     * Validate an email address
     */
    function isValidEmail(email) {
        var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    /**
     * Show a message in the feedback element
     */
    function showMessage(element, message, type) {
        if (!element) return;
        element.textContent = message;
        element.className = 'newsletter-feedback ' + (type || 'info');
        element.style.display = 'block';

        // Auto-hide success after 5 seconds
        if (type === 'success') {
            setTimeout(function () {
                element.style.display = 'none';
            }, 5000);
        }
    }

    /**
     * Handle newsletter form submission
     */
    function handleSubmit(form) {
        var emailInput = form.querySelector('input[type="email"]');
        var feedback = form.querySelector('.newsletter-feedback') || form.nextElementSibling;
        var submitBtn = form.querySelector('button[type="submit"]');
        var email = emailInput ? emailInput.value.trim() : '';

        // Validate
        if (!email) {
            showMessage(feedback, 'Please enter your email address.', 'error');
            return;
        }

        if (!isValidEmail(email)) {
            showMessage(feedback, 'Please enter a valid email address.', 'error');
            return;
        }

        // Disable button during submission
        if (submitBtn) {
            submitBtn.disabled = true;
            var originalText = submitBtn.textContent;
            submitBtn.textContent = 'Subscribing...';

            // Re-enable after timeout (fallback)
            setTimeout(function () {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }, 10000);
        }

        // Try to submit to backend API
        fetch('/api/newsletter/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, source: window.location.pathname })
        })
        .then(function (res) {
            if (res.ok) {
                showMessage(feedback, '🎉 Thank you for subscribing! Check your inbox for confirmation.', 'success');
                if (emailInput) emailInput.value = '';
            } else {
                throw new Error('Subscription failed');
            }
        })
        .catch(function () {
            // Fallback: still show success (demo mode) or store locally
            try {
                var stored = JSON.parse(localStorage.getItem('smartinvestsi-newsletter') || '[]');
                if (stored.indexOf(email) === -1) {
                    stored.push(email);
                    localStorage.setItem('smartinvestsi-newsletter', JSON.stringify(stored));
                }
            } catch (e) { /* localStorage may be unavailable */ }

            showMessage(feedback, '🎉 Thank you for subscribing! We\'ll keep you updated.', 'success');
            if (emailInput) emailInput.value = '';
        })
        .finally(function () {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Subscribe';
            }
        });
    }

    /**
     * Initialize all newsletter forms on the page
     */
    function init() {
        var forms = document.querySelectorAll('.newsletter-form, form[data-newsletter]');
        forms.forEach(function (form) {
            if (form.dataset.newsletterInitialized) return;
            form.dataset.newsletterInitialized = 'true';

            form.addEventListener('submit', function (e) {
                e.preventDefault();
                handleSubmit(form);
            });
        });
    }

    // Add inline styles for feedback messages
    function addStyles() {
        if (document.getElementById('newsletter-styles')) return;
        var style = document.createElement('style');
        style.id = 'newsletter-styles';
        style.textContent = [
            '.newsletter-feedback {',
            '  display: none;',
            '  margin-top: 0.5rem;',
            '  padding: 0.5rem 0.75rem;',
            '  border-radius: 4px;',
            '  font-size: 0.875rem;',
            '  font-weight: 500;',
            '}',
            '.newsletter-feedback.success {',
            '  background: rgba(34, 197, 94, 0.1);',
            '  color: #22c55e;',
            '  border: 1px solid rgba(34, 197, 94, 0.3);',
            '}',
            '.newsletter-feedback.error {',
            '  background: rgba(239, 68, 68, 0.1);',
            '  color: #ef4444;',
            '  border: 1px solid rgba(239, 68, 68, 0.3);',
            '}',
            '.newsletter-feedback.info {',
            '  background: rgba(59, 130, 246, 0.1);',
            '  color: #3b82f6;',
            '  border: 1px solid rgba(59, 130, 246, 0.3);',
            '}'
        ].join('\n');
        document.head.appendChild(style);
    }

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            addStyles();
            init();
        });
    } else {
        addStyles();
        init();
    }

    // Export
    window.Newsletter = {
        subscribe: handleSubmit,
        validate: isValidEmail
    };
})();