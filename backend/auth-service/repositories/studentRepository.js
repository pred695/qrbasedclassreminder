// backend/auth-service/repositories/studentRepository.js
const { getDatabase } = require("../config/database");
const { transformError, ValidationError, NotFoundError } = require("../shared/utils/errors");
const {
    createStudentSchema,
    updateStudentSchema,
    uuidSchema,
    emailSchema,
    phoneSchema,
} = require("../models/studentSchema");
const { createLogger } = require("../shared/utils/logger");

const logger = createLogger("student-repository");
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
const STUDENT_FIELDS = {
    public: {
        id: true,
        email: true,
        phone: true,
        name: true,
        reminderPreference: true,
        optedOutEmail: true,
        optedOutSms: true,
        optOutOtp: true,
        createdAt: true,
        updatedAt: true,
    },
    minimal: {
        id: true,
        email: true,
        phone: true,
        name: true,
        reminderPreference: true,
    },
    // For OTP verification - includes OTP field
    withOtp: {
        id: true,
        email: true,
        phone: true,
        name: true,
        optOutOtp: true,
        optedOutEmail: true,
        optedOutSms: true,
    },
};

/**
 * Create a new student
 * @param {Object} studentData - Student data
 * @returns {Promise<Object>} Created student
 */
const createStudent = async (studentData) => {
    try {
        const validatedData = createStudentSchema.parse(studentData);
        const db = await getDB();

        const newStudent = await db.student.create({
            data: validatedData,
            select: STUDENT_FIELDS.public,
        });

        logger.info("Student created successfully", { studentId: newStudent.id });
        return newStudent;
    } catch (error) {
        logger.error("Failed to create student", { error: error.message });
        throw transformError(error, "createStudent");
    }
};

/**
 * Find student by email
 * @param {string} email - Student email
 * @returns {Promise<Object|null>} Student object or null
 */
const findByEmail = async (email) => {
    try {
        const validEmail = emailSchema.parse(email);
        const db = await getDB();

        const student = await db.student.findUnique({
            where: { email: validEmail },
            select: STUDENT_FIELDS.public,
        });

        return student;
    } catch (error) {
        logger.error("Failed to find student by email", { error: error.message });
        throw transformError(error, "findByEmail");
    }
};

/**
 * Find student by phone
 * @param {string} phone - Student phone
 * @returns {Promise<Object|null>} Student object or null
 */
const findByPhone = async (phone) => {
    try {
        const validPhone = phoneSchema.parse(phone);
        const db = await getDB();

        const student = await db.student.findUnique({
            where: { phone: validPhone },
            select: STUDENT_FIELDS.public,
        });

        return student;
    } catch (error) {
        logger.error("Failed to find student by phone", { error: error.message });
        throw transformError(error, "findByPhone");
    }
};

/**
 * Find student by ID
 * @param {string} studentId - Student ID
 * @returns {Promise<Object|null>} Student object or null
 */
const findById = async (studentId) => {
    try {
        const validId = uuidSchema.parse(studentId);
        const db = await getDB();

        const student = await db.student.findUnique({
            where: { id: validId },
            select: STUDENT_FIELDS.public,
        });

        return student;
    } catch (error) {
        logger.error("Failed to find student by ID", { error: error.message, studentId });
        throw transformError(error, "findById");
    }
};

/**
 * Check if student exists by email or phone
 * @param {string} email - Student email
 * @param {string} phone - Student phone
 * @returns {Promise<Object|null>} Existing student or null
 */
const checkExists = async (email, phone) => {
    try {
        const db = await getDB();
        const whereConditions = [];

        if (email) {
            const validEmail = emailSchema.parse(email);
            whereConditions.push({ email: validEmail });
        }

        if (phone) {
            const validPhone = phoneSchema.parse(phone);
            whereConditions.push({ phone: validPhone });
        }

        if (whereConditions.length === 0) {
            throw ValidationError("Email or phone must be provided");
        }

        const student = await db.student.findFirst({
            where: {
                OR: whereConditions,
            },
            select: STUDENT_FIELDS.public,
        });

        return student;
    } catch (error) {
        logger.error("Failed to check student exists", { error: error.message });
        throw transformError(error, "checkExists");
    }
};

/**
 * Update student
 * @param {string} studentId - Student ID
 * @param {Object} updateData - Update data
 * @returns {Promise<Object>} Updated student
 */
const updateStudent = async (studentId, updateData) => {
    try {
        const validId = uuidSchema.parse(studentId);
        const validatedData = updateStudentSchema.parse(updateData);
        const db = await getDB();

        const updatedStudent = await db.student.update({
            where: { id: validId },
            data: {
                ...validatedData,
                updatedAt: new Date(),
            },
            select: STUDENT_FIELDS.public,
        });

        logger.info("Student updated successfully", { studentId: validId });
        return updatedStudent;
    } catch (error) {
        logger.error("Failed to update student", { error: error.message, studentId });
        throw transformError(error, "updateStudent");
    }
};

/**
 * Update opt-out status
 * @param {string} studentId - Student ID
 * @param {Object} optOutData - Opt-out flags { optedOutEmail?, optedOutSms? }
 * @returns {Promise<Object>} Updated student
 */
const updateOptOutStatus = async (studentId, optOutData) => {
    try {
        const validId = uuidSchema.parse(studentId);
        const db = await getDB();

        const updateFields = {};
        if (optOutData.optedOutEmail !== undefined) {
            updateFields.optedOutEmail = optOutData.optedOutEmail;
        }
        if (optOutData.optedOutSms !== undefined) {
            updateFields.optedOutSms = optOutData.optedOutSms;
        }

        const updatedStudent = await db.student.update({
            where: { id: validId },
            data: {
                ...updateFields,
                updatedAt: new Date(),
            },
            select: STUDENT_FIELDS.public,
        });

        logger.info("Student opt-out status updated", {
            studentId: validId,
            ...updateFields,
        });
        return updatedStudent;
    } catch (error) {
        logger.error("Failed to update opt-out status", { error: error.message, studentId });
        throw transformError(error, "updateOptOutStatus");
    }
};

/**
 * Get all students with pagination
 * @param {Object} filters - Filter options
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>} Paginated student list
 */
const findStudents = async (filters = {}, options = {}) => {
    try {
        const db = await getDB();
        const { page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc" } = options;
        const offset = (page - 1) * limit;

        const whereConditions = {};

        if (filters.email) {
            whereConditions.email = { contains: filters.email, mode: "insensitive" };
        }
        if (filters.phone) {
            whereConditions.phone = { contains: filters.phone, mode: "insensitive" };
        }
        if (filters.optedOutEmail !== undefined) {
            whereConditions.optedOutEmail = filters.optedOutEmail;
        }
        if (filters.optedOutSms !== undefined) {
            whereConditions.optedOutSms = filters.optedOutSms;
        }

        const [students, totalCount] = await Promise.all([
            db.student.findMany({
                where: whereConditions,
                skip: offset,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
                select: STUDENT_FIELDS.public,
            }),
            db.student.count({ where: whereConditions }),
        ]);

        return {
            students,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
            },
        };
    } catch (error) {
        logger.error("Failed to find students", { error: error.message });
        throw transformError(error, "findStudents");
    }
};

/**
 * Update opt-out OTP for a student
 * @param {string} studentId - Student ID
 * @param {string} otp - OTP code to set
 * @returns {Promise<Object>} Updated student
 */
const updateOptOutOtp = async (studentId, otp) => {
    try {
        const validId = uuidSchema.parse(studentId);
        const db = await getDB();

        const updatedStudent = await db.student.update({
            where: { id: validId },
            data: {
                optOutOtp: otp,
                updatedAt: new Date(),
            },
            select: STUDENT_FIELDS.minimal,
        });

        logger.info("Student opt-out OTP updated", { studentId: validId });
        return updatedStudent;
    } catch (error) {
        logger.error("Failed to update opt-out OTP", { error: error.message, studentId });
        throw transformError(error, "updateOptOutOtp");
    }
};

/**
 * Clear opt-out OTP for a student (after successful unsubscription)
 * @param {string} studentId - Student ID
 * @returns {Promise<Object>} Updated student
 */
const clearOptOutOtp = async (studentId) => {
    try {
        const validId = uuidSchema.parse(studentId);
        const db = await getDB();

        const updatedStudent = await db.student.update({
            where: { id: validId },
            data: {
                optOutOtp: null,
                updatedAt: new Date(),
            },
            select: STUDENT_FIELDS.minimal,
        });

        logger.info("Student opt-out OTP cleared", { studentId: validId });
        return updatedStudent;
    } catch (error) {
        logger.error("Failed to clear opt-out OTP", { error: error.message, studentId });
        throw transformError(error, "clearOptOutOtp");
    }
};

/**
 * Find student by email or phone with OTP field
 * @param {string} destination - Email or phone
 * @returns {Promise<Object|null>} Student object or null
 */
const findByDestinationWithOtp = async (destination) => {
    try {
        const db = await getDB();
        const trimmedDest = destination.trim();

        // Check if it looks like an email or phone
        const isEmail = trimmedDest.includes("@");

        let student;
        if (isEmail) {
            student = await db.student.findUnique({
                where: { email: trimmedDest.toLowerCase() },
                select: STUDENT_FIELDS.withOtp,
            });
        } else {
            // Try phone lookup
            student = await db.student.findUnique({
                where: { phone: trimmedDest },
                select: STUDENT_FIELDS.withOtp,
            });
        }

        return student;
    } catch (error) {
        logger.error("Failed to find student by destination", { error: error.message });
        throw transformError(error, "findByDestinationWithOtp");
    }
};

/**
 * Delete a student by ID (cascades to signups and delivery logs)
 * @param {string} studentId - Student UUID
 * @returns {Promise<Object>} Deleted student info
 */
const deleteStudent = async (studentId) => {
    try {
        const validId = uuidSchema.parse(studentId);
        const db = await getDB();
        const student = await db.student.delete({
            where: { id: validId },
            select: { id: true, email: true, phone: true },
        });
        logger.info("Student deleted", { studentId: validId });
        return student;
    } catch (error) {
        logger.error("Failed to delete student", { error: error.message, studentId });
        throw transformError(error, "deleteStudent");
    }
};

module.exports = {
    createStudent,
    findByEmail,
    findByPhone,
    findById,
    checkExists,
    updateStudent,
    updateOptOutStatus,
    updateOptOutOtp,
    clearOptOutOtp,
    findByDestinationWithOtp,
    findStudents,
    deleteStudent,
    STUDENT_FIELDS,
};
