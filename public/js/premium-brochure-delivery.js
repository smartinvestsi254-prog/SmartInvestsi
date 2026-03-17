/**
 * Premium Brochure Delivery System
 * Automatically delivers brochures to paid members based on subscription duration
 */

class BrochureDeliverySystem {
    constructor() {
        this.brochures = [
            {
                id: 'week1',
                title: 'Africa Markets Weekly Insights',
                description: 'Weekly analysis of African stock markets',
                url: '/public/brochures/weekly-insights.html',
                deliveryWeek: 1,
                format: 'HTML/PDF',
                pages: 12
            },
            {
                id: 'week2',
                title: 'Investment Opportunities Q1 2026',
                description: 'Quarterly deep-dive into emerging opportunities',
                url: '/public/brochures/quarterly-opportunities.html',
                deliveryWeek: 2,
                format: 'HTML/PDF',
                pages: 24
            },
            {
                id: 'week3',
                title: 'Portfolio Optimization Strategies',
                description: 'Advanced techniques for portfolio rebalancing',
                url: '/public/brochures/portfolio-optimization.html',
                deliveryWeek: 3,
                format: 'HTML/PDF',
                pages: 18
            },
            {
                id: 'week4',
                title: 'Risk Management Masterclass',
                description: 'Comprehensive guide to investment risk mitigation',
                url: '/public/brochures/risk-management.html',
                deliveryWeek: 4,
                format: 'HTML/PDF',
                pages: 20
            },
            {
                id: 'month2',
                title: 'African Fintech Revolution Report',
                description: 'Deep analysis of African fintech landscape',
                url: '/public/brochures/fintech-report.html',
                deliveryWeek: 8,
                format: 'HTML/PDF',
                pages: 35
            },
            {
                id: 'month3',
                title: 'Green Energy Investment Guide',
                description: 'Renewable energy opportunities across Africa',
                url: '/public/brochures/green-energy.html',
                deliveryWeek: 12,
                format: 'HTML/PDF',
                pages: 28
            }
        ];
        
        this.init();
    }
    
    /**
     * Initialize the delivery system
     */
    init() {
        this.checkMembershipStatus();
        this.setupEventListeners();
    }
    
    /**
     * Check user's membership status and delivery eligibility
     */
    async checkMembershipStatus() {
        try {
            const response = await fetch('/api/user/membership-status', {
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            
            if (!response.ok) {
                console.log('User not authenticated or not premium member');
                return;
            }
            
            const membershipData = await response.json();
            
            if (membershipData.isPremium) {
                this.calculateDeliveries(membershipData);
            }
        } catch (error) {
            console.error('Error checking membership:', error);
        }
    }
    
    /**
     * Calculate which brochures to deliver based on subscription duration
     */
    calculateDeliveries(membershipData) {
        const subscriptionStartDate = new Date(membershipData.subscriptionStartDate);
        const currentDate = new Date();
        const weeksSubscribed = Math.floor((currentDate - subscriptionStartDate) / (1000 * 60 * 60 * 24 * 7));
        
        // Get eligible brochures
        const eligibleBrochures = this.brochures.filter(b => b.deliveryWeek <= weeksSubscribed);
        
        // Display available brochures
        this.displayBrochures(eligibleBrochures, weeksSubscribed);
        
        // Check for new brochures to notify about
        this.checkNewDeliveries(eligibleBrochures, membershipData.lastNotificationDate);
    }
    
    /**
     * Display available brochures in the UI
     */
    displayBrochures(brochures, weeksSubscribed) {
        const container = document.getElementById('premium-brochures-container');
        if (!container) return;
        
        const html = `
            <div class="brochure-library">
                <div class="library-header">
                    <h2>📚 Your Premium Brochure Library</h2>
                    <p>You've been a member for <strong>${weeksSubscribed} weeks</strong> and have access to <strong>${brochures.length}</strong> exclusive brochures</p>
                </div>
                
                <div class="brochure-grid">
                    ${brochures.map(b => this.renderBrochureCard(b)).join('')}
                </div>
                
                ${this.renderUpcomingBrochures(weeksSubscribed)}
            </div>
        `;
        
        container.innerHTML = html;
    }
    
    /**
     * Render a single brochure card
     */
    renderBrochureCard(brochure) {
        return `
            <div class="brochure-card" data-brochure-id="${brochure.id}">
                <div class="brochure-icon">📊</div>
                <h3>${brochure.title}</h3>
                <p>${brochure.description}</p>
                
                <div class="brochure-meta">
                    <span class="meta-item">
                        <i class="fas fa-file-alt"></i> ${brochure.pages} pages
                    </span>
                    <span class="meta-item">
                        <i class="fas fa-download"></i> ${brochure.format}
                    </span>
                </div>
                
                <div class="brochure-actions">
                    <button class="btn-view" onclick="brochureSystem.viewBrochure('${brochure.id}')">
                        <i class="fas fa-eye"></i> View Online
                    </button>
                    <button class="btn-download" onclick="brochureSystem.downloadBrochure('${brochure.id}')">
                        <i class="fas fa-download"></i> Download PDF
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Render upcoming brochures section
     */
    renderUpcomingBrochures(weeksSubscribed) {
        const upcoming = this.brochures.filter(b => b.deliveryWeek > weeksSubscribed);
        
        if (upcoming.length === 0) {
            return '<div class="all-unlocked"><h3>🎉 You\'ve unlocked all available brochures!</h3><p>New content added monthly for continued members.</p></div>';
        }
        
        return `
            <div class="upcoming-section">
                <h3>🔒 Coming Soon</h3>
                <p>Stay subscribed to unlock these upcoming brochures:</p>
                
                <div class="upcoming-list">
                    ${upcoming.slice(0, 3).map(b => `
                        <div class="upcoming-item">
                            <div class="unlock-badge">Week ${b.deliveryWeek}</div>
                            <div class="upcoming-info">
                                <h4>${b.title}</h4>
                                <p>${b.description}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    /**
     * Check for new brochures since last notification
     */
    async checkNewDeliveries(eligibleBrochures, lastNotificationDate) {
        const lastNotified = lastNotificationDate ? new Date(lastNotificationDate) : new Date(0);
        
        const newBrochures = eligibleBrochures.filter(b => {
            // Check if brochure was added after last notification
            return true; // Simplified - actual implementation would check delivery dates
        });
        
        if (newBrochures.length > 0) {
            this.showNewBrochureNotification(newBrochures);
        }
    }
    
    /**
     * Show notification for new brochures
     */
    showNewBrochureNotification(newBrochures) {
        const notification = document.createElement('div');
        notification.className = 'brochure-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">🎁</div>
                <div class="notification-text">
                    <h4>New Premium Content Unlocked!</h4>
                    <p>You have ${newBrochures.length} new brochure(s) available in your library.</p>
                </div>
                <button class="btn-view-now" onclick="brochureSystem.scrollToBrochures()">
                    View Now
                </button>
                <button class="btn-close" onclick="this.parentElement.parentElement.remove()">
                    ×
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-dismiss after 10 seconds
        setTimeout(() => notification.remove(), 10000);
    }
    
    /**
     * View brochure online
     */
    viewBrochure(brochureId) {
        const brochure = this.brochures.find(b => b.id === brochureId);
        if (brochure) {
            window.open(brochure.url, '_blank');
            
            // Track view event
            this.trackEvent('brochure_view', { brochure_id: brochureId, brochure_title: brochure.title });
        }
    }
    
    /**
     * Download brochure as PDF
     */
    async downloadBrochure(brochureId) {
        const brochure = this.brochures.find(b => b.id === brochureId);
        if (!brochure) return;
        
        try {
            // Show loading state
            const button = event.target;
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PDF...';
            button.disabled = true;
            
            // Request PDF generation
            const response = await fetch(`/api/brochures/${brochureId}/pdf`, {
                headers: {
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });
            
            if (!response.ok) throw new Error('PDF generation failed');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${brochure.title.replace(/\s+/g, '-')}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            // Restore button
            button.innerHTML = originalText;
            button.disabled = false;
            
            // Track download event
            this.trackEvent('brochure_download', { brochure_id: brochureId, brochure_title: brochure.title });
            
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download brochure. Please try again or contact support.');
        }
    }
    
    /**
     * Scroll to brochures section
     */
    scrollToBrochures() {
        const container = document.getElementById('premium-brochures-container');
        if (container) {
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
    /**
     * Get authentication token
     */
    getAuthToken() {
        return localStorage.getItem('si_token') || sessionStorage.getItem('si_token') || '';
    }
    
    /**
     * Track analytics event
     */
    async trackEvent(eventName, eventData) {
        try {
            await fetch('/api/analytics/track', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({
                    event: eventName,
                    data: eventData,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (error) {
            console.error('Analytics tracking failed:', error);
        }
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for membership updates
        window.addEventListener('membership-updated', () => {
            this.checkMembershipStatus();
        });
        
        // Periodic check for new content (every 6 hours)
        setInterval(() => {
            this.checkMembershipStatus();
        }, 6 * 60 * 60 * 1000);
    }
}

// Initialize the brochure delivery system
const brochureSystem = new BrochureDeliverySystem();

// Add CSS for brochure display
const brochureStyles = document.createElement('style');
brochureStyles.textContent = `
    .brochure-library {
        max-width: 1200px;
        margin: 40px auto;
        padding: 0 20px;
    }
    
    .library-header {
        text-align: center;
        margin-bottom: 40px;
    }
    
    .library-header h2 {
        color: #0B1F33;
        font-size: 2rem;
        margin-bottom: 10px;
    }
    
    .library-header p {
        color: #64748b;
        font-size: 1.1rem;
    }
    
    .brochure-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 25px;
        margin-bottom: 50px;
    }
    
    .brochure-card {
        background: white;
        border-radius: 12px;
        padding: 25px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
        transition: all 0.3s;
    }
    
    .brochure-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
    }
    
    .brochure-icon {
        font-size: 3rem;
        text-align: center;
        margin-bottom: 15px;
    }
    
    .brochure-card h3 {
        color: #0B1F33;
        font-size: 1.2rem;
        margin-bottom: 10px;
        font-weight: 700;
    }
    
    .brochure-card p {
        color: #64748b;
        font-size: 0.95rem;
        margin-bottom: 15px;
    }
    
    .brochure-meta {
        display: flex;
        gap: 15px;
        margin-bottom: 20px;
        padding-top: 15px;
        border-top: 1px solid #e2e8f0;
    }
    
    .meta-item {
        color: #64748b;
        font-size: 0.85rem;
        display: flex;
        align-items: center;
        gap: 5px;
    }
    
    .brochure-actions {
        display: flex;
        gap: 10px;
    }
    
    .btn-view, .btn-download {
        flex: 1;
        padding: 10px 15px;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
        font-size: 0.9rem;
    }
    
    .btn-view {
        background: #0891b2;
        color: white;
    }
    
    .btn-view:hover {
        background: #0e7490;
        transform: translateY(-2px);
    }
    
    .btn-download {
        background: #D4AF37;
        color: #0B1F33;
    }
    
    .btn-download:hover {
        background: #f4d03f;
        transform: translateY(-2px);
    }
    
    .upcoming-section {
        background: white;
        border-radius: 12px;
        padding: 30px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    }
    
    .upcoming-section h3 {
        color: #0B1F33;
        margin-bottom: 10px;
    }
    
    .upcoming-list {
        margin-top: 20px;
    }
    
    .upcoming-item {
        display: flex;
        gap: 20px;
        padding: 20px;
        background: #f8fafc;
        border-radius: 8px;
        margin-bottom: 15px;
    }
    
    .unlock-badge {
        background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-weight: 700;
        font-size: 0.85rem;
        white-space: nowrap;
        height: fit-content;
    }
    
    .upcoming-info h4 {
        color: #0B1F33;
        margin-bottom: 5px;
        font-size: 1.1rem;
    }
    
    .upcoming-info p {
        color: #64748b;
        font-size: 0.9rem;
    }
    
    .all-unlocked {
        text-align: center;
        padding: 60px 20px;
        background: linear-gradient(135deg, #D4AF37 0%, #f4d03f 100%);
        border-radius: 12px;
        color: #0B1F33;
    }
    
    .brochure-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        padding: 20px;
        max-width: 400px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    }
    
    @keyframes slideIn {
        from { transform: translateX(420px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    .notification-content {
        display: flex;
        gap: 15px;
        align-items: center;
    }
    
    .notification-icon {
        font-size: 2.5rem;
    }
    
    .notification-text h4 {
        color: #0B1F33;
        margin-bottom: 5px;
    }
    
    .notification-text p {
        color: #64748b;
        font-size: 0.9rem;
    }
    
    .btn-view-now {
        background: #D4AF37;
        color: #0B1F33;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
    }
    
    .btn-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        color: #64748b;
        cursor: pointer;
        padding: 0 5px;
    }
`;
document.head.appendChild(brochureStyles);
