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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Add CORS middleware
app.use(
  cors({
    origin: function (origin, callback) {
      // Always log the request origin for debugging
      console.log("Request origin:", origin);
      
      // Allow all origins in development
      if (process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }

      const allowedOrigins = [
        process.env.FRONTEND_URL, 
        "http://localhost:3000", 
        "https://ctf-website-mv21.vercel.app",
        process.env.KOYEB_URL
      ].filter(Boolean); // Remove any undefined values

      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) {
        console.log("Request with no origin");
        return callback(null, true);
      }

      if (allowedOrigins.indexOf(origin) !== -1) {
        console.log("Allowed origin:", origin);
        return callback(null, true);
      }

      // In production, always accept requests from Vercel frontend for now
      if (origin === "https://ctf-website-mv21.vercel.app") {
        console.log("Allowing Vercel frontend:", origin);
        return callback(null, true);
      }

      console.log("Origin not allowed:", origin);
      return callback(new Error("CORS not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposedHeaders: ["set-cookie"],
  })
);

// Handle preflight OPTIONS requests
app.options('*', (req, res) => {
  // Set CORS headers explicitly for preflight requests
  res.header('Access-Control-Allow-Origin', 'https://ctf-website-mv21.vercel.app');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(204).end();
});

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin || "No origin"}`);
  next();
});

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "default_session_secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      ttl: 24 * 60 * 60, // 1 day
      autoRemove: "native",
      touchAfter: 24 * 3600, // time period in seconds
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production", // Only use secure in production
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // Use none for cross-site requests in production
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      domain: undefined, // Don't set a specific domain
    },
    proxy: true, // Trust the reverse proxy
  })
);

// Debug session middleware
app.use((req, res, next) => {
  console.log("Session ID:", req.sessionID);
  console.log("Session User:", req.session.user ? req.session.user.username : "No user");
  console.log("Cookies:", req.headers.cookie);

  // Add headers to help with CORS and cookies
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

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
