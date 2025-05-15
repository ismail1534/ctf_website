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
      const allowedOrigins = [process.env.FRONTEND_URL, "http://localhost:3000", "https://ctf-website-mv21.vercel.app"];
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      }
      console.log("Blocked origin:", origin);
      return callback(null, true); // Allow all origins for troubleshooting
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "default_session_secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      ttl: 24 * 60 * 60, // 1 day
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "none", // Required for cross-domain cookies
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      domain: process.env.NODE_ENV === "production" ? ".onrender.com" : undefined,
    },
  })
);

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
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
