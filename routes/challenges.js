const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Challenge = require("../models/Challenge");
const User = require("../models/User");
const SiteConfig = require("../models/SiteConfig");
const { isAuthenticated, isNotBanned } = require("../middleware/auth");
const path = require("path");
const fs = require("fs");

// In-memory lock to prevent concurrent submissions by the same user for the same challenge
// This is a lightweight protection against burst submissions. It complements DB-level transaction safety.
const submissionLocks = new Set();

// Middleware to check if site is in leaderboard mode
const checkNotLeaderboardMode = async (req, res, next) => {
  try {
    const siteConfig = await SiteConfig.getConfig();

    if (siteConfig.siteMode === "leaderboard_only") {
      return res.status(403).json({
        message: "Challenge submissions are disabled in leaderboard mode",
      });
    }

    next();
  } catch (error) {
    console.error("Site mode check error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all challenges
router.get("/", isAuthenticated, isNotBanned, async (req, res) => {
  try {
    // Check site mode first
    const siteConfig = await SiteConfig.getConfig();

    if (siteConfig.siteMode === "leaderboard_only") {
      return res.status(403).json({
        message: "Challenges are not available in leaderboard mode",
      });
    }

    // Get challenges but don't return the flag field, sorted by newest first
    const challenges = await Challenge.find().select("-flag").sort({ createdAt: -1 });
    res.json({ challenges });
  } catch (error) {
    console.error("Get challenges error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Download challenge file - improved version with better error handling
router.get("/download/:id", isAuthenticated, isNotBanned, checkNotLeaderboardMode, async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);

    if (!challenge || !challenge.file) {
      return res.status(404).json({ message: "Challenge file not found" });
    }

    const filePath = path.join(__dirname, "..", challenge.file.path);

    // Check if file exists before trying to download
    if (!fs.existsSync(filePath)) {
      console.error(`File not found at path: ${filePath}`);
      return res.status(404).json({ message: "File not found on server" });
    }

    // Log successful download attempt
    console.log(`Sending file: ${filePath} as ${challenge.file.originalName}`);

    // Set content disposition explicitly for better download handling
    res.setHeader("Content-Disposition", `attachment; filename="${challenge.file.originalName}"`);
    res.setHeader("Content-Type", "application/octet-stream");

    // Send file with explicit options
    res.sendFile(
      filePath,
      {
        headers: {
          "Content-Disposition": `attachment; filename="${challenge.file.originalName}"`,
        },
      },
      (err) => {
        if (err) {
          console.error("Error sending file:", err);
          // Don't try to send another response if headers are already sent
          if (!res.headersSent) {
            res.status(500).json({ message: "Error sending file" });
          }
        }
      }
    );
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Submit flag for a challenge
router.post("/submit/:id", isAuthenticated, isNotBanned, checkNotLeaderboardMode, async (req, res) => {
  const { flag } = req.body;
  const userId = req.session.userId;
  const challengeId = req.params.id;

  const lockKey = `${userId}:${challengeId}`;
  if (submissionLocks.has(lockKey)) {
    return res.status(429).json({ message: "Another submission is being processed. Please wait." });
  }

  submissionLocks.add(lockKey);
  let session;
  try {
    session = await mongoose.startSession();

    let responsePayload = null;
    await session.withTransaction(async () => {
      // Load challenge within the transaction
      const challenge = await Challenge.findById(challengeId).session(session);
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }

      // Validate flag
      if (flag !== challenge.flag) {
        return res.status(400).json({ message: "Incorrect flag" });
      }

      // Atomically increment submission counter and get the new value
      const updatedConfig = await SiteConfig.findOneAndUpdate(
        {},
        { $inc: { submissionCount: 1 } },
        { new: true, upsert: true, session }
      );

      const submissionIndex = (updatedConfig.submissionCount || 1) - 1; // mirror previous behavior

      // Atomically add solved challenge only if not already present
      const userUpdate = await User.updateOne(
        { _id: userId, "solvedChallenges.challenge": { $ne: challengeId } },
        { $push: { solvedChallenges: { challenge: challengeId, submissionIndex, solvedAt: new Date() } } },
        { session }
      );

      if (userUpdate.modifiedCount === 0) {
        // Already solved; throw to abort transaction (rollback the counter increment)
        const err = new Error("ALREADY_SOLVED");
        err.code = "ALREADY_SOLVED";
        throw err;
      }

      responsePayload = { message: "Flag correct!", submissionIndex };
    });

    if (responsePayload) {
      return res.json(responsePayload);
    }
  } catch (error) {
    if (error && (error.code === "ALREADY_SOLVED" || error.message === "ALREADY_SOLVED")) {
      return res.status(400).json({ message: "Challenge already solved" });
    }
    console.error("Flag submission error:", error);
    return res.status(500).json({ message: "Server error" });
  } finally {
    if (session) {
      session.endSession();
    }
    submissionLocks.delete(lockKey);
  }
});

module.exports = router;
