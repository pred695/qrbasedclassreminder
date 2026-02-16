// backend/auth-service/controllers/signupController.js
const signupService = require("../services/signupService");
const { createSuccessResponse, createErrorResponse } = require("../lib/utils");
const { createLogger } = require("../shared/utils/logger");
const { signupQuerySchema } = require("../models/studentSchema");

const logger = createLogger("signup-controller");

// ============================================
// Admin Signup Management Routes
// ============================================

/**
 * Get all signups with filters and pagination (admin)
 * GET /api/signups
 */
const getAllSignups = async (req, res) => {
    try {
        const query = signupQuerySchema.parse(req.query);
        const { page, limit, sortBy, sortOrder, ...filters } = query;

        const result = await signupService.getAllSignups(filters, {
            page,
            limit,
            sortBy,
            sortOrder,
        });

        return createSuccessResponse(res, result, "Signups retrieved successfully", 200);
    } catch (error) {
        logger.error("Get all signups failed", { error: error.message });
        return createErrorResponse(res, error, "getAllSignups");
    }
};

/**
 * Get signup statistics (admin)
 * GET /api/signups/stats
 */
const getStats = async (req, res) => {
    try {
        const result = await signupService.getSignupStats();
        return createSuccessResponse(res, result, "Statistics retrieved successfully", 200);
    } catch (error) {
        logger.error("Get signup stats failed", { error: error.message });
        return createErrorResponse(res, error, "getStats");
    }
};

/**
 * Get signup by ID (admin)
 * GET /api/signups/:signupId
 */
const getSignupById = async (req, res) => {
    try {
        const { signupId } = req.params;

        const result = await signupService.getSignupById(signupId);

        return createSuccessResponse(res, result, "Signup retrieved successfully", 200);
    } catch (error) {
        logger.error("Get signup by ID failed", { error: error.message });
        return createErrorResponse(res, error, "getSignupById");
    }
};

/**
 * Update signup (admin)
 * PATCH /api/signups/:signupId
 */
const updateSignup = async (req, res) => {
    try {
        const { signupId } = req.params;

        const result = await signupService.updateSignup(signupId, req.body);

        logger.info("Signup updated by admin", { signupId, updatedBy: req.admin?.id });
        return createSuccessResponse(res, result, result.message, 200);
    } catch (error) {
        logger.error("Update signup failed", { error: error.message });
        return createErrorResponse(res, error, "updateSignup");
    }
};

/**
 * Delete signup (admin)
 * DELETE /api/signups/:signupId
 */
const deleteSignup = async (req, res) => {
    try {
        const { signupId } = req.params;

        const result = await signupService.deleteSignup(signupId);

        logger.info("Signup deleted by admin", { signupId, deletedBy: req.admin?.id });
        return createSuccessResponse(res, {}, result.message, 200);
    } catch (error) {
        logger.error("Delete signup failed", { error: error.message });
        return createErrorResponse(res, error, "deleteSignup");
    }
};

/**
 * Delete student and all registrations (admin)
 * DELETE /api/admin/signups/student/:studentId
 */
const deleteStudent = async (req, res) => {
    try {
        const { studentId } = req.params;

        const result = await signupService.deleteStudent(studentId);

        logger.info("Student deleted by admin", { studentId, deletedBy: req.admin?.id });
        return createSuccessResponse(res, {}, result.message, 200);
    } catch (error) {
        logger.error("Delete student failed", { error: error.message });
        return createErrorResponse(res, error, "deleteStudent");
    }
};

module.exports = {
    getAllSignups,
    getStats,
    getSignupById,
    updateSignup,
    deleteSignup,
    deleteStudent,
};
