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
    const isSolved = state.user && state.user.solvedChallenges && 
                     state.user.solvedChallenges.includes(challenge._id);
    
    const solvedBadge = isSolved ? 
      '<span class="solved-badge"><i class="fas fa-check-circle"></i> Solved</span>' : '';
    
    challengeElement.innerHTML = `
      ${solvedBadge}
      <h3><i class="fas fa-puzzle-piece"></i> ${challenge.title}</h3>
      <p>${challenge.description.substring(0, 100)}${challenge.description.length > 100 ? "..." : ""}</p>
      <button class="btn btn-primary view-challenge" data-id="${challenge._id}">
        <i class="fas fa-eye"></i> View Challenge
      </button>
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

  // Fill modal with challenge data
  modalTitle.textContent = challenge.title;
  modalDescription.textContent = challenge.description;

  // Show or hide file download link
  if (challenge.file) {
    modalFileContainer.style.display = "block";
    modalFileLink.href = `${API_BASE_URL}/api/challenges/download/${challenge._id}`;
    modalFileLink.textContent = `Download ${challenge.file.originalName}`;
  } else {
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
