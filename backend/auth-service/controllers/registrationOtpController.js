// backend/auth-service/controllers/registrationOtpController.js
const registrationOtpService = require("../services/registrationOtpService");
const { createSuccessResponse, createErrorResponse } = require("../shared/utils/response");
const { createLogger } = require("../shared/utils/logger");

const logger = createLogger("registration-otp-controller");

/**
 * Initiate registration - send OTP
 * POST /api/students/signup/initiate
 */
const initiateSignup = async (req, res) => {
    try {
        const result = await registrationOtpService.initiateRegistration(req.body);

        return res.status(201).json(
            createSuccessResponse(result, "Verification code sent successfully.")
        );
    } catch (error) {
        logger.error("Initiate signup failed", { error: error.message });
        return res.status(error.statusCode || 500).json(
            createErrorResponse(error)
        );
    }
};

/**
 * Verify OTP
 * POST /api/students/signup/verify
 */
const verifyOtp = async (req, res) => {
    try {
        const result = await registrationOtpService.verifyRegistrationOtp(req.body);

        return res.status(200).json(
            createSuccessResponse(result, "Verification successful.")
        );
    } catch (error) {
        logger.error("Verify OTP failed", { error: error.message });
        return res.status(error.statusCode || 500).json(
            createErrorResponse(error)
        );
    }
};

/**
 * Complete registration
 * POST /api/students/signup/complete
 */
const completeSignup = async (req, res) => {
    try {
        const result = await registrationOtpService.completeRegistration(req.body);

        return res.status(201).json(
            createSuccessResponse(result, result.message)
        );
    } catch (error) {
        logger.error("Complete signup failed", { error: error.message });
        return res.status(error.statusCode || 500).json(
            createErrorResponse(error)
        );
    }
};

/**
 * Resend OTP
 * POST /api/students/signup/resend
 */
const resendOtp = async (req, res) => {
    try {
        const result = await registrationOtpService.resendOtp(req.body);

        return res.status(200).json(
            createSuccessResponse(result, "Verification code resent successfully.")
        );
    } catch (error) {
        logger.error("Resend OTP failed", { error: error.message });
        return res.status(error.statusCode || 500).json(
            createErrorResponse(error)
        );
    }
};

module.exports = {
    initiateSignup,
    verifyOtp,
    completeSignup,
    resendOtp,
};
