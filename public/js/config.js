// Use the full backend URL directly
const API_BASE_URL = "https://ctf-website-backend-e5la.onrender.com";

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
