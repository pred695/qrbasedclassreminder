const express = require("express");
const path = require("path");
const cors = require("cors");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// Global Logger Setup
const {
  createLogger,
  createMorganMiddleware,
  errorLoggingMiddleware,
  requestTimingMiddleware,
} = require("./shared/utils/logger");

// Initialize logger for auth-service
const logger = createLogger("auth-service", process.env.LOG_LEVEL || "info");

// Database configuration
const {
  disconnectDatabase,
  healthCheck,
  initializeDatabase,
} = require("./config/database");

// Routes
const adminRoutes = require("./routes/adminRoutes");
const studentRoutes = require("./routes/studentRoutes");
const signupRoutes = require("./routes/signupRoutes");
const reminderRoutes = require("./routes/reminderRoutes");
const templateRoutes = require("./routes/templateRoutes");

// Cron jobs
const { startReminderCron } = require("./jobs/reminderCron");

// Admin repository and utils for auto-creation
const adminRepository = require("./repositories/adminRepository");
const { hashPassword } = require("./lib/utils");

// Load environment variables
require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
});

const app = express();

// Trust proxy - required for secure cookies behind reverse proxies (Render, Heroku, etc.)
// This allows Express to trust X-Forwarded-* headers
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// =============================================
// Logging Middleware (Must be first!)
// =============================================

// Request timing middleware
app.use(requestTimingMiddleware(logger));

// Morgan HTTP request logging
app.use(createMorganMiddleware(logger));

// =============================================
// Security Middleware
// =============================================

// Helmet for security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS configuration
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is in the allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow any Vercel preview deployment for this app
      if (origin.includes("qrbasedclassreminder") && origin.endsWith(".vercel.app")) {
        return callback(null, true);
      }

      // Reject other origins
      console.log("CORS blocked origin:", origin);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  })
);

// Compression middleware
app.use(compression());

// =============================================
// Rate Limiting
// =============================================

// General rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  // Skip rate limiting for health checks (Render pings every 5 seconds)
  skip: (req) => req.path === "/health" || req.path === "/",
  message: {
    success: false,
    error: {
      message: "Too many requests, please try again later.",
      code: "RATE_LIMIT_EXCEEDED",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn("Rate limit exceeded", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });
    res.status(429).json({
      success: false,
      error: {
        message: "Too many requests, please try again later.",
        code: "RATE_LIMIT_EXCEEDED",
      },
    });
  },
});

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: {
    success: false,
    error: {
      message: "Too many authentication attempts, please try again later.",
      code: "AUTH_RATE_LIMIT_EXCEEDED",
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn("Auth rate limit exceeded", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      endpoint: req.originalUrl,
    });
    res.status(429).json({
      success: false,
      error: {
        message: "Too many authentication attempts, please try again later.",
        code: "AUTH_RATE_LIMIT_EXCEEDED",
      },
    });
  },
});

// Apply general rate limiting
app.use(generalLimiter);

// Apply stricter rate limiting to auth routes
app.use("/api/admin/login", authLimiter);
app.use("/api/admin/refresh", authLimiter);

// =============================================
// Body Parsing Middleware
// =============================================

app.use(
  express.json({
    limit: "10mb",
    strict: true,
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

// Cookie parser for JWT tokens
app.use(cookieParser());

// =============================================
// Routes
// =============================================

// Welcome route
app.get("/", (req, res) => {
  logger.info("Welcome page accessed", { ip: req.ip });

  res.json({
    success: true,
    message: "Welcome to the Student Portal Auth Service API",
    service: "auth-service",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    documentation: {
      health: "/health",
      apiBase: "/api",
      endpoints: {
        student: [
          "POST /api/students/signup (Public)",
          "GET /api/students/signup/:signupId (Public)",
          "GET /api/students/:studentId/signups (Public)",
          "PATCH /api/students/:studentId/opt-out (Public)",
        ],
        signup: [
          "GET /api/signups (Admin)",
          "GET /api/signups/stats (Admin)",
          "GET /api/signups/:signupId (Admin)",
          "PATCH /api/signups/:signupId (Admin)",
          "DELETE /api/signups/:signupId (SUPER_ADMIN)",
        ],
        auth: [
          "POST /api/admin/login",
          "POST /api/admin/logout",
          "POST /api/admin/refresh",
          "POST /api/admin/logout-all",
        ],
        profile: [
          "GET /api/admin/me",
          "PUT /api/admin/me",
          "POST /api/admin/change-password",
        ],
        sessions: ["GET /api/admin/sessions", "DELETE /api/admin/sessions/:id"],
        management: [
          "GET /api/admin/manage (SUPER_ADMIN)",
          "POST /api/admin/manage (SUPER_ADMIN)",
          "GET /api/admin/manage/:id (SUPER_ADMIN)",
          "PUT /api/admin/manage/:id (SUPER_ADMIN)",
          "PUT /api/admin/manage/:id/role (SUPER_ADMIN)",
          "DELETE /api/admin/manage/:id (SUPER_ADMIN)",
        ],
      },
    },
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    logger.debug("Health check requested", { ip: req.ip });
    const dbHealth = await healthCheck();

    const healthData = {
      success: true,
      status: "OK",
      service: "auth-service",
      database: dbHealth,
      uptime: process.uptime(),
      memory: {
        used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
        total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
      },
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
    };

    logger.info("Health check successful", {
      status: healthData.status,
      uptime: healthData.uptime,
    });

    res.json(healthData);
  } catch (error) {
    logger.error("Health check failed", {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      success: false,
      status: "ERROR",
      service: "auth-service",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Admin API Routes
app.use("/api/admin", adminRoutes);
app.use("/api/students", studentRoutes); // Public student routes
app.use("/api/admin/signups", signupRoutes); // Admin signup management routes (auth temporarily disabled)
app.use("/api/admin/reminders", reminderRoutes); // Admin reminder management routes
app.use("/api/admin/templates", templateRoutes); // Template management routes

// Error logging middleware
app.use(errorLoggingMiddleware(logger));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.url} not found`,
    },
  });
});

// =============================================
// Admin Auto-Creation Function
// =============================================

const initializeDefaultAdmin = async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "System Admin";

  if (!email || !password) {
    logger.warn("ADMIN_EMAIL or ADMIN_PASSWORD not set. Skipping default admin creation.");
    return;
  }

  try {
    const existingAdmin = await adminRepository.findByEmail(email);

    if (existingAdmin) {
      logger.info("Default admin already exists, skipping creation", { email });
      return;
    }

    const hashedPassword = await hashPassword(password);

    await adminRepository.createAdmin({
      email,
      password: hashedPassword,
      name,
      role: "SUPER_ADMIN",
    });

    logger.info("Default SUPER_ADMIN created successfully", { email, name });
  } catch (error) {
    logger.error("Failed to create default admin", {
      error: error.message,
      stack: error.stack,
    });
  }
};

// =============================================
// Server Startup Function
// =============================================

const startServer = async () => {
  const port = process.env.PORT || process.env.AUTH_SERVICE_PORT || 3001;

  try {
    // Initialize database connection
    logger.info("Initializing database connection...");
    await initializeDatabase();
    logger.info("Database connection established successfully");

    // Create default admin from environment variables
    await initializeDefaultAdmin();

    // Start reminder cron job
    startReminderCron();

    // Start server
    const server = app.listen(port, () => {
      logger.info("Student Portal Auth Service started successfully", {
        port: port,
        environment: process.env.NODE_ENV || "development",
        apiBase: `http://localhost:${port}/api/admin`,
        health: `http://localhost:${port}/health`,
      });

      // Log available routes in development
      if (process.env.NODE_ENV !== "production") {
        logger.debug("Available API Routes:", {
          auth: [
            "POST /api/admin/login",
            "POST /api/admin/logout",
            "POST /api/admin/refresh",
            "POST /api/admin/logout-all",
          ],
          profile: [
            "GET /api/admin/me",
            "PUT /api/admin/me",
            "POST /api/admin/change-password",
          ],
          sessions: ["GET /api/admin/sessions", "DELETE /api/admin/sessions/:id"],
          management: [
            "GET /api/admin/manage",
            "POST /api/admin/manage",
            "GET /api/admin/manage/:id",
            "PUT /api/admin/manage/:id",
            "PUT /api/admin/manage/:id/role",
            "DELETE /api/admin/manage/:id",
          ],
        });
      }
    });

    // Store server reference for graceful shutdown
    app.server = server;
  } catch (error) {
    logger.error("Failed to start server", {
      error: error.message,
      stack: error.stack,
    });
    await disconnectDatabase();
    process.exit(1);
  }
};

// =============================================
// Graceful Shutdown Handlers
// =============================================

const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);

  try {
    // Close server
    if (app.server) {
      logger.info("Closing HTTP server...");
      app.server.close(() => {
        logger.info("HTTP server closed successfully");
      });
    }

    // Close database connection
    logger.info("Closing database connection...");
    await disconnectDatabase();
    logger.info("Database connection closed successfully");

    logger.info("Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    logger.error("Error during shutdown", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

// Handle shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", {
    error: error.message,
    stack: error.stack,
  });
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection", {
    reason: reason,
    promise: promise,
  });
  gracefulShutdown("UNHANDLED_REJECTION");
});

// Export logger for use in other modules
module.exports = { app, logger };

// Start the server
startServer();
