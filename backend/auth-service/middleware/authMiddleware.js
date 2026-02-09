// backend/auth-service/middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const adminService = require("../services/adminService");
const { COOKIE_NAMES, ROLE_HIERARCHY } = require("../lib/constants");
const {
  AuthenticationError,
  transformError,
  ValidationError,
} = require("../shared/utils/errors");
const { createLogger } = require("../shared/utils/logger");

const logger = createLogger("auth-middleware");

/**
 * Get client IP address from request
 */
const getClientIP = (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.ip ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress
  );
};

/**
 * Extract access token from request (cookies)
 */
const extractToken = (req) => {
  return req.cookies?.[COOKIE_NAMES.ACCESS_TOKEN] || null;
};

/**
 * Extract refresh token from request (cookies)
 */
const extractRefreshToken = (req) => {
  return req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN] || null;
};

/**
 * Get cookie options for setting authentication cookies
 */
const getCookieOptions = (isRefreshToken = false) => {
  const isProduction = process.env.NODE_ENV === "production";
  const cookieDomain = process.env.COOKIE_DOMAIN;

  const baseOptions = {
    httpOnly: true,
    secure: isProduction,
    // Use 'none' for cross-origin requests in production (frontend and backend on different domains)
    // Use 'lax' for same-origin (when using Vercel rewrites or local dev)
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  };

  // Only set domain if explicitly provided and valid
  // Don't set domain for localhost or when frontend/backend are on different subdomains
  if (cookieDomain && cookieDomain !== "localhost" && cookieDomain !== "") {
    baseOptions.domain = cookieDomain;
  }

  if (isRefreshToken) {
    baseOptions.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  } else {
    baseOptions.maxAge = 15 * 60 * 1000; // 15 minutes
  }

  logger.debug("Cookie options", { isRefreshToken, isProduction, cookieDomain, options: baseOptions });
  return baseOptions;
};

/**
 * Get request metadata for session tracking
 */
const getRequestMetadata = (req) => {
  return {
    ipAddress: getClientIP(req),
    userAgent: req.get("User-Agent") || "Unknown",
  };
};

/**
 * Main authentication middleware for admin routes
 * Validates JWT token and attaches admin to request
 */
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      throw AuthenticationError("Authentication token required", "NO_TOKEN");
    }

    // Validate token and get admin data
    const { admin, session } = await adminService.validateToken(token);

    // Attach to request
    req.admin = admin;
    req.session = session;
    req.token = token;
    req.clientIP = getClientIP(req);

    logger.debug("Admin authenticated", { adminId: admin.id, role: admin.role });
    next();
  } catch (error) {
    const transformedError = transformError(error, "authenticateAdmin");

    // Clear cookies on auth failure
    if (["INVALID_TOKEN", "TOKEN_EXPIRED", "SESSION_EXPIRED"].includes(transformedError.code)) {
      res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN);
      res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN);
    }

    logger.warn("Authentication failed", {
      error: transformedError.message,
      code: transformedError.code,
      url: req.url,
    });

    return res.status(401).json({
      success: false,
      error: {
        message: transformedError.message,
        code: transformedError.code,
      },
    });
  }
};

/**
 * Role-based access control middleware factory
 * @param {string} minimumRole - Minimum required role
 */
const requireRole = (minimumRole) => {
  return (req, res, next) => {
    try {
      if (!req.admin) {
        throw AuthenticationError("Authentication required", "AUTHENTICATION_REQUIRED");
      }

      const adminRole = req.admin.role;
      const adminRoleLevel = ROLE_HIERARCHY[adminRole];
      const requiredRoleLevel = ROLE_HIERARCHY[minimumRole];

      if (!adminRoleLevel || adminRoleLevel < requiredRoleLevel) {
        logger.warn("Insufficient permissions", {
          adminId: req.admin.id,
          adminRole,
          requiredRole: minimumRole,
        });

        return res.status(403).json({
          success: false,
          error: {
            code: "INSUFFICIENT_PERMISSIONS",
            message: `${minimumRole} role or higher is required for this action`,
          },
        });
      }

      next();
    } catch (error) {
      const transformedError = transformError(error, "requireRole");
      return res.status(403).json({
        success: false,
        error: {
          message: transformedError.message,
          code: transformedError.code,
        },
      });
    }
  };
};

// Convenience role middleware
const requireSuperAdmin = requireRole("SUPER_ADMIN");
const requireAdmin = requireRole("ADMIN");
const requireViewer = requireRole("VIEWER");

/**
 * Middleware to validate refresh token
 */
const validateRefreshToken = async (req, res, next) => {
  try {
    const refreshToken = extractRefreshToken(req);

    if (!refreshToken) {
      throw AuthenticationError("Refresh token required", "REFRESH_TOKEN_REQUIRED");
    }

    req.refreshToken = refreshToken;
    next();
  } catch (error) {
    const transformedError = transformError(error, "validateRefreshToken");
    res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN);

    return res.status(401).json({
      success: false,
      error: {
        message: transformedError.message,
        code: transformedError.code,
      },
    });
  }
};

/**
 * Set authentication cookies on response
 */
const setAuthCookies = (res, tokens) => {
  try {
    if (!tokens || !tokens.accessToken || !tokens.refreshToken) {
      throw ValidationError("Valid tokens required", "INVALID_TOKENS");
    }

    res.cookie(COOKIE_NAMES.ACCESS_TOKEN, tokens.accessToken, getCookieOptions(false));
    res.cookie(COOKIE_NAMES.REFRESH_TOKEN, tokens.refreshToken, getCookieOptions(true));

    logger.debug("Auth cookies set successfully");
  } catch (error) {
    logger.error("Failed to set auth cookies", { error: error.message });
    throw error;
  }
};

/**
 * Clear authentication cookies
 */
const clearAuthCookies = (res) => {
  res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, getCookieOptions(false));
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, getCookieOptions(true));
  logger.debug("Auth cookies cleared");
};

/**
 * Combine multiple middleware functions
 */
const combineMiddleware = (...middlewares) => {
  return (req, res, next) => {
    let index = 0;

    const runNext = (error) => {
      if (error) return next(error);
      if (index >= middlewares.length) return next();

      const middleware = middlewares[index++];
      middleware(req, res, runNext);
    };

    runNext();
  };
};

// Pre-configured middleware combinations
const requireAuth = combineMiddleware(authenticateAdmin);
const requireAuthAdmin = combineMiddleware(authenticateAdmin, requireAdmin);
const requireAuthSuperAdmin = combineMiddleware(authenticateAdmin, requireSuperAdmin);

module.exports = {
  // Core authentication
  authenticateAdmin,
  validateRefreshToken,

  // Role-based access control
  requireRole,
  requireSuperAdmin,
  requireAdmin,
  requireViewer,

  // Utility functions
  extractToken,
  extractRefreshToken,
  getRequestMetadata,
  getClientIP,
  setAuthCookies,
  clearAuthCookies,
  combineMiddleware,

  // Pre-configured middleware
  requireAuth,
  requireAuthAdmin,
  requireAuthSuperAdmin,
};
