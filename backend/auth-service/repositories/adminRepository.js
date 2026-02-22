const { getDatabase } = require("../config/database");
const { transformError, ValidationError } = require("../shared/utils/errors");
const {
  createAdminSchema,
  updateAdminSchema,
  uuidSchema,
  emailSchema,
  adminRoleSchema,
} = require("../models/adminSchema");
const { ADMIN_FIELDS, ALLOWED_ADMIN_UPDATE_FIELDS } = require("../lib/constants");
const { createLogger } = require("../shared/utils/logger");

const logger = createLogger("admin-repository");
let dbInstance = null;

/**
 * Get database instance (singleton pattern)
 */
const getDB = async () => {
  if (!dbInstance) {
    dbInstance = await getDatabase();
  }
  return dbInstance;
};

/**
 * Create a new admin in the database
 * @param {Object} adminData - Admin data to create
 * @returns {Promise<Object>} Created admin object
 */
const createAdmin = async (adminData) => {
  try {
    const validatedAdminData = createAdminSchema.parse(adminData);
    const { email, password, name, role } = validatedAdminData;

    const db = await getDB();
    const newAdmin = await db.admin.create({
      data: {
        email,
        password,
        name,
        role,
      },
      select: ADMIN_FIELDS.public,
    });

    logger.info("Admin created successfully", { adminId: newAdmin.id, email: newAdmin.email });
    return newAdmin;
  } catch (error) {
    logger.error("Failed to create admin", { error: error.message });
    throw transformError(error, "createAdmin");
  }
};

/**
 * Find admin by email
 * @param {string} email - Admin email
 * @param {boolean} includePassword - Whether to include password in result
 * @returns {Promise<Object|null>} Admin object or null
 */
const findByEmail = async (email, includePassword = false) => {
  try {
    const validEmail = emailSchema.parse(email);
    const db = await getDB();

    const admin = await db.admin.findUnique({
      where: { email: validEmail },
      select: includePassword ? ADMIN_FIELDS.withPassword : ADMIN_FIELDS.public,
    });

    return admin;
  } catch (error) {
    logger.error("Failed to find admin by email", { error: error.message });
    throw transformError(error, "findByEmail");
  }
};

/**
 * Find admin by ID
 * @param {string} adminId - Admin ID (UUID)
 * @param {boolean} includePassword - Whether to include password in result
 * @returns {Promise<Object|null>} Admin object or null
 */
const findById = async (adminId, includePassword = false) => {
  try {
    const validId = uuidSchema.parse(adminId);
    const db = await getDB();

    const admin = await db.admin.findUnique({
      where: { id: validId },
      select: includePassword ? ADMIN_FIELDS.withPassword : ADMIN_FIELDS.public,
    });

    return admin;
  } catch (error) {
    logger.error("Failed to find admin by ID", { error: error.message, adminId });
    throw transformError(error, "findById");
  }
};

/**
 * Find admin by email or ID
 * @param {Object|string} identifier - Email, ID, or object with these properties
 * @param {boolean} includePassword - Whether to include password
 * @returns {Promise<Object|null>} Admin object or null
 */
const findAdmin = async (identifier, includePassword = false) => {
  try {
    const db = await getDB();
    let whereClause = {};

    if (typeof identifier === "string") {
      // Check if it's an email or UUID
      if (identifier.includes("@")) {
        whereClause.email = emailSchema.parse(identifier);
      } else {
        whereClause.id = uuidSchema.parse(identifier);
      }
    } else if (typeof identifier === "object" && identifier !== null) {
      if (identifier.email) {
        whereClause.email = emailSchema.parse(identifier.email);
      } else if (identifier.id) {
        whereClause.id = uuidSchema.parse(identifier.id);
      }
    }

    if (Object.keys(whereClause).length === 0) {
      throw ValidationError("Valid email or ID must be provided");
    }

    const admin = await db.admin.findFirst({
      where: {
        ...whereClause,
        isActive: true,
      },
      select: includePassword ? ADMIN_FIELDS.withPassword : ADMIN_FIELDS.public,
    });

    return admin;
  } catch (error) {
    logger.error("Failed to find admin", { error: error.message });
    throw transformError(error, "findAdmin");
  }
};

/**
 * Update admin's last login timestamp
 * @param {string} adminId - Admin ID
 * @returns {Promise<Object>} Updated admin object
 */
const updateLastLogin = async (adminId) => {
  try {
    const validId = uuidSchema.parse(adminId);
    const db = await getDB();

    const updatedAdmin = await db.admin.update({
      where: { id: validId },
      data: { lastLoginAt: new Date() },
      select: ADMIN_FIELDS.minimal,
    });

    return updatedAdmin;
  } catch (error) {
    logger.error("Failed to update last login", { error: error.message, adminId });
    throw transformError(error, "updateLastLogin");
  }
};

/**
 * Update admin details
 * @param {string} adminId - Admin ID
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object>} Updated admin object
 */
const updateAdmin = async (adminId, updateData) => {
  try {
    const validId = uuidSchema.parse(adminId);

    if (!updateData || Object.keys(updateData).length === 0) {
      throw ValidationError("Update data cannot be empty");
    }

    const validatedUpdateData = updateAdminSchema.parse(updateData);
    const db = await getDB();

    // Filter to only allowed update fields
    const cleanData = Object.fromEntries(
      Object.entries(validatedUpdateData).filter(
        ([key, value]) =>
          ALLOWED_ADMIN_UPDATE_FIELDS.includes(key) && value !== undefined && value !== null
      )
    );

    const updatedAdmin = await db.admin.update({
      where: { id: validId },
      data: {
        ...cleanData,
        updatedAt: new Date(),
      },
      select: ADMIN_FIELDS.public,
    });

    logger.info("Admin updated successfully", { adminId: validId });
    return updatedAdmin;
  } catch (error) {
    logger.error("Failed to update admin", { error: error.message, adminId });
    throw transformError(error, "updateAdmin");
  }
};

/**
 * Update admin role (ADMIN only)
 * @param {string} adminId - Admin ID
 * @param {string} newRole - New role
 * @returns {Promise<Object>} Updated admin object
 */
const updateAdminRole = async (adminId, newRole) => {
  try {
    const validId = uuidSchema.parse(adminId);
    const validRole = adminRoleSchema.parse(newRole);
    const db = await getDB();

    const updatedAdmin = await db.admin.update({
      where: { id: validId },
      data: {
        role: validRole,
        updatedAt: new Date(),
      },
      select: ADMIN_FIELDS.public,
    });

    logger.info("Admin role updated", { adminId: validId, newRole: validRole });
    return updatedAdmin;
  } catch (error) {
    logger.error("Failed to update admin role", { error: error.message, adminId });
    throw transformError(error, "updateAdminRole");
  }
};

/**
 * Update admin password
 * @param {string} adminId - Admin ID
 * @param {string} newPassword - New hashed password
 * @returns {Promise<Object>} Updated admin object
 */
const updatePassword = async (adminId, newPassword) => {
  try {
    const validId = uuidSchema.parse(adminId);
    const db = await getDB();

    const updatedAdmin = await db.admin.update({
      where: { id: validId },
      data: {
        password: newPassword,
        updatedAt: new Date(),
      },
      select: ADMIN_FIELDS.public,
    });

    logger.info("Admin password updated", { adminId: validId });
    return updatedAdmin;
  } catch (error) {
    logger.error("Failed to update admin password", { error: error.message, adminId });
    throw transformError(error, "updatePassword");
  }
};

/**
 * Deactivate admin account
 * @param {string} adminId - Admin ID
 * @returns {Promise<Object>} Deactivated admin object
 */
const deactivateAdmin = async (adminId) => {
  try {
    const validId = uuidSchema.parse(adminId);
    const db = await getDB();

    const deactivatedAdmin = await db.admin.update({
      where: { id: validId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
      select: ADMIN_FIELDS.public,
    });

    logger.info("Admin deactivated", { adminId: validId });
    return deactivatedAdmin;
  } catch (error) {
    logger.error("Failed to deactivate admin", { error: error.message, adminId });
    throw transformError(error, "deactivateAdmin");
  }
};

/**
 * Check if email exists
 * @param {string} email - Email to check
 * @returns {Promise<boolean>} True if email exists
 */
const checkEmailExists = async (email) => {
  try {
    const validEmail = emailSchema.parse(email);
    const db = await getDB();

    const count = await db.admin.count({
      where: { email: validEmail },
    });

    return count > 0;
  } catch (error) {
    logger.error("Failed to check email exists", { error: error.message });
    throw transformError(error, "checkEmailExists");
  }
};

/**
 * Find all admins with pagination
 * @param {Object} filters - Filter options
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>} Paginated admin list
 */
const findAdmins = async (filters = {}, options = {}) => {
  try {
    const db = await getDB();
    const { page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc" } = options;
    const offset = (page - 1) * limit;

    const whereConditions = {};

    if (filters.role) {
      whereConditions.role = adminRoleSchema.parse(filters.role);
    }
    if (filters.isActive !== undefined) {
      whereConditions.isActive = filters.isActive;
    }
    if (filters.email) {
      whereConditions.email = { contains: filters.email, mode: "insensitive" };
    }

    const [admins, totalCount] = await Promise.all([
      db.admin.findMany({
        where: whereConditions,
        skip: offset,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: ADMIN_FIELDS.minimal,
      }),
      db.admin.count({ where: whereConditions }),
    ]);

    return {
      admins,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  } catch (error) {
    logger.error("Failed to find admins", { error: error.message });
    throw transformError(error, "findAdmins");
  }
};

/**
 * Count admins by role
 * @returns {Promise<Object>} Count by role
 */
const countByRole = async () => {
  try {
    const db = await getDB();

    const [admins, staff, total] = await Promise.all([
      db.admin.count({ where: { role: "ADMIN", isActive: true } }),
      db.admin.count({ where: { role: "STAFF", isActive: true } }),
      db.admin.count({ where: { isActive: true } }),
    ]);

    return {
      ADMIN: admins,
      STAFF: staff,
      total,
    };
  } catch (error) {
    logger.error("Failed to count admins by role", { error: error.message });
    throw transformError(error, "countByRole");
  }
};

module.exports = {
  createAdmin,
  findByEmail,
  findById,
  findAdmin,
  updateLastLogin,
  updateAdmin,
  updateAdminRole,
  updatePassword,
  deactivateAdmin,
  checkEmailExists,
  findAdmins,
  countByRole,
};
