// backend/auth-service/services/registrationOtpService.js
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const studentRepository = require("../repositories/studentRepository");
const signupRepository = require("../repositories/signupRepository");
const emailService = require("./emailService");
const smsService = require("./smsService");
const { generateOtp } = require("./unsubscribeService");
const { calculateReminderDate } = require("./studentService");
const {
    initiateRegistrationSchema,
    verifyOtpSchema,
    completeRegistrationSchema,
    resendOtpSchema,
} = require("../models/registrationOtpSchema");
const {
    generateRegistrationOtpEmailHtml,
    generateRegistrationOtpEmailText,
} = require("../templates/registrationOtpTemplates");
const {
    ValidationError,
    ConflictError,
    NotFoundError,
    transformError,
} = require("../shared/utils/errors");
const { createLogger } = require("../shared/utils/logger");

const logger = createLogger("registration-otp-service");

// Configuration
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_VERIFICATION_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute
const MAX_RESENDS = 3;
const VERIFICATION_TOKEN_EXPIRY = "5m";

// In-memory storage for pending registrations
const pendingRegistrations = new Map();

// Cleanup interval (run every 60 seconds)
setInterval(() => {
    const now = Date.now();
    for (const [token, data] of pendingRegistrations) {
        if (now - data.createdAt > OTP_EXPIRY_MS) {
            pendingRegistrations.delete(token);
            logger.debug("Cleaned up expired registration", { token: token.substring(0, 8) });
        }
    }
}, 60 * 1000);

/**
 * Generate a unique registration token
 * @returns {string} UUID v4 token
 */
const generateRegistrationToken = () => {
    return uuidv4();
};

/**
 * Mask destination for display (e.g., "u***@example.com" or "***-***-7890")
 * @param {string} destination - Email or phone
 * @param {string} channel - "email" or "phone"
 * @returns {string} Masked destination
 */
const maskDestination = (destination, channel) => {
    if (channel === "email") {
        const [local, domain] = destination.split("@");
        const maskedLocal = local.charAt(0) + "***";
        return `${maskedLocal}@${domain}`;
    } else {
        // Phone: show last 4 digits
        const last4 = destination.slice(-4);
        return `***-***-${last4}`;
    }
};

/**
 * Send OTP via the selected channel
 * @param {string} destination - Email or phone
 * @param {string} channel - "email" or "phone"
 * @param {string} otp - 6-digit OTP
 * @returns {Promise<Object>} Send result
 */
const sendOtp = async (destination, channel, otp) => {
    const expiresInMinutes = Math.floor(OTP_EXPIRY_MS / 60000);

    if (channel === "email") {
        const html = generateRegistrationOtpEmailHtml({ otp, expiresInMinutes });
        const text = generateRegistrationOtpEmailText({ otp, expiresInMinutes });

        return await emailService.sendEmail({
            to: destination,
            subject: "Verify Your Registration - Training Portal",
            body: text,
            html,
        });
    } else {
        const body = `Your Training Portal verification code is: ${otp}\n\nThis code expires in ${expiresInMinutes} minutes. Do not share this code.`;

        return await smsService.sendSms({
            to: destination,
            body,
        });
    }
};

/**
 * Initiate registration - validate data, send OTP
 * @param {Object} data - { email?, phone?, classType, verificationChannel }
 * @returns {Promise<Object>} Registration token and expiry info
 */
const initiateRegistration = async (data) => {
    try {
        const validatedData = initiateRegistrationSchema.parse(data);
        const { email, phone, classType, verificationChannel } = validatedData;

        const destination = verificationChannel === "email" ? email : phone;

        // Check if email/phone already registered
        const existingStudent = await studentRepository.checkExists(email, phone);
        if (existingStudent) {
            // Check which field matches
            if (email && existingStudent.email === email.toLowerCase()) {
                throw ConflictError(
                    "This email is already registered.",
                    "EMAIL_EXISTS"
                );
            }
            if (phone && existingStudent.phone === phone) {
                throw ConflictError(
                    "This phone number is already registered.",
                    "PHONE_EXISTS"
                );
            }
        }

        // Generate registration token and OTP
        const registrationToken = generateRegistrationToken();
        const otp = generateOtp();
        const now = Date.now();
        const expiresAt = new Date(now + OTP_EXPIRY_MS);

        // Store pending registration
        pendingRegistrations.set(registrationToken, {
            email: email || null,
            phone: phone || null,
            classType,
            verificationChannel,
            otp,
            createdAt: now,
            attempts: 0,
            resendCount: 0,
            lastResendAt: null,
        });

        // Send OTP
        const sendResult = await sendOtp(destination, verificationChannel, otp);

        if (!sendResult.success) {
            pendingRegistrations.delete(registrationToken);
            throw ValidationError(
                "Failed to send verification code. Please try again.",
                "SEND_FAILED"
            );
        }

        logger.info("Registration initiated", {
            token: registrationToken.substring(0, 8),
            channel: verificationChannel,
            destination: maskDestination(destination, verificationChannel),
        });

        return {
            registrationToken,
            expiresAt: expiresAt.toISOString(),
            verificationChannel,
            maskedDestination: maskDestination(destination, verificationChannel),
        };
    } catch (error) {
        logger.error("Registration initiation failed", { error: error.message });
        throw transformError(error, "initiateRegistration");
    }
};

/**
 * Verify OTP for registration
 * @param {Object} data - { registrationToken, otp }
 * @returns {Promise<Object>} Verification token
 */
const verifyRegistrationOtp = async (data) => {
    try {
        const validatedData = verifyOtpSchema.parse(data);
        const { registrationToken, otp } = validatedData;

        // Get pending registration
        const registration = pendingRegistrations.get(registrationToken);

        if (!registration) {
            throw NotFoundError(
                "Registration session not found or expired. Please start over.",
                "TOKEN_NOT_FOUND"
            );
        }

        // Check if expired
        if (Date.now() - registration.createdAt > OTP_EXPIRY_MS) {
            pendingRegistrations.delete(registrationToken);
            throw ValidationError(
                "Verification code has expired. Please start over.",
                "OTP_EXPIRED"
            );
        }

        // Check if too many attempts
        if (registration.attempts >= MAX_VERIFICATION_ATTEMPTS) {
            pendingRegistrations.delete(registrationToken);
            throw ValidationError(
                "Too many failed attempts. Please start over.",
                "TOO_MANY_ATTEMPTS"
            );
        }

        // Increment attempts before comparing (timing attack prevention)
        registration.attempts++;
        pendingRegistrations.set(registrationToken, registration);

        // Compare OTP
        if (registration.otp !== otp.trim()) {
            const remaining = MAX_VERIFICATION_ATTEMPTS - registration.attempts;
            logger.warn("OTP verification failed", {
                token: registrationToken.substring(0, 8),
                remainingAttempts: remaining,
            });
            throw ValidationError(
                `Invalid verification code. ${remaining} attempts remaining.`,
                "INVALID_OTP"
            );
        }

        // OTP verified - generate verification token (JWT)
        const verificationToken = jwt.sign(
            {
                registrationToken,
                email: registration.email,
                phone: registration.phone,
                classType: registration.classType,
                purpose: "registration_complete",
            },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: VERIFICATION_TOKEN_EXPIRY }
        );

        logger.info("Registration OTP verified", {
            token: registrationToken.substring(0, 8),
        });

        return {
            verified: true,
            verificationToken,
        };
    } catch (error) {
        logger.error("OTP verification failed", { error: error.message });
        throw transformError(error, "verifyRegistrationOtp");
    }
};

/**
 * Complete registration after OTP verification
 * @param {Object} data - { verificationToken }
 * @returns {Promise<Object>} Created signup and student
 */
const completeRegistration = async (data) => {
    try {
        const validatedData = completeRegistrationSchema.parse(data);
        const { verificationToken } = validatedData;

        // Verify JWT token
        let decoded;
        try {
            decoded = jwt.verify(verificationToken, process.env.JWT_ACCESS_SECRET);
        } catch (error) {
            if (error.name === "TokenExpiredError") {
                throw ValidationError(
                    "Verification session expired. Please verify again.",
                    "TOKEN_EXPIRED"
                );
            }
            throw ValidationError(
                "Invalid verification token. Please start over.",
                "INVALID_TOKEN"
            );
        }

        // Check token purpose
        if (decoded.purpose !== "registration_complete") {
            throw ValidationError("Invalid token purpose", "INVALID_TOKEN");
        }

        const { registrationToken, email, phone, classType } = decoded;

        // Clean up pending registration
        pendingRegistrations.delete(registrationToken);

        // Double-check for existing student (race condition protection)
        const existingStudent = await studentRepository.checkExists(email, phone);
        if (existingStudent) {
            throw ConflictError(
                "This email or phone number is already registered.",
                "ALREADY_EXISTS"
            );
        }

        // Create student
        const student = await studentRepository.createStudent({
            email,
            phone,
            optedOutEmail: false,
            optedOutSms: false,
        });

        logger.info("Student created via OTP verification", { studentId: student.id });

        // Calculate reminder date and create signup
        const reminderScheduledDate = calculateReminderDate(classType);

        const signup = await signupRepository.createSignup({
            studentId: student.id,
            classType,
            reminderScheduledDate,
            status: "PENDING",
        });

        logger.info("Signup created via OTP verification", {
            signupId: signup.id,
            studentId: student.id,
            classType,
        });

        return {
            signup,
            student,
            message: "Registration successful! You will receive a reminder before your class.",
        };
    } catch (error) {
        logger.error("Registration completion failed", { error: error.message });
        throw transformError(error, "completeRegistration");
    }
};

/**
 * Resend OTP for pending registration
 * @param {Object} data - { registrationToken }
 * @returns {Promise<Object>} New expiry info
 */
const resendOtp = async (data) => {
    try {
        const validatedData = resendOtpSchema.parse(data);
        const { registrationToken } = validatedData;

        // Get pending registration
        const registration = pendingRegistrations.get(registrationToken);

        if (!registration) {
            throw NotFoundError(
                "Registration session not found or expired. Please start over.",
                "TOKEN_NOT_FOUND"
            );
        }

        // Check if expired
        if (Date.now() - registration.createdAt > OTP_EXPIRY_MS) {
            pendingRegistrations.delete(registrationToken);
            throw ValidationError(
                "Registration session expired. Please start over.",
                "SESSION_EXPIRED"
            );
        }

        // Check resend limit
        if (registration.resendCount >= MAX_RESENDS) {
            throw ValidationError(
                "Maximum resend limit reached. Please start over.",
                "MAX_RESENDS"
            );
        }

        // Check cooldown
        if (
            registration.lastResendAt &&
            Date.now() - registration.lastResendAt < RESEND_COOLDOWN_MS
        ) {
            const waitTime = Math.ceil(
                (RESEND_COOLDOWN_MS - (Date.now() - registration.lastResendAt)) / 1000
            );
            throw ValidationError(
                `Please wait ${waitTime} seconds before requesting another code.`,
                "RESEND_COOLDOWN"
            );
        }

        // Generate new OTP
        const newOtp = generateOtp();
        const destination =
            registration.verificationChannel === "email"
                ? registration.email
                : registration.phone;

        // Send new OTP
        const sendResult = await sendOtp(
            destination,
            registration.verificationChannel,
            newOtp
        );

        if (!sendResult.success) {
            throw ValidationError(
                "Failed to send verification code. Please try again.",
                "SEND_FAILED"
            );
        }

        // Update registration
        registration.otp = newOtp;
        registration.resendCount++;
        registration.lastResendAt = Date.now();
        registration.attempts = 0; // Reset attempts on resend
        pendingRegistrations.set(registrationToken, registration);

        const expiresAt = new Date(registration.createdAt + OTP_EXPIRY_MS);

        logger.info("OTP resent", {
            token: registrationToken.substring(0, 8),
            resendCount: registration.resendCount,
        });

        return {
            expiresAt: expiresAt.toISOString(),
            remainingResends: MAX_RESENDS - registration.resendCount,
        };
    } catch (error) {
        logger.error("Resend OTP failed", { error: error.message });
        throw transformError(error, "resendOtp");
    }
};

module.exports = {
    initiateRegistration,
    verifyRegistrationOtp,
    completeRegistration,
    resendOtp,
    // Export for testing
    pendingRegistrations,
};
