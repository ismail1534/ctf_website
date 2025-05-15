const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { isAuthenticated } = require("../middleware/auth");

// Register route
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User with that email or username already exists",
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
    });

    await user.save();

    // Set session
    req.session.userId = user._id;
    req.session.user = {
      id: user._id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
    };

    // Save session explicitly
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ message: "Session error" });
      }

      res.status(201).json({
        message: "User registered successfully",
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          isAdmin: user.isAdmin,
        },
      });
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Error registering user" });
  }
});

// Login route
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(`Login attempt for: ${username}`);

    // Find user by username
    const user = await User.findOne({ username });

    if (!user) {
      console.log(`User not found: ${username}`);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check if the user is banned
    if (user.isBanned) {
      console.log(`Banned user login attempt: ${username}`);
      return res.status(403).json({ message: "Your account has been banned" });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      console.log(`Invalid password for: ${username}`);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Set session
    req.session.userId = user._id;
    req.session.user = {
      id: user._id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
    };
    console.log(`Login successful for: ${username}, session:`, req.sessionID);

    // Save the session explicitly
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ message: "Session error" });
      }

      res.json({
        message: "Login successful",
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          isAdmin: user.isAdmin,
        },
      });
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Admin login route
router.post("/admin/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(`Admin login attempt for: ${username}`);

    // Find user by username
    const user = await User.findOne({ username, isAdmin: true });

    if (!user) {
      console.log(`Admin user not found: ${username}`);
      return res.status(400).json({ message: "Invalid admin credentials" });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      console.log(`Invalid admin password for: ${username}`);
      return res.status(400).json({ message: "Invalid admin credentials" });
    }

    // Set session
    req.session.userId = user._id;
    req.session.user = {
      id: user._id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
    };

    console.log(`Admin login successful for: ${username}, session:`, req.sessionID);

    // Save session explicitly
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ message: "Session error" });
      }

      res.json({
        message: "Admin login successful",
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          isAdmin: user.isAdmin,
        },
      });
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Logout route
router.get("/logout", (req, res) => {
  console.log("Logout called, destroying session:", req.sessionID);

  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destruction error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }

      // Clear the cookie
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  } else {
    res.json({ message: "Already logged out" });
  }
});

// Get current user
router.get("/me", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
        solvedChallenges: user.solvedChallenges,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Healthcheck/status route
router.get("/status", (req, res) => {
  console.log("Status check, session ID:", req.sessionID);
  console.log("Cookie header:", req.headers.cookie);

  return res.json({
    success: true,
    message: "API is running",
    hasSession: !!req.session.userId,
    sessionID: req.sessionID,
  });
});

module.exports = router;
