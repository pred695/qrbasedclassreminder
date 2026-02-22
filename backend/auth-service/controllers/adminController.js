const adminService = require("../services/adminService");
const {
  setAuthCookies,
  clearAuthCookies,
  getRequestMetadata,
} = require("../middleware/authMiddleware");
const { createSuccessResponse, createErrorResponse } = require("../lib/utils");
const { createLogger } = require("../shared/utils/logger");
const { adminQuerySchema, updateAdminRoleSchema } = require("../models/adminSchema");

const logger = createLogger("admin-controller");

// ============================================
// Authentication Handlers
// ============================================

/**
 * Admin login
 * POST /api/admin/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const metadata = getRequestMetadata(req);

    logger.info("Admin login attempt", { email, ip: metadata.ipAddress });

    const result = await adminService.loginAdmin({ email, password }, metadata);

    // Set cookies
    setAuthCookies(res, result.tokens);

    logger.info("Admin login successful", { adminId: result.admin.id });
    return createSuccessResponse(res, { admin: result.admin }, result.message, 200);
  } catch (error) {
    logger.error("Admin login failed", { error: error.message, email: req.body?.email });
    return createErrorResponse(res, error, "login");
  }
};

/**
 * Admin logout
 * POST /api/admin/logout
 */
const logout = async (req, res) => {
  try {
    await adminService.logoutAdmin(req.token);
    clearAuthCookies(res);

    logger.info("Admin logout successful", { adminId: req.admin?.id });
    return createSuccessResponse(res, {}, "Logout successful", 200);
  } catch (error) {
    logger.error("Admin logout failed", { error: error.message });
    // Still clear cookies even if logout fails
    clearAuthCookies(res);
    return createSuccessResponse(res, {}, "Logout successful", 200);
  }
};

/**
 * Refresh access token
 * POST /api/admin/refresh
 */
const refresh = async (req, res) => {
  try {
    const metadata = getRequestMetadata(req);
    const result = await adminService.refreshAccessToken(req.refreshToken, metadata);

    setAuthCookies(res, result.tokens);

    return createSuccessResponse(res, {}, result.message, 200);
  } catch (error) {
    logger.error("Token refresh failed", { error: error.message });
    clearAuthCookies(res);
    return createErrorResponse(res, error, "refresh");
  }
};

/**
 * Logout from all devices
 * POST /api/admin/logout-all
 */
const logoutAll = async (req, res) => {
  try {
    await adminService.logoutAllDevices(req.admin.id);
    clearAuthCookies(res);

    logger.info("Admin logged out from all devices", { adminId: req.admin.id });
    return createSuccessResponse(res, {}, "Logged out from all devices", 200);
  } catch (error) {
    logger.error("Logout all failed", { error: error.message, adminId: req.admin?.id });
    return createErrorResponse(res, error, "logoutAll");
  }
};

// ============================================
// Profile Handlers
// ============================================

/**
 * Get current admin profile
 * GET /api/admin/me
 */
const getProfile = async (req, res) => {
  try {
    const result = await adminService.getProfile(req.admin.id);
    return createSuccessResponse(res, result, "Profile retrieved successfully", 200);
  } catch (error) {
    logger.error("Get profile failed", { error: error.message, adminId: req.admin?.id });
    return createErrorResponse(res, error, "getProfile");
  }
};

/**
 * Update current admin profile
 * PUT /api/admin/me
 */
const updateProfile = async (req, res) => {
  try {
    const result = await adminService.updateProfile(req.admin.id, req.body);

    logger.info("Admin profile updated", { adminId: req.admin.id });
    return createSuccessResponse(res, result, result.message, 200);
  } catch (error) {
    logger.error("Update profile failed", { error: error.message, adminId: req.admin?.id });
    return createErrorResponse(res, error, "updateProfile");
  }
};

/**
 * Change password
 * POST /api/admin/change-password
 */
const changePassword = async (req, res) => {
  try {
    const result = await adminService.changePassword(req.admin.id, req.body);
    clearAuthCookies(res);

    logger.info("Admin password changed", { adminId: req.admin.id });
    return createSuccessResponse(res, {}, result.message, 200);
  } catch (error) {
    logger.error("Change password failed", { error: error.message, adminId: req.admin?.id });
    return createErrorResponse(res, error, "changePassword");
  }
};

// ============================================
// Session Handlers
// ============================================

/**
 * Get current admin's sessions
 * GET /api/admin/sessions
 */
const getSessions = async (req, res) => {
  try {
    const result = await adminService.getAdminSessions(req.admin.id);
    return createSuccessResponse(res, result, "Sessions retrieved successfully", 200);
  } catch (error) {
    logger.error("Get sessions failed", { error: error.message, adminId: req.admin?.id });
    return createErrorResponse(res, error, "getSessions");
  }
};

/**
 * Revoke a specific session
 * DELETE /api/admin/sessions/:sessionId
 */
const revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await adminService.revokeSession(req.admin.id, sessionId);

    logger.info("Session revoked", { adminId: req.admin.id, sessionId });
    return createSuccessResponse(res, {}, result.message, 200);
  } catch (error) {
    logger.error("Revoke session failed", { error: error.message, adminId: req.admin?.id });
    return createErrorResponse(res, error, "revokeSession");
  }
};

// ============================================
// Admin Management Handlers (ADMIN only)
// ============================================

/**
 * Get all admins (paginated)
 * GET /api/admin/manage
 */
const getAllAdmins = async (req, res) => {
  try {
    const query = adminQuerySchema.parse(req.query);
    const { page, limit, sortBy, sortOrder, ...filters } = query;

    const result = await adminService.getAllAdmins(filters, { page, limit, sortBy, sortOrder });
    return createSuccessResponse(res, result, "Admins retrieved successfully", 200);
  } catch (error) {
    logger.error("Get all admins failed", { error: error.message });
    return createErrorResponse(res, error, "getAllAdmins");
  }
};

/**
 * Create new admin
 * POST /api/admin/manage
 */
const createAdmin = async (req, res) => {
  try {
    const result = await adminService.createAdmin(req.body);

    logger.info("New user created by admin", {
      createdBy: req.admin.id,
      newAdminId: result.admin.id,
    });
    return createSuccessResponse(res, result, result.message, 201);
  } catch (error) {
    logger.error("Create admin failed", { error: error.message });
    return createErrorResponse(res, error, "createAdmin");
  }
};

/**
 * Get admin by ID
 * GET /api/admin/manage/:adminId
 */
const getAdminById = async (req, res) => {
  try {
    const { adminId } = req.params;
    const result = await adminService.getAdminById(adminId);
    return createSuccessResponse(res, result, "Admin retrieved successfully", 200);
  } catch (error) {
    logger.error("Get admin by ID failed", { error: error.message, adminId: req.params?.adminId });
    return createErrorResponse(res, error, "getAdminById");
  }
};

/**
 * Update admin
 * PUT /api/admin/manage/:adminId
 */
const updateAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;
    const result = await adminService.updateAdminById(adminId, req.body);

    logger.info("User updated by admin", { updatedBy: req.admin.id, adminId });
    return createSuccessResponse(res, result, result.message, 200);
  } catch (error) {
    logger.error("Update admin failed", { error: error.message, adminId: req.params?.adminId });
    return createErrorResponse(res, error, "updateAdmin");
  }
};

/**
 * Change admin role
 * PUT /api/admin/manage/:adminId/role
 */
const changeRole = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { role } = updateAdminRoleSchema.parse(req.body);

    // Prevent changing own role
    if (adminId === req.admin.id) {
      return res.status(400).json({
        success: false,
        error: {
          code: "CANNOT_CHANGE_OWN_ROLE",
          message: "You cannot change your own role",
        },
      });
    }

    const result = await adminService.changeAdminRole(adminId, role);

    logger.info("Admin role changed", { changedBy: req.admin.id, adminId, newRole: role });
    return createSuccessResponse(res, result, result.message, 200);
  } catch (error) {
    logger.error("Change role failed", { error: error.message, adminId: req.params?.adminId });
    return createErrorResponse(res, error, "changeRole");
  }
};

/**
 * Deactivate admin
 * DELETE /api/admin/manage/:adminId
 */
const deactivateAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;

    // Prevent self-deactivation
    if (adminId === req.admin.id) {
      return res.status(400).json({
        success: false,
        error: {
          code: "CANNOT_DEACTIVATE_SELF",
          message: "You cannot deactivate your own account",
        },
      });
    }

    const result = await adminService.deactivateAdmin(adminId);

    logger.info("Admin deactivated", { deactivatedBy: req.admin.id, adminId });
    return createSuccessResponse(res, {}, result.message, 200);
  } catch (error) {
    logger.error("Deactivate admin failed", { error: error.message, adminId: req.params?.adminId });
    return createErrorResponse(res, error, "deactivateAdmin");
  }
};

/**
 * Get admin statistics
 * GET /api/admin/manage/stats
 */
const getStats = async (req, res) => {
  try {
    const result = await adminService.getAdminStats();
    return createSuccessResponse(res, result, "Stats retrieved successfully", 200);
  } catch (error) {
    logger.error("Get stats failed", { error: error.message });
    return createErrorResponse(res, error, "getStats");
  }
};

module.exports = {
  // Authentication
  login,
  logout,
  refresh,
  logoutAll,

  // Profile
  getProfile,
  updateProfile,
  changePassword,

  // Sessions
  getSessions,
  revokeSession,

  // Admin Management (ADMIN only)
  getAllAdmins,
  createAdmin,
  getAdminById,
  updateAdmin,
  changeRole,
  deactivateAdmin,
  getStats,
};
