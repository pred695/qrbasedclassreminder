// backend/auth-service/models/registrationOtpSchema.js
const { z } = require("zod");
const { emailSchema, phoneSchema, classTypeSchema } = require("./studentSchema");

// OTP schema - 6 digit numeric string
const otpSchema = z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d{6}$/, "OTP must be numeric");

// Verification channel enum
const verificationChannelSchema = z.enum(["email", "phone"], {
    errorMap: () => ({ message: "Invalid verification channel. Must be 'email' or 'phone'" }),
});

// Initiate registration schema
const initiateRegistrationSchema = z
    .object({
        name: z.string().max(255).nullish(),
        email: emailSchema.nullish(),
        phone: phoneSchema.nullish(),
        classType: classTypeSchema,
        verificationChannel: verificationChannelSchema,
    })
    .strict()
    .refine((data) => data.email || data.phone, {
        message: "At least one contact method (email or phone) is required",
    })
    .refine(
        (data) => {
            // Ensure the selected verification channel has a corresponding contact
            if (data.verificationChannel === "email" && !data.email) {
                return false;
            }
            if (data.verificationChannel === "phone" && !data.phone) {
                return false;
            }
            return true;
        },
        {
            message: "Selected verification channel must have a corresponding contact method",
            path: ["verificationChannel"],
        }
    );

// Verify OTP schema
const verifyOtpSchema = z
    .object({
        registrationToken: z.string().uuid("Invalid registration token"),
        otp: otpSchema,
    })
    .strict();

// Complete registration schema
const completeRegistrationSchema = z
    .object({
        verificationToken: z.string().min(1, "Verification token is required"),
    })
    .strict();

// Resend OTP schema
const resendOtpSchema = z
    .object({
        registrationToken: z.string().uuid("Invalid registration token"),
    })
    .strict();

module.exports = {
    otpSchema,
    verificationChannelSchema,
    initiateRegistrationSchema,
    verifyOtpSchema,
    completeRegistrationSchema,
    resendOtpSchema,
};
