// market-ticker.js
// Simple rotating ticker for demo purposes
(function(){
    const data = [
        'NSE 20: +0.54%',
        'JSE All Share: -0.12%',
        'NGX ASI: +1.32%',
        'KRX KOSPI: +0.78%',
        'S&P 500: +0.25%'
    ];
    let idx = 0;
    const tickerEl = document.getElementById('market-ticker');
    if(!tickerEl) return;
    function update(){
        tickerEl.querySelector('span').textContent = data[idx];
        idx = (idx + 1) % data.length;
    }
    update();
    setInterval(update, 4000);
})();