const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const path = require("path");
const dotenv = require("dotenv");
const cors = require("cors");
const MongoStore = require("connect-mongo");

// Load environment variables
dotenv.config();

// Database connection
const connectDB = require("./config/db");

// Initialize Express
const app = express();

// Connect to MongoDB
connectDB();

// Trust reverse proxy (required for secure cookies behind Koyeb/Proxies)
app.set("trust proxy", 1);
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Add CORS middleware
app.use(
  cors({
    origin: function (origin, callback) {
      console.log("Request origin:", origin);

      if (process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }

      const allowedOrigins = [
        process.env.FRONTEND_URL,
        "http://localhost:3000",
        "https://ctf-website-mv21.vercel.app",
        process.env.KOYEB_URL,
      ].filter(Boolean);

      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization", "Cookie"],
    exposedHeaders: ["set-cookie"],
  })
);

// Handle preflight OPTIONS requests dynamically with allowed origin echo
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:3000",
    "https://ctf-website-mv21.vercel.app",
    process.env.KOYEB_URL,
  ].filter(Boolean);

  if (!origin || process.env.NODE_ENV !== "production" || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
    res.header('Access-Control-Allow-Credentials', 'true');
    return res.status(204).end();
  }

  return res.status(403).end();
});

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin || "No origin"}`);
  next();
});

// API routes middleware - ensure JSON responses only
app.use("/api", (req, res, next) => {
  // Set JSON content type for all API routes
  res.setHeader("Content-Type", "application/json");
  
  // Add error handler to catch any non-JSON responses
  const originalSend = res.send;
  res.send = function(data) {
    // Ensure we're sending JSON
    if (typeof data === "string" && !data.startsWith("{")) {
      console.error("Non-JSON response detected in API route:", req.path);
      return originalSend.call(this, JSON.stringify({
        error: "Invalid response format",
        message: "API routes must return JSON only"
      }));
    }
    return originalSend.call(this, data);
  };
  
  next();
});

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "default_session_secret",
    resave: true,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      ttl: 24 * 60 * 60, // 1 day
      autoRemove: "native",
      touchAfter: 24 * 3600, // time period in seconds
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production", // required for iOS Safari when SameSite=None
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // cross-site cookies allowed
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      // Do not set domain; let browser infer host to avoid iOS domain mis-match
      path: "/",
    },
    proxy: true, // Trust the reverse proxy
    name: "connect.sid",
  })
);

// Debug session middleware with enhanced logging
app.use((req, res, next) => {
  console.log("Session ID:", req.sessionID);
  console.log("Session User:", req.session.user ? req.session.user.username : "No user");
  console.log("Cookies:", req.headers.cookie);
  console.log("User agent:", req.headers["user-agent"]);
  console.log("Request origin:", req.headers.origin);
  console.log("Request method:", req.method);
  console.log("Request path:", req.path);

  // Add headers to help with CORS and cookies
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  
  // Add cache control headers to prevent caching of API responses
  if (req.path.startsWith("/api/")) {
    res.header("Cache-Control", "no-cache, no-store, must-revalidate");
    res.header("Pragma", "no-cache");
    res.header("Expires", "0");
  }

  next();
});

// Site mode middleware
const { checkSiteMode } = require("./middleware/auth");
app.use(checkSiteMode);

// Serve static files
app.use(express.static(path.join(__dirname, "public")));
// app.use("/", express.static(path.join(__dirname, "views")));

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/challenges", require("./routes/challenges"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/leaderboard", require("./routes/leaderboard"));

// Serve index.html for all non-API routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
