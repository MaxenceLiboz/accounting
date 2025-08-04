// Configuration
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxkaAAPC-P1c9vl3WvfjFU54EDFobQC9imGzm2DfU7ln19cNuFVInAxoIUGpIRxIvNaJA/exec';
let USER_ID_TOKEN = null; // Global variable to store the user's login token

// Element Selectors
const authContainer = document.getElementById('auth-container');
const form = document.getElementById('accountingForm');
const prestationSelect = document.getElementById('prestation');
const submitButton = document.getElementById('submitButton');
const statusMessage = document.getElementById('statusMessage');

/**
 * This function is automatically called by the Google Sign-In library after a successful login.
 * @param {Object} response - The response object from Google containing the user's credential.
 */
function handleCredentialResponse(response) {
    USER_ID_TOKEN = response.credential; // Store the secure token
    
    // Hide the login prompt and show the main application form
    authContainer.style.display = 'none';
    form.style.display = 'block';
    
    // Now that the user is authenticated, we can fetch the data
    fetchPrestations();
    setDefaultDate();
}

/**
 * Handles the form submission, now including the security token.
 */
function handleFormSubmit(e) {
    e.preventDefault();
    if (!USER_ID_TOKEN) {
        handleError("You must be signed in to save data.");
        return;
    }
    submitButton.disabled = true;
    submitButton.textContent = 'Saving...';
    hideStatusMessage();
    const formData = {
        date: document.getElementById('date').value,
        invoiceNumber: document.getElementById('invoiceNumber').value,
        prestationName: prestationSelect.value
    };
    fetch(WEB_APP_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
            'Authorization': `Bearer ${USER_ID_TOKEN}` // The security token is added here!
        },
        body: JSON.stringify(formData),
        redirect: 'follow'
    })
    .then(response => response.json())
    .then(res => {
        if (res.status === 'success') {
            showStatusMessage('Transaction saved successfully!', 'success');
            form.reset();
            setDefaultDate();
        } else {
            handleError(res.message); // Show specific error from backend
        }
    })
    .catch(error => handleError('An error occurred while saving.'))
    .finally(() => {
        submitButton.disabled = false;
        submitButton.textContent = 'Save Transaction';
    });
}

// --- Helper Functions (Unchanged from Step 3) ---

function fetchPrestations() {
    fetch(WEB_APP_URL)
        .then(response => response.json())
        .then(res => {
            if (res.status === 'success') {
                populatePrestationDropdown(res.data);
            } else {
                handleError('Could not load services: ' + res.message);
            }
        })
        .catch(error => handleError('Could not connect to the server.'));
}

function populatePrestationDropdown(prestations) {
    prestationSelect.innerHTML = '<option value="" disabled selected>-- Select a Service --</option>';
    prestations.forEach(prestation => {
        const option = document.createElement('option');
        option.value = prestation.name;
        option.textContent = `${prestation.name} (€${prestation.earning})`;
        prestationSelect.appendChild(option);
    });
}

function setDefaultDate() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    document.getElementById('date').value = `${yyyy}-${mm}-${dd}`;
}

function showStatusMessage(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.style.display = 'block';
}

function hideStatusMessage() {
    statusMessage.style.display = 'none';
}

function handleError(message) {
    showStatusMessage(message, 'error');
}

// Event Listener
form.addEventListener('submit', handleFormSubmit);
