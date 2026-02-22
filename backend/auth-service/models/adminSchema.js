// backend/auth-service/models/adminSchema.js
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

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be less than 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/\d/, "Password must contain at least one number")
  .regex(
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
    "Password must contain at least one special character"
  );

const nameSchema = z
  .string()
  .min(1, "Name is required")
  .max(100, "Name must be less than 100 characters")
  .trim();

// UUID validation (for admin IDs)
const uuidSchema = z
  .string()
  .uuid("Invalid ID format")
  .transform((val) => val.toLowerCase());

// Admin role enum
const adminRoleSchema = z.enum(["ADMIN", "STAFF"], {
  errorMap: () => ({ message: "Role must be ADMIN or STAFF" }),
});

// Date schema
const dateSchema = z
  .string()
  .refine(
    (dateString) => {
      const date = new Date(dateString);
      return !Number.isNaN(date.getTime());
    },
    { message: "Invalid date format" }
  )
  .transform((dateString) => new Date(dateString));

// Sanitization schema
const sanitizedStringSchema = z.string().transform((input) => {
  if (!input || typeof input !== "string") {
    return "";
  }
  return input.trim().replace(/[<>\"'&]/g, (match) => {
    const htmlEntities = {
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;",
      "&": "&amp;",
    };
    return htmlEntities[match];
  });
});

// ============================================
// Admin-specific schemas
// ============================================

// Admin creation schema (used by ADMIN to create other admins/staff)
const createAdminSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    name: nameSchema,
    role: adminRoleSchema.optional().default("STAFF"),
  })
  .strict();

// Admin update schema (for profile updates)
const updateAdminSchema = z
  .object({
    email: emailSchema.optional(),
    name: nameSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

// Admin role update schema (ADMIN only)
const updateAdminRoleSchema = z
  .object({
    role: adminRoleSchema,
  })
  .strict();

// Admin login schema
const loginAdminSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, "Password is required"),
  })
  .strict();

// Password change schema
const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .strict()
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New password and confirmation do not match",
    path: ["confirmPassword"],
  });

// Admin query schema (for listing/filtering admins)
const adminQuerySchema = z
  .object({
    id: uuidSchema.optional(),
    email: z.string().optional(),
    role: adminRoleSchema.optional(),
    isActive: z
      .string()
      .transform((val) => val === "true")
      .optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    sortBy: z.enum(["createdAt", "updatedAt", "email", "name"]).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

// ============================================
// Session schemas
// ============================================

const createSessionSchema = z.object({
  adminId: uuidSchema,
  token: z.string().min(1, "Token is required"),
  refreshToken: z.string().min(1, "Refresh token is required").optional(),
  expiresAt: z.date(),
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
});

const updateSessionSchema = z.object({
  token: z.string().optional(),
  refreshToken: z.string().optional(),
  expiresAt: z.date().optional(),
  ipAddress: z.string().optional().nullable(),
  userAgent: z.string().optional().nullable(),
});

// ============================================
// Password reset schemas
// ============================================

const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

const passwordResetSchema = z
  .object({
    token: z.string().min(32, "Invalid reset token").max(128, "Invalid reset token"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const createPasswordResetSchema = z.object({
  adminId: uuidSchema,
  email: emailSchema,
  token: z.string().min(32, "Token must be at least 32 characters"),
  expiresAt: z.date(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
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

const validatePassword = (password) => {
  try {
    passwordSchema.parse(password);
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

const validateRole = (role) => {
  try {
    adminRoleSchema.parse(role);
    return true;
  } catch {
    return false;
  }
};

const sanitizeInput = (input) => {
  try {
    return sanitizedStringSchema.parse(input);
  } catch {
    return "";
  }
};

// ============================================
// Exports
// ============================================

module.exports = {
  // Base schemas
  emailSchema,
  passwordSchema,
  nameSchema,
  uuidSchema,
  adminRoleSchema,
  dateSchema,
  sanitizedStringSchema,

  // Admin schemas
  createAdminSchema,
  updateAdminSchema,
  updateAdminRoleSchema,
  loginAdminSchema,
  changePasswordSchema,
  adminQuerySchema,

  // Session schemas
  createSessionSchema,
  updateSessionSchema,

  // Password reset schemas
  passwordResetRequestSchema,
  passwordResetSchema,
  createPasswordResetSchema,

  // Utility validators
  validateEmail,
  validatePassword,
  validateUuid,
  validateRole,
  sanitizeInput,
};
