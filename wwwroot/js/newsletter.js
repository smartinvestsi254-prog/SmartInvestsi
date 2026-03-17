// newsletter.js
// Shows newsletter signup modal after a short delay and handles subscription.
(function(){
    function showModal() {
        const modalEl = document.getElementById('newsletterModal');
        if (modalEl) {
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(showModal, 8000); // show after 8 seconds
        const subscribeBtn = document.getElementById('subscribeBtn');
        if (subscribeBtn) {
            subscribeBtn.addEventListener('click', () => {
                const email = document.getElementById('newsletterEmail').value;
                if (email && email.includes('@')) {
                    console.log('Newsletter signup:', email);
                    alert('Thanks for subscribing!');
                    const modal = bootstrap.Modal.getInstance(document.getElementById('newsletterModal'));
                    modal.hide();
                } else {
                    alert('Please enter a valid email address.');
                }
            });
        }
    });
})();