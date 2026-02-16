// backend/auth-service/routes/unsubscribeRoutes.js
const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const unsubscribeController = require("../controllers/unsubscribeController");

// Rate limiter for OTP verification (stricter than general rate limit)
const otpVerifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window per IP
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

// ============================================
// Public Unsubscribe Routes (No Authentication)
// ============================================

// Initiate opt-out (send OTP on demand)
// POST /api/students/unsubscribe/initiate
router.post("/initiate", otpVerifyLimiter, unsubscribeController.initiateOptOut);

// Verify OTP
// POST /api/students/unsubscribe/verify
router.post("/verify", otpVerifyLimiter, unsubscribeController.verifyOtp);

// Confirm unsubscribe
// POST /api/students/unsubscribe/confirm
router.post("/confirm", unsubscribeController.confirmUnsubscribe);

module.exports = router;
