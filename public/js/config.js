// API base URL configuration
// This can be updated when deploying to different environments
const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:10000"
    : window.location.hostname.includes("koyeb")
    ? "https://YOUR-APP-NAME.koyeb.app" // Replace with your Koyeb app URL when deployed
    : "https://ctf-website-backend-e5la.onrender.com"; // Fallback to the original Render URL

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
