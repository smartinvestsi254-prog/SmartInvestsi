(function () {
  const el = id => document.getElementById(id);
  const fmt = n => n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

  function parseInputs() {
    const initial = Math.max(0, parseFloat(el('initial').value || '0'));
    const monthly = Math.max(0, parseFloat(el('monthly').value || '0'));
    const years = Math.max(1, parseInt(el('years').value || '1', 10));
    const rAnnual = parseFloat(el('returnPct').value || '0') / 100;
    const feesAnnual = Math.max(0, parseFloat(el('feesPct').value || '0')) / 100;
    const infAnnual = Math.max(0, parseFloat(el('inflationPct').value || '0')) / 100;

    const rMonthlyNominal = Math.pow(1 + rAnnual, 1 / 12) - 1;
    const feesMonthly = Math.pow(1 + feesAnnual, 1 / 12) - 1;
    const infMonthly = Math.pow(1 + infAnnual, 1 / 12) - 1;

    const netMonthly = ((1 + rMonthlyNominal) * (1 - feesMonthly)) / (1 + infMonthly) - 1;

    return { initial, monthly, years, netMonthly };
  }

  window.runCalculation = function () {
    const { initial, monthly, years, netMonthly } = parseInputs();

    let balance = initial;
    let totalContrib = 0;
    let totalInterest = 0;

    const rows = [];
    let yearInterest = 0;
    let yearContrib = 0;

    for (let m = 1; m <= years * 12; m++) {
      balance += monthly;
      yearContrib += monthly;
      totalContrib += monthly;

      const interest = balance * netMonthly;
      balance += interest;

      yearInterest += interest;
      totalInterest += interest;

      if (m % 12 === 0) {
        const year = m / 12;
        rows.push({
          year,
          endBalance: balance,
          contribYear: yearContrib,
          interestYear: yearInterest
        });
        yearInterest = 0;
        yearContrib = 0;
      }
    }

    el('summary').innerHTML = `
      <div class="space-y-1">
        <div><strong>Final Balance:</strong> ${fmt(balance)}</div>
        <div><strong>Total Contributed:</strong> ${fmt(totalContrib)}</div>
        <div><strong>Total Interest (real):</strong> ${fmt(totalInterest)}</div>
      </div>
    `;

    const tbody = el('yearlyRows');
    tbody.innerHTML = rows.map(r => `
      <tr>
        <td class="py-1 px-2">${r.year}</td>
        <td class="py-1 px-2">${fmt(r.endBalance)}</td>
        <td class="py-1 px-2">${fmt(r.contribYear)}</td>
        <td class="py-1 px-2">${fmt(r.interestYear)}</td>
      </tr>
    `).join('');
  };

  window.resetForm = function () {
    el('initial').value = 1000;
    el('monthly').value = 100;
    el('returnPct').value = 8;
    el('years').value = 10;
    el('feesPct').value = 1;
    el('inflationPct').value = 5;
    el('summary').textContent = 'Fill parameters and calculate.';
    el('yearlyRows').innerHTML = '';
  };

  window.exportCSV = function () {
    const { initial, monthly, years, netMonthly } = parseInputs();
    let balance = initial;
    let yearInterest = 0;
    let yearContrib = 0;
    const lines = ['Year,End Balance,Contrib (Y),Interest (Y)'];

    for (let m = 1; m <= years * 12; m++) {
      balance += monthly;
      yearContrib += monthly;
      const interest = balance * netMonthly;
      balance += interest;
      yearInterest += interest;

      if (m % 12 === 0) {
        const year = m / 12;
        lines.push([
          year,
          balance.toFixed(2),
          yearContrib.toFixed(2),
          yearInterest.toFixed(2)
        ].join(','));
        yearInterest = 0;
        yearContrib = 0;
      }
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'investment-calculator.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
})();