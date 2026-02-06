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

function calculatePreview() {
  const entry = parseFloat(document.getElementById("entry").value);
  const sl = parseFloat(document.getElementById("sl").value);
  
  if (!entry || !sl || entry <= 0 || sl <= 0) {
    document.getElementById('slPercent').innerText = '-';
    document.getElementById('qtyPreview').innerText = '-';
    document.getElementById('riskPreview').innerText = '-';
    return;
  }
  
  const slDistance = Math.abs(entry - sl);
  const slPercent = (slDistance / entry) * 100;
  const riskAmount = capital * (riskPerTrade / 100);
  const qty = Math.floor(riskAmount / slDistance);
  const totalRisk = slDistance * qty;
  
  document.getElementById('slPercent').innerText = `${slPercent.toFixed(2)}%`;
  document.getElementById('qtyPreview').innerText = qty;
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

  trades.forEach(t => {
    const risk = Math.abs(t.entry - t.sl) * t.qty;
    totalRisk += risk;
    
    const slPercent = t.slPercent || ((Math.abs(t.entry - t.sl) / t.entry) * 100);

    body.innerHTML += `
      <tr>
        <td><strong>${t.symbol}</strong></td>
        <td>₹${t.entry.toFixed(2)}</td>
        <td>₹${t.ltp.toFixed(2)}</td>
        <td>₹${t.sl.toFixed(2)}</td>
        <td>${slPercent.toFixed(2)}%</td>
        <td><strong>${t.qty}</strong></td>
        <td>₹${risk.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
        <td><button class="exit-btn" onclick="exitTrade('${t.id}')">Exit</button></td>
      </tr>`;
  });

  const portfolioRiskPct = (totalRisk / capital) * 100;
  document.getElementById("portfolioRisk").innerText =
    `₹${totalRisk.toLocaleString('en-IN', {maximumFractionDigits: 0})} (${portfolioRiskPct.toFixed(2)}%)`;

  if (portfolioRiskPct > 5) notifyRisk();
}

function renderClosedTrades() {
  const body = document.getElementById("closedPositionsBody");
  body.innerHTML = "";

  if (closedTrades.length === 0) {
    body.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #64748b;">No closed positions yet</td></tr>';
    return;
  }

  closedTrades.forEach(t => {
    const pnl = (t.exit - t.entry) * t.qty;
    const pnlPercent = ((t.exit - t.entry) / t.entry) * 100;
    const pnlClass = pnl >= 0 ? 'profit' : 'loss';

    body.innerHTML += `
      <tr class="${pnlClass}">
        <td><strong>${t.symbol}</strong></td>
        <td>₹${t.entry.toFixed(2)}</td>
        <td>₹${t.exit.toFixed(2)}</td>
        <td>${t.qty}</td>
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

