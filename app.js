// Configuration
const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbxufeg80IJ2ihLKaClVayElTZQzMEDVblGs_50VA6b7upLbqOI6tZEwPpF8bPAnmJd2Qg/exec";
let USER_ID_TOKEN = null; // Global variable to store the user's login token
let PRESTATIONS_DATA = []; // Pour stocker les données des prestations
let SELECTED_PRESTATIONS = []; // Pour stocker la liste des prestations choisies

// Sélecteurs d'éléments
const authContainer = document.getElementById("auth-container");
const form = document.getElementById("accountingForm");
const prestationSelect = document.getElementById("prestation");
const addButton = document.getElementById("addButton");
const prestationListDiv = document.getElementById("prestationList");
const submitButton = document.getElementById("submitButton");
const statusMessage = document.getElementById("statusMessage");
const customEarningInput = document.getElementById("customEarning");

// --- Logique d'Authentification (inchangée) ---
function handleCredentialResponse(response) {
  USER_ID_TOKEN = response.credential;
  authContainer.style.display = "none";
  form.style.display = "block";
  fetchPrestations();
  setDefaultDate();
}


/**
 * Ajoute la prestation sélectionnée dans la liste déroulante à notre liste temporaire.
 */
function addPrestationToList() {
  const selectedName = prestationSelect.value;
  if (!selectedName) {
    handleError("Veuillez d'abord sélectionner une prestation.");
    return;
  }
  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked');
  if (!paymentMethod) {
    handleError("Veuillez sélectionner un mode de règlement.");
    return;
  }

  const prestationData = PRESTATIONS_DATA.find((p) => p.name === selectedName);

  if (prestationData) {
    const customEarningValue = customEarningInput.value;

    SELECTED_PRESTATIONS.push({
      ...prestationData,                    // Copies keys: name, earning, cost
      paymentMethod: paymentMethod.value,   // Adds the payment method
      actualEarning: customEarningValue
    });
    
    renderSelectedList();
  }

  prestationSelect.selectedIndex = 0;
  customEarningInput.value = ""; // Clear the custom earning field
}
/**
 * Affiche la liste des prestations sélectionnées dans la div.
 */
function renderSelectedList() {
  prestationListDiv.innerHTML = "";

  if (SELECTED_PRESTATIONS.length === 0) {
    prestationListDiv.innerHTML = '<p style="color: #888; text-align: center;">Aucune prestation ajoutée.</p>';
    return;
  }

  SELECTED_PRESTATIONS.forEach((prestation, index) => {
    const displayEarning = parseFloat(prestation.actualEarning) || parseFloat(prestation.earning);

    // Check if a custom price was used to show a visual indicator
    const isCustomPrice =
      !!prestation.actualEarning && parseFloat(prestation.actualEarning) !== parseFloat(prestation.earning);
    const priceText = isCustomPrice
      ? `Montant : €${displayEarning.toFixed(2)} <em style="color:#0056b3;">(Prix de base: €${prestation.earning})</em>`
      : `Montant : €${displayEarning.toFixed(2)}`;

    const itemDiv = document.createElement("div");
    itemDiv.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.8em;
        margin-bottom: 0.5em;
        background-color: #f9f9f9;
        border-left: 5px solid ${isCustomPrice ? "#ffc107" : "#007bff"}; /* Yellow for custom, blue for default */
        border-radius: 4px;
    `;

    const detailsSpan = document.createElement("span");
    detailsSpan.innerHTML = `
        <strong style="display: block; color: #333;">${prestation.name}</strong>
        <small style="color: #666;">Payé par : ${prestation.paymentMethod} - ${priceText}</small>
    `;

    // Note: Your remove button logic had a small typo (`.remove-btn` instead of `[data-index]`).
    // I'm providing a corrected and simplified version of the rendering and event handling.
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.innerHTML = "×";
    removeButton.dataset.index = index; // Use data-index to know which item to remove
    removeButton.style.cssText = `
        color: red; background: none; border: none; cursor: pointer;
        font-size: 1.5em; line-height: 1; padding-left: 1em;
    `;
    removeButton.addEventListener("click", () => {
      SELECTED_PRESTATIONS.splice(index, 1);
      renderSelectedList(); // Re-render the list after removing an item
    });

    itemDiv.appendChild(detailsSpan);
    itemDiv.appendChild(removeButton);
    prestationListDiv.appendChild(itemDiv);
  });

  document.querySelectorAll(".remove-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      const indexToRemove = parseInt(e.target.dataset.index);
      SELECTED_PRESTATIONS.splice(indexToRemove, 1);
      renderSelectedList();
    });
  });
}

/**
 * Gère la soumission du formulaire principal.
 */
function handleFormSubmit(e) {
  e.preventDefault();

  if (SELECTED_PRESTATIONS.length === 0) {
    handleError("Veuillez ajouter au moins une prestation à la transaction.");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Enregistrement...";
  hideStatusMessage();

  const formData = {
    date: document.getElementById("date").value,
    invoiceNumber: document.getElementById("invoiceNumber").value,
    // Envoyer le tableau complet des prestations
    prestations: SELECTED_PRESTATIONS,
    token: USER_ID_TOKEN,
  };

  fetch(WEB_APP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(formData),
  })
    .then((response) => response.json())
    .then((res) => {
      if (res.status === "success") {
        showStatusMessage("Transaction enregistrée avec succès !", "success");
        form.reset();
        SELECTED_PRESTATIONS = []; // Vider la liste
        renderSelectedList();
        setDefaultDate();
      } else {
        handleError(res.message);
      }
    })
    .catch((error) => handleError("Une erreur est survenue lors de l'enregistrement."))
    .finally(() => {
      submitButton.disabled = false;
      submitButton.textContent = "Enregistrer la Transaction";
    });
}

// --- Fonctions utilitaires (certaines inchangées) ---

function fetchPrestations() {
  fetch(WEB_APP_URL)
    .then((response) => response.json())
    .then((res) => {
      if (res.status === "success") {
        PRESTATIONS_DATA = res.data; // Stocker les données
        populatePrestationDropdown(PRESTATIONS_DATA);
      } else {
        handleError("Impossible de charger les services : " + res.message);
      }
    })
    .catch((error) => handleError("Impossible de se connecter au serveur."));
}

function populatePrestationDropdown(prestations) {
  prestationSelect.innerHTML = '<option value="" disabled selected>-- Sélectionner un Service --</option>';
  prestations.forEach((prestation) => {
    const option = document.createElement("option");
    option.value = prestation.name;
    option.textContent = `${prestation.name} (€${prestation.earning})`;
    prestationSelect.appendChild(option);
  });
}

function setDefaultDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  document.getElementById("date").value = `${yyyy}-${mm}-${dd}`;
}

function showStatusMessage(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.style.display = "block";
}

function hideStatusMessage() {
  statusMessage.style.display = "none";
}

function handleError(message) {
  showStatusMessage(message, "error");
}

// --- Écouteurs d'événements ---
document.addEventListener("DOMContentLoaded", renderSelectedList); // Afficher la liste vide au chargement
addButton.addEventListener("click", addPrestationToList);
form.addEventListener("submit", handleFormSubmit);
