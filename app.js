// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDWvLCgOPc4Ae6Ei1iK2KscIKqMxYAX_3I",
  authDomain: "swing-risk-tracker.firebaseapp.com",
  projectId: "swing-risk-tracker",
  storageBucket: "swing-risk-tracker.firebasestorage.app",
  messagingSenderId: "256506757099",
  appId: "1:256506757099:web:4074e24612b98ee7e123ae"
};

// Initialize Firebase (using compat mode)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let trades = [];
let closedTrades = [];
const TRADES_COLLECTION = "trades";
const CLOSED_TRADES_COLLECTION = "closedTrades";
const SETTINGS_DOC = "settings/userSettings";

// Default settings
let capital = 1000000;
let riskPerTrade = 2;

// Load settings from localStorage or use defaults
function loadSettings() {
  const savedCapital = localStorage.getItem('capital');
  const savedRiskPerTrade = localStorage.getItem('riskPerTrade');
  
  if (savedCapital) capital = parseFloat(savedCapital);
  if (savedRiskPerTrade) riskPerTrade = parseFloat(savedRiskPerTrade);
  
  document.getElementById('capitalInput').value = capital;
  document.getElementById('riskPerTradeInput').value = riskPerTrade;
  updateMaxRiskDisplay();
}

function updateCapital() {
  capital = parseFloat(document.getElementById('capitalInput').value) || 0;
  localStorage.setItem('capital', capital);
  updateMaxRiskDisplay();
  calculatePreview();
  renderTrades();
}

function updateRiskPerTrade() {
  riskPerTrade = parseFloat(document.getElementById('riskPerTradeInput').value) || 0;
  localStorage.setItem('riskPerTrade', riskPerTrade);
  updateMaxRiskDisplay();
  calculatePreview();
}

function updateMaxRiskDisplay() {
  const maxRisk = capital * (riskPerTrade / 100);
  document.getElementById('maxRiskAmount').innerText = `₹${maxRisk.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
}

// Helper function to format date
function formatDate(timestamp) {
  if (!timestamp) return '-';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Helper function to calculate holding days
function calculateHoldingDays(entryDate) {
  if (!entryDate) return 0;
  const entry = entryDate.toDate ? entryDate.toDate() : new Date(entryDate);
  const today = new Date();
  const diffTime = Math.abs(today - entry);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function calculatePreview() {
  const entry = parseFloat(document.getElementById("entry").value);
  const sl = parseFloat(document.getElementById("sl").value);
  
  if (!entry || !sl || entry <= 0 || sl <= 0) {
    document.getElementById('slPercent').innerText = '-';
    document.getElementById('qtyPreview').innerText = '-';
    document.getElementById('investPreview').innerText = '-';
    document.getElementById('riskPreview').innerText = '-';
    return;
  }
  
  const slDistance = Math.abs(entry - sl);
  const slPercent = (slDistance / entry) * 100;
  const riskAmount = capital * (riskPerTrade / 100);
  const qty = Math.floor(riskAmount / slDistance);
  const totalRisk = slDistance * qty;
  const invested = entry * qty;
  
  document.getElementById('slPercent').innerText = `${slPercent.toFixed(2)}%`;
  document.getElementById('qtyPreview').innerText = qty;
  document.getElementById('investPreview').innerText = `₹${invested.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
  document.getElementById('riskPreview').innerText = `₹${totalRisk.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
}

function addTrade() {
  const entry = parseFloat(document.getElementById("entry").value);
  const sl = parseFloat(document.getElementById("sl").value);
  const symbol = document.getElementById("symbol").value.trim().toUpperCase();

  if (!symbol || !entry || !sl) {
    alert('Please fill in Stock Symbol, Entry Price, and Stop Loss');
    return;
  }

  if (entry <= 0 || sl <= 0) {
    alert('Entry and Stop Loss must be positive numbers');
    return;
  }

  const slDistance = Math.abs(entry - sl);
  const slPercent = (slDistance / entry) * 100;
  const riskAmount = capital * (riskPerTrade / 100);
  const qty = Math.floor(riskAmount / slDistance);

  if (qty <= 0) {
    alert('Calculated quantity is 0. Adjust your risk parameters or entry/SL values.');
    return;
  }

  const trade = {
    symbol,
    entry,
    sl,
    slPercent,
    qty,
    ltp: entry,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  db.collection(TRADES_COLLECTION).add(trade).then(() => {
    // Clear form
    document.getElementById("symbol").value = '';
    document.getElementById("entry").value = '';
    document.getElementById("sl").value = '';
    calculatePreview();
    loadTrades();
  }).catch(err => {
    alert('Error adding trade: ' + err.message);
  });
}


function renderTrades() {
  const body = document.getElementById("positionsBody");
  body.innerHTML = "";

  let totalRisk = 0;
  let totalDeployed = 0;

  trades.forEach(t => {
    const risk = Math.abs(t.entry - t.sl) * t.qty;
    const invested = t.entry * t.qty;
    totalRisk += risk;
    totalDeployed += invested;
    
    const slPercent = t.slPercent || ((Math.abs(t.entry - t.sl) / t.entry) * 100);
    const entryDate = formatDate(t.createdAt);
    const holdingDays = calculateHoldingDays(t.createdAt);

    body.innerHTML += `
      <tr>
        <td><strong>${t.symbol}</strong></td>
        <td>${entryDate}</td>
        <td>${holdingDays}</td>
        <td>₹${t.entry.toFixed(2)}</td>
        <td>₹${t.ltp.toFixed(2)}</td>
        <td><input type="number" class="sl-input" value="${t.sl.toFixed(2)}" step="0.01" onchange="updateSL('${t.id}', this.value)" /></td>
        <td id="slPercent-${t.id}">${slPercent.toFixed(2)}%</td>
        <td><strong>${t.qty}</strong></td>
        <td>₹${invested.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
        <td id="risk-${t.id}">₹${risk.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
        <td><button class="exit-btn" onclick="exitTrade('${t.id}')">Exit</button></td>
      </tr>`;
  });

  const portfolioRiskPct = (totalRisk / capital) * 100;
  document.getElementById("portfolioRisk").innerText =
    `₹${totalRisk.toLocaleString('en-IN', {maximumFractionDigits: 0})} (${portfolioRiskPct.toFixed(2)}%)`;

  document.getElementById("deployedCapital").innerText =
    `₹${totalDeployed.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;

  if (portfolioRiskPct > 5) notifyRisk();
}

function updateSL(tradeId, newSL) {
  const sl = parseFloat(newSL);
  
  if (isNaN(sl) || sl <= 0) {
    alert('Please enter a valid stop loss value');
    loadTrades(); // Reload to reset the input
    return;
  }

  const trade = trades.find(t => t.id === tradeId);
  if (!trade) {
    alert('Trade not found');
    return;
  }

  // Calculate new values
  const slDistance = Math.abs(trade.entry - sl);
  const slPercent = (slDistance / trade.entry) * 100;
  const risk = slDistance * trade.qty;

  // Update in Firebase
  db.collection(TRADES_COLLECTION).doc(tradeId).update({
    sl: sl,
    slPercent: slPercent
  })
  .then(() => {
    // Update local display
    document.getElementById(`slPercent-${tradeId}`).innerText = `${slPercent.toFixed(2)}%`;
    document.getElementById(`risk-${tradeId}`).innerText = `₹${risk.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
    
    // Reload to update portfolio risk
    loadTrades();
  })
  .catch(err => {
    alert('Error updating stop loss: ' + err.message);
    loadTrades(); // Reload to reset
  });
}

function renderClosedTrades() {
  const body = document.getElementById("closedPositionsBody");
  body.innerHTML = "";

  if (closedTrades.length === 0) {
    body.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #64748b;">No closed positions yet</td></tr>';
    return;
  }

  closedTrades.forEach(t => {
    const pnl = (t.exit - t.entry) * t.qty;
    const pnlPercent = ((t.exit - t.entry) / t.entry) * 100;
    const invested = t.entry * t.qty;
    const pnlClass = pnl >= 0 ? 'profit' : 'loss';
    const entryDate = formatDate(t.entryDate);
    const exitDate = formatDate(t.exitDate);

    body.innerHTML += `
      <tr class="${pnlClass}">
        <td><strong>${t.symbol}</strong></td>
        <td>${entryDate}</td>
        <td>${exitDate}</td>
        <td>₹${t.entry.toFixed(2)}</td>
        <td>₹${t.exit.toFixed(2)}</td>
        <td>${t.qty}</td>
        <td>₹${invested.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
        <td class="${pnlClass}-text">₹${pnl.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
        <td class="${pnlClass}-text">${pnlPercent.toFixed(2)}%</td>
      </tr>`;
  });
}

function exitTrade(tradeId) {
  const trade = trades.find(t => t.id === tradeId);
  if (!trade) {
    alert('Trade not found');
    return;
  }

  const exitPrice = prompt(`Exit ${trade.symbol}\nEntry: ₹${trade.entry}\nQuantity: ${trade.qty}\n\nEnter Exit Price:`);
  
  if (!exitPrice) return; // User cancelled
  
  const exit = parseFloat(exitPrice);
  
  if (isNaN(exit) || exit <= 0) {
    alert('Please enter a valid exit price');
    return;
  }

  const pnl = (exit - trade.entry) * trade.qty;
  const pnlPercent = ((exit - trade.entry) / trade.entry) * 100;

  // Confirm the exit
  const confirmMsg = `Exit Confirmation:\n\nStock: ${trade.symbol}\nEntry: ₹${trade.entry}\nExit: ₹${exit}\nQuantity: ${trade.qty}\n\nP&L: ₹${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)\n\nConfirm exit?`;
  
  if (!confirm(confirmMsg)) return;

  // Create closed trade record
  const closedTrade = {
    symbol: trade.symbol,
    entry: trade.entry,
    exit: exit,
    sl: trade.sl,
    slPercent: trade.slPercent,
    qty: trade.qty,
    pnl: pnl,
    pnlPercent: pnlPercent,
    entryDate: trade.createdAt,
    exitDate: firebase.firestore.FieldValue.serverTimestamp()
  };

  // Add to closed trades collection and delete from open trades
  db.collection(CLOSED_TRADES_COLLECTION).add(closedTrade)
    .then(() => {
      return db.collection(TRADES_COLLECTION).doc(tradeId).delete();
    })
    .then(() => {
      loadTrades();
      loadClosedTrades();
    })
    .catch(err => {
      alert('Error exiting trade: ' + err.message);
    });
}

function loadTrades() {
  db.collection(TRADES_COLLECTION)
    .orderBy("createdAt", "asc")
    .get()
    .then(snapshot => {
      trades = [];
      snapshot.forEach(doc => {
        trades.push({ id: doc.id, ...doc.data() });
      });
      renderTrades();
    })
    .catch(err => {
      console.error('Error loading trades:', err);
    });
}

function loadClosedTrades() {
  db.collection(CLOSED_TRADES_COLLECTION)
    .orderBy("exitDate", "desc")
    .get()
    .then(snapshot => {
      closedTrades = [];
      snapshot.forEach(doc => {
        closedTrades.push({ id: doc.id, ...doc.data() });
      });
      renderClosedTrades();
      calculateMetrics();
      renderGrowthChart();
    })
    .catch(err => {
      console.error('Error loading closed trades:', err);
    });
}

function calculateMetrics() {
  if (closedTrades.length === 0) {
    document.getElementById('totalTrades').innerText = '0';
    document.getElementById('winRate').innerText = '0%';
    document.getElementById('lossRate').innerText = '0%';
    document.getElementById('totalPnL').innerText = '₹0';
    document.getElementById('avgProfit').innerText = '₹0';
    document.getElementById('avgLoss').innerText = '₹0';
    document.getElementById('maxProfit').innerText = '₹0';
    document.getElementById('maxLoss').innerText = '₹0';
    document.getElementById('winLossRatio').innerText = '0';
    document.getElementById('profitFactor').innerText = '0';
    return;
  }

  const total = closedTrades.length;
  const wins = closedTrades.filter(t => t.pnl > 0);
  const losses = closedTrades.filter(t => t.pnl < 0);
  
  const totalWins = wins.length;
  const totalLosses = losses.length;
  const winRate = (totalWins / total) * 100;
  const lossRate = (totalLosses / total) * 100;

  const totalPnL = closedTrades.reduce((sum, t) => sum + t.pnl, 0);
  
  const avgProfit = totalWins > 0 ? wins.reduce((sum, t) => sum + t.pnl, 0) / totalWins : 0;
  const avgLoss = totalLosses > 0 ? losses.reduce((sum, t) => sum + t.pnl, 0) / totalLosses : 0;
  
  const maxProfit = wins.length > 0 ? Math.max(...wins.map(t => t.pnl)) : 0;
  const maxLoss = losses.length > 0 ? Math.min(...losses.map(t => t.pnl)) : 0;
  
  const winLossRatio = totalLosses > 0 ? (totalWins / totalLosses).toFixed(2) : totalWins;
  
  const totalGross = wins.reduce((sum, t) => sum + t.pnl, 0);
  const totalLossAmount = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = totalLossAmount > 0 ? (totalGross / totalLossAmount).toFixed(2) : totalGross > 0 ? '∞' : '0';

  // Update DOM
  document.getElementById('totalTrades').innerText = total;
  document.getElementById('winRate').innerText = `${winRate.toFixed(1)}%`;
  document.getElementById('lossRate').innerText = `${lossRate.toFixed(1)}%`;
  
  const totalPnLElement = document.getElementById('totalPnL');
  totalPnLElement.innerText = `₹${totalPnL.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
  totalPnLElement.className = 'metric-value ' + (totalPnL >= 0 ? 'profit-text' : 'loss-text');
  
  document.getElementById('avgProfit').innerText = `₹${avgProfit.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
  document.getElementById('avgLoss').innerText = `₹${avgLoss.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
  document.getElementById('maxProfit').innerText = `₹${maxProfit.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
  document.getElementById('maxLoss').innerText = `₹${maxLoss.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
  document.getElementById('winLossRatio').innerText = winLossRatio;
  document.getElementById('profitFactor').innerText = profitFactor;
}

let growthChart = null;

function renderGrowthChart() {
  if (closedTrades.length === 0) {
    const ctx = document.getElementById('growthChart').getContext('2d');
    if (growthChart) growthChart.destroy();
    
    growthChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Start'],
        datasets: [{
          label: 'Account Balance',
          data: [capital],
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `Balance: ₹${context.parsed.y.toLocaleString('en-IN')}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            ticks: {
              color: '#94a3b8',
              callback: (value) => `₹${(value/1000).toFixed(0)}K`
            },
            grid: { color: 'rgba(255, 255, 255, 0.1)' }
          },
          x: {
            ticks: { color: '#94a3b8' },
            grid: { color: 'rgba(255, 255, 255, 0.1)' }
          }
        }
      }
    });
    return;
  }

  // Sort by exit date
  const sortedTrades = [...closedTrades].sort((a, b) => {
    const dateA = a.exitDate?.toDate ? a.exitDate.toDate() : new Date(a.exitDate);
    const dateB = b.exitDate?.toDate ? b.exitDate.toDate() : new Date(b.exitDate);
    return dateA - dateB;
  });

  // Calculate cumulative balance
  let balance = capital;
  const labels = ['Start'];
  const balances = [capital];

  sortedTrades.forEach((trade, index) => {
    balance += trade.pnl;
    labels.push(`Trade ${index + 1}`);
    balances.push(balance);
  });

  const ctx = document.getElementById('growthChart').getContext('2d');
  
  if (growthChart) growthChart.destroy();

  growthChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Account Balance',
        data: balances,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: balances.map((val, idx) => {
          if (idx === 0) return '#22c55e';
          const pnl = sortedTrades[idx - 1]?.pnl || 0;
          return pnl >= 0 ? '#22c55e' : '#ef4444';
        }),
        pointBorderColor: '#0f172a',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleColor: '#22c55e',
          bodyColor: '#e5e7eb',
          borderColor: '#22c55e',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          callbacks: {
            title: (context) => context[0].label,
            label: (context) => {
              const balance = context.parsed.y;
              const profit = balance - capital;
              const profitPct = ((profit / capital) * 100).toFixed(2);
              return [
                `Balance: ₹${balance.toLocaleString('en-IN', {maximumFractionDigits: 0})}`,
                `Profit: ₹${profit.toLocaleString('en-IN', {maximumFractionDigits: 0})} (${profitPct}%)`
              ];
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          ticks: {
            color: '#94a3b8',
            font: { size: 11 },
            callback: (value) => `₹${(value/1000).toFixed(0)}K`
          },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        x: {
          ticks: { 
            color: '#94a3b8',
            font: { size: 10 },
            maxRotation: 45,
            minRotation: 0
          },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        }
      }
    }
  });
}

function loadClosedTrades() {
  db.collection(CLOSED_TRADES_COLLECTION)
    .orderBy("exitDate", "desc")
    .get()
    .then(snapshot => {
      closedTrades = [];
      snapshot.forEach(doc => {
        closedTrades.push({ id: doc.id, ...doc.data() });
      });
      renderClosedTrades();
      calculateMetrics();
      renderGrowthChart();
    })
    .catch(err => {
      console.error('Error loading closed trades:', err);
    });
}

function notifyRisk() {
  alert("⚠️ Portfolio risk exceeds 5%!");
}

// Initialize app
loadSettings();
loadTrades();
loadClosedTrades();

