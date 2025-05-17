// Render dashboard with challenges
const renderDashboard = async () => {
  state.currentPage = "dashboard";
  app.appendChild(templates.dashboard.content.cloneNode(true));

  const challengeList = document.getElementById("challenge-list");
  const dashboardAlert = document.getElementById("dashboard-alert");

  // Load challenges
  try {
    const response = await fetch(API_BASE_URL + "/api/challenges", {
      credentials: "include",
    });
    const data = await response.json();

    state.challenges = data.challenges;

    if (state.challenges.length === 0) {
      dashboardAlert.innerHTML = "No challenges available yet.";
      dashboardAlert.className = "alert alert-info";
      return;
    }

    // Render challenges
    renderChallenges();
  } catch (error) {
    console.error("Load challenges error:", error);
    dashboardAlert.innerHTML = "Error loading challenges. Please try again.";
    dashboardAlert.className = "alert alert-danger";
  }
};

// Render challenges in the dashboard
const renderChallenges = () => {
  const challengeList = document.getElementById("challenge-list");
  challengeList.innerHTML = "";

  state.challenges.forEach((challenge) => {
    const challengeElement = document.createElement("div");
    challengeElement.className = "challenge-item";

    // Create solved badge if the challenge is already solved
    const isSolved = state.user && state.user.solvedChallenges && state.user.solvedChallenges.includes(challenge._id);

    const solvedBadge = isSolved ? '<span class="solved-badge"><i class="fas fa-check-circle"></i> Solved</span>' : "";

    // Determine if challenge has a file
    const hasFile = challenge.fileUrl || (challenge.file && challenge.file.path);
    const fileIndicator = hasFile ? '<span class="file-indicator"><i class="fas fa-file-alt"></i> Has File</span>' : "";

    // Format deadline if it exists
    let deadlineDisplay = "";
    if (challenge.deadline) {
      const deadlineDate = new Date(challenge.deadline);
      const options = { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };
      const formattedDeadline = deadlineDate.toLocaleDateString("en-US", options);
      deadlineDisplay = `<div class="challenge-metadata"><i class="fas fa-clock"></i> Deadline: ${formattedDeadline}</div>`;
    }

    // Show author if it exists
    let authorDisplay = "";
    if (challenge.author) {
      authorDisplay = `<div class="challenge-metadata"><i class="fas fa-user-edit"></i> Author: ${challenge.author}</div>`;
    }

    challengeElement.innerHTML = `
      ${solvedBadge}
      <h3><i class="fas fa-puzzle-piece"></i> ${challenge.title}</h3>
      ${fileIndicator}
      <p>${challenge.description.substring(0, 100)}${challenge.description.length > 100 ? "..." : ""}</p>
      ${deadlineDisplay}
      ${authorDisplay}
      <div class="challenge-buttons">
        <button class="btn btn-primary view-challenge" data-id="${challenge._id}">
          <i class="fas fa-eye"></i> View Challenge
        </button>
        ${
          challenge.hint
            ? `<button class="btn btn-info show-hint" data-id="${challenge._id}">
          <i class="fas fa-lightbulb"></i> Hint
        </button>`
            : ""
        }
      </div>
    `;

    challengeList.appendChild(challengeElement);
  });

  // Add event listeners to challenge view buttons
  document.querySelectorAll(".view-challenge").forEach((button) => {
    button.addEventListener("click", () => {
      const challengeId = button.getAttribute("data-id");
      openChallengeModal(challengeId);
    });
  });

  // Add event listeners to hint buttons
  document.querySelectorAll(".show-hint").forEach((button) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      const challengeId = button.getAttribute("data-id");
      const challenge = state.challenges.find((c) => c._id === challengeId);
      if (challenge && challenge.hint) {
        showHintModal(challenge);
      }
    });
  });
};

// Show hint modal
const showHintModal = (challenge) => {
  // Create modal for hint
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.id = "hint-modal";
  modal.style.display = "block";

  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-modal">&times;</span>
      <h2>Hint for ${challenge.title}</h2>
      <div class="hint-content">
        ${challenge.hint}
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close modal handler
  const closeModal = modal.querySelector(".close-modal");
  closeModal.addEventListener("click", () => {
    document.body.removeChild(modal);
  });

  // Close modal when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });

  // Add escape key handler
  const escapeHandler = (e) => {
    if (e.key === "Escape") {
      document.body.removeChild(modal);
      window.removeEventListener("keydown", escapeHandler);
    }
  };
  window.addEventListener("keydown", escapeHandler);
};

// Open challenge modal
const openChallengeModal = (challengeId) => {
  // Find the challenge from state
  const challenge = state.challenges.find((c) => c._id === challengeId);

  if (!challenge) {
    return;
  }

  // Create modal element from template
  const modalTemplate = document.getElementById("challenge-modal-template");
  const modalElement = modalTemplate.content.cloneNode(true);

  document.body.appendChild(modalElement);

  // Get modal elements
  const modal = document.getElementById("challenge-modal");
  const modalTitle = document.getElementById("modal-title");
  const modalDescription = document.getElementById("modal-description");
  const modalFileContainer = document.getElementById("modal-file-container");
  const modalFileLink = document.getElementById("modal-file-link");
  const flagInput = document.getElementById("flag-input");
  const submitFlag = document.getElementById("submit-flag");
  const flagResult = document.getElementById("flag-result");
  const closeModal = document.querySelector(".close-modal");
  const modalMetadata = document.getElementById("modal-metadata");

  // Fill modal with challenge data
  modalTitle.textContent = challenge.title;
  modalDescription.textContent = challenge.description;

  // Add metadata (author and deadline)
  let metadataHTML = "";

  if (challenge.author) {
    metadataHTML += `<div class="metadata-item"><i class="fas fa-user-edit"></i> Author: ${challenge.author}</div>`;
  }

  if (challenge.deadline) {
    const deadlineDate = new Date(challenge.deadline);
    const options = { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };
    const formattedDeadline = deadlineDate.toLocaleDateString("en-US", options);
    metadataHTML += `<div class="metadata-item"><i class="fas fa-clock"></i> Deadline: ${formattedDeadline}</div>`;
  }

  if (metadataHTML) {
    modalMetadata.innerHTML = metadataHTML;
    modalMetadata.style.display = "block";
  } else {
    modalMetadata.style.display = "none";
  }

  // Add hint button if available
  const modalActions = document.getElementById("modal-actions");
  if (challenge.hint) {
    const hintButton = document.createElement("button");
    hintButton.className = "btn btn-info";
    hintButton.innerHTML = '<i class="fas fa-lightbulb"></i> Show Hint';
    hintButton.addEventListener("click", () => {
      showHintModal(challenge);
    });
    modalActions.appendChild(hintButton);
  }

  // Show or hide file download link
  if (challenge.fileUrl) {
    // Show container for file URL
    modalFileContainer.style.display = "block";

    // Configure as external link
    modalFileLink.href = challenge.fileUrl;
    modalFileLink.setAttribute("target", "_blank");
    modalFileLink.innerHTML = `<i class="fas fa-external-link-alt"></i> Open File`;

    // Simple click handler for logging
    modalFileLink.addEventListener("click", () => {
      console.log("Opening external file URL:", challenge.fileUrl);
    });
  } else if (challenge.file && challenge.file.path) {
    // Show container for local file
    modalFileContainer.style.display = "block";

    // Configure as download
    const downloadUrl = `${API_BASE_URL}/api/challenges/download/${challenge._id}`;
    modalFileLink.href = downloadUrl;
    modalFileLink.removeAttribute("target");
    modalFileLink.setAttribute("download", challenge.file.originalName);
    modalFileLink.innerHTML = `<i class="fas fa-download"></i> Download ${challenge.file.originalName}`;

    // Add download handling with loading indicator
    modalFileLink.addEventListener("click", async (e) => {
      e.preventDefault();

      // Create and show loading indicator
      const originalText = modalFileLink.innerHTML;
      modalFileLink.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Downloading...`;
      modalFileLink.classList.add("downloading");

      try {
        // Force download using Blob approach which is more reliable
        const response = await fetch(downloadUrl, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Download failed (${response.status})`);
        }

        // Get the file as a blob
        const blob = await response.blob();

        // Create a blob URL and trigger download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = challenge.file.originalName;
        document.body.appendChild(a);
        a.click();

        // Clean up
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Update UI to show success
        modalFileLink.innerHTML = `<i class="fas fa-check"></i> Downloaded`;
        setTimeout(() => {
          modalFileLink.innerHTML = originalText;
          modalFileLink.classList.remove("downloading");
        }, 2000);
      } catch (error) {
        console.error("Download error:", error);

        // Show error message
        modalFileLink.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Download failed`;
        setTimeout(() => {
          modalFileLink.innerHTML = originalText;
          modalFileLink.classList.remove("downloading");
        }, 2000);

        // Try one more time with a direct method as fallback
        try {
          // Create a hidden form to force download
          const form = document.createElement("form");
          form.method = "GET";
          form.action = downloadUrl;
          form.style.display = "none";

          // Add a hidden field for credentials
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = "token";
          input.value = document.cookie.replace(/(?:(?:^|.*;\s*)connect.sid\s*\=\s*([^;]*).*$)|^.*$/, "$1");

          form.appendChild(input);
          document.body.appendChild(form);
          form.submit();

          setTimeout(() => {
            document.body.removeChild(form);
          }, 100);
        } catch (fallbackError) {
          console.error("Fallback download also failed:", fallbackError);
        }
      }
    });
  } else {
    // Hide container if no file URL or local file
    modalFileContainer.style.display = "none";
  }

  // Submit flag handler
  submitFlag.addEventListener("click", async () => {
    const flag = flagInput.value.trim();

    if (!flag) {
      flagResult.innerHTML = "Please enter a flag";
      flagResult.className = "alert alert-danger";
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/challenges/submit/${challenge._id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ flag }),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        flagResult.innerHTML = `${data.message} Your submission index: ${data.submissionIndex}`;
        flagResult.className = "alert alert-success";

        // Disable submit button after successful submission
        submitFlag.disabled = true;
        flagInput.disabled = true;
      } else {
        flagResult.innerHTML = data.message;
        flagResult.className = "alert alert-danger";
      }
    } catch (error) {
      console.error("Flag submission error:", error);
      flagResult.innerHTML = "Error submitting flag. Please try again.";
      flagResult.className = "alert alert-danger";
    }
  });

  // Close modal handler
  closeModal.addEventListener("click", () => {
    document.body.removeChild(modal);
  });

  // Close modal when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });

  // Add escape key handler to close modal
  const escapeHandler = (e) => {
    if (e.key === "Escape") {
      document.body.removeChild(modal);
      window.removeEventListener("keydown", escapeHandler);
    }
  };
  window.addEventListener("keydown", escapeHandler);

  // Show the modal with animation
  modal.style.display = "block";
};
