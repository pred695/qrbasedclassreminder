// backend/auth-service/services/registrationOtpService.js
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const studentRepository = require("../repositories/studentRepository");
const signupRepository = require("../repositories/signupRepository");
const emailService = require("./emailService");
const smsService = require("./smsService");
const { generateOtp } = require("./unsubscribeService");
const { calculateReminderDate } = require("./studentService");
const { CLASS_TYPE_LABELS } = require("./reminderService");
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
    generateRegistrationConfirmationHtml,
    generateRegistrationConfirmationText,
} = require("../templates/registrationConfirmationTemplates");
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
    return crypto.randomUUID();
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
        const { name, email, phone, classType, verificationChannel } = validatedData;

        const destination = verificationChannel === "email" ? email : phone;

        // Check if student already exists (they can still sign up for additional classes)
        const existingStudent = await studentRepository.checkExists(email, phone);

        // Generate registration token and OTP
        const registrationToken = generateRegistrationToken();
        const otp = generateOtp();
        const now = Date.now();
        const expiresAt = new Date(now + OTP_EXPIRY_MS);

        // Determine if both channels need verification
        const bothRequired = !!(email && phone);

        // Store pending registration
        pendingRegistrations.set(registrationToken, {
            name: name || null,
            email: email || null,
            phone: phone || null,
            classType,
            verificationChannel,
            otp,
            createdAt: now,
            attempts: 0,
            resendCount: 0,
            lastResendAt: null,
            bothRequired,
            verifiedChannels: [],
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

        // Track verified channel
        registration.verifiedChannels = registration.verifiedChannels || [];
        registration.verifiedChannels.push(registration.verificationChannel);

        logger.info("Registration OTP verified for channel", {
            token: registrationToken.substring(0, 8),
            channel: registration.verificationChannel,
        });

        // Check if both channels need verification and second still pending
        if (registration.bothRequired && registration.verifiedChannels.length < 2) {
            const nextChannel = registration.verificationChannel === "email" ? "phone" : "email";
            const nextDestination = nextChannel === "email" ? registration.email : registration.phone;

            // Generate new OTP for next channel
            const newOtp = generateOtp();
            const sendResult = await sendOtp(nextDestination, nextChannel, newOtp);

            if (!sendResult.success) {
                throw ValidationError(
                    "Failed to send verification code to second channel. Please try again.",
                    "SEND_FAILED"
                );
            }

            // Update registration for next channel
            registration.otp = newOtp;
            registration.verificationChannel = nextChannel;
            registration.attempts = 0;
            registration.resendCount = 0;
            registration.lastResendAt = null;
            pendingRegistrations.set(registrationToken, registration);

            const expiresAt = new Date(registration.createdAt + OTP_EXPIRY_MS);

            return {
                verified: false,
                channelVerified: registration.verifiedChannels[0],
                nextChannel,
                maskedDestination: maskDestination(nextDestination, nextChannel),
                expiresAt: expiresAt.toISOString(),
            };
        }

        // All channels verified - generate verification token (JWT)
        const verificationToken = jwt.sign(
            {
                registrationToken,
                name: registration.name,
                email: registration.email,
                phone: registration.phone,
                classType: registration.classType,
                purpose: "registration_complete",
            },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: VERIFICATION_TOKEN_EXPIRY }
        );

        logger.info("All channels verified, registration OTP complete", {
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

        const { registrationToken, name, email, phone, classType } = decoded;

        // Clean up pending registration
        pendingRegistrations.delete(registrationToken);

        // Check if student already exists (returning student signing up for another class)
        let student = await studentRepository.checkExists(email, phone);

        if (!student) {
            // Create new student
            student = await studentRepository.createStudent({
                name,
                email,
                phone,
                optedOutEmail: false,
                optedOutSms: false,
            });
            logger.info("Student created via OTP verification", { studentId: student.id });
        } else {
            // Check if student already has a signup for this exact class type
            const existingSignups = await signupRepository.findByStudentId(student.id);
            const duplicateSignup = existingSignups.find(s => s.classType === classType);
            if (duplicateSignup) {
                throw ConflictError(
                    "You have already registered for this training class.",
                    "DUPLICATE_SIGNUP"
                );
            }
            // Update name if provided and student doesn't have one yet
            if (name && !student.name) {
                student = await studentRepository.updateStudent(student.id, { name });
            }
            logger.info("Existing student signing up for new class", { studentId: student.id });
        }

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

        // Send confirmation email with booking link
        const bookingLink = process.env.BOOKING_LINK || "https://www-1576u.bookeo.com/bookeo/b_lpginc_start.html?ctlsrc2=vskZyJm5J1HEVBjiZ6I3S3gwac%2B3JN3dWUpvA1XVhvI%3D&src=03a&source=remarketing";
        const classTypeName = CLASS_TYPE_LABELS[classType] || classType;

        if (email) {
            try {
                const html = generateRegistrationConfirmationHtml({ classTypeName, bookingLink });
                const text = generateRegistrationConfirmationText({ classTypeName, bookingLink });
                await emailService.sendEmail({
                    to: email,
                    subject: `Registration Confirmed - ${classTypeName}`,
                    body: text,
                    html,
                });
                logger.info("Confirmation email sent", { email, classType });
            } catch (emailError) {
                // Don't fail registration if confirmation email fails
                logger.error("Failed to send confirmation email", { error: emailError.message });
            }
        }

        if (phone) {
            try {
                await smsService.sendSms({
                    to: phone,
                    body: `Registration confirmed for ${classTypeName}! Book your training session: ${bookingLink}`,
                });
                logger.info("Confirmation SMS sent", { classType });
            } catch (smsError) {
                logger.error("Failed to send confirmation SMS", { error: smsError.message });
            }
        }

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
