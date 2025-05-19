// Render admin area
const renderAdminArea = (path) => {
  state.currentPage = "admin";

  // Render the admin dashboard template
  app.appendChild(templates.adminDashboard.content.cloneNode(true));

  const adminContent = document.getElementById("admin-content");

  // Route to the correct admin section
  if (path === "/admin" || path === "/admin/") {
    adminContent.innerHTML = `
      <h2>Admin Dashboard</h2>
      <p>Welcome to the admin panel. Select an option from the sidebar.</p>
    `;
  } else if (path === "/admin/challenges") {
    renderAdminChallenges();
  } else if (path === "/admin/users") {
    renderAdminUsers();
  } else if (path === "/admin/site-config") {
    renderAdminSiteConfig();
  }
};

// Render admin challenges section
const renderAdminChallenges = async () => {
  const adminContent = document.getElementById("admin-content");
  adminContent.innerHTML = "";

  // Clone the template
  const challengesTemplate = templates.adminChallenges.content.cloneNode(true);
  adminContent.appendChild(challengesTemplate);

  // Get elements
  const challengesAlert = document.getElementById("admin-challenges-alert");
  const addChallengeBtn = document.getElementById("add-challenge-btn");
  const challengeFormContainer = document.getElementById("challenge-form-container");
  const challengeForm = document.getElementById("challenge-form");
  const cancelChallengeBtn = document.getElementById("cancel-challenge");
  const challengesBody = document.getElementById("challenges-body");

  // Load challenges
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/challenges`, {
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    const data = await response.json();

    renderChallengesTable(data.challenges || []);
  } catch (error) {
    console.error("Admin challenges error:", error);
    challengesAlert.innerHTML = "Error loading challenges. Please try again.";
    challengesAlert.className = "alert alert-danger";
  }

  // Add challenge button handler
  addChallengeBtn.addEventListener("click", () => {
    // Reset form
    challengeForm.reset();
    document.getElementById("challenge-id").value = "";
    document.getElementById("challenge-form-title").textContent = "Add Challenge";

    // Show form
    challengeFormContainer.style.display = "block";
  });

  // Cancel button handler
  cancelChallengeBtn.addEventListener("click", () => {
    challengeFormContainer.style.display = "none";
  });

  // Challenge form submission
  challengeForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Get form data
    const challengeId = document.getElementById("challenge-id").value;
    const fileUrl = document.getElementById("challenge-file-url").value.trim();

    // Create FormData object
    const formData = new FormData();

    // Add the required fields with correct names
    formData.append("title", document.getElementById("challenge-title").value);
    formData.append("description", document.getElementById("challenge-description").value);
    formData.append("flag", document.getElementById("challenge-flag").value);

    // Add new optional fields
    formData.append("hint", document.getElementById("challenge-hint").value);

    // Handle deadline timezone properly - convert to Pakistan timezone before saving
    const deadlineInput = document.getElementById("challenge-deadline").value;
    if (deadlineInput) {
      // Convert the input datetime to a Date object
      const inputDate = new Date(deadlineInput);

      // Create a formatter that will output the date in ISO format with Pakistan timezone offset
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Karachi",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

      // Format the date and convert it to ISO format
      const parts = formatter.formatToParts(inputDate);
      const dateObj = {};
      parts.forEach((part) => {
        if (part.type !== "literal") {
          dateObj[part.type] = part.value;
        }
      });

      // Create a UTC ISO string but preserving the Pakistan time values
      const pkTime = `${dateObj.year}-${dateObj.month}-${dateObj.day}T${dateObj.hour}:${dateObj.minute}:${dateObj.second}.000Z`;
      formData.append("deadline", pkTime);
    } else {
      formData.append("deadline", "");
    }

    formData.append("author", document.getElementById("challenge-author").value);

    // Add fileUrl if provided
    if (fileUrl) {
      formData.append("fileUrl", fileUrl);
    }

    // Add file if selected and no URL is provided
    const fileInput = document.getElementById("challenge-file");
    if (fileInput.files.length > 0) {
      formData.append("file", fileInput.files[0]);
    }

    try {
      let response;

      if (challengeId) {
        // Update challenge
        response = await fetch(`${API_BASE_URL}/api/admin/challenges/${challengeId}`, {
          method: "PUT",
          body: formData,
          credentials: "include",
        });
      } else {
        // Create challenge
        response = await fetch(`${API_BASE_URL}/api/admin/challenges`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });
      }

      const data = await response.json();

      if (response.ok) {
        challengesAlert.innerHTML = data.message;
        challengesAlert.className = "alert alert-success";

        // Reload challenges
        const challengesResponse = await fetch(`${API_BASE_URL}/api/admin/challenges`, {
          credentials: "include",
        });
        const challengesData = await challengesResponse.json();

        renderChallengesTable(challengesData.challenges || []);

        // Hide form
        challengeFormContainer.style.display = "none";
      } else {
        challengesAlert.innerHTML = data.message || "Server error";
        challengesAlert.className = "alert alert-danger";
      }
    } catch (error) {
      console.error("Challenge form error:", error);
      challengesAlert.innerHTML = "Error submitting form. Please try again.";
      challengesAlert.className = "alert alert-danger";
    }
  });
};

// Render challenges table
const renderChallengesTable = (challenges) => {
  const challengesBody = document.getElementById("challenges-body");
  challengesBody.innerHTML = "";

  if (!challenges || challenges.length === 0) {
    // Handle empty challenges
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="5">No challenges found</td>`;
    challengesBody.appendChild(row);
    return;
  }

  challenges.forEach((challenge) => {
    const row = document.createElement("tr");

    // Determine file display text
    let fileDisplay = "No file";
    if (challenge.fileUrl) {
      fileDisplay = `<a href="${challenge.fileUrl}" target="_blank" class="file-link">External URL</a>`;
    } else if (challenge.file && challenge.file.originalName) {
      fileDisplay = challenge.file.originalName;
    }

    row.innerHTML = `
      <td>${challenge.title}</td>
      <td>${challenge.description.substring(0, 50)}${challenge.description.length > 50 ? "..." : ""}</td>
      <td>${challenge.flag}</td>
      <td>${fileDisplay}</td>
      <td>
        <button class="btn btn-primary edit-challenge" data-id="${challenge._id}">Edit</button>
        <button class="btn btn-danger delete-challenge" data-id="${challenge._id}">Delete</button>
      </td>
    `;

    challengesBody.appendChild(row);
  });

  // Add event listeners to buttons
  document.querySelectorAll(".edit-challenge").forEach((button) => {
    button.addEventListener("click", async () => {
      await editChallenge(button.getAttribute("data-id"));
    });
  });

  document.querySelectorAll(".delete-challenge").forEach((button) => {
    button.addEventListener("click", async () => {
      await deleteChallenge(button.getAttribute("data-id"));
    });
  });
};

// Edit challenge
const editChallenge = async (challengeId) => {
  try {
    // Get challenges from API
    const response = await fetch(`${API_BASE_URL}/api/admin/challenges`, {
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    const data = await response.json();

    // Find the challenge by ID
    const challenge = data.challenges.find((c) => c._id === challengeId);
    if (!challenge) {
      throw new Error("Challenge not found");
    }

    // Get form elements
    const challengeForm = document.getElementById("challenge-form");
    const challengeFormTitle = document.getElementById("challenge-form-title");
    const challengeFormContainer = document.getElementById("challenge-form-container");

    // Set form title
    challengeFormTitle.textContent = "Edit Challenge";

    // Populate form fields
    document.getElementById("challenge-id").value = challenge._id;
    document.getElementById("challenge-title").value = challenge.title;
    document.getElementById("challenge-description").value = challenge.description;
    document.getElementById("challenge-flag").value = challenge.flag;

    // Populate new fields
    document.getElementById("challenge-hint").value = challenge.hint || "";
    document.getElementById("challenge-author").value = challenge.author || "";

    // Format and set deadline if it exists
    if (challenge.deadline) {
      // Convert UTC date to Pakistan timezone for display in the form
      const date = new Date(challenge.deadline);

      // Use formatter to get date parts in Pakistan timezone
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Karachi",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const parts = formatter.formatToParts(date);
      const dateObj = {};
      parts.forEach((part) => {
        if (part.type !== "literal") {
          dateObj[part.type] = part.value;
        }
      });

      // Format for datetime-local input (YYYY-MM-DDThh:mm)
      const formattedDate = `${dateObj.year}-${dateObj.month}-${dateObj.day}T${dateObj.hour}:${dateObj.minute}`;
      document.getElementById("challenge-deadline").value = formattedDate;
    } else {
      document.getElementById("challenge-deadline").value = "";
    }

    // Populate file URL if exists
    if (challenge.fileUrl) {
      document.getElementById("challenge-file-url").value = challenge.fileUrl;
    } else {
      document.getElementById("challenge-file-url").value = "";
    }

    // Show current file name if exists
    const fileInput = document.getElementById("challenge-file");
    fileInput.value = ""; // Clear the file input

    // Remove any previous file name label
    const existingFileLabel = document.querySelector(".current-file-name");
    if (existingFileLabel) {
      existingFileLabel.remove();
    }

    if (challenge.file && challenge.file.originalName) {
      const fileLabel = document.createElement("div");
      fileLabel.className = "current-file-name";
      fileLabel.innerHTML = `Current file: <strong>${challenge.file.originalName}</strong>`;
      fileInput.parentNode.insertBefore(fileLabel, fileInput.nextSibling);
    }

    // Show form
    challengeFormContainer.style.display = "block";
  } catch (error) {
    console.error("Edit challenge error:", error);
    document.getElementById("admin-challenges-alert").innerHTML = "Error loading challenge for editing. Please try again.";
    document.getElementById("admin-challenges-alert").className = "alert alert-danger";
  }
};

// Delete challenge
const deleteChallenge = async (challengeId) => {
  if (!confirm("Are you sure you want to delete this challenge?")) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/challenges/${challengeId}`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = await response.json();

    if (response.ok) {
      document.getElementById("admin-challenges-alert").innerHTML = data.message;
      document.getElementById("admin-challenges-alert").className = "alert alert-success";

      // Reload challenges
      const challengesResponse = await fetch(`${API_BASE_URL}/api/admin/challenges`, {
        credentials: "include",
      });
      const challengesData = await challengesResponse.json();

      renderChallengesTable(challengesData.challenges || []);
    } else {
      document.getElementById("admin-challenges-alert").innerHTML = data.message;
      document.getElementById("admin-challenges-alert").className = "alert alert-danger";
    }
  } catch (error) {
    console.error("Delete challenge error:", error);
    document.getElementById("admin-challenges-alert").innerHTML = "Error deleting challenge. Please try again.";
    document.getElementById("admin-challenges-alert").className = "alert alert-danger";
  }
};

// Render admin users section
const renderAdminUsers = async () => {
  const adminContent = document.getElementById("admin-content");
  adminContent.innerHTML = "";

  // Clone the template
  const usersTemplate = templates.adminUsers.content.cloneNode(true);
  adminContent.appendChild(usersTemplate);

  // Get elements
  const usersAlert = document.getElementById("admin-users-alert");
  const usersBody = document.getElementById("users-body");

  // Load users
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    const data = await response.json();

    renderUsersTable(data.users || []);
  } catch (error) {
    console.error("Admin users error:", error);
    usersAlert.innerHTML = "Error loading users. Please try again.";
    usersAlert.className = "alert alert-danger";
  }
};

// Render users table
const renderUsersTable = (users) => {
  const usersBody = document.getElementById("users-body");
  usersBody.innerHTML = "";

  if (!users || users.length === 0) {
    // Handle empty users
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="6">No users found</td>`;
    usersBody.appendChild(row);
    return;
  }

  users.forEach((user) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${user.username}</td>
      <td>${user.email}</td>
      <td>${user.isAdmin ? "Yes" : "No"}</td>
      <td>${user.isBanned ? "Yes" : "No"}</td>
      <td>${user.solvedChallenges ? user.solvedChallenges.length : 0}</td>
      <td>
        ${
          user.isBanned
            ? `<button class="btn btn-success unban-user" data-id="${user._id}">Unban</button>`
            : `<button class="btn btn-danger ban-user" data-id="${user._id}">Ban</button>`
        }
      </td>
    `;

    usersBody.appendChild(row);
  });

  // Add event listeners to buttons
  document.querySelectorAll(".ban-user").forEach((button) => {
    button.addEventListener("click", async () => {
      await banUser(button.getAttribute("data-id"), true);
    });
  });

  document.querySelectorAll(".unban-user").forEach((button) => {
    button.addEventListener("click", async () => {
      await banUser(button.getAttribute("data-id"), false);
    });
  });
};

// Ban/unban user
const banUser = async (userId, banned) => {
  const message = banned ? "ban" : "unban";

  if (!confirm(`Are you sure you want to ${message} this user?`)) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/ban`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ banned }),
      credentials: "include",
    });

    const data = await response.json();

    if (response.ok) {
      document.getElementById("admin-users-alert").innerHTML = data.message;
      document.getElementById("admin-users-alert").className = "alert alert-success";

      // Reload users
      const usersResponse = await fetch(`${API_BASE_URL}/api/admin/users`, {
        credentials: "include",
      });
      const usersData = await usersResponse.json();

      renderUsersTable(usersData.users || []);
    } else {
      document.getElementById("admin-users-alert").innerHTML = data.message;
      document.getElementById("admin-users-alert").className = "alert alert-danger";
    }
  } catch (error) {
    console.error("Ban user error:", error);
    document.getElementById("admin-users-alert").innerHTML = `Error ${message}ning user. Please try again.`;
    document.getElementById("admin-users-alert").className = "alert alert-danger";
  }
};

// Render admin site config section
const renderAdminSiteConfig = async () => {
  const adminContent = document.getElementById("admin-content");
  adminContent.innerHTML = "";

  // Clone the template
  const configTemplate = templates.adminSiteConfig.content.cloneNode(true);
  adminContent.appendChild(configTemplate);

  // Get elements
  const configAlert = document.getElementById("admin-config-alert");
  const configForm = document.getElementById("site-config-form");
  const siteModeSelect = document.getElementById("site-mode");

  // Load site config
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/site-config`, {
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    const data = await response.json();

    // Set current mode
    siteModeSelect.value = data.config.siteMode;
  } catch (error) {
    console.error("Admin site config error:", error);
    configAlert.innerHTML = "Error loading site configuration. Please try again.";
    configAlert.className = "alert alert-danger";
  }

  // Form submission
  configForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/site-config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ siteMode: siteModeSelect.value }),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        configAlert.innerHTML = data.message;
        configAlert.className = "alert alert-success";
      } else {
        configAlert.innerHTML = data.message || "Server error";
        configAlert.className = "alert alert-danger";
      }
    } catch (error) {
      console.error("Update site config error:", error);
      configAlert.innerHTML = "Error updating site configuration. Please try again.";
      configAlert.className = "alert alert-danger";
    }
  });
};
