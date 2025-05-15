// Render login page
const renderLogin = () => {
  state.currentPage = "login";
  app.appendChild(templates.login.content.cloneNode(true));

  // Login form handler
  const loginForm = document.getElementById("login-form");
  const loginAlert = document.getElementById("login-alert");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        state.user = data.user;
        loginAlert.innerHTML = data.message;
        loginAlert.className = "alert alert-success";

        // Redirect to dashboard after login
        setTimeout(() => {
          navigateTo("/dashboard");
        }, 1000);
      } else {
        loginAlert.innerHTML = data.message;
        loginAlert.className = "alert alert-danger";
      }
    } catch (error) {
      console.error("Login error:", error);
      loginAlert.innerHTML = "Error logging in. Please try again.";
      loginAlert.className = "alert alert-danger";
    }
  });
};

// Render register page
const renderRegister = () => {
  state.currentPage = "register";
  app.appendChild(templates.register.content.cloneNode(true));

  // Register form handler
  const registerForm = document.getElementById("register-form");
  const registerAlert = document.getElementById("register-alert");

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("reg-username").value;
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-password").value;
    const confirmPassword = document.getElementById("reg-confirm-password").value;

    // Validate password match
    if (password !== confirmPassword) {
      registerAlert.innerHTML = "Passwords do not match";
      registerAlert.className = "alert alert-danger";
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password }),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        state.user = data.user;
        registerAlert.innerHTML = data.message;
        registerAlert.className = "alert alert-success";

        // Redirect to dashboard after registration
        setTimeout(() => {
          navigateTo("/dashboard");
        }, 1000);
      } else {
        registerAlert.innerHTML = data.message;
        registerAlert.className = "alert alert-danger";
      }
    } catch (error) {
      console.error("Registration error:", error);
      registerAlert.innerHTML = "Error registering. Please try again.";
      registerAlert.className = "alert alert-danger";
    }
  });
};

// Render admin login page
const renderAdminLogin = () => {
  state.currentPage = "adminLogin";
  app.appendChild(templates.adminLogin.content.cloneNode(true));

  // Admin login form handler
  const adminLoginForm = document.getElementById("admin-login-form");
  const adminLoginAlert = document.getElementById("admin-login-alert");

  adminLoginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("admin-username").value;
    const password = document.getElementById("admin-password").value;

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        state.user = data.user;
        adminLoginAlert.innerHTML = data.message;
        adminLoginAlert.className = "alert alert-success";

        // Redirect to admin dashboard after login
        setTimeout(() => {
          navigateTo("/admin");
        }, 1000);
      } else {
        adminLoginAlert.innerHTML = data.message;
        adminLoginAlert.className = "alert alert-danger";
      }
    } catch (error) {
      console.error("Admin login error:", error);
      adminLoginAlert.innerHTML = "Error logging in. Please try again.";
      adminLoginAlert.className = "alert alert-danger";
    }
  });
};

// Call init to initialize the app
document.addEventListener("DOMContentLoaded", init);
