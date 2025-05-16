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

    // Sort by number of challenges solved (descending) first,
    // then by submission index (ascending) for tiebreakers
    leaderboard.sort((a, b) => {
      // First, compare by number of challenges solved (descending)
      if (b.challengesSolved !== a.challengesSolved) {
        return b.challengesSolved - a.challengesSolved;
      }
      
      // If same number of challenges, sort by earliest submission index (ascending)
      return a.submissionIndex - b.submissionIndex;
    });

    res.json({ leaderboard });
  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
