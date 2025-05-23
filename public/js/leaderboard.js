// Render leaderboard page
const renderLeaderboard = async () => {
  state.currentPage = "leaderboard";
  app.appendChild(templates.leaderboard.content.cloneNode(true));

  const leaderboardAlert = document.getElementById("leaderboard-alert");

  // Setup tab switching
  const weeklyTab = document.getElementById("weekly-tab");
  const allTimeTab = document.getElementById("all-time-tab");
  const weeklyLeaderboard = document.getElementById("weekly-leaderboard");
  const allTimeLeaderboard = document.getElementById("all-time-leaderboard");

  weeklyTab.addEventListener("click", () => {
    weeklyTab.classList.add("active");
    allTimeTab.classList.remove("active");
    weeklyLeaderboard.classList.add("active");
    allTimeLeaderboard.classList.remove("active");
  });

  allTimeTab.addEventListener("click", () => {
    allTimeTab.classList.add("active");
    weeklyTab.classList.remove("active");
    allTimeLeaderboard.classList.add("active");
    weeklyLeaderboard.classList.remove("active");
  });

  // Load both leaderboards
  try {
    // Load weekly leaderboard
    const weeklyResponse = await fetch(`${API_BASE_URL}/api/leaderboard/weekly`, {
      credentials: "include",
    });
    if (!weeklyResponse.ok) {
      throw new Error(`Server returned ${weeklyResponse.status}`);
    }
    const weeklyData = await weeklyResponse.json();
    state.weeklyLeaderboard = weeklyData.leaderboard || [];

    // Load all-time leaderboard
    const allTimeResponse = await fetch(`${API_BASE_URL}/api/leaderboard/all-time`, {
      credentials: "include",
    });
    if (!allTimeResponse.ok) {
      throw new Error(`Server returned ${allTimeResponse.status}`);
    }
    const allTimeData = await allTimeResponse.json();
    state.allTimeLeaderboard = allTimeData.leaderboard || [];

    // Show message if both leaderboards are empty
    if (state.weeklyLeaderboard.length === 0 && state.allTimeLeaderboard.length === 0) {
      leaderboardAlert.innerHTML = "No entries in the leaderboard yet.";
      leaderboardAlert.className = "alert alert-info";
      return;
    }

    // Render both leaderboards
    renderWeeklyLeaderboard();
    renderAllTimeLeaderboard();

    // Set up auto-refresh for the leaderboard
    setupLeaderboardRefresh();
  } catch (error) {
    console.error("Leaderboard error:", error);
    leaderboardAlert.innerHTML = "Error loading leaderboard. Please try again.";
    leaderboardAlert.className = "alert alert-danger";
  }
};

// Render weekly leaderboard entries
const renderWeeklyLeaderboard = () => {
  const leaderboardBody = document.getElementById("weekly-leaderboard-body");
  leaderboardBody.innerHTML = "";

  if (state.weeklyLeaderboard.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="3">No challenges solved this week</td>';
    leaderboardBody.appendChild(row);
    return;
  }

  state.weeklyLeaderboard.forEach((entry, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${entry.username}</td>
      <td>${entry.challengesSolved}</td>
    `;

    leaderboardBody.appendChild(row);
  });
};

// Render all-time leaderboard entries
const renderAllTimeLeaderboard = () => {
  const leaderboardBody = document.getElementById("all-time-leaderboard-body");
  leaderboardBody.innerHTML = "";

  if (state.allTimeLeaderboard.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="3">No challenges solved yet</td>';
    leaderboardBody.appendChild(row);
    return;
  }

  state.allTimeLeaderboard.forEach((entry, index) => {
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
      // Refresh weekly leaderboard
      const weeklyResponse = await fetch(`${API_BASE_URL}/api/leaderboard/weekly`, {
        credentials: "include",
      });
      if (weeklyResponse.ok) {
        const weeklyData = await weeklyResponse.json();
        state.weeklyLeaderboard = weeklyData.leaderboard || [];
        renderWeeklyLeaderboard();
      }

      // Refresh all-time leaderboard
      const allTimeResponse = await fetch(`${API_BASE_URL}/api/leaderboard/all-time`, {
        credentials: "include",
      });
      if (allTimeResponse.ok) {
        const allTimeData = await allTimeResponse.json();
        state.allTimeLeaderboard = allTimeData.leaderboard || [];
        renderAllTimeLeaderboard();
      }
    } catch (error) {
      console.error("Leaderboard refresh error:", error);
    }
  }, 30000); // 30 seconds
};
