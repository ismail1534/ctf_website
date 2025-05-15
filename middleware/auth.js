const User = require("../models/User");
const SiteConfig = require("../models/SiteConfig");

// Check if user is authenticated
exports.isAuthenticated = (req, res, next) => {
  console.log("Checking authentication, session userId:", req.session.userId);

  if (req.session && req.session.userId) {
    return next();
  }

  // For API requests, return JSON
  if (req.path.startsWith("/api/")) {
    return res.status(401).json({ message: "Authentication required" });
  }

  // For browser requests, redirect
  res.redirect("/login");
};

// Check if user is an admin
exports.isAdmin = async (req, res, next) => {
  try {
    if (!req.session.userId) {
      return res.redirect("/login");
    }

    const user = await User.findById(req.session.userId);

    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }

    next();
  } catch (error) {
    console.error("Admin auth error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Check if user is banned
exports.isNotBanned = async (req, res, next) => {
  try {
    if (!req.session.userId) {
      return res.redirect("/login");
    }

    const user = await User.findById(req.session.userId);

    if (!user || user.isBanned) {
      req.session.destroy();
      return res.redirect("/login?error=Your account has been banned");
    }

    next();
  } catch (error) {
    console.error("Ban check error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Check site mode middleware
exports.checkSiteMode = async (req, res, next) => {
  try {
    // Allow admin access regardless of site mode
    if (req.session.userId) {
      const user = await User.findById(req.session.userId);
      if (user && user.isAdmin) {
        return next();
      }
    }

    const siteConfig = await SiteConfig.getConfig();

    // If we're in leaderboard only mode, only allow access to leaderboard, login and registration
    if (siteConfig.siteMode === "leaderboard_only") {
      const allowedPaths = ["/leaderboard", "/login", "/register", "/"];

      if (!allowedPaths.includes(req.path) && !req.path.startsWith("/public")) {
        return res.redirect("/leaderboard");
      }
    }

    next();
  } catch (error) {
    console.error("Site mode check error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
