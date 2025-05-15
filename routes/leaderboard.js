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
      // Get the lowest submission index to determine user ranking
      const minSubmissionIndex = Math.min(...user.solvedChallenges.map((solved) => solved.submissionIndex));

      return {
        username: user.username,
        challengesSolved: user.solvedChallenges.length,
        submissionIndex: minSubmissionIndex,
      };
    });

    // Sort by submission index (ascending) which represents solving order
    leaderboard.sort((a, b) => a.submissionIndex - b.submissionIndex);

    res.json({ leaderboard });
  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
