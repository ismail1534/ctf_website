// Global state
const state = {
  user: null,
  currentPage: null,
  challenges: [],
  leaderboard: [],
  siteConfig: null,
  isLoading: false,
  isInitialized: false,
};

// DOM Elements
const app = document.getElementById("app");
const navLinks = document.getElementById("nav-links");

// Templates
const templates = {
  home: document.getElementById("home-template"),
  login: document.getElementById("login-template"),
  register: document.getElementById("register-template"),
  dashboard: document.getElementById("dashboard-template"),
  leaderboard: document.getElementById("leaderboard-template"),
  adminLogin: document.getElementById("admin-login-template"),
  adminDashboard: document.getElementById("admin-dashboard-template"),
  adminChallenges: document.getElementById("admin-challenges-template"),
  adminUsers: document.getElementById("admin-users-template"),
  adminSiteConfig: document.getElementById("admin-site-config-template"),
};

// Router
const navigateTo = (path) => {
  window.location.hash = path;
};

// Add footer to the page (except login and register pages)
const addFooterIfNeeded = (path) => {
  // First remove any existing footer
  const existingFooter = document.querySelector(".footer");
  if (existingFooter) {
    existingFooter.remove();
  }

  // Don't add footer to login or register pages
  if (path === "/login" || path === "/register") {
    return;
  }

  // Create and append the footer
  const footer = document.createElement("div");
  footer.className = "footer";
  footer.innerHTML = "Made with ♥️ by Ismail";

  // Add to the body instead of container for fixed positioning
  document.body.appendChild(footer);
};

// Show loading state
const showLoading = () => {
  if (state.isLoading) return;
  state.isLoading = true;
  app.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading...</p>
    </div>
  `;
};

// Hide loading state
const hideLoading = () => {
  state.isLoading = false;
};

// Enhanced error handling with mobile detection
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Handle route changes with better error handling
const handleRouteChange = async () => {
  const path = window.location.hash.substring(1) || "/";

  // Show loading for route changes
  showLoading();

  // Clear previous content
  app.innerHTML = "";

  // Update navigation
  updateNavigation();

  // Route handling with enhanced error handling
  try {
    if (path === "/" || path === "/home") {
      renderHome();
    } else if (path === "/login") {
      renderLogin();
    } else if (path === "/register") {
      renderRegister();
    } else if (path === "/dashboard") {
      await checkAuth();
      renderDashboard();
    } else if (path === "/leaderboard") {
      renderLeaderboard();
    } else if (path === "/admin/login") {
      renderAdminLogin();
    } else if (path.startsWith("/admin")) {
      await checkAdminAuth();
      renderAdminArea(path);
    } else if (path === "/logout") {
      await logout();
      navigateTo("/");
    } else {
      renderNotFound();
    }

    // Add footer if needed for the current page
    addFooterIfNeeded(path);
  } catch (error) {
    console.error("Route error:", error);
    
    // Show user-friendly error message
    const errorMessage = isMobile() 
      ? "Unable to load this page on mobile. Please try refreshing or use a desktop browser."
      : "Error loading page. Please try again.";
    
    app.innerHTML = `
      <div class="error-container">
        <h2>Oops! Something went wrong</h2>
        <p>${errorMessage}</p>
        <button class="btn btn-primary" onclick="window.location.reload()">Refresh Page</button>
        <a href="#/" class="btn">Go Home</a>
      </div>
    `;
  } finally {
    hideLoading();
  }
};

// Enhanced authentication check with better session handling
const checkAuth = async () => {
  if (!state.user) {
    try {
      // First try to get user from server session
      const response = await fetch(API_BASE_URL + "/api/auth/me", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        state.user = data.user;
        // Store user data in localStorage for persistence
        localStorage.setItem("user", JSON.stringify(data.user));
        console.log("User authenticated from server session:", state.user.username);
        return;
      }
      
      // If server session is invalid, try localStorage as fallback
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          console.log("Attempting to restore session from localStorage");
          
          // Try to validate the stored user data with the server
          const statusResponse = await fetch(API_BASE_URL + "/api/auth/status", {
            credentials: "include",
          });
          
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            if (statusData.hasSession) {
              // Server has a valid session, get full user data
              const userResponse = await fetch(API_BASE_URL + "/api/auth/me", {
                credentials: "include",
              });
              if (userResponse.ok) {
                const userData = await userResponse.json();
                state.user = userData.user;
                localStorage.setItem("user", JSON.stringify(userData.user));
                console.log("Session restored successfully:", state.user.username);
                return;
              }
            }
          }
          
          // If we reach here, the stored data is stale
          console.log("Stored user data is stale, redirecting to login");
          localStorage.removeItem("user");
          navigateTo("/login");
          throw new Error("Session expired. Please log in again.");
          
        } catch (error) {
          console.error("Error parsing user from localStorage:", error);
          localStorage.removeItem("user");
          navigateTo("/login");
          throw new Error("Invalid stored session. Please log in again.");
        }
      }
      
      // No valid session found
      navigateTo("/login");
      throw new Error("Not authenticated");
      
    } catch (error) {
      console.error("Auth error:", error);
      navigateTo("/login");
      throw error;
    }
  }
};

// Check if user is admin
const checkAdminAuth = async () => {
  await checkAuth();

  if (!state.user || !state.user.isAdmin) {
    navigateTo("/");
    throw new Error("Not authorized as admin");
  }
};

// Logout
const logout = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      console.log("Logout successful");
    } else {
      console.error("Logout failed:", await response.json());
    }

    // Always clear local state regardless of server response
    state.user = null;
    localStorage.removeItem("user");

    // Navigate to home page after logout
    navigateTo("/");
  } catch (error) {
    console.error("Logout error:", error);
    // Still clear local state on error
    state.user = null;
    localStorage.removeItem("user");
  }
};

// Update navigation links based on user state
const updateNavigation = () => {
  navLinks.innerHTML = "";

  // Home and leaderboard links for everyone
  navLinks.innerHTML += `<li><a href="#/">Home</a></li>`;
  navLinks.innerHTML += `<li><a href="#/leaderboard">Leaderboard</a></li>`;

  if (state.user) {
    // Show dashboard for authenticated users
    navLinks.innerHTML += `<li><a href="#/dashboard">Challenges</a></li>`;

    // Show admin link for admin users
    if (state.user.isAdmin) {
      navLinks.innerHTML += `<li><a href="#/admin">Admin Panel</a></li>`;
    }

    // Logout link
    navLinks.innerHTML += `<li><a href="#/logout">Logout</a></li>`;
  } else {
    // Login/Register links for non-authenticated users
    navLinks.innerHTML += `<li><a href="#/login">Login</a></li>`;
    navLinks.innerHTML += `<li><a href="#/register">Register</a></li>`;
  }
};

// Show alert message
const showAlert = (message, type, elementId = "alert") => {
  const alertElement = document.getElementById(elementId);

  if (alertElement) {
    alertElement.innerHTML = message;
    alertElement.className = `alert alert-${type}`;
  }
};

// Render Home page
const renderHome = () => {
  state.currentPage = "home";
  app.appendChild(templates.home.content.cloneNode(true));

  const siteStatus = document.getElementById("site-status");

  // Get site config using the public endpoint
  fetch(API_BASE_URL + "/api/admin/site-config/public", {
    credentials: "include",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      state.siteConfig = data.config;

      if (state.siteConfig.siteMode === "leaderboard_only") {
        siteStatus.innerHTML = "Site is currently in Leaderboard Only Mode. Challenge submissions are disabled.";
        siteStatus.className = "alert alert-danger";
      } else {
        siteStatus.innerHTML = "Site is currently in Live Mode. All features are available.";
        siteStatus.className = "alert alert-success";
      }
    })
    .catch((error) => {
      console.error("Site config error:", error);
      siteStatus.innerHTML = "Error loading site status.";
      siteStatus.className = "alert alert-danger";
    });
};

// Render 404 Not Found
const renderNotFound = () => {
  app.innerHTML = `
    <div class="card">
      <h2>404 - Page Not Found</h2>
      <p>The page you're looking for does not exist.</p>
      <a href="#/" class="btn">Go Home</a>
    </div>
  `;
};

// Initialize the application with enhanced session handling
const init = async () => {
  try {
    console.log("Initializing application...");
    
    // Try to get session status first
    const statusResponse = await fetch(`${API_BASE_URL}/api/auth/status`, {
      credentials: "include",
    });

    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log("Session status on init:", statusData);

      // If we have an active server-side session, use it
      if (statusData.hasSession && statusData.user) {
        console.log("Active session found, loading user data");

        // Fetch full user data
        const userResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
          credentials: "include",
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          state.user = userData.user;
          localStorage.setItem("user", JSON.stringify(userData.user));
          console.log("User data loaded from session:", state.user.username);
        }
      } else {
        // Fallback to localStorage if no active session
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          try {
            state.user = JSON.parse(storedUser);
            console.log("User loaded from localStorage:", state.user.username);
          } catch (error) {
            console.error("Error parsing user from localStorage:", error);
            localStorage.removeItem("user");
          }
        }
      }
    }
  } catch (error) {
    console.error("Error checking session status:", error);

    // Fallback to localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        state.user = JSON.parse(storedUser);
        console.log("User loaded from localStorage:", state.user.username);
      } catch (error) {
        console.error("Error parsing user from localStorage:", error);
        localStorage.removeItem("user");
      }
    }
  }

  // Mark as initialized
  state.isInitialized = true;

  // Handle route changes
  window.addEventListener("hashchange", handleRouteChange);

  // Initial route handling
  handleRouteChange();
};
