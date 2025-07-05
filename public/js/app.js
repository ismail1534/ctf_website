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

// Logout user function - clears local data and redirects to login
const logoutUser = async () => {
  console.log("Logging out user due to invalid session");
  
  // Clear local state
  state.user = null;
  localStorage.removeItem("user");
  
  // Optional: Call backend logout route
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "GET",
      credentials: "include",
    });
  } catch (error) {
    console.error("Backend logout error:", error);
    // Continue with logout even if backend call fails
  }
  
  // If app is not initialized yet, set the hash and let init() handle it
  if (!state.isInitialized) {
    console.log("App not initialized, setting hash for init to handle");
    window.location.hash = "#/login";
    return;
  }
  
  // If app is initialized, use normal navigation
  console.log("App initialized, using normal navigation");
  navigateTo("/login");
};

// Check session validity with automatic logout
const checkSessionValidity = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/status`, {
      credentials: "include",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    });

    // Check if response is JSON (valid API response)
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.log("Non-JSON response received, treating as invalid session");
      await logoutUser();
      return false;
    }

    const data = await response.json();
    
    // Check if session is authenticated
    if (!data.authenticated) {
      console.log("Session not authenticated, logging out user");
      await logoutUser();
      return false;
    }

    // Session is valid, update user state
    if (data.user) {
      state.user = data.user;
      localStorage.setItem("user", JSON.stringify(data.user));
      console.log("Session validated, user:", data.user.username);
    }
    
    return true;
  } catch (error) {
    console.error("Session validation error:", error);
    await logoutUser();
    return false;
  }
};

// Handle route changes with better error handling
const handleRouteChange = async () => {
  const path = window.location.hash.substring(1) || "/";
  
  console.log("Handling route change to:", path);

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
      console.log("Rendering login page");
      // Check if templates are loaded
      if (!templates.login) {
        console.error("Login template not found!");
        app.innerHTML = `
          <div class="error-container">
            <h2>Template Error</h2>
            <p>Login template not found. Please refresh the page.</p>
            <button class="btn btn-primary" onclick="window.location.reload()">Refresh Page</button>
          </div>
        `;
        return;
      }
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

// Enhanced authentication check with automatic session validation
const checkAuth = async () => {
  if (!state.user) {
    // First check session validity
    const sessionValid = await checkSessionValidity();
    if (!sessionValid) {
      throw new Error("Session validation failed");
    }
    
    // If we reach here, session is valid and user is set
    return;
  }

  // If we have a user in state, still validate session
  const sessionValid = await checkSessionValidity();
  if (!sessionValid) {
    throw new Error("Session validation failed");
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

// Initialize the application with automatic session validation
const init = async () => {
  try {
    console.log("Initializing application...");
    
    // Check if DOM is ready
    if (!app) {
      console.error("App element not found!");
      return;
    }
    
    // Check if templates are loaded
    if (!templates.login) {
      console.error("Templates not loaded!");
      app.innerHTML = `
        <div class="error-container">
          <h2>Initialization Error</h2>
          <p>Templates not loaded. Please refresh the page.</p>
          <button class="btn btn-primary" onclick="window.location.reload()">Refresh Page</button>
        </div>
      `;
      return;
    }
    
    console.log("DOM and templates ready, checking session...");
    
    // Always check session validity on app initialization
    const sessionValid = await checkSessionValidity();
    
    if (!sessionValid) {
      // User will be automatically redirected to login by checkSessionValidity
      // If the hash is already set to login, we need to handle it
      if (window.location.hash === "#/login") {
        console.log("Hash already set to login, rendering login page");
        state.isInitialized = true;
        handleRouteChange();
      }
      return;
    }
    
    // Mark as initialized
    state.isInitialized = true;

    // Handle route changes
    window.addEventListener("hashchange", handleRouteChange);

    // Initial route handling
    handleRouteChange();
  } catch (error) {
    console.error("Initialization error:", error);
    // If initialization fails, redirect to login
    await logoutUser();
  }
};

// Fallback mechanism to ensure login page renders
// This will run if the normal initialization fails
window.addEventListener('load', () => {
  // If we're on login page and nothing has rendered after 2 seconds, force render
  setTimeout(() => {
    if (window.location.hash === "#/login" && app.innerHTML.trim() === "") {
      console.log("Fallback: Forcing login page render");
      
      // Check if we can render login
      if (templates.login && app) {
        state.isInitialized = true;
        renderLogin();
      } else {
        // If templates aren't available, show a simple login form
        console.log("Fallback: Rendering simple login form");
        app.innerHTML = `
          <div class="form-container">
            <h2>Login</h2>
            <div id="login-alert"></div>
            <form id="login-form">
              <div class="form-group">
                <label for="username">Username</label>
                <input type="text" id="username" class="form-control" required />
              </div>
              <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" class="form-control" required />
              </div>
              <button type="submit" class="btn btn-primary">Login</button>
            </form>
            <p>Don't have an account? <a href="#/register">Register</a></p>
          </div>
        `;
        
        // Add basic login functionality
        const loginForm = document.getElementById("login-form");
        if (loginForm) {
          loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const username = document.getElementById("username").value;
            const password = document.getElementById("password").value;
            
            try {
              const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
                credentials: "include",
              });
              
              const data = await response.json();
              if (response.ok) {
                window.location.reload(); // Reload to get full app functionality
              } else {
                document.getElementById("login-alert").innerHTML = data.message;
                document.getElementById("login-alert").className = "alert alert-danger";
              }
            } catch (error) {
              document.getElementById("login-alert").innerHTML = "Error logging in. Please try again.";
              document.getElementById("login-alert").className = "alert alert-danger";
            }
          });
        }
      }
    }
  }, 2000);
});
