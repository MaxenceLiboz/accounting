
// This function runs when Google Sign-In is successful
// It saves the token and reloads the page to ensure a clean state.
function handleCredentialResponse(response) {
  const idToken = response.credential;
  sessionStorage.setItem("googleIdToken", idToken); // Save token to session storage
  window.location.reload(); // Reload the page
}

// This function signs the user out
function logout() {
  sessionStorage.removeItem("googleIdToken"); // Remove the token
  // Optional: You can also ask Google to revoke the session for a full sign-out
  // google.accounts.id.revoke(email, done => { ... });
  window.location.href = "index.html"; // Go back to the main page
}

// This function checks if a user is logged in on page load
// It should be called from the page-specific JS files (app.js, stats.js)
function checkLoginStatus() {
  const token = sessionStorage.getItem("googleIdToken");
  if (token) {
    // User is logged in, show the main content
    document.getElementById("auth-container").style.display = "none";
    const content = document.getElementById("app-content") || document.getElementById("stats-content");
    if (content) content.style.display = "block";
    return token;
  } else {
    // User is not logged in, show the login button
    document.getElementById("auth-container").style.display = "block";
    const content = document.getElementById("app-content") || document.getElementById("stats-content");
    if (content) content.style.display = "none";
    return null;
  }
}
