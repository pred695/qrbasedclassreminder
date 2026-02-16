// backend/auth-service/controllers/studentController.js
const studentService = require("../services/studentService");
const { createSuccessResponse, createErrorResponse } = require("../lib/utils");
const { createLogger } = require("../shared/utils/logger");

const logger = createLogger("student-controller");

// ============================================
// Public Student Routes
// ============================================

/**
 * Create new student signup (public endpoint)
 * POST /api/students/signup
 */
const createSignup = async (req, res) => {
    try {
        const { email, phone, classType, name } = req.body;

        logger.info("Student signup attempt", { email, phone, classType });

        const result = await studentService.createSignup({ email, phone, classType, name });

        logger.info("Student signup successful", { signupId: result.signup.id });
        return createSuccessResponse(res, result, result.message, 201);
    } catch (error) {
        logger.error("Student signup failed", { error: error.message });
        return createErrorResponse(res, error, "createSignup");
    }
};

/**
 * Get signup confirmation details (public endpoint)
 * GET /api/students/signup/:signupId
 */
const getSignupConfirmation = async (req, res) => {
    try {
        const { signupId } = req.params;

        const result = await studentService.getSignupById(signupId);

        return createSuccessResponse(res, result, "Signup details retrieved successfully", 200);
    } catch (error) {
        logger.error("Get signup confirmation failed", { error: error.message });
        return createErrorResponse(res, error, "getSignupConfirmation");
    }
};

/**
 * Get all signups for a student (public endpoint)
 * GET /api/students/:studentId/signups
 */
const getStudentSignups = async (req, res) => {
    try {
        const { studentId } = req.params;

        const result = await studentService.getStudentSignups(studentId);

        return createSuccessResponse(
            res,
            result,
            "Student signups retrieved successfully",
            200
        );
    } catch (error) {
        logger.error("Get student signups failed", { error: error.message });
        return createErrorResponse(res, error, "getStudentSignups");
    }
};

/**
 * Update opt-out preference (public endpoint)
 * PATCH /api/students/:studentId/opt-out
 */
const updateOptOut = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { optedOutEmail, optedOutSms } = req.body;

        const result = await studentService.updateOptOutPreference(studentId, {
            optedOutEmail,
            optedOutSms,
        });

        logger.info("Opt-out preference updated", { studentId });
        return createSuccessResponse(res, result, result.message, 200);
    } catch (error) {
        logger.error("Update opt-out failed", { error: error.message });
        return createErrorResponse(res, error, "updateOptOut");
    }
};

module.exports = {
    createSignup,
    getSignupConfirmation,
    getStudentSignups,
    updateOptOut,
};
