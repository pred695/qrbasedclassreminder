// backend/auth-service/models/unsubscribeSchema.js
const { z } = require("zod");

// ============================================
// Unsubscribe OTP Verification Schemas
// ============================================

// OTP format: 6-digit numeric
const otpSchema = z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d{6}$/, "OTP must be numeric");

// Verify OTP schema - used when user submits email/phone + OTP
const verifyOtpSchema = z
    .object({
        destination: z
            .string()
            .min(1, "Email or phone is required")
            .trim(),
        otp: otpSchema,
    })
    .strict();

// Confirm unsubscribe schema - used after OTP verification
const confirmUnsubscribeSchema = z
    .object({
        token: z.string().min(1, "Verification token is required"),
        optedOutEmail: z.boolean().optional(),
        optedOutSms: z.boolean().optional(),
    })
    .strict()
    .refine(
        (data) => data.optedOutEmail !== undefined || data.optedOutSms !== undefined,
        {
            message: "At least one opt-out preference must be provided",
        }
    );

// ============================================
// Exports
// ============================================

module.exports = {
    otpSchema,
    verifyOtpSchema,
    confirmUnsubscribeSchema,
};
