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
    return res.status(401).json({ 
      authenticated: false,
      message: "Authentication required" 
    });
  }

  // For browser requests, redirect
  res.redirect("/login");
};

// Check if user is an admin
exports.isAdmin = async (req, res, next) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ 
        authenticated: false,
        message: "Authentication required" 
      });
    }

    const user = await User.findById(req.session.userId);

    if (!user || !user.isAdmin) {
      return res.status(403).json({ 
        authenticated: true,
        authorized: false,
        message: "Access denied - admin privileges required" 
      });
    }

    next();
  } catch (error) {
    console.error("Admin auth error:", error);
    res.status(500).json({ 
      authenticated: false,
      message: "Server error during authentication" 
    });
  }
};

// Check if user is banned
exports.isNotBanned = async (req, res, next) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ 
        authenticated: false,
        message: "Authentication required" 
      });
    }

    const user = await User.findById(req.session.userId);

    if (!user || user.isBanned) {
      req.session.destroy();
      return res.status(403).json({ 
        authenticated: false,
        message: "Your account has been banned" 
      });
    }

    next();
  } catch (error) {
    console.error("Ban check error:", error);
    res.status(500).json({ 
      authenticated: false,
      message: "Server error during authentication" 
    });
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
      // For API requests, return JSON error
      if (req.path.startsWith("/api/")) {
        // Allow certain API endpoints even in leaderboard mode
        const allowedApiPaths = [
          "/api/auth/login",
          "/api/auth/register", 
          "/api/auth/status",
          "/api/leaderboard",
          "/api/admin/site-config/public"
        ];
        
        if (allowedApiPaths.includes(req.path)) {
          return next();
        }
        
        return res.status(403).json({ 
          authenticated: false,
          message: "Challenges are not available in leaderboard mode" 
        });
      }

      // For browser requests, redirect to leaderboard
      const allowedPaths = ["/leaderboard", "/login", "/register", "/"];

      if (!allowedPaths.includes(req.path) && !req.path.startsWith("/public")) {
        return res.redirect("/leaderboard");
      }
    }

    next();
  } catch (error) {
    console.error("Site mode check error:", error);
    
    // For API requests, return JSON error
    if (req.path.startsWith("/api/")) {
      return res.status(500).json({ 
        authenticated: false,
        message: "Server error during site mode check" 
      });
    }
    
    // For browser requests, redirect to error page
    res.redirect("/");
  }
};
