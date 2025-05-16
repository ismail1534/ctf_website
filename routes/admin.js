const express = require("express");
const router = express.Router();
const Challenge = require("../models/Challenge");
const User = require("../models/User");
const SiteConfig = require("../models/SiteConfig");
const { isAdmin } = require("../middleware/auth");
const upload = require("../middleware/upload");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

// Get all challenges (including flags)
router.get("/challenges", isAdmin, async (req, res) => {
  try {
    const challenges = await Challenge.find();
    res.json({ challenges });
  } catch (error) {
    console.error("Admin get challenges error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create a new challenge
router.post("/challenges", isAdmin, upload.single("file"), async (req, res) => {
  try {
    const { title, description, flag } = req.body;

    const challenge = new Challenge({
      title,
      description,
      flag,
    });

    // If a file was uploaded
    if (req.file) {
      challenge.file = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: path.join("public", "uploads", req.file.filename),
      };
    }

    await challenge.save();

    res.status(201).json({
      message: "Challenge created successfully",
      challenge,
    });
  } catch (error) {
    console.error("Create challenge error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update a challenge
router.put("/challenges/:id", isAdmin, upload.single("file"), async (req, res) => {
  try {
    const { title, description, flag } = req.body;
    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({ message: "Challenge not found" });
    }

    // Update challenge fields
    challenge.title = title || challenge.title;
    challenge.description = description || challenge.description;
    challenge.flag = flag || challenge.flag;

    // If a new file was uploaded
    if (req.file) {
      // Delete the old file if it exists
      if (challenge.file && challenge.file.path) {
        const oldFilePath = path.join(__dirname, "..", challenge.file.path);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      // Set the new file info
      challenge.file = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: path.join("public", "uploads", req.file.filename),
      };
    }

    await challenge.save();

    res.json({
      message: "Challenge updated successfully",
      challenge,
    });
  } catch (error) {
    console.error("Update challenge error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a challenge
router.delete("/challenges/:id", isAdmin, async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({ message: "Challenge not found" });
    }

    // Delete the file if it exists
    if (challenge.file && challenge.file.path) {
      const filePath = path.join(__dirname, "..", challenge.file.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Challenge.deleteOne({ _id: req.params.id });

    res.json({ message: "Challenge deleted successfully" });
  } catch (error) {
    console.error("Delete challenge error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get all users
router.get("/users", isAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json({ users });
  } catch (error) {
    console.error("Admin get users error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Ban/unban a user
router.put("/users/:id/ban", isAdmin, async (req, res) => {
  try {
    const { banned } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isBanned = !!banned;
    await user.save();

    res.json({
      message: banned ? "User banned successfully" : "User unbanned successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isBanned: user.isBanned,
      },
    });
  } catch (error) {
    console.error("Ban user error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get site configuration (admin only - with all details)
router.get("/site-config", isAdmin, async (req, res) => {
  try {
    const config = await SiteConfig.getConfig();
    res.json({ config });
  } catch (error) {
    console.error("Get site config error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Public site configuration endpoint (available to all users)
router.get("/site-config/public", async (req, res) => {
  try {
    const config = await SiteConfig.getConfig();
    // Only return the public information
    res.json({
      config: {
        siteMode: config.siteMode,
        updatedAt: config.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get public site config error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update site mode
router.put("/site-config", isAdmin, async (req, res) => {
  try {
    const { siteMode } = req.body;

    if (!siteMode || !["live", "leaderboard_only"].includes(siteMode)) {
      return res.status(400).json({ message: "Invalid site mode" });
    }

    const config = await SiteConfig.getConfig();
    config.siteMode = siteMode;
    config.updatedAt = Date.now();

    await config.save();

    res.json({
      message: "Site configuration updated successfully",
      config,
    });
  } catch (error) {
    console.error("Update site config error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
