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
const TRADES_COLLECTION = "trades";
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
      </tr>`;
  });

  const portfolioRiskPct = (totalRisk / capital) * 100;
  document.getElementById("portfolioRisk").innerText =
    `₹${totalRisk.toLocaleString('en-IN', {maximumFractionDigits: 0})} (${portfolioRiskPct.toFixed(2)}%)`;

  if (portfolioRiskPct > 5) notifyRisk();
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

function notifyRisk() {
  alert("⚠️ Portfolio risk exceeds 5%!");
}

// Initialize app
loadSettings();
loadTrades();

