class InvestmentCalculator {
    constructor() {
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.getElementById('calcCompoundInterest')?.addEventListener('click', () => this.calculateCompound());
        document.getElementById('calcFutureValue')?.addEventListener('click', () => this.calculateFuture());
        document.getElementById('calcROI')?.addEventListener('click', () => this.calculateROI());
    }

    async calculateCompound() {
        const principal = parseFloat(document.getElementById('principal').value);
        const rate = parseFloat(document.getElementById('rate').value);
        const years = parseInt(document.getElementById('years').value);
        const frequency = parseInt(document.getElementById('frequency').value);

        if (this.validateInputs(principal, rate, years)) {
            try {
                const response = await fetch('/api/calculation/compound-interest', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ principal, rate, years, compoundingFrequency: frequency })
                });

                const result = await response.json();
                
                document.getElementById('result').innerHTML = `
                    <div class="alert alert-success">
                        <h4>Investment Growth</h4>
                        <p><strong>Initial Investment:</strong> ${this.formatCurrency(principal)}</p>
                        <p><strong>Final Amount:</strong> ${this.formatCurrency(result.futureValue)}</p>
                        <p><strong>Interest Earned:</strong> ${this.formatCurrency(result.gain)}</p>
                        <p><strong>Return:</strong> ${((result.gain / principal) * 100).toFixed(2)}%</p>
                    </div>
                `;
            } catch (error) {
                console.error('Calculation error:', error);
            }
        }
    }

    async calculateFuture() {
        const principal = parseFloat(document.getElementById('fvPrincipal').value);
        const monthly = parseFloat(document.getElementById('monthlyContribution').value);
        const rate = parseFloat(document.getElementById('fvRate').value);
        const years = parseInt(document.getElementById('fvYears').value);

        try {
            const response = await fetch('/api/calculation/future-value', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ principal, monthlyContribution: monthly, annualRate: rate, years })
            });

            const result = await response.json();
            const totalContributed = principal + (monthly * years * 12);
            const totalGain = result.futureValue - totalContributed;

            document.getElementById('fvResult').innerHTML = `
                <div class="alert alert-info">
                    <h4>Future Value Projection</h4>
                    <p><strong>Future Value:</strong> ${this.formatCurrency(result.futureValue)}</p>
                    <p><strong>Total Contributed:</strong> ${this.formatCurrency(totalContributed)}</p>
                    <p><strong>Investment Gain:</strong> ${this.formatCurrency(totalGain)}</p>
                </div>
            `;
        } catch (error) {
            console.error('Calculation error:', error);
        }
    }

    async calculateROI() {
        const initial = parseFloat(document.getElementById('initialInvestment').value);
        const current = parseFloat(document.getElementById('currentValue').value);
        const years = parseInt(document.getElementById('roiYears').value);

        try {
            const response = await fetch('/api/calculation/roi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ initialInvestment: initial, currentValue: current, years })
            });

            const result = await response.json();

            document.getElementById('roiResult').innerHTML = `
                <div class="alert alert-success">
                    <h4>Return on Investment Analysis</h4>
                    <p><strong>Total Return:</strong> ${this.formatCurrency(result.totalReturn)}</p>
                    <p><strong>Simple ROI:</strong> ${result.simpleROI.toFixed(2)}%</p>
                    <p><strong>CAGR:</strong> ${result.cagr.toFixed(2)}%</p>
                </div>
            `;
        } catch (error) {
            console.error('Calculation error:', error);
        }
    }

    validateInputs(...values) {
        return values.every(v => !isNaN(v) && v > 0);
    }

    formatCurrency(amount, currency = 'ZAR') {
        return new Intl.NumberFormat('en-ZA', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }
}

// Initialize calculator when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new InvestmentCalculator();
});
