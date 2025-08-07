// stats.js

// ===============================================================
// GLOBAL STATE AND CONFIG
// ===============================================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxsMiZ79MzLfXcZtUzrfOcbqcqvi5dtRppV5Fp-OO-jQFsv1CWGLMuFKqzyyLfLXN9pIQ/exec";
let idToken = null;
let allTransactions = []; // To store all raw transaction data from the backend

// ===============================================================
// DOM ELEMENT REFERENCES
// ===============================================================
const statsResultDiv = document.getElementById("statsResult");
const statusMessage = document.getElementById("statusMessage");
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const filterBtn = document.getElementById("filterBtn");


// ===============================================================
// INITIALIZATION
// ===============================================================

// This function runs once the user is confirmed to be logged in
function initializePage() {
    idToken = sessionStorage.getItem("googleIdToken"); // Get token from storage
    fetchTransactions(); // Fetch the data as soon as the page loads
    
    // Add event listener to the filter button
    filterBtn.addEventListener("click", () => {
        // When filter is clicked, we don't need to fetch again, just re-calculate
        displayStats();
    });
}

// Check login status on page load. If logged in, initialize the page.
window.onload = function() {
  if (checkLoginStatus()) { // This function comes from auth.js
    initializePage();
  }
};


// ===============================================================
// DATA FETCHING AND PROCESSING
// ===============================================================

/**
 * Fetches all transactions from the backend.
 */
function fetchTransactions() {
  if (!idToken) return;

  statsResultDiv.innerHTML = "<p>Chargement des transactions...</p>";
  
  fetch(`${SCRIPT_URL}?action=getTransactions&token=${idToken}`)
    .then(response => response.json())
    .then(res => {
      if (res.status === "success") {
        allTransactions = res.data;
        // Once data is fetched, calculate and display stats for the first time
        displayStats();
      } else {
        throw new Error(res.message || "Failed to fetch transactions.");
      }
    })
    .catch(error => {
      showStatus(`Erreur: ${error.message}`, "error");
      statsResultDiv.innerHTML = `<p style="color: red;">${error.message}</p>`;
    });
}

/**
 * Main function to filter, calculate, and render stats.
 */
function displayStats() {
    // 1. Filter the transactions based on the date inputs
    const filteredTransactions = filterTransactionsByDate(allTransactions);

    // 2. Calculate the stats from the filtered data
    const stats = calculateStats(filteredTransactions);

    // 3. Render the final table
    renderStatsTable(stats);
}


// ===============================================================
// CALCULATION & RENDERING (The "Frontend" part)
// ===============================================================

/**
 * Filters the master list of transactions by the selected date range.
 * @param {Array} transactions - The array of all transactions.
 * @returns {Array} A new array of transactions that fall within the date range.
 */
function filterTransactionsByDate(transactions) {
    const startDate = startDateInput.value ? new Date(startDateInput.value) : null;
    const endDate = endDateInput.value ? new Date(endDateInput.value) : null;

    if (!startDate && !endDate) {
        return transactions; // No filter, return everything
    }

    // Set time to beginning of day for start date and end of day for end date
    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(23, 59, 59, 999);

    return transactions.filter(t => {
        const transactionDate = new Date(t.date);
        const afterStart = !startDate || transactionDate >= startDate;
        const beforeEnd = !endDate || transactionDate <= endDate;
        return afterStart && beforeEnd;
    });
}


/**
 * Processes a list of transactions to generate aggregated stats.
 * @param {Array} transactions - The list of transactions to process.
 * @returns {Object} An object containing the aggregated stats.
 */
function calculateStats(transactions) {
    const stats = {};

    transactions.forEach(t => {
        const name = t.prestationName;
        if (!name) return; // Skip if no name

        // Initialize if it's the first time we see this prestation
        if (!stats[name]) {
            stats[name] = {
                revenue: 0,
                profit: 0,
                count: 0,
                paymentMethods: { 'Espèce': 0, 'Chèque': 0, 'Paylib': 0 }
            };
        }

        const actualEarning = parseFloat(t.actualEarning) || 0;
        const cost = parseFloat(t.cost) || 0;
        const profit = actualEarning - cost;

        // Aggregate data
        stats[name].revenue += actualEarning;
        stats[name].profit += profit;
        stats[name].count++;
        if (stats[name].paymentMethods.hasOwnProperty(t.paymentMethod)) {
            stats[name].paymentMethods[t.paymentMethod]++;
        }
    });

    return stats;
}


/**
 * Renders the calculated statistics into an HTML table.
 * @param {Object} statsData - The calculated stats data.
 */
function renderStatsTable(statsData) {
  if (Object.keys(statsData).length === 0) {
    statsResultDiv.innerHTML = "<p>Aucune donnée trouvée pour la période sélectionnée.</p>";
    return;
  }

  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>Prestation</th>
        <th>Chiffre d'affaire</th>
        <th>Bénéfice</th>
        <th>Nb</th>
        <th>Espèce</th>
        <th>Chèque</th>
        <th>Paylib</th>
      </tr>
    </thead>
    <tbody>
    </tbody>
  `;
  const tbody = table.querySelector("tbody");
  
  const formatCurrency = (amount) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

  // Sort prestation names alphabetically for consistent order
  const sortedPrestationNames = Object.keys(statsData).sort();

  sortedPrestationNames.forEach(prestationName => {
    const data = statsData[prestationName];
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${prestationName}</td>
      <td>${formatCurrency(data.revenue)}</td>
      <td>${formatCurrency(data.profit)}</td>
      <td>${data.count}</td>
      <td>${data.paymentMethods['Espèce']}</td>
      <td>${data.paymentMethods['Chèque']}</td>
      <td>${data.paymentMethods['Paylib']}</td>
    `;
    tbody.appendChild(row);
  });

  statsResultDiv.innerHTML = "";
  statsResultDiv.appendChild(table);
}


// ===============================================================
// UI UTILITY FUNCTIONS
// ===============================================================
function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.style.display = "block";
  setTimeout(() => {
    statusMessage.style.display = "none";
  }, 5000);
}
