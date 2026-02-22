const adminRepository = require("../repositories/adminRepository");
const sessionRepository = require("../repositories/adminSessionRepository");
const {
  hashPassword,
  generateTokens,
  comparePassword,
  verifyToken,
} = require("../lib/utils");
const {
  createAdminSchema,
  loginAdminSchema,
  updateAdminSchema,
  passwordSchema,
  changePasswordSchema,
} = require("../models/adminSchema");
const {
  ValidationError,
  AuthenticationError,
  ConflictError,
  NotFoundError,
  transformError,
} = require("../shared/utils/errors");
const { JWT_CONFIG, SUCCESS_MESSAGES } = require("../lib/constants");
const { createLogger } = require("../shared/utils/logger");

const logger = createLogger("admin-service");

/**
 * Login admin
 * @param {Object} loginData - Login credentials
 * @param {Object} requestMetadata - Request metadata (IP, user agent)
 * @returns {Promise<Object>} Login result with admin data and tokens
 */
const loginAdmin = async (loginData, requestMetadata = {}) => {
  try {
    const validatedData = loginAdminSchema.parse(loginData);

    // Find admin by email
    const admin = await adminRepository.findByEmail(validatedData.email, true);
    if (!admin) {
      throw AuthenticationError("Invalid credentials", "INVALID_CREDENTIALS");
    }

    // Check if admin is active
    if (!admin.isActive) {
      throw AuthenticationError("Account is deactivated", "ACCOUNT_DEACTIVATED");
    }

    // Verify password
    const passwordMatch = await comparePassword(validatedData.password, admin.password);
    if (!passwordMatch) {
      throw AuthenticationError("Invalid credentials", "INVALID_CREDENTIALS");
    }

    // Generate tokens
    const tokenPayload = {
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
    };

    const { accessToken, refreshToken } = generateTokens(tokenPayload);

    // Create session
    const sessionData = {
      adminId: admin.id,
      token: accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      ipAddress: requestMetadata.ipAddress,
      userAgent: requestMetadata.userAgent,
    };

    await sessionRepository.createSession(sessionData);

    // Update last login
    await adminRepository.updateLastLogin(admin.id);

    // Remove password from response
    const { password, ...adminWithoutPassword } = admin;

    logger.info("Admin login successful", { adminId: admin.id, email: admin.email });

    return {
      admin: adminWithoutPassword,
      tokens: { accessToken, refreshToken },
      message: SUCCESS_MESSAGES.ADMIN.LOGIN,
    };
  } catch (error) {
    logger.error("Admin login failed", { error: error.message, email: loginData?.email });
    throw transformError(error, "loginAdmin");
  }
};

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Refresh token
 * @param {Object} requestMetadata - Request metadata
 * @returns {Promise<Object>} New tokens
 */
const refreshAccessToken = async (refreshToken, requestMetadata = {}) => {
  try {
    if (!refreshToken) {
      throw AuthenticationError("Refresh token required", "REFRESH_TOKEN_REQUIRED");
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken, JWT_CONFIG.refreshTokenSecret);

    // Check if session exists and is valid
    const session = await sessionRepository.findByRefreshToken(refreshToken);
    if (!session || new Date(session.expiresAt) < new Date()) {
      throw AuthenticationError("Invalid or expired refresh token", "INVALID_REFRESH_TOKEN");
    }

    // Get admin data
    const admin = await adminRepository.findById(decoded.adminId);
    if (!admin || !admin.isActive) {
      throw AuthenticationError("Admin not found or inactive", "ADMIN_INACTIVE");
    }

    // Generate new tokens
    const tokenPayload = {
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
    };

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(tokenPayload);

    // Update session with new tokens
    await sessionRepository.updateSession(session.id, {
      token: accessToken,
      refreshToken: newRefreshToken,
      ipAddress: requestMetadata.ipAddress,
      userAgent: requestMetadata.userAgent,
    });

    return {
      message: SUCCESS_MESSAGES.SESSION.REFRESHED,
      tokens: { accessToken, refreshToken: newRefreshToken },
    };
  } catch (error) {
    logger.error("Token refresh failed", { error: error.message });
    throw transformError(error, "refreshAccessToken");
  }
};

/**
 * Logout admin and invalidate session
 * @param {string} token - Access token
 * @returns {Promise<Object>} Logout result
 */
const logoutAdmin = async (token) => {
  try {
    if (!token) {
      throw ValidationError("Token required for logout", "TOKEN_REQUIRED");
    }

    // Find session by access token
    const session = await sessionRepository.findByAccessToken(token);
    if (session) {
      await sessionRepository.deleteSession(session.id);
    }

    return { message: SUCCESS_MESSAGES.ADMIN.LOGOUT };
  } catch (error) {
    logger.error("Logout failed", { error: error.message });
    throw transformError(error, "logoutAdmin");
  }
};

/**
 * Logout from all devices
 * @param {string} adminId - Admin ID
 * @returns {Promise<Object>} Logout result
 */
const logoutAllDevices = async (adminId) => {
  try {
    const result = await sessionRepository.invalidateAllSessions(adminId);
    logger.info("Logged out from all devices", { adminId, count: result.deletedCount });
    return { message: SUCCESS_MESSAGES.SESSION.ALL_INVALIDATED };
  } catch (error) {
    logger.error("Logout all failed", { error: error.message, adminId });
    throw transformError(error, "logoutAllDevices");
  }
};

/**
 * Validate access token and get admin data
 * @param {string} token - Access token
 * @returns {Promise<Object>} Admin data and session info
 */
const validateToken = async (token) => {
  try {
    if (!token) {
      throw AuthenticationError("Token required", "TOKEN_REQUIRED");
    }

    // Verify token
    const decoded = verifyToken(token, JWT_CONFIG.accessTokenSecret);

    // Check if session exists
    const session = await sessionRepository.findByAccessToken(token);
    if (!session || new Date(session.expiresAt) < new Date()) {
      throw AuthenticationError("Session expired", "SESSION_EXPIRED");
    }

    // Get fresh admin data
    const admin = await adminRepository.findById(decoded.adminId);
    if (!admin || !admin.isActive) {
      throw AuthenticationError("Admin not found or inactive", "ADMIN_INACTIVE");
    }

    return {
      admin,
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
      },
    };
  } catch (error) {
    throw transformError(error, "validateToken");
  }
};

/**
 * Change admin password
 * @param {string} adminId - Admin ID
 * @param {Object} passwordData - Password change data
 * @returns {Promise<Object>} Result
 */
const changePassword = async (adminId, passwordData) => {
  try {
    // Validate input
    const validated = changePasswordSchema.parse(passwordData);

    // Get admin with password
    const admin = await adminRepository.findById(adminId, true);
    if (!admin) {
      throw NotFoundError("Admin not found", "ADMIN_NOT_FOUND");
    }

    // Verify current password
    const passwordMatch = await comparePassword(validated.currentPassword, admin.password);
    if (!passwordMatch) {
      throw AuthenticationError("Current password is incorrect", "INVALID_CURRENT_PASSWORD");
    }

    // Hash new password
    const hashedPassword = await hashPassword(validated.newPassword);

    // Update password
    await adminRepository.updatePassword(adminId, hashedPassword);

    // Invalidate all sessions
    await sessionRepository.invalidateAllSessions(adminId);

    logger.info("Admin password changed", { adminId });
    return { message: SUCCESS_MESSAGES.ADMIN.PASSWORD_CHANGED };
  } catch (error) {
    logger.error("Password change failed", { error: error.message, adminId });
    throw transformError(error, "changePassword");
  }
};

/**
 * Update admin profile
 * @param {string} adminId - Admin ID
 * @param {Object} updateData - Update data
 * @returns {Promise<Object>} Updated admin data
 */
const updateProfile = async (adminId, updateData) => {
  try {
    const validatedData = updateAdminSchema.parse(updateData);

    // Check for email conflict if being updated
    if (validatedData.email) {
      const existingAdmin = await adminRepository.findByEmail(validatedData.email);
      if (existingAdmin && existingAdmin.id !== adminId) {
        throw ConflictError("Email already in use", "EMAIL_EXISTS");
      }
    }

    const updatedAdmin = await adminRepository.updateAdmin(adminId, validatedData);

    logger.info("Admin profile updated", { adminId });
    return {
      admin: updatedAdmin,
      message: SUCCESS_MESSAGES.ADMIN.PROFILE_UPDATED,
    };
  } catch (error) {
    logger.error("Profile update failed", { error: error.message, adminId });
    throw transformError(error, "updateProfile");
  }
};

/**
 * Get admin profile by ID
 * @param {string} adminId - Admin ID
 * @returns {Promise<Object>} Admin data
 */
const getProfile = async (adminId) => {
  try {
    const admin = await adminRepository.findById(adminId);
    if (!admin) {
      throw NotFoundError("Admin not found", "ADMIN_NOT_FOUND");
    }
    return { admin };
  } catch (error) {
    logger.error("Get profile failed", { error: error.message, adminId });
    throw transformError(error, "getProfile");
  }
};

/**
 * Get admin's active sessions
 * @param {string} adminId - Admin ID
 * @returns {Promise<Object>} Sessions data
 */
const getAdminSessions = async (adminId) => {
  try {
    const result = await sessionRepository.getAdminSessions(adminId);
    return result;
  } catch (error) {
    logger.error("Get sessions failed", { error: error.message, adminId });
    throw transformError(error, "getAdminSessions");
  }
};

/**
 * Revoke a specific session
 * @param {string} adminId - Admin ID (for ownership check)
 * @param {string} sessionId - Session ID to revoke
 * @returns {Promise<Object>} Result
 */
const revokeSession = async (adminId, sessionId) => {
  try {
    // Check session belongs to admin
    const session = await sessionRepository.findById(sessionId);
    if (!session) {
      throw NotFoundError("Session not found", "SESSION_NOT_FOUND");
    }
    if (session.adminId !== adminId) {
      throw AuthenticationError("Not authorized to revoke this session", "UNAUTHORIZED");
    }

    await sessionRepository.deleteSession(sessionId);
    logger.info("Session revoked", { adminId, sessionId });
    return { message: SUCCESS_MESSAGES.SESSION.INVALIDATED };
  } catch (error) {
    logger.error("Revoke session failed", { error: error.message, adminId, sessionId });
    throw transformError(error, "revokeSession");
  }
};

// ============================================
// Admin Management Functions (ADMIN only)
// ============================================

/**
 * Create a new admin (ADMIN only)
 * @param {Object} adminData - New admin data
 * @returns {Promise<Object>} Created admin
 */
const createAdmin = async (adminData) => {
  try {
    const validatedData = createAdminSchema.parse(adminData);

    // Check if email already exists
    const emailExists = await adminRepository.checkEmailExists(validatedData.email);
    if (emailExists) {
      throw ConflictError("Email already registered", "EMAIL_EXISTS");
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);

    // Create admin
    const newAdmin = await adminRepository.createAdmin({
      ...validatedData,
      password: hashedPassword,
    });

    logger.info("New admin created", { adminId: newAdmin.id, email: newAdmin.email });
    return {
      admin: newAdmin,
      message: SUCCESS_MESSAGES.ADMIN.CREATED,
    };
  } catch (error) {
    logger.error("Create admin failed", { error: error.message });
    throw transformError(error, "createAdmin");
  }
};

/**
 * Get all admins with pagination (ADMIN only)
 * @param {Object} filters - Filter options
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>} Paginated admin list
 */
const getAllAdmins = async (filters = {}, options = {}) => {
  try {
    const result = await adminRepository.findAdmins(filters, options);
    return result;
  } catch (error) {
    logger.error("Get all admins failed", { error: error.message });
    throw transformError(error, "getAllAdmins");
  }
};

/**
 * Get admin by ID (ADMIN only)
 * @param {string} adminId - Admin ID
 * @returns {Promise<Object>} Admin data
 */
const getAdminById = async (adminId) => {
  try {
    const admin = await adminRepository.findById(adminId);
    if (!admin) {
      throw NotFoundError("Admin not found", "ADMIN_NOT_FOUND");
    }
    return { admin };
  } catch (error) {
    logger.error("Get admin by ID failed", { error: error.message, adminId });
    throw transformError(error, "getAdminById");
  }
};

/**
 * Update admin (ADMIN only)
 * @param {string} adminId - Admin ID
 * @param {Object} updateData - Update data
 * @returns {Promise<Object>} Updated admin
 */
const updateAdminById = async (adminId, updateData) => {
  try {
    const validatedData = updateAdminSchema.parse(updateData);

    // Check for email conflict
    if (validatedData.email) {
      const existingAdmin = await adminRepository.findByEmail(validatedData.email);
      if (existingAdmin && existingAdmin.id !== adminId) {
        throw ConflictError("Email already in use", "EMAIL_EXISTS");
      }
    }

    const updatedAdmin = await adminRepository.updateAdmin(adminId, validatedData);
    logger.info("Admin updated by super admin", { adminId });
    return {
      admin: updatedAdmin,
      message: SUCCESS_MESSAGES.ADMIN.PROFILE_UPDATED,
    };
  } catch (error) {
    logger.error("Update admin failed", { error: error.message, adminId });
    throw transformError(error, "updateAdminById");
  }
};

/**
 * Change admin role (ADMIN only)
 * @param {string} adminId - Admin ID
 * @param {string} newRole - New role
 * @returns {Promise<Object>} Updated admin
 */
const changeAdminRole = async (adminId, newRole) => {
  try {
    const updatedAdmin = await adminRepository.updateAdminRole(adminId, newRole);
    logger.info("Admin role changed", { adminId, newRole });
    return {
      admin: updatedAdmin,
      message: `Admin role changed to ${newRole}`,
    };
  } catch (error) {
    logger.error("Change role failed", { error: error.message, adminId });
    throw transformError(error, "changeAdminRole");
  }
};

/**
 * Deactivate admin (ADMIN only)
 * @param {string} adminId - Admin ID
 * @returns {Promise<Object>} Result
 */
const deactivateAdmin = async (adminId) => {
  try {
    await adminRepository.deactivateAdmin(adminId);
    await sessionRepository.invalidateAllSessions(adminId);
    logger.info("Admin deactivated", { adminId });
    return { message: SUCCESS_MESSAGES.ADMIN.DEACTIVATED };
  } catch (error) {
    logger.error("Deactivate admin failed", { error: error.message, adminId });
    throw transformError(error, "deactivateAdmin");
  }
};

/**
 * Get admin statistics
 * @returns {Promise<Object>} Admin stats
 */
const getAdminStats = async () => {
  try {
    const stats = await adminRepository.countByRole();
    return { stats };
  } catch (error) {
    logger.error("Get admin stats failed", { error: error.message });
    throw transformError(error, "getAdminStats");
  }
};

module.exports = {
  // Authentication
  loginAdmin,
  refreshAccessToken,
  logoutAdmin,
  logoutAllDevices,
  validateToken,

  // Profile management
  changePassword,
  updateProfile,
  getProfile,
  getAdminSessions,
  revokeSession,

  // Admin management (ADMIN)
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdminById,
  changeAdminRole,
  deactivateAdmin,
  getAdminStats,
};
