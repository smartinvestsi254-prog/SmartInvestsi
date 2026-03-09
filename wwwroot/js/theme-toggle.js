// theme-toggle.js
// Adds a dark mode toggle button to the navbar and persists preference in localStorage

(function () {
    const toggle = document.createElement('button');
    toggle.id = 'darkModeToggle';
    toggle.className = 'btn btn-secondary btn-sm ms-2';
    const icon = document.createElement('span');
    icon.id = 'darkIcon';
    icon.textContent = '🌙';
    toggle.appendChild(icon);

    toggle.addEventListener('click', () => {
        const dark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', dark);
        icon.textContent = dark ? '☀️' : '🌙';
    });

    function attach() {
        const nav = document.querySelector('.navbar-nav');
        if (nav && !document.getElementById('darkModeToggle')) {
            const li = document.createElement('li');
            li.className = 'nav-item';
            li.appendChild(toggle);
            nav.appendChild(li);
        }
    }

    // add on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attach);
    } else {
        attach();
    }

    // floating chat widget
    const chatBtn = document.createElement('a');
    chatBtn.href = '/contact.html';
    chatBtn.id = 'chatWidget';
    chatBtn.title = 'Support Chat';
    chatBtn.style.position = 'fixed';
    chatBtn.style.bottom = '20px';
    chatBtn.style.right = '20px';
    chatBtn.style.width = '60px';
    chatBtn.style.height = '60px';
    chatBtn.style.borderRadius = '50%';
    chatBtn.style.background = 'var(--accent-gold)';
    chatBtn.style.display = 'flex';
    chatBtn.style.alignItems = 'center';
    chatBtn.style.justifyContent = 'center';
    chatBtn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    chatBtn.style.zIndex = '1000';
    chatBtn.style.color = '#0B1F33';
    chatBtn.style.fontSize = '24px';
    chatBtn.textContent = '💬';
    document.body.appendChild(chatBtn);

    // load preference
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        icon.textContent = '☀️';
    }
})();