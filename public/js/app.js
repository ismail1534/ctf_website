// Global state
const state = {
  user: null,
  currentPage: null,
  challenges: [],
  leaderboard: [],
  siteConfig: null,
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

// Handle route changes
const handleRouteChange = async () => {
  const path = window.location.hash.substring(1) || "/";

  // Clear previous content
  app.innerHTML = "";

  // Update navigation
  updateNavigation();

  // Route handling
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
  } catch (error) {
    console.error("Route error:", error);
    showAlert("Error loading page. Please try again.", "danger");
  }
};

// Check if user is authenticated
const checkAuth = async () => {
  if (!state.user) {
    try {
      const response = await fetch(API_BASE_URL + "/api/auth/me", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        state.user = data.user;
      } else {
        // Try to use localStorage data as fallback
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          try {
            console.log("Session not found, trying to re-authenticate with stored credentials");
            const userData = JSON.parse(storedUser);
            // Don't actually re-authenticate automatically for security reasons,
            // but let the user know they need to login again
            console.log("Authentication failed. Please log in again.");
          } catch (error) {
            console.error("Error parsing user from localStorage:", error);
            localStorage.removeItem("user");
          }
        }
        throw new Error("Not authenticated");
      }
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
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      credentials: "include",
    });
    state.user = null;
    // Clear user data from localStorage
    localStorage.removeItem("user");
  } catch (error) {
    console.error("Logout error:", error);
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

// Initialize the application
const init = () => {
  // Check localStorage for user data
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

  // Debug session status
  fetch(`${API_BASE_URL}/api/auth/status`, {
    credentials: "include",
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Session status:", data);
    })
    .catch((error) => {
      console.error("Session status check failed:", error);
    });

  // Handle route changes
  window.addEventListener("hashchange", handleRouteChange);

  // Initial route handling
  handleRouteChange();
};
