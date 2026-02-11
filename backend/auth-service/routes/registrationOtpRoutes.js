// backend/auth-service/routes/registrationOtpRoutes.js
const express = require("express");
const rateLimit = require("express-rate-limit");
const registrationOtpController = require("../controllers/registrationOtpController");

const router = express.Router();

// Rate limiter for initiate endpoint (5 requests per 15 minutes per IP)
const initiateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: {
        success: false,
        error: {
            message: "Too many registration attempts. Please try again later.",
            code: "RATE_LIMIT_EXCEEDED",
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for verify endpoint (10 requests per 15 minutes per IP)
const verifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: {
        success: false,
        error: {
            message: "Too many verification attempts. Please try again later.",
            code: "RATE_LIMIT_EXCEEDED",
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter for resend endpoint (3 requests per 15 minutes per IP)
const resendLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3,
    message: {
        success: false,
        error: {
            message: "Too many resend requests. Please try again later.",
            code: "RATE_LIMIT_EXCEEDED",
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Routes
router.post("/initiate", initiateLimiter, registrationOtpController.initiateSignup);
router.post("/verify", verifyLimiter, registrationOtpController.verifyOtp);
router.post("/complete", registrationOtpController.completeSignup);
router.post("/resend", resendLimiter, registrationOtpController.resendOtp);

module.exports = router;
