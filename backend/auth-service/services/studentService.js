// backend/auth-service/services/studentService.js
const studentRepository = require("../repositories/studentRepository");
const signupRepository = require("../repositories/signupRepository");
const {
    createSignupSchema,
} = require("../models/studentSchema");
const {
    ValidationError,
    ConflictError,
    NotFoundError,
    transformError,
} = require("../shared/utils/errors");
const { createLogger } = require("../shared/utils/logger");

const logger = createLogger("student-service");

// Class type to reminder interval mapping (in months after signup)
const CLASS_REMINDER_INTERVALS = {
    TYPE_1: 4,   // Initial Firearms - 4 months
    TYPE_2: 5,   // Firearms Requalification - 5 months
    TYPE_3: 11,  // CPR/AED & First Aid - 11 months
    TYPE_4: 11,  // Handcuffing / Pepper Spray - 11 months
    TYPE_5: 11,  // CEW / Taser - 11 months
    TYPE_6: 11,  // Baton - 11 months
};

/**
 * Calculate reminder scheduled date based on class type
 * @param {string} classType - Class type
 * @returns {Date} Scheduled reminder date (months after signup)
 */
const calculateReminderDate = (classType) => {
    const monthsAfterSignup = CLASS_REMINDER_INTERVALS[classType] || 11;
    const scheduledDate = new Date();
    scheduledDate.setMonth(scheduledDate.getMonth() + monthsAfterSignup);
    return scheduledDate;
};

/**
 * Create a new signup (public student-facing API)
 * @param {Object} signupData - Signup data { email?, phone?, classType }
 * @returns {Promise<Object>} Created signup with student info
 */
const createSignup = async (signupData) => {
    try {
        // Validate input
        const validatedData = createSignupSchema.parse(signupData);
        const { email, phone, classType } = validatedData;

        // Check if student already exists
        let student = await studentRepository.checkExists(email, phone);

        if (!student) {
            // Create new student
            student = await studentRepository.createStudent({
                email,
                phone,
                optedOutEmail: false,
                optedOutSms: false,
            });
            logger.info("New student created during signup", { studentId: student.id });
        } else {
            logger.info("Existing student found during signup", { studentId: student.id });
        }

        // Check if student has opted out
        if (email && student.optedOutEmail) {
            throw ValidationError(
                "This email has opted out of reminders. Please use a different email or contact support.",
                "EMAIL_OPTED_OUT"
            );
        }
        if (phone && student.optedOutSms) {
            throw ValidationError(
                "This phone number has opted out of SMS reminders. Please use a different number or contact support.",
                "PHONE_OPTED_OUT"
            );
        }

        // Calculate reminder scheduled date
        const reminderScheduledDate = calculateReminderDate(classType);

        // Create signup record
        const signup = await signupRepository.createSignup({
            studentId: student.id,
            classType,
            reminderScheduledDate,
            status: "PENDING",
        });

        logger.info("Signup created successfully", {
            signupId: signup.id,
            studentId: student.id,
            classType,
        });

        return {
            signup,
            student,
            message: "Signup successful! You will receive a reminder before your class.",
        };
    } catch (error) {
        logger.error("Signup creation failed", { error: error.message });
        throw transformError(error, "createSignup");
    }
};

/**
 * Get signup by ID
 * @param {string} signupId - Signup ID
 * @returns {Promise<Object>} Signup details with student info
 */
const getSignupById = async (signupId) => {
    try {
        const signup = await signupRepository.findById(signupId, true);

        if (!signup) {
            throw NotFoundError("Signup not found", "SIGNUP_NOT_FOUND");
        }

        return { signup };
    } catch (error) {
        logger.error("Get signup failed", { error: error.message, signupId });
        throw transformError(error, "getSignupById");
    }
};

/**
 * Get all signups for a student
 * @param {string} studentId - Student ID
 * @returns {Promise<Object>} Student's signups
 */
const getStudentSignups = async (studentId) => {
    try {
        const student = await studentRepository.findById(studentId);

        if (!student) {
            throw NotFoundError("Student not found", "STUDENT_NOT_FOUND");
        }

        const signups = await signupRepository.findByStudentId(studentId);

        return {
            student,
            signups,
            count: signups.length,
        };
    } catch (error) {
        logger.error("Get student signups failed", { error: error.message, studentId });
        throw transformError(error, "getStudentSignups");
    }
};

/**
 * Update opt-out preference for a student
 * @param {string} studentId - Student ID
 * @param {Object} optOutData - Opt-out preferences
 * @returns {Promise<Object>} Updated student
 */
const updateOptOutPreference = async (studentId, optOutData) => {
    try {
        const student = await studentRepository.findById(studentId);

        if (!student) {
            throw NotFoundError("Student not found", "STUDENT_NOT_FOUND");
        }

        const updatedStudent = await studentRepository.updateOptOutStatus(studentId, optOutData);

        logger.info("Opt-out preference updated", { studentId, ...optOutData });

        return {
            student: updatedStudent,
            message: "Preference updated successfully",
        };
    } catch (error) {
        logger.error("Update opt-out preference failed", { error: error.message, studentId });
        throw transformError(error, "updateOptOutPreference");
    }
};

module.exports = {
    createSignup,
    getSignupById,
    getStudentSignups,
    updateOptOutPreference,
    calculateReminderDate,
    CLASS_REMINDER_INTERVALS,
};
