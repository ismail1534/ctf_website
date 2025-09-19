const express = require("express");
const router = express.Router();
const User = require("../models/User");

// Get leaderboard data
router.get("/", async (req, res) => {
  try {
    // Find all users with solved challenges
    const users = await User.find({
      "solvedChallenges.0": { $exists: true },
      isBanned: false,
    }).select("username solvedChallenges");

    // Process users for leaderboard display
    const leaderboard = users.map((user) => {
      // Number of solved challenges
      const challengesSolved = user.solvedChallenges.length;

      // Determine when the user achieved their current score (Nth solve)
      // Use the highest submissionIndex among the user's solves as the timestamp of reaching this score
      const indices = user.solvedChallenges
        .map((s) => s.submissionIndex)
        .filter((v) => typeof v === "number" && !isNaN(v));

      const lastSolveIndex = indices.length > 0 ? Math.max(...indices) : Number.MAX_SAFE_INTEGER;

      return {
        username: user.username,
        challengesSolved,
        // For compatibility we can still include min index, though we don't sort by it anymore
        submissionIndex: indices.length > 0 ? Math.min(...indices) : Number.MAX_SAFE_INTEGER,
        lastSolveIndex,
      };
    });

    // Sort by number of challenges solved (descending) first,
    // then by the earliest time they reached that total (ascending lastSolveIndex)
    leaderboard.sort((a, b) => {
      if (b.challengesSolved !== a.challengesSolved) {
        return b.challengesSolved - a.challengesSolved;
      }
      // Earlier achiever of the current score stays on top
      if (a.lastSolveIndex !== b.lastSolveIndex) {
        return a.lastSolveIndex - b.lastSolveIndex;
      }
      // Stable fallback: alphabetical by username
      return a.username.localeCompare(b.username);
    });

    res.json({ leaderboard });
  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
