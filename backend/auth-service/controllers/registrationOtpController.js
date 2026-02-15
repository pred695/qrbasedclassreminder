// backend/auth-service/controllers/registrationOtpController.js
const registrationOtpService = require("../services/registrationOtpService");
const { createSuccessResponse, createErrorResponse } = require("../lib/utils");
const { createLogger } = require("../shared/utils/logger");

const logger = createLogger("registration-otp-controller");

/**
 * Initiate registration - send OTP
 * POST /api/students/signup/initiate
 */
const initiateSignup = async (req, res) => {
    try {
        const result = await registrationOtpService.initiateRegistration(req.body);

        return createSuccessResponse(res, result, "Verification code sent successfully.", 201);
    } catch (error) {
        logger.error("Initiate signup failed", { error: error.message });
        return createErrorResponse(res, error, "initiateSignup");
    }
};

/**
 * Verify OTP
 * POST /api/students/signup/verify
 */
const verifyOtp = async (req, res) => {
    try {
        const result = await registrationOtpService.verifyRegistrationOtp(req.body);

        return createSuccessResponse(res, result, "Verification successful.", 200);
    } catch (error) {
        logger.error("Verify OTP failed", { error: error.message });
        return createErrorResponse(res, error, "verifyOtp");
    }
};

/**
 * Complete registration
 * POST /api/students/signup/complete
 */
const completeSignup = async (req, res) => {
    try {
        const result = await registrationOtpService.completeRegistration(req.body);

        return createSuccessResponse(res, result, result.message, 201);
    } catch (error) {
        logger.error("Complete signup failed", { error: error.message });
        return createErrorResponse(res, error, "completeSignup");
    }
};

/**
 * Resend OTP
 * POST /api/students/signup/resend
 */
const resendOtp = async (req, res) => {
    try {
        const result = await registrationOtpService.resendOtp(req.body);

        return createSuccessResponse(res, result, "Verification code resent successfully.", 200);
    } catch (error) {
        logger.error("Resend OTP failed", { error: error.message });
        return createErrorResponse(res, error, "resendOtp");
    }
};

module.exports = {
    initiateSignup,
    verifyOtp,
    completeSignup,
    resendOtp,
};
