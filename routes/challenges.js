const express = require("express");
const router = express.Router();
const Challenge = require("../models/Challenge");
const User = require("../models/User");
const SiteConfig = require("../models/SiteConfig");
const { isAuthenticated, isNotBanned } = require("../middleware/auth");
const path = require("path");
const fs = require("fs");

// Get all challenges
router.get("/", isAuthenticated, isNotBanned, async (req, res) => {
  try {
    // Get challenges but don't return the flag field
    const challenges = await Challenge.find().select("-flag");
    res.json({ challenges });
  } catch (error) {
    console.error("Get challenges error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Download challenge file - improved version with better error handling
router.get("/download/:id", isAuthenticated, isNotBanned, async (req, res) => {
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
    res.setHeader('Content-Disposition', `attachment; filename="${challenge.file.originalName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Send file with explicit options
    res.sendFile(filePath, {
      headers: {
        'Content-Disposition': `attachment; filename="${challenge.file.originalName}"`
      }
    }, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        // Don't try to send another response if headers are already sent
        if (!res.headersSent) {
          res.status(500).json({ message: "Error sending file" });
        }
      }
    });
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Submit flag for a challenge
router.post("/submit/:id", isAuthenticated, isNotBanned, async (req, res) => {
  try {
    const { flag } = req.body;
    const userId = req.session.userId;
    const challengeId = req.params.id;

    // Find the challenge
    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
      return res.status(404).json({ message: "Challenge not found" });
    }

    // Find the user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user has already solved this challenge
    const alreadySolved = user.solvedChallenges.some((solved) => solved.challenge.toString() === challengeId);

    if (alreadySolved) {
      return res.status(400).json({ message: "Challenge already solved" });
    }

    // Check if the flag is correct
    if (flag !== challenge.flag) {
      return res.status(400).json({ message: "Incorrect flag" });
    }

    // Get the site config to set submission index
    const siteConfig = await SiteConfig.getConfig();
    const submissionIndex = siteConfig.submissionCount;

    // Update the submission count in site config
    siteConfig.submissionCount += 1;
    await siteConfig.save();

    // Add the solved challenge to the user with the correct submission index
    user.solvedChallenges.push({
      challenge: challengeId,
      submissionIndex,
    });

    await user.save();

    res.json({
      message: "Flag correct!",
      submissionIndex,
    });
  } catch (error) {
    console.error("Flag submission error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
