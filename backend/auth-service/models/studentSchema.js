// backend/auth-service/models/studentSchema.js
const { z } = require("zod");

// ============================================
// Base validation schemas
// ============================================

const emailSchema = z
    .string()
    .min(1, "Email is required")
    .max(254, "Email must be less than 254 characters")
    .email("Invalid email format")
    .toLowerCase()
    .trim();

const phoneSchema = z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must be less than 15 digits")
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format");

const uuidSchema = z
    .string()
    .uuid("Invalid ID format")
    .transform((val) => val.toLowerCase());

// Class type enum
const classTypeSchema = z.enum(
    ["TYPE_1", "TYPE_2", "TYPE_3", "TYPE_4", "TYPE_5", "TYPE_6"],
    {
        errorMap: () => ({ message: "Invalid class type" }),
    }
);

// Signup status enum
const signupStatusSchema = z.enum(["PENDING", "SENT", "FAILED"], {
    errorMap: () => ({ message: "Invalid signup status" }),
});

// Message channel enum
const messageChannelSchema = z.enum(["EMAIL", "SMS"], {
    errorMap: () => ({ message: "Invalid message channel" }),
});

// ============================================
// Student schemas
// ============================================
// Reminder preference enum
const reminderPreferenceSchema = z.enum(['EMAIL', 'SMS', 'BOTH']);

// Student creation schema (for internal use)
const createStudentSchema = z
    .object({
        email: emailSchema.nullish(), // Accept null, undefined, or valid string
        phone: phoneSchema.nullish(), // Accept null, undefined, or valid string
        name: z.string().max(255).optional(),
        reminderPreference: reminderPreferenceSchema.optional().default('BOTH'),
        optedOutEmail: z.boolean().optional().default(false),
        optedOutSms: z.boolean().optional().default(false),
    })
    .strict()
    .refine((data) => data.email || data.phone, {
        message: "At least one contact method (email or phone) is required",
    });

// Student update schema
const updateStudentSchema = z
    .object({
        email: emailSchema.optional(),
        phone: phoneSchema.optional(),
        name: z.string().max(255).optional(),
        reminderPreference: reminderPreferenceSchema.optional(),
        optedOutEmail: z.boolean().optional(),
        optedOutSms: z.boolean().optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided for update",
    });

// Opt-out schema
const optOutSchema = z
    .object({
        optedOutEmail: z.boolean(),
        optedOutSms: z.boolean(),
    })
    .strict();

// ============================================
// Signup schemas
// ============================================

// Public signup creation schema (student-facing)
const createSignupSchema = z
    .object({
        email: emailSchema.nullish(), // Accept null, undefined, or valid string
        phone: phoneSchema.nullish(), // Accept null, undefined, or valid string
        name: z.string().max(255).optional(),
        classType: classTypeSchema,
    })
    .strict()
    .refine((data) => data.email || data.phone, {
        message: "At least one contact method (email or phone) is required",
    });

// Signup update schema (admin use)
const updateSignupSchema = z
    .object({
        classType: classTypeSchema.optional(),
        reminderScheduledDate: z.coerce.date().optional(),
        reminderSentAt: z.coerce.date().nullable().optional(),
        status: signupStatusSchema.optional(),
        notes: z.string().max(1000, "Notes must be less than 1000 characters").optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided for update",
    });

// Signup query/filter schema (admin dashboard)
const signupQuerySchema = z
    .object({
        studentId: uuidSchema.optional(),
        classType: classTypeSchema.optional(),
        status: signupStatusSchema.optional(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        search: z.string().optional(), // Search by email/phone
        page: z.coerce.number().int().min(1).optional(),
        limit: z.coerce.number().int().min(1).optional(), // No max limit - allow fetching all
        sortBy: z
            .enum(["createdAt", "reminderScheduledDate", "classType", "status"])
            .default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
    })
    .strict();

// ============================================
// Message Template schemas
// ============================================

const createTemplateSchema = z
    .object({
        classType: classTypeSchema,
        channel: messageChannelSchema,
        subject: z.string().max(200, "Subject must be less than 200 characters").optional(),
        body: z.string().min(1, "Body is required"),
        scheduleLink: z.string().url("Invalid schedule link URL"),
        variables: z.record(z.any()).optional(),
    })
    .strict()
    .refine(
        (data) => {
            // Email must have subject
            if (data.channel === "EMAIL" && !data.subject) {
                return false;
            }
            return true;
        },
        {
            message: "Subject is required for email templates",
            path: ["subject"],
        }
    );

const updateTemplateSchema = z
    .object({
        subject: z.string().max(200, "Subject must be less than 200 characters").optional(),
        body: z.string().min(1).optional(),
        scheduleLink: z.string().url("Invalid schedule link URL").optional(),
        variables: z.record(z.any()).optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided for update",
    });

// ============================================
// Utility validation functions
// ============================================

const validateEmail = (email) => {
    try {
        emailSchema.parse(email);
        return true;
    } catch {
        return false;
    }
};

const validatePhone = (phone) => {
    try {
        phoneSchema.parse(phone);
        return true;
    } catch {
        return false;
    }
};

const validateUuid = (id) => {
    try {
        uuidSchema.parse(id);
        return true;
    } catch {
        return false;
    }
};

const validateClassType = (classType) => {
    try {
        classTypeSchema.parse(classType);
        return true;
    } catch {
        return false;
    }
};

// ============================================
// Exports
// ============================================

module.exports = {
    // Base schemas
    emailSchema,
    phoneSchema,
    uuidSchema,
    classTypeSchema,
    signupStatusSchema,
    messageChannelSchema,

    // Student schemas
    createStudentSchema,
    updateStudentSchema,
    optOutSchema,

    // Signup schemas
    createSignupSchema,
    updateSignupSchema,
    signupQuerySchema,

    // Template schemas
    createTemplateSchema,
    updateTemplateSchema,

    // Utility validators
    validateEmail,
    validatePhone,
    validateUuid,
    validateClassType,
};
