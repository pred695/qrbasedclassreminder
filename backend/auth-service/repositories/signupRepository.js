// backend/auth-service/repositories/signupRepository.js
const { getDatabase } = require("../config/database");
const { transformError, ValidationError, NotFoundError } = require("../shared/utils/errors");
const {
    uuidSchema,
    classTypeSchema,
    signupStatusSchema,
    updateSignupSchema,
} = require("../models/studentSchema");
const { createLogger } = require("../shared/utils/logger");

const logger = createLogger("signup-repository");
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

// Field selections
const SIGNUP_FIELDS = {
    public: {
        id: true,
        studentId: true,
        classType: true,
        reminderScheduledDate: true,
        reminderSentAt: true,
        status: true,
        optedOutEmail: true,
        optedOutSms: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
    },
    withStudent: {
        id: true,
        studentId: true,
        classType: true,
        reminderScheduledDate: true,
        reminderSentAt: true,
        status: true,
        optedOutEmail: true,
        optedOutSms: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        student: {
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                optedOutEmail: true,
                optedOutSms: true,
            },
        },
    },
    minimal: {
        id: true,
        classType: true,
        reminderScheduledDate: true,
        status: true,
        optedOutEmail: true,
        optedOutSms: true,
        createdAt: true,
    },
};

/**
 * Create a new signup
 * @param {Object} signupData - Signup data
 * @returns {Promise<Object>} Created signup
 */
const createSignup = async (signupData) => {
    try {
        const db = await getDB();

        const newSignup = await db.signup.create({
            data: signupData,
            select: SIGNUP_FIELDS.public,
        });

        logger.info("Signup created successfully", { signupId: newSignup.id });
        return newSignup;
    } catch (error) {
        logger.error("Failed to create signup", { error: error.message });
        throw transformError(error, "createSignup");
    }
};

/**
 * Find signup by ID
 * @param {string} signupId - Signup ID
 * @param {boolean} includeStudent - Include student data
 * @returns {Promise<Object|null>} Signup object or null
 */
const findById = async (signupId, includeStudent = false) => {
    try {
        const validId = uuidSchema.parse(signupId);
        const db = await getDB();

        const signup = await db.signup.findUnique({
            where: { id: validId },
            select: includeStudent ? SIGNUP_FIELDS.withStudent : SIGNUP_FIELDS.public,
        });

        return signup;
    } catch (error) {
        logger.error("Failed to find signup by ID", { error: error.message, signupId });
        throw transformError(error, "findById");
    }
};

/**
 * Find signups by student ID
 * @param {string} studentId - Student ID
 * @returns {Promise<Array>} Array of signups
 */
const findByStudentId = async (studentId) => {
    try {
        const validId = uuidSchema.parse(studentId);
        const db = await getDB();

        const signups = await db.signup.findMany({
            where: { studentId: validId },
            select: SIGNUP_FIELDS.public,
            orderBy: { createdAt: "desc" },
        });

        return signups;
    } catch (error) {
        logger.error("Failed to find signups by student ID", { error: error.message, studentId });
        throw transformError(error, "findByStudentId");
    }
};

/**
 * Find pending reminders (due to be sent)
 * @param {Date} beforeDate - Find reminders scheduled before this date
 * @returns {Promise<Array>} Array of signups with pending reminders
 */
const findPendingReminders = async (beforeDate = new Date()) => {
    try {
        const db = await getDB();

        const signups = await db.signup.findMany({
            where: {
                status: "PENDING",
                reminderScheduledDate: {
                    lte: beforeDate,
                },
            },
            select: SIGNUP_FIELDS.withStudent,
            orderBy: { reminderScheduledDate: "asc" },
        });

        logger.info("Found pending reminders", { count: signups.length });
        return signups;
    } catch (error) {
        logger.error("Failed to find pending reminders", { error: error.message });
        throw transformError(error, "findPendingReminders");
    }
};

/**
 * Update signup
 * @param {string} signupId - Signup ID
 * @param {Object} updateData - Update data
 * @returns {Promise<Object>} Updated signup
 */
const updateSignup = async (signupId, updateData) => {
    try {
        const validId = uuidSchema.parse(signupId);
        const validatedData = updateSignupSchema.parse(updateData);
        const db = await getDB();

        const updatedSignup = await db.signup.update({
            where: { id: validId },
            data: {
                ...validatedData,
                updatedAt: new Date(),
            },
            select: SIGNUP_FIELDS.public,
        });

        logger.info("Signup updated successfully", { signupId: validId });
        return updatedSignup;
    } catch (error) {
        logger.error("Failed to update signup", { error: error.message, signupId });
        throw transformError(error, "updateSignup");
    }
};

/**
 * Update reminder status
 * @param {string} signupId - Signup ID
 * @param {string} status - New status ('SENT' or 'FAILED')
 * @returns {Promise<Object>} Updated signup
 */
const updateReminderStatus = async (signupId, status) => {
    try {
        const validId = uuidSchema.parse(signupId);
        const validStatus = signupStatusSchema.parse(status);
        const db = await getDB();

        const updateData = {
            status: validStatus,
            updatedAt: new Date(),
        };

        // Set reminderSentAt only if status is SENT
        if (validStatus === "SENT") {
            updateData.reminderSentAt = new Date();
        }

        const updatedSignup = await db.signup.update({
            where: { id: validId },
            data: updateData,
            select: SIGNUP_FIELDS.public,
        });

        logger.info("Reminder status updated", { signupId: validId, status: validStatus });
        return updatedSignup;
    } catch (error) {
        logger.error("Failed to update reminder status", { error: error.message, signupId });
        throw transformError(error, "updateReminderStatus");
    }
};

/**
 * Get all signups with filters and pagination
 * @param {Object} filters - Filter options
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>} Paginated signup list
 */
const findSignups = async (filters = {}, options = {}) => {
    try {
        const db = await getDB();
        const { page, limit, sortBy = "createdAt", sortOrder = "desc" } = options;

        const whereConditions = {};

        if (filters.studentId) {
            whereConditions.studentId = uuidSchema.parse(filters.studentId);
        }
        if (filters.classType) {
            whereConditions.classType = classTypeSchema.parse(filters.classType);
        }
        if (filters.status) {
            whereConditions.status = signupStatusSchema.parse(filters.status);
        }
        if (filters.startDate || filters.endDate) {
            whereConditions.createdAt = {};
            if (filters.startDate) {
                whereConditions.createdAt.gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                whereConditions.createdAt.lte = new Date(filters.endDate);
            }
        }

        // Search by student email or phone
        if (filters.search) {
            whereConditions.student = {
                OR: [
                    { email: { contains: filters.search, mode: "insensitive" } },
                    { phone: { contains: filters.search, mode: "insensitive" } },
                ],
            };
        }

        // Build query options - omit skip/take if no pagination requested
        const queryOptions = {
            where: whereConditions,
            orderBy: { [sortBy]: sortOrder },
            select: SIGNUP_FIELDS.withStudent,
        };

        // Add pagination only if limit is provided
        if (limit !== undefined) {
            const pageNum = page || 1;
            const offset = (pageNum - 1) * limit;
            queryOptions.skip = offset;
            queryOptions.take = limit;
        }

        const [signups, totalCount] = await Promise.all([
            db.signup.findMany(queryOptions),
            db.signup.count({ where: whereConditions }),
        ]);

        return {
            signups,
            pagination: {
                page: page || 1,
                limit: limit || totalCount,
                totalCount,
                totalPages: limit ? Math.ceil(totalCount / limit) : 1,
            },
        };
    } catch (error) {
        logger.error("Failed to find signups", { error: error.message });
        throw transformError(error, "findSignups");
    }
};

/**
 * Delete signup (soft delete by marking as FAILED)
 * @param {string} signupId - Signup ID
 * @returns {Promise<Object>} Deleted signup
 */
const deleteSignup = async (signupId) => {
    try {
        const validId = uuidSchema.parse(signupId);
        const db = await getDB();

        // Hard delete for now (can be changed to soft delete later)
        const deletedSignup = await db.signup.delete({
            where: { id: validId },
            select: { id: true },
        });

        logger.info("Signup deleted", { signupId: validId });
        return { success: true, deletedId: deletedSignup.id };
    } catch (error) {
        logger.error("Failed to delete signup", { error: error.message, signupId });
        throw transformError(error, "deleteSignup");
    }
};

/**
 * Get signup statistics
 * @returns {Promise<Object>} Signup stats
 */
const getSignupStats = async () => {
    try {
        const db = await getDB();

        const [totalSignups, pendingSignups, sentSignups, failedSignups, signupsByClass] =
            await Promise.all([
                db.signup.count(),
                db.signup.count({ where: { status: "PENDING" } }),
                db.signup.count({ where: { status: "SENT" } }),
                db.signup.count({ where: { status: "FAILED" } }),
                db.signup.groupBy({
                    by: ["classType"],
                    _count: {
                        id: true,
                    },
                }),
            ]);

        const classTypeStats = signupsByClass.reduce((acc, item) => {
            acc[item.classType] = item._count.id;
            return acc;
        }, {});

        return {
            total: totalSignups,
            byStatus: {
                PENDING: pendingSignups,
                SENT: sentSignups,
                FAILED: failedSignups,
            },
            byClassType: classTypeStats,
        };
    } catch (error) {
        logger.error("Failed to get signup stats", { error: error.message });
        throw transformError(error, "getSignupStats");
    }
};

/**
 * Update opt-out preferences for multiple signups (batch)
 * @param {Array<Object>} signupPreferences - Array of { signupId, optedOutEmail, optedOutSms }
 * @returns {Promise<Array>} Updated signups
 */
const updateSignupOptOutBatch = async (signupPreferences) => {
    try {
        const db = await getDB();

        const updates = signupPreferences.map((pref) => {
            const validId = uuidSchema.parse(pref.signupId);
            const updateFields = {};
            if (pref.optedOutEmail !== undefined) updateFields.optedOutEmail = pref.optedOutEmail;
            if (pref.optedOutSms !== undefined) updateFields.optedOutSms = pref.optedOutSms;

            return db.signup.update({
                where: { id: validId },
                data: {
                    ...updateFields,
                    updatedAt: new Date(),
                },
                select: SIGNUP_FIELDS.public,
            });
        });

        const results = await Promise.all(updates);
        logger.info("Signup opt-out batch updated", { count: results.length });
        return results;
    } catch (error) {
        logger.error("Failed to batch update signup opt-out", { error: error.message });
        throw transformError(error, "updateSignupOptOutBatch");
    }
};

module.exports = {
    createSignup,
    findById,
    findByStudentId,
    findPendingReminders,
    updateSignup,
    updateReminderStatus,
    updateSignupOptOutBatch,
    findSignups,
    deleteSignup,
    getSignupStats,
    SIGNUP_FIELDS,
};
