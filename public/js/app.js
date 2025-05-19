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

// Check if user is authenticated
const checkAuth = async () => {
  try {
    const response = await fetch(API_BASE_URL + "/api/auth/status", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Not authenticated");
    }

    const data = await response.json();
    console.log("Session status:", data);

    if (data.isAuthenticated && data.user) {
      state.user = data.user;
      localStorage.setItem("user", JSON.stringify(data.user));
      return true;
    } else {
      state.user = null;
      localStorage.removeItem("user");
      return false;
    }
  } catch (error) {
    console.error("Auth error:", error);
    state.user = null;
    localStorage.removeItem("user");
    return false;
  }
};

// Check if user is admin
const checkAdminAuth = async () => {
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated || !state.user.isAdmin) {
    navigateTo("/admin/login");
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
      const isAuthenticated = await checkAuth();
      if (!isAuthenticated) {
        navigateTo("/login");
        return;
      }
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
    showAlert("Error loading page. Please try again.", "danger");
  }
};

// Initialize the application
const init = async () => {
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

  // Verify session with server
  await checkAuth();

  // Handle route changes
  window.addEventListener("hashchange", handleRouteChange);

  // Initial route handling
  handleRouteChange();
};

// Start the app
document.addEventListener("DOMContentLoaded", init);
