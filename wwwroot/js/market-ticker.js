// SmartInvest Market Ticker Functionality
document.addEventListener('DOMContentLoaded', function() {
    const ticker = document.getElementById('market-ticker');
    if (!ticker) return;
    
    // Simulated market data - replace with actual API in production
    const marketData = [
        { symbol: 'NSE ASI', change: '+0.45%', up: true },
        { symbol: 'JSE ALSI', change: '+0.22%', up: true },
        { symbol: 'NGX', change: '-0.15%', up: false },
        { symbol: 'KES', change: '+0.08%', up: true },
        { symbol: 'GHS', change: '-0.32%', up: false }
    ];
    
    function updateTicker() {
        const html = marketData.map(item => {
            const color = item.up ? '#22c55e' : '#ef4444';
            const arrow = item.up ? '▲' : '▼';
            return `<span style="margin: 0 15px;"><strong>${item.symbol}</strong> <span style="color:${color}">${arrow} ${item.change}</span></span>`;
        }).join('');
        ticker.innerHTML = html;
    }
    
    // Initial load
    updateTicker();
    
    // Update every 60 seconds
    setInterval(updateTicker, 60000);
});

