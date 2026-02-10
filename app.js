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
const USERS_COLLECTION = "users";

// Authentication state
let currentUser = null;
const SESSION_STORAGE_KEY = 'currentUser';

// Simple password encoding (for basic security)
function encodePassword(password) {
  return btoa(password); // Base64 encoding
}

function decodePassword(encoded) {
  return atob(encoded); // Base64 decoding
}

// Initialize default user
async function initializeDefaultUser() {
  try {
    const usersSnapshot = await db.collection(USERS_COLLECTION).get();
    
    if (usersSnapshot.empty) {
      // Create default user
      await db.collection(USERS_COLLECTION).doc('akki').set({
        username: 'akki',
        password: encodePassword('akki@1'),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      addDebugLog('✅ Default user "akki" created', 'success');
    }
  } catch (error) {
    console.error('Error initializing default user:', error);
    addDebugLog('❌ Error initializing users: ' + error.message, 'error');
  }
}

// Check if user is logged in
function isLoggedIn() {
  return currentUser !== null;
}

// Login function
async function handleLogin(event) {
  event.preventDefault();
  
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorDiv = document.getElementById('loginError');
  
  if (!username || !password) {
    errorDiv.textContent = 'Please enter username and password';
    errorDiv.style.display = 'block';
    return;
  }
  
  try {
    const userDoc = await db.collection(USERS_COLLECTION).doc(username).get();
    
    if (!userDoc.exists) {
      errorDiv.textContent = 'Invalid username or password';
      errorDiv.style.display = 'block';
      return;
    }
    
    const userData = userDoc.data();
    const storedPassword = decodePassword(userData.password);
    
    if (password !== storedPassword) {
      errorDiv.textContent = 'Invalid username or password';
      errorDiv.style.display = 'block';
      return;
    }
    
    // Login successful
    currentUser = username;
    sessionStorage.setItem(SESSION_STORAGE_KEY, username);
    
    closeLoginModal();
    updateUIForAuthState();
    addDebugLog(`✅ User "${username}" logged in`, 'success');
    
    // Clear form
    document.getElementById('loginForm').reset();
    errorDiv.style.display = 'none';
    
  } catch (error) {
    console.error('Login error:', error);
    errorDiv.textContent = 'Login failed. Please try again.';
    errorDiv.style.display = 'block';
  }
}

// Logout function
function handleLogout() {
  currentUser = null;
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
  updateUIForAuthState();
  addDebugLog('👋 User logged out', 'info');
}

// Open/Close login modal
function openLoginModal() {
  document.getElementById('loginModal').style.display = 'block';
}

function closeLoginModal() {
  document.getElementById('loginModal').style.display = 'none';
  document.getElementById('loginError').style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
  const modal = document.getElementById('loginModal');
  if (event.target === modal) {
    closeLoginModal();
  }
}

// Update UI based on authentication state
function updateUIForAuthState() {
  const loginLogoutBtn = document.getElementById('loginLogoutBtn');
  const userDisplay = document.getElementById('userDisplay');
  
  if (isLoggedIn()) {
    // User is logged in
    loginLogoutBtn.textContent = 'Logout';
    loginLogoutBtn.className = 'logout-btn';
    loginLogoutBtn.onclick = handleLogout;
    
    userDisplay.textContent = `👤 ${currentUser}`;
    userDisplay.style.display = 'block';
    
    // Enable all controls
    enableControls();
    
  } else {
    // User is not logged in
    loginLogoutBtn.textContent = 'Login';
    loginLogoutBtn.className = 'login-btn';
    loginLogoutBtn.onclick = openLoginModal;
    
    userDisplay.style.display = 'none';
    
    // Disable all controls (view-only mode)
    disableControls();
  }
}

// Disable controls for view-only mode
function disableControls() {
  // Disable add trade section
  const addTradeInputs = document.querySelectorAll('#addTrade input, #addTrade button');
  addTradeInputs.forEach(el => {
    el.disabled = true;
    el.classList.add('disabled-for-view-only');
  });
  
  // Disable settings inputs
  const settingsInputs = document.querySelectorAll('#settings input');
  settingsInputs.forEach(el => {
    el.disabled = true;
    el.classList.add('disabled-for-view-only');
  });
  
  // Disable exit buttons (will be applied when trades are rendered)
  const exitButtons = document.querySelectorAll('.exit-btn');
  exitButtons.forEach(btn => {
    btn.disabled = true;
    btn.classList.add('disabled-for-view-only');
  });
  
  // Disable SL inputs (will be applied when trades are rendered)
  const slInputs = document.querySelectorAll('.sl-input');
  slInputs.forEach(input => {
    input.disabled = true;
    input.classList.add('disabled-for-view-only');
  });
}

// Enable controls for logged-in users
function enableControls() {
  // Enable add trade section
  const addTradeInputs = document.querySelectorAll('#addTrade input, #addTrade button');
  addTradeInputs.forEach(el => {
    el.disabled = false;
    el.classList.remove('disabled-for-view-only');
  });
  
  // Enable settings inputs
  const settingsInputs = document.querySelectorAll('#settings input');
  settingsInputs.forEach(el => {
    el.disabled = false;
    el.classList.remove('disabled-for-view-only');
  });
  
  // Enable exit buttons (will be applied when trades are rendered)
  const exitButtons = document.querySelectorAll('.exit-btn');
  exitButtons.forEach(btn => {
    btn.disabled = false;
    btn.classList.remove('disabled-for-view-only');
  });
  
  // Enable SL inputs (will be applied when trades are rendered)
  const slInputs = document.querySelectorAll('.sl-input');
  slInputs.forEach(input => {
    input.disabled = false;
    input.classList.remove('disabled-for-view-only');
  });
}

// Check session on page load
function checkSession() {
  const savedUser = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (savedUser) {
    currentUser = savedUser;
    updateUIForAuthState();
  } else {
    updateUIForAuthState();
    // Show login modal on first load
    setTimeout(() => {
      openLoginModal();
    }, 1000);
  }
}

// Default settings
let capital = 1000000;
let riskPerTrade = 2;

const THEME_STORAGE_KEY = 'theme';
const THEME_DARK = 'dark';
const THEME_LIGHT = 'light';

function applyTheme(theme) {
  const body = document.body;
  const toggle = document.getElementById('themeToggle');
  if (!body) return;

  body.classList.remove(THEME_DARK, THEME_LIGHT);
  body.classList.add(theme);

  if (toggle) {
    const isDark = theme === THEME_DARK;
    toggle.textContent = isDark ? '🌙' : '☀️';
    toggle.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
    toggle.setAttribute('title', isDark ? 'Switch to light theme' : 'Switch to dark theme');
  }
}

function initThemeToggle() {
  const toggle = document.getElementById('themeToggle');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  const initialTheme = savedTheme || (prefersDark ? THEME_DARK : THEME_LIGHT);

  applyTheme(initialTheme);

  if (!toggle) return;

  toggle.addEventListener('click', () => {
    const nextTheme = document.body.classList.contains(THEME_DARK) ? THEME_LIGHT : THEME_DARK;
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  });
}

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
  if (!isLoggedIn()) {
    return;
  }
  
  capital = parseFloat(document.getElementById('capitalInput').value) || 0;
  localStorage.setItem('capital', capital);
  updateMaxRiskDisplay();
  calculatePreview();
  if (!isLoggedIn()) {
    return;
  }
  
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
  if (!isLoggedIn()) {
    alert('Please login to add trades');
    openLoginModal();
    return;
  }
  
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


// TradingView Chart Configuration
const TRADINGVIEW_CHART_ID = '05Iji3dY';

function openTradingViewChart(symbol) {
  const nseSymbol = `NSE:${symbol}`;
  const encodedSymbol = encodeURIComponent(nseSymbol);
  const tradingViewUrl = `https://in.tradingview.com/chart/${TRADINGVIEW_CHART_ID}/?symbol=${encodedSymbol}`;
  window.open(tradingViewUrl, '_blank');
}

function renderTrades() {
  const body = document.getElementById("positionsBody");
  body.innerHTML = "";

  let totalRisk = 0;
  let totalDeployed = 0;
  let totalCurrentValue = 0;
  let totalPnL = 0;

  trades.forEach(t => {
    const risk = Math.abs(t.entry - t.sl) * t.qty;
    const invested = t.entry * t.qty;
    const currentValue = t.ltp * t.qty;
    const pnl = currentValue - invested;
    const pnlPercent = (pnl / invested) * 100;
    
    totalRisk += risk;
    totalDeployed += invested;
    totalCurrentValue += currentValue;
    totalPnL += pnl;
    
    const slPercent = t.slPercent || ((Math.abs(t.entry - t.sl) / t.entry) * 100);
    const entryDate = formatDate(t.createdAt);
    const holdingDays = calculateHoldingDays(t.createdAt);
    
    const pnlClass = pnl >= 0 ? 'profit-text' : 'loss-text';

    const slInputDisabled = !isLoggedIn() ? 'disabled' : '';
    const exitBtnDisabled = !isLoggedIn() ? 'disabled' : '';
    const disabledClass = !isLoggedIn() ? 'disabled-for-view-only' : '';
    const slOnChange = isLoggedIn() ? `onchange="updateSL('${t.id}', this.value)"` : '';

    body.innerHTML += `
      <tr>
        <td><strong><a href="#" onclick="openTradingViewChart('${t.symbol}'); return false;" class="stock-link">${t.symbol}</a></strong></td>
        <td>${entryDate}</td>
        <td>${holdingDays}</td>
        <td>₹${t.entry.toFixed(2)}</td>
        <td>₹${t.ltp.toFixed(2)}</td>
        <td><input type="number" class="sl-input ${disabledClass}" value="${t.sl.toFixed(2)}" step="0.01" ${slOnChange} ${slInputDisabled} /></td>
        <td id="slPercent-${t.id}">${slPercent.toFixed(2)}%</td>
        <td><strong>${t.qty}</strong></td>
        <td>₹${invested.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
        <td>₹${currentValue.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
        <td class="${pnlClass}">₹${pnl.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
        <td class="${pnlClass}">${pnlPercent.toFixed(2)}%</td>
        <td id="risk-${t.id}">₹${risk.toLocaleString('en-IN', {maximumFractionDigits: 0})}</td>
        <td><button class="exit-btn ${disabledClass}" onclick="exitTrade('${t.id}')" ${exitBtnDisabled}>Exit</button></td>
      </tr>`;
  });

  // Update totals in footer
  const totalPnLPercent = totalDeployed > 0 ? (totalPnL / totalDeployed) * 100 : 0;
  const totalPnLClass = totalPnL >= 0 ? 'profit-text' : 'loss-text';
  
  document.getElementById('totalInvested').innerText = `₹${totalDeployed.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
  document.getElementById('totalCurrentValue').innerText = `₹${totalCurrentValue.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
  
  const totalPnLEl = document.getElementById('totalPnL');
  totalPnLEl.innerText = `₹${totalPnL.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
  totalPnLEl.className = `pnl-cell ${totalPnLClass}`;
  
  const totalPnLPercentEl = document.getElementById('totalPnLPercent');
  totalPnLPercentEl.innerText = `${totalPnLPercent.toFixed(2)}%`;
  totalPnLPercentEl.className = `pnl-cell ${totalPnLClass}`;
  
  document.getElementById('totalRisk').innerText = `₹${totalRisk.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;

  const portfolioRiskPct = (totalRisk / capital) * 100;
  document.getElementById("portfolioRisk").innerText =
    `₹${totalRisk.toLocaleString('en-IN', {maximumFractionDigits: 0})} (${portfolioRiskPct.toFixed(2)}%)`;

  document.getElementById("deployedCapital").innerText =
    `₹${totalDeployed.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
  
  if (portfolioRiskPct > 5) notifyRisk();
}

function updateSL(tradeId, newSL) {
  if (!isLoggedIn()) {
    return;
  }

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
  if (!isLoggedIn()) {
    alert('Please login to exit trades');
    return;
  }
  
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

// Live Price Fetching for NSE Stocks
let priceUpdateInterval;
const PRICE_UPDATE_INTERVAL = 30000; // Update every 30 seconds
let debugLogs = [];

function addDebugLog(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString('en-IN');
  const logEntry = `[${timestamp}] ${message}`;
  debugLogs.unshift({ message: logEntry, type });
  
  // Keep only last 20 logs
  if (debugLogs.length > 20) {
    debugLogs.pop();
  }
  
  console.log(`%c${logEntry}`, `color: ${type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : '#3b82f6'}`);
  updateDebugPanel();
}

function updateDebugPanel() {
  const debugPanel = document.getElementById('debugLogs');
  if (debugPanel) {
    debugPanel.innerHTML = debugLogs.map(log => {
      const colorClass = log.type === 'error' ? 'log-error' : log.type === 'success' ? 'log-success' : 'log-info';
      return `<div class="debug-log-entry ${colorClass}">${log.message}</div>`;
    }).join('');
  }
}

// Check if current time is within market hours (9:15 AM - 3:30 PM IST)
function isMarketOpen() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hours * 60 + minutes; // Convert to minutes since midnight
  
  const marketOpen = 9 * 60 + 15; // 9:15 AM
  const marketClose = 15 * 60 + 30; // 3:30 PM
  
  // Check if it's a weekday (Monday = 1, Friday = 5)
  const day = now.getDay();
  const isWeekday = day >= 1 && day <= 5;
  
  return isWeekday && currentTime >= marketOpen && currentTime <= marketClose;
}

function updateMarketStatus() {
  const statusEl = document.getElementById('priceUpdateStatus');
  if (!statusEl) return;
  
  if (isMarketOpen()) {
    statusEl.textContent = 'Live prices updating...';
    statusEl.style.color = '#22c55e';
  } else {
    statusEl.textContent = 'Market Closed';
    statusEl.style.color = '#ef4444';
  }
}

async function fetchNSEPrice(symbol) {
  try {
    // Yahoo Finance API expects NSE symbols with .NS suffix
    const yahooSymbol = `${symbol}.NS`;
    
    addDebugLog(`Fetching ${symbol} from Yahoo Finance...`, 'info');
    
    // Try multiple CORS proxies in order
    const proxies = [
      `https://corsproxy.io/?${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`)}`,
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`)}`
    ];
    
    let data = null;
    let lastError = null;
    
    // Try each proxy until one works
    for (const proxyUrl of proxies) {
      try {
        const response = await fetch(proxyUrl);
        if (response.ok) {
          data = await response.json();
          break; // Success, exit loop
        }
      } catch (err) {
        lastError = err;
        continue; // Try next proxy
      }
    }
    
    if (!data) {
      addDebugLog(`❌ All proxies failed for ${symbol}`, 'error');
      if (lastError) console.error(`Last error for ${symbol}:`, lastError);
      return null;
    }
    
    // Log the raw response for debugging
    console.log(`Raw API response for ${symbol}:`, data);
    
    // Extract the latest price from the response
    if (data.chart && data.chart.result && data.chart.result[0]) {
      const result = data.chart.result[0];
      const meta = result.meta;
      
      // Try to get regular market price, fallback to previous close
      const price = meta.regularMarketPrice || meta.previousClose || meta.chartPreviousClose;
      
      if (price && price > 0) {
        addDebugLog(`✅ ${symbol}: ₹${parseFloat(price).toFixed(2)}`, 'success');
        return parseFloat(price);
      } else {
        addDebugLog(`⚠️ ${symbol}: No valid price in response`, 'error');
      }
    } else {
      addDebugLog(`⚠️ ${symbol}: Invalid response structure`, 'error');
    }
    
    return null;
  } catch (error) {
    addDebugLog(`❌ Error fetching ${symbol}: ${error.message}`, 'error');
    console.error(`Detailed error for ${symbol}:`, error);
    return null;
  }
}

async function updateAllPrices() {
  // Check if market is open
  if (!isMarketOpen()) {
    const statusEl = document.getElementById('priceUpdateStatus');
    if (statusEl) {
      statusEl.textContent = 'Market Closed';
      statusEl.style.color = '#ef4444';
    }
    addDebugLog('⏸️ Market closed - skipping price update', 'info');
    return;
  }
  
  if (trades.length === 0) {
    addDebugLog('⚠️ No open positions to update', 'info');
    return;
  }
  
  // Update status indicator
  const statusEl = document.getElementById('priceUpdateStatus');
  if (statusEl) {
    statusEl.textContent = 'Fetching prices...';
    statusEl.style.color = '#f59e0b';
  }
  
  addDebugLog(`🔄 Starting price update for ${trades.length} stock(s)`, 'info');
  
  let updatedCount = 0;
  let unchangedCount = 0;
  let failedCount = 0;
  
  // Fetch prices for all open positions
  const pricePromises = trades.map(async (trade) => {
    const newPrice = await fetchNSEPrice(trade.symbol);
    
    if (newPrice === null) {
      failedCount++;
      return false;
    }
    
    if (newPrice !== trade.ltp) {
      // Update in Firebase
      try {
        await db.collection(TRADES_COLLECTION).doc(trade.id).update({
          ltp: newPrice
        });
        
        // Update local trade object
        const oldPrice = trade.ltp;
        trade.ltp = newPrice;
        
        const change = ((newPrice - oldPrice) / oldPrice * 100).toFixed(2);
        const changeSymbol = newPrice > oldPrice ? '📈' : '📉';
        addDebugLog(`${changeSymbol} ${trade.symbol} updated: ₹${oldPrice.toFixed(2)} → ₹${newPrice.toFixed(2)} (${change}%)`, 'success');
        updatedCount++;
        return true;
      } catch (error) {
        addDebugLog(`❌ Failed to save ${trade.symbol} to Firebase: ${error.message}`, 'error');
        failedCount++;
        return false;
      }
    } else {
      unchangedCount++;
      return false;
    }
  });
  
  // Wait for all updates to complete
  await Promise.all(pricePromises);
  
  // Re-render the table with updated prices
  renderTrades();
  
  // Summary log
  addDebugLog(`✓ Update complete: ${updatedCount} changed, ${unchangedCount} unchanged, ${failedCount} failed`, updatedCount > 0 ? 'success' : 'info');
  
  // Update status indicator
  if (statusEl) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    statusEl.textContent = `Updated at ${timeStr}`;
    statusEl.style.color = updatedCount > 0 ? '#22c55e' : '#94a3b8';
    
    // Revert to market status after 3 seconds
    setTimeout(() => {
      updateMarketStatus();
    }, 3000);
  }
}

function startPriceUpdates() {
  addDebugLog(`🚀 Live price updates enabled (${PRICE_UPDATE_INTERVAL / 1000}s interval)`, 'info');
  
  // Check and log initial market status
  if (isMarketOpen()) {
    addDebugLog('✅ Market is open - prices will update automatically', 'success');
  } else {
    addDebugLog('⏸️ Market closed (9:15 AM - 3:30 PM) - updates paused', 'info');
  }
  
  // Update status display
  updateMarketStatus();
  
  // Initial update after 2 seconds (only if market is open)
  setTimeout(() => {
    updateAllPrices();
  }, 2000);
  
  // Set up periodic updates
  if (priceUpdateInterval) {
    clearInterval(priceUpdateInterval);
  }
  
  priceUpdateInterval = setInterval(() => {
    if (trades.length > 0) {
      updateAllPrices();
    } else {
      // Update market status even when no trades
      updateMarketStatus();
    }
  }, PRICE_UPDATE_INTERVAL);
}

function stopPriceUpdates() {
  if (priceUpdateInterval) {
    clearInterval(priceUpdateInterval);
    priceUpdateInterval = null;
    addDebugLog('⏸️ Price updates stopped', 'info');
  }
}

// Manual refresh with market hours check
function manualRefreshPrices() {
  if (!isMarketOpen()) {
    const now = new Date();
    const day = now.getDay();
    
    let message = 'Market is currently closed.\n\n';
    if (day === 0 || day === 6) {
      message += 'Markets are closed on weekends.\n';
    }
    message += 'Trading hours: Monday-Friday, 9:15 AM - 3:30 PM';
    
    alert(message);
    addDebugLog('⚠️ Manual refresh blocked - Market closed', 'info');
    return;
  }
  
  addDebugLog('🔄 Manual refresh triggered', 'info');
  updateAllPrices();
}

// Initialize authentication
initializeDefaultUser();
checkSession();


// Initialize app
initThemeToggle();
addDebugLog('🎯 Swing Risk Tracker initialized', 'info');
loadSettings();
loadTrades();
loadClosedTrades();

// Start live price updates after initial load
setTimeout(() => {
  startPriceUpdates();
}, 2000); // Wait 2 seconds after page load to start updates

