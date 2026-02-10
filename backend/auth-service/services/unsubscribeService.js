// backend/auth-service/services/unsubscribeService.js
const jwt = require("jsonwebtoken");
const studentRepository = require("../repositories/studentRepository");
const { verifyOtpSchema, confirmUnsubscribeSchema } = require("../models/unsubscribeSchema");
const {
    ValidationError,
    AuthenticationError,
    NotFoundError,
    transformError,
} = require("../shared/utils/errors");
const { createLogger } = require("../shared/utils/logger");

const logger = createLogger("unsubscribe-service");

// Verification token expiry (5 minutes)
const VERIFICATION_TOKEN_EXPIRY = "5m";

// In-memory rate limiting for OTP verification attempts
const verificationAttempts = new Map();
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes

/**
 * Generate a 6-digit numeric OTP
 * @returns {string} 6-digit OTP
 */
const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Get verification attempts for a destination
 * @param {string} destination - Email or phone
 * @returns {Object} Attempts info
 */
const getAttempts = (destination) => {
    const key = destination.toLowerCase();
    const now = Date.now();
    const record = verificationAttempts.get(key);

    if (!record || now - record.firstAttempt > ATTEMPT_WINDOW) {
        return { count: 0, blocked: false };
    }

    return {
        count: record.count,
        blocked: record.count >= MAX_ATTEMPTS,
        remainingAttempts: Math.max(0, MAX_ATTEMPTS - record.count),
    };
};

/**
 * Increment verification attempts
 * @param {string} destination - Email or phone
 */
const incrementAttempts = (destination) => {
    const key = destination.toLowerCase();
    const now = Date.now();
    const record = verificationAttempts.get(key);

    if (!record || now - record.firstAttempt > ATTEMPT_WINDOW) {
        verificationAttempts.set(key, { count: 1, firstAttempt: now });
    } else {
        record.count++;
        verificationAttempts.set(key, record);
    }
};

/**
 * Clear verification attempts (after successful verification)
 * @param {string} destination - Email or phone
 */
const clearAttempts = (destination) => {
    const key = destination.toLowerCase();
    verificationAttempts.delete(key);
};

/**
 * Verify OTP and return a verification token
 * @param {Object} data - { destination, otp }
 * @returns {Promise<Object>} Verification result with token
 */
const verifyOtp = async (data) => {
    try {
        const validatedData = verifyOtpSchema.parse(data);
        const { destination, otp } = validatedData;

        // Check if blocked due to too many attempts
        const attempts = getAttempts(destination);
        if (attempts.blocked) {
            throw ValidationError(
                "Too many verification attempts. Please try again later.",
                "TOO_MANY_ATTEMPTS"
            );
        }

        // Find student by email or phone
        const student = await studentRepository.findByDestinationWithOtp(destination);

        // Always increment attempts first (to prevent timing attacks)
        incrementAttempts(destination);

        // Generic error message to prevent enumeration
        const genericError = "Invalid verification code. Please check and try again.";

        if (!student) {
            logger.warn("OTP verification failed - student not found", { destination });
            throw ValidationError(genericError, "INVALID_OTP");
        }

        if (!student.optOutOtp) {
            logger.warn("OTP verification failed - no OTP set", { studentId: student.id });
            throw ValidationError(genericError, "INVALID_OTP");
        }

        // Compare OTP (case-insensitive, trim whitespace)
        if (student.optOutOtp.trim() !== otp.trim()) {
            const remaining = MAX_ATTEMPTS - getAttempts(destination).count;
            logger.warn("OTP verification failed - OTP mismatch", {
                studentId: student.id,
                remainingAttempts: remaining,
            });
            throw ValidationError(
                `Invalid verification code. ${remaining} attempts remaining.`,
                "INVALID_OTP"
            );
        }

        // OTP is valid - clear attempts
        clearAttempts(destination);

        // Generate verification token (short-lived)
        const verificationToken = jwt.sign(
            {
                studentId: student.id,
                destination,
                purpose: "unsubscribe",
            },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: VERIFICATION_TOKEN_EXPIRY }
        );

        logger.info("OTP verified successfully", { studentId: student.id });

        return {
            verified: true,
            token: verificationToken,
            student: {
                id: student.id,
                email: student.email,
                phone: student.phone,
                optedOutEmail: student.optedOutEmail,
                optedOutSms: student.optedOutSms,
            },
            message: "Verification successful. Please confirm your preferences.",
        };
    } catch (error) {
        logger.error("OTP verification error", { error: error.message });
        throw transformError(error, "verifyOtp");
    }
};

/**
 * Confirm unsubscribe after OTP verification
 * @param {Object} data - { token, optedOutEmail?, optedOutSms? }
 * @returns {Promise<Object>} Confirmation result
 */
const confirmUnsubscribe = async (data) => {
    try {
        const validatedData = confirmUnsubscribeSchema.parse(data);
        const { token, optedOutEmail, optedOutSms } = validatedData;

        // Verify the token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        } catch (error) {
            if (error.name === "TokenExpiredError") {
                throw AuthenticationError(
                    "Verification session expired. Please verify your identity again.",
                    "TOKEN_EXPIRED"
                );
            }
            throw AuthenticationError(
                "Invalid verification token. Please verify your identity again.",
                "INVALID_TOKEN"
            );
        }

        // Check token purpose
        if (decoded.purpose !== "unsubscribe") {
            throw AuthenticationError("Invalid token purpose", "INVALID_TOKEN");
        }

        const studentId = decoded.studentId;

        // Verify student exists
        const student = await studentRepository.findById(studentId);
        if (!student) {
            throw NotFoundError("Student not found", "STUDENT_NOT_FOUND");
        }

        // Build update data
        const updateData = {};
        if (optedOutEmail !== undefined) {
            updateData.optedOutEmail = optedOutEmail;
        }
        if (optedOutSms !== undefined) {
            updateData.optedOutSms = optedOutSms;
        }

        // Update opt-out preferences
        await studentRepository.updateOptOutStatus(studentId, updateData);

        // Clear the OTP
        await studentRepository.clearOptOutOtp(studentId);

        logger.info("Unsubscribe confirmed", {
            studentId,
            optedOutEmail,
            optedOutSms,
        });

        return {
            success: true,
            message: "Your preferences have been updated successfully.",
            preferences: {
                optedOutEmail: optedOutEmail ?? student.optedOutEmail,
                optedOutSms: optedOutSms ?? student.optedOutSms,
            },
        };
    } catch (error) {
        logger.error("Confirm unsubscribe error", { error: error.message });
        throw transformError(error, "confirmUnsubscribe");
    }
};

module.exports = {
    generateOtp,
    verifyOtp,
    confirmUnsubscribe,
};
