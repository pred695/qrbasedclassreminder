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
} = require("../shared/utils/logger");

// Initialize logger for auth-service
const logger = createLogger("auth-service", process.env.LOG_LEVEL || "info");

// Database configuration
const {
  healthCheck,
  initializeDatabase,
} = require("../config/database");

// Routes
const adminRoutes = require("../routes/adminRoutes");
const studentRoutes = require("../routes/studentRoutes");
const signupRoutes = require("../routes/signupRoutes");

// Admin repository and utils for auto-creation
const adminRepository = require("../repositories/adminRepository");
const { hashPassword } = require("../lib/utils");

const app = express();

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
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
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

app.use(generalLimiter);

// =============================================
// Request Parsing
// =============================================

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// =============================================
// Initialize Database for Serverless
// =============================================

let isInitialized = false;

const initializeServerless = async () => {
  if (isInitialized) {
    return;
  }

  try {
    logger.info("Initializing database connection for serverless...");
    await initializeDatabase();
    logger.info("Database connection established successfully");

    // Create default admin from environment variables
    await initializeDefaultAdmin();

    isInitialized = true;
  } catch (error) {
    logger.error("Failed to initialize serverless", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

// Middleware to ensure initialization before handling requests
app.use(async (req, res, next) => {
  try {
    await initializeServerless();
    next();
  } catch (error) {
    logger.error("Initialization failed", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      error: {
        code: "INITIALIZATION_ERROR",
        message: "Service initialization failed",
      },
    });
  }
});

// =============================================
// Root Endpoint (API Info)
// =============================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    service: "Student Portal Auth Service",
    version: "1.0.0",
    documentation: "/api/docs",
    endpoints: {
      health: "/health",
      auth: {
        login: [
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

// Admin API Routes
app.use("/api/admin", adminRoutes);
app.use("/api/students", studentRoutes); // Public student routes
app.use("/api/admin/signups", signupRoutes); // Admin signup management routes

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

// Export the app for Vercel
module.exports = app;
