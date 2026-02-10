// backend/auth-service/controllers/unsubscribeController.js
const unsubscribeService = require("../services/unsubscribeService");
const { createSuccessResponse, createErrorResponse } = require("../lib/utils");
const { createLogger } = require("../shared/utils/logger");

const logger = createLogger("unsubscribe-controller");

/**
 * Verify OTP for unsubscribe flow
 * POST /api/students/unsubscribe/verify
 */
const verifyOtp = async (req, res) => {
    try {
        const { destination, otp } = req.body;

        logger.info("OTP verification attempt", {
            destination: destination?.substring(0, 3) + "***"
        });

        const result = await unsubscribeService.verifyOtp({ destination, otp });

        logger.info("OTP verification successful", { studentId: result.student.id });
        return createSuccessResponse(res, result, result.message, 200);
    } catch (error) {
        logger.error("OTP verification failed", { error: error.message });
        return createErrorResponse(res, error, "verifyOtp");
    }
};

/**
 * Confirm unsubscribe after OTP verification
 * POST /api/students/unsubscribe/confirm
 */
const confirmUnsubscribe = async (req, res) => {
    try {
        const { token, optedOutEmail, optedOutSms } = req.body;

        logger.info("Unsubscribe confirmation attempt");

        const result = await unsubscribeService.confirmUnsubscribe({
            token,
            optedOutEmail,
            optedOutSms,
        });

        logger.info("Unsubscribe confirmed successfully");
        return createSuccessResponse(res, result, result.message, 200);
    } catch (error) {
        logger.error("Unsubscribe confirmation failed", { error: error.message });
        return createErrorResponse(res, error, "confirmUnsubscribe");
    }
};

module.exports = {
    verifyOtp,
    confirmUnsubscribe,
};
