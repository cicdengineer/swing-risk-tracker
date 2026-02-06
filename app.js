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
    symbol,
    entry,
    sl,
    qty,
    notes,
    ltp: entry,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  db.collection(TRADES_COLLECTION).add(trade).then(() => {
    loadTrades();
  });
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
    });
}

function notifyRisk() {
  alert("⚠️ Portfolio risk exceeds 5%!");
}

loadTrades();

