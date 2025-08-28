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

// Get current user with enhanced session handling
router.get("/me", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Touch the session to keep it alive
    req.session.touch();

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

// Healthcheck/status route with enhanced session validation
router.get("/status", (req, res) => {
  console.log("Status check, session ID:", req.sessionID);
  console.log("Cookie header:", req.headers.cookie);
  console.log("User agent:", req.headers["user-agent"]);
  console.log("Request origin:", req.headers.origin);

  // Ensure we always return JSON
  res.setHeader("Content-Type", "application/json");

  // Check if session is valid
  if (req.session.userId && req.session.user) {
    // Touch the session to keep it alive
    req.session.touch();

    // Save session to ensure it's properly stored
    req.session.save((err) => {
      if (err) {
        console.error("Session save error in status check:", err);
        return res.status(401).json({
          authenticated: false,
          message: "Session error",
          sessionID: req.sessionID,
          user: null,
          userAgent: req.headers["user-agent"],
          origin: req.headers.origin,
          hasCookieHeader: !!req.headers.cookie,
        });
      }
    });

    // Return authenticated response
    return res.json({
      authenticated: true,
      message: "Session is valid",
      sessionID: req.sessionID,
      user: {
        username: req.session.user.username,
        isAdmin: req.session.user.isAdmin,
      },
      userAgent: req.headers["user-agent"],
      origin: req.headers.origin,
      hasCookieHeader: !!req.headers.cookie,
    });
  }

  // Session is invalid or missing
  return res.status(401).json({
    authenticated: false,
    message: "No valid session found",
    sessionID: req.sessionID,
    user: null,
    userAgent: req.headers["user-agent"],
    origin: req.headers.origin,
    hasCookieHeader: !!req.headers.cookie,
  });
});

// Bounce endpoint to establish cookie in first-party context (helps iOS Safari)
router.get("/bounce", (req, res) => {
  try {
    const redirect = req.query.redirect || "/";

    // Force a session write to ensure Set-Cookie is emitted
    if (req.session) {
      req.session.lastBounceAt = Date.now();
    }

    // Use a small HTML redirect to avoid issues with CORS on 302 in some environments
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(
      `<!doctype html><html><head><meta http-equiv="refresh" content="0;url='${redirect.replace(/'/g, '%27')}'" /></head><body>Redirecting...</body></html>`
    );
  } catch (error) {
    console.error("Bounce error:", error);
    return res.redirect("/");
  }
});

module.exports = router;
