// Admin field selections for Prisma queries
const ADMIN_FIELDS = {
  // Public fields - safe for client-side
  public: {
    id: true,
    email: true,
    name: true,
    role: true,
    isActive: true,
    lastLoginAt: true,
    createdAt: true,
    updatedAt: true,
  },
  // With password - only for authentication
  withPassword: {
    id: true,
    email: true,
    name: true,
    password: true,
    role: true,
    isActive: true,
    lastLoginAt: true,
    createdAt: true,
    updatedAt: true,
  },
  // Minimal fields - for lists
  minimal: {
    id: true,
    email: true,
    name: true,
    role: true,
    isActive: true,
  },
};

// Session field selections
const SESSION_FIELDS = {
  // Public session fields (safe for client)
  public: {
    id: true,
    adminId: true,
    expiresAt: true,
    ipAddress: true,
    userAgent: true,
    createdAt: true,
    updatedAt: true,
  },
  // Session fields with tokens (internal use)
  withTokens: {
    id: true,
    adminId: true,
    token: true,
    refreshToken: true,
    expiresAt: true,
    ipAddress: true,
    userAgent: true,
    createdAt: true,
    updatedAt: true,
  },
  // Minimal session fields
  minimal: {
    id: true,
    adminId: true,
    expiresAt: true,
    createdAt: true,
  },
};

// Allowed fields for admin profile updates
const ALLOWED_ADMIN_UPDATE_FIELDS = ["email", "name", "password", "isActive"];

// Allowed fields for session updates
const ALLOWED_SESSION_UPDATE_FIELDS = [
  "token",
  "refreshToken",
  "expiresAt",
  "ipAddress",
  "userAgent",
];

// Role hierarchy for RBAC
const ROLE_HIERARCHY = {
  ADMIN: 2,
  STAFF: 1,
};

// JWT token types
const TOKEN_TYPES = {
  ACCESS: "access",
  REFRESH: "refresh",
  PASSWORD_RESET: "password_reset",
};

// Cookie names for tokens
const COOKIE_NAMES = {
  ACCESS_TOKEN: "student_portal_access_token",
  REFRESH_TOKEN: "student_portal_refresh_token",
};

// Session configuration
const SESSION_CONFIG = {
  MAX_SESSIONS_PER_ADMIN: 5,
  SESSION_CLEANUP_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
  SESSION_EXTEND_THRESHOLD: 2 * 60 * 60 * 1000, // 2 hours before expiry
};

// Rate limiting configurations
const RATE_LIMITS = {
  LOGIN_ATTEMPTS: {
    max: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    skipSuccessfulRequests: true,
  },
  PASSWORD_RESET: {
    max: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  TOKEN_REFRESH: {
    max: 10,
    windowMs: 60 * 1000, // 1 minute
  },
  GENERAL: {
    max: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
};

// ============================================
// Student Domain Constants
// ============================================

// Student field selections
const STUDENT_FIELDS = {
  public: {
    id: true,
    email: true,
    phone: true,
    optedOutEmail: true,
    optedOutSms: true,
    createdAt: true,
    updatedAt: true,
  },
  minimal: {
    id: true,
    email: true,
    phone: true,
  },
};

// Signup field selections
const SIGNUP_FIELDS = {
  public: {
    id: true,
    studentId: true,
    classType: true,
    reminderScheduledDate: true,
    reminderSentAt: true,
    status: true,
    notes: true,
    createdAt: true,
    updatedAt: true,
  },
  withStudent: {
    id: true,
    studentId: true,
    classType: true,
    reminderScheduledDate: true,
    reminderSentAt: true,
    status: true,
    notes: true,
    createdAt: true,
    updatedAt: true,
    student: {
      select: {
        id: true,
        email: true,
        phone: true,
        optedOutEmail: true,
        optedOutSms: true,
      },
    },
  },
};

// Class type to reminder interval mapping (in days)
const CLASS_REMINDER_INTERVALS = {
  TYPE_1: 7,
  TYPE_2: 7,
  TYPE_3: 7,
  TYPE_4: 7,
  TYPE_5: 7,
  TYPE_6: 7,
};

// Error message templates
const ERROR_MESSAGES = {
  VALIDATION: {
    REQUIRED_FIELD: (field) => `${field} is required`,
    INVALID_FORMAT: (field) => `${field} has invalid format`,
    TOO_SHORT: (field, min) => `${field} must be at least ${min} characters`,
    TOO_LONG: (field, max) => `${field} must be less than ${max} characters`,
  },
  AUTHENTICATION: {
    INVALID_CREDENTIALS: "Invalid email or password",
    ACCOUNT_DEACTIVATED: "Account has been deactivated",
    TOKEN_EXPIRED: "Token has expired",
    INVALID_TOKEN: "Invalid or malformed token",
    SESSION_EXPIRED: "Session has expired",
    NO_TOKEN: "No authentication token provided",
  },
  AUTHORIZATION: {
    INSUFFICIENT_PERMISSIONS: "You do not have permission to perform this action",
    ROLE_REQUIRED: (role) => `${role} role required for this action`,
  },
  CONFLICT: {
    EMAIL_EXISTS: "Email is already registered",
  },
  NOT_FOUND: {
    ADMIN_NOT_FOUND: "Admin not found",
    SESSION_NOT_FOUND: "Session not found",
    STUDENT_NOT_FOUND: "Student not found",
    SIGNUP_NOT_FOUND: "Signup not found",
  },
};

// Success message templates
const SUCCESS_MESSAGES = {
  ADMIN: {
    CREATED: "Admin created successfully",
    LOGIN: "Login successful",
    LOGOUT: "Logout successful",
    PROFILE_UPDATED: "Profile updated successfully",
    PASSWORD_CHANGED: "Password changed successfully",
    DEACTIVATED: "Admin account deactivated successfully",
  },
  SESSION: {
    CREATED: "Session created successfully",
    REFRESHED: "Token refreshed successfully",
    INVALIDATED: "Session invalidated successfully",
    ALL_INVALIDATED: "All sessions invalidated successfully",
  },
  STUDENT: {
    SIGNUP_CREATED: "Signup successful! You will receive a reminder before your class.",
    OPT_OUT_UPDATED: "Preference updated successfully",
  },
  SIGNUP: {
    RETRIEVED: "Signup details retrieved successfully",
    UPDATED: "Signup updated successfully",
    DELETED: "Signup deleted successfully",
  },
};

// JWT configuration
const JWT_CONFIG = {
  accessTokenSecret: process.env.JWT_ACCESS_SECRET || "your-access-token-secret",
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET || "your-refresh-token-secret",
  accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || "15m",
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || "7d",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    domain: process.env.COOKIE_DOMAIN || undefined,
  },
};

// Password reset configuration
const PASSWORD_RESET_CONFIG = {
  TOKEN_EXPIRY: 60 * 60 * 1000, // 1 hour
  MAX_ATTEMPTS: 3,
};

module.exports = {
  // Field selections
  ADMIN_FIELDS,
  SESSION_FIELDS,
  STUDENT_FIELDS,
  SIGNUP_FIELDS,
  // Allowed fields for updates
  ALLOWED_ADMIN_UPDATE_FIELDS,
  ALLOWED_SESSION_UPDATE_FIELDS,
  // Role configuration
  ROLE_HIERARCHY,
  // Token and session configurations
  TOKEN_TYPES,
  COOKIE_NAMES,
  SESSION_CONFIG,
  PASSWORD_RESET_CONFIG,
  RATE_LIMITS,
  // Student domain
  CLASS_REMINDER_INTERVALS,
  // Error and success messages
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  JWT_CONFIG,
};
