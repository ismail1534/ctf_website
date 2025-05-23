// API base URL configuration
// Updated to always use Koyeb except in local development
const API_BASE_URL = window.location.hostname === "localhost" ? "http://localhost:10000" : "https://vivid-baboon-ismail1534-c0b1a753.koyeb.app"; // Always use Koyeb in production

console.log("Using API base URL:", API_BASE_URL);

// Debug function to wrap fetch and log requests
const originalFetch = window.fetch;
window.fetch = function (url, options) {
  console.log("Fetch request to:", url, options);
  return originalFetch(url, options)
    .then((response) => {
      console.log("Response status:", response.status, "from URL:", url);
      // Important: We need to return the original response, not a clone
      return response;
    })
    .catch((error) => {
      console.error("Fetch error:", error, "for URL:", url);
      throw error;
    });
};
