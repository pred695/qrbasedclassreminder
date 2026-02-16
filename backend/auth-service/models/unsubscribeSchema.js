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

// Per-signup preference item
const signupPreferenceSchema = z.object({
    signupId: z.string().uuid("Invalid signup ID"),
    optedOutEmail: z.boolean(),
    optedOutSms: z.boolean(),
});

// Confirm unsubscribe schema - supports both global and per-signup preferences
const confirmUnsubscribeSchema = z
    .object({
        token: z.string().min(1, "Verification token is required"),
        // Legacy global preferences (for old UnsubscribeFlow)
        optedOutEmail: z.boolean().optional(),
        optedOutSms: z.boolean().optional(),
        // Per-signup preferences (for MyRegistrations page)
        signupPreferences: z.array(signupPreferenceSchema).optional(),
    })
    .refine(
        (data) =>
            data.signupPreferences?.length > 0 ||
            data.optedOutEmail !== undefined ||
            data.optedOutSms !== undefined,
        {
            message: "Either signup preferences or global opt-out preferences must be provided",
        }
    );

// Initiate opt-out schema - used to send OTP on demand
const initiateOptOutSchema = z
    .object({
        destination: z
            .string()
            .min(1, "Email or phone is required")
            .trim(),
    })
    .strict();

// ============================================
// Exports
// ============================================

module.exports = {
    otpSchema,
    verifyOtpSchema,
    confirmUnsubscribeSchema,
    initiateOptOutSchema,
};
