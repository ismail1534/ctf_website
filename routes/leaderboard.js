const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Challenge = require("../models/Challenge");

// Get all-time leaderboard data
router.get("/all-time", async (req, res) => {
  try {
    // Find all users with solved challenges
    const users = await User.find({
      "solvedChallenges.0": { $exists: true },
      isBanned: false,
    }).select("username solvedChallenges");

    // Process users for leaderboard display
    const leaderboard = users.map((user) => {
      // Get the lowest submission index to determine user ranking
      const minSubmissionIndex = Math.min(...user.solvedChallenges.map((solved) => solved.submissionIndex || Infinity));

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

// Get weekly leaderboard data
router.get("/weekly", async (req, res) => {
  try {
    // First, get all weekly challenges (to filter user submissions)
    const weeklyChallenges = await Challenge.find({ isWeekly: true });
    const weeklyChallengeIds = weeklyChallenges.map(c => c._id.toString());
    
    // Find all users with solved challenges
    const users = await User.find({
      "solvedChallenges.0": { $exists: true },
      isBanned: false,
    }).select("username solvedChallenges");

    // Process users for weekly leaderboard display
    const leaderboard = users
      .map((user) => {
        // Filter only challenges that are marked as weekly
        const weeklySolved = user.solvedChallenges.filter(
          solved => solved.challenge && weeklyChallengeIds.includes(solved.challenge.toString())
        );
        
        // Get the lowest submission index for weekly challenges to determine user ranking
        const minSubmissionIndex = weeklySolved.length > 0 
          ? Math.min(...weeklySolved.map((solved) => solved.submissionIndex || Infinity))
          : Infinity;

        return {
          username: user.username,
          challengesSolved: weeklySolved.length,
          submissionIndex: minSubmissionIndex,
        };
      })
      // Filter out users with no weekly challenges solved
      .filter(user => user.challengesSolved > 0);

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
    console.error("Weekly leaderboard error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get combined leaderboard data (for backward compatibility)
router.get("/", async (req, res) => {
  try {
    // Redirect to all-time leaderboard for backward compatibility
    const response = await fetch(`${req.protocol}://${req.get('host')}/api/leaderboard/all-time`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
