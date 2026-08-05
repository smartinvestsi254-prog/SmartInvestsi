# Trading Graphs Enhancement - TODO Steps
Status: 🚀 In Progress

## Breakdown from Approved Plan

### 1. Create Shared JS Library ✅
- [x] Create public/js/trading-charts.js with common functions (toggleStudy, changeTimeframe, syncCharts)

### 2. Update CSS ✅
- [x] Add .indicator-panel, .ta-toggle, .timeframe-bar classes to public/css/trading-ui.css

### 3. Backend TA Endpoint ✅
- [x] Extend netlify/functions/crypto-trading.ts: Add /ta/indicators endpoint (SMA20/50/200, EMA12/26, RSI14, MACD, BB20)

### 4. Core Trading Pages
- [ ] crypto-trading.html: Add indicator toolbar, sync selectors, TA summary
- [ ] spot-trading.html: Advanced TV config + indicators sidebar
- [ ] futures-trading.html: Funding/liquidation + indicator toggles

**Next Step: Enhance crypto-trading.html**

### 2. Update CSS ✅
- [ ] Add .indicator-panel, .ta-toggle, .timeframe-bar classes to public/css/trading-ui.css

### 3. Backend TA Endpoint
- [ ] Extend netlify/functions/crypto-trading.ts: Add /ta/indicators endpoint (MA/RSI/MACD on OHLC)

### 4. Core Trading Pages
- [ ] crypto-trading.html: Add indicator toolbar, sync selectors
- [ ] spot-trading.html: Advanced TV config + indicators sidebar
- [ ] futures-trading.html: Funding/liquidation + indicator toggles

### 5. Testing & Demo
- [ ] Test toggles/timeframes on all pages
- [ ] Verify mobile responsiveness
- [ ] Demo: open spot-trading.html

**Next Step: Create public/js/trading-charts.js**

