// Render leaderboard page
const renderLeaderboard = async () => {
  state.currentPage = "leaderboard";
  app.appendChild(templates.leaderboard.content.cloneNode(true));

  const leaderboardBody = document.getElementById("leaderboard-body");
  const leaderboardAlert = document.getElementById("leaderboard-alert");

  // Load leaderboard data
  try {
    const response = await fetch(`${API_BASE_URL}/api/leaderboard`, {
      credentials: "include",
    });
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    const data = await response.json();

    state.leaderboard = data.leaderboard || [];

    if (state.leaderboard.length === 0) {
      leaderboardAlert.innerHTML = "No entries in the leaderboard yet.";
      leaderboardAlert.className = "alert alert-info";
      return;
    }

    // Render leaderboard
    renderLeaderboardEntries();

    // Set up auto-refresh for the leaderboard
    setupLeaderboardRefresh();
  } catch (error) {
    console.error("Leaderboard error:", error);
    leaderboardAlert.innerHTML = "Error loading leaderboard. Please try again.";
    leaderboardAlert.className = "alert alert-danger";
  }
};

// Render leaderboard entries
const renderLeaderboardEntries = () => {
  const leaderboardBody = document.getElementById("leaderboard-body");
  leaderboardBody.innerHTML = "";

  state.leaderboard.forEach((entry, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${entry.username}</td>
      <td>${entry.challengesSolved}</td>
    `;

    leaderboardBody.appendChild(row);
  });
};

// Set up auto-refresh for the leaderboard
const setupLeaderboardRefresh = () => {
  // Clear any existing timers
  if (state.leaderboardTimer) {
    clearInterval(state.leaderboardTimer);
  }

  // Refresh leaderboard every 30 seconds
  state.leaderboardTimer = setInterval(async () => {
    if (state.currentPage !== "leaderboard") {
      clearInterval(state.leaderboardTimer);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/leaderboard`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      const data = await response.json();

      state.leaderboard = data.leaderboard || [];

      // Update leaderboard if the element still exists
      const leaderboardBody = document.getElementById("leaderboard-body");
      if (leaderboardBody) {
        renderLeaderboardEntries();
      }
    } catch (error) {
      console.error("Leaderboard refresh error:", error);
    }
  }, 30000); // 30 seconds
};
