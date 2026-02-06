let trades = [];
let capital = 10000000;

function addTrade() {
  const entry = +document.getElementById("entry").value;
  const sl = +document.getElementById("sl").value;
  const riskPct = +document.getElementById("riskPercent").value;
  const symbol = document.getElementById("symbol").value;
  const notes = document.getElementById("notes").value;

  const riskAmount = capital * (riskPct / 100);
  const qty = Math.floor(riskAmount / Math.abs(entry - sl));

  const trade = {
    symbol, entry, sl, qty, notes,
    rMultiple: 0,
    ltp: entry
  };

  trades.push(trade);
  renderTrades();
}

function renderTrades() {
  const body = document.getElementById("positionsBody");
  body.innerHTML = "";

  let totalRisk = 0;

  trades.forEach(t => {
    const risk = (t.entry - t.sl) * t.qty;
    totalRisk += risk;

    body.innerHTML += `
      <tr>
        <td>${t.symbol}</td>
        <td>${t.entry}</td>
        <td>${t.ltp}</td>
        <td>${t.sl}</td>
        <td>${t.qty}</td>
        <td>${(risk / (capital * 0.01)).toFixed(2)}R</td>
      </tr>`;
  });

  document.getElementById("portfolioRisk").innerText =
    `₹${totalRisk.toFixed(0)} (${((totalRisk/capital)*100).toFixed(2)}%)`;

  if (totalRisk > capital * 0.05) notifyRisk();
}
