// backend/auth-service/services/signupService.js
const signupRepository = require("../repositories/signupRepository");
const studentRepository = require("../repositories/studentRepository");
const { transformError, NotFoundError } = require("../shared/utils/errors");
const { createLogger } = require("../shared/utils/logger");

const logger = createLogger("signup-service");

/**
 * Get all signups with filters and pagination (admin)
 * @param {Object} filters - Filter options
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>} Paginated signups
 */
const getAllSignups = async (filters = {}, options = {}) => {
    try {
        const result = await signupRepository.findSignups(filters, options);
        return result;
    } catch (error) {
        logger.error("Get all signups failed", { error: error.message });
        throw transformError(error, "getAllSignups");
    }
};

/**
 * Get signup statistics (admin)
 * @returns {Promise<Object>} Signup stats
 */
const getSignupStats = async () => {
    try {
        const stats = await signupRepository.getSignupStats();
        return { stats };
    } catch (error) {
        logger.error("Get signup stats failed", { error: error.message });
        throw transformError(error, "getSignupStats");
    }
};

/**
 * Update a signup (admin)
 * @param {string} signupId - Signup ID
 * @param {Object} updateData - Update data
 * @returns {Promise<Object>} Updated signup
 */
const updateSignup = async (signupId, updateData) => {
    try {
        // Check if signup exists
        const existingSignup = await signupRepository.findById(signupId);
        if (!existingSignup) {
            throw NotFoundError("Signup not found", "SIGNUP_NOT_FOUND");
        }

        const updatedSignup = await signupRepository.updateSignup(signupId, updateData);

        logger.info("Signup updated by admin", { signupId });
        return {
            signup: updatedSignup,
            message: "Signup updated successfully",
        };
    } catch (error) {
        logger.error("Update signup failed", { error: error.message, signupId });
        throw transformError(error, "updateSignup");
    }
};

/**
 * Delete a signup (admin)
 * @param {string} signupId - Signup ID
 * @returns {Promise<Object>} Deletion result
 */
const deleteSignup = async (signupId) => {
    try {
        // Check if signup exists
        const existingSignup = await signupRepository.findById(signupId);
        if (!existingSignup) {
            throw NotFoundError("Signup not found", "SIGNUP_NOT_FOUND");
        }

        await signupRepository.deleteSignup(signupId);

        logger.info("Signup deleted by admin", { signupId });
        return { message: "Signup deleted successfully" };
    } catch (error) {
        logger.error("Delete signup failed", { error: error.message, signupId });
        throw transformError(error, "deleteSignup");
    }
};

/**
 * Get signup by ID (admin, with full details)
 * @param {string} signupId - Signup ID
 * @returns {Promise<Object>} Signup with student details
 */
const getSignupById = async (signupId) => {
    try {
        const signup = await signupRepository.findById(signupId, true);

        if (!signup) {
            throw NotFoundError("Signup not found", "SIGNUP_NOT_FOUND");
        }

        return { signup };
    } catch (error) {
        logger.error("Get signup by ID failed", { error: error.message, signupId });
        throw transformError(error, "getSignupById");
    }
};

/**
 * Delete a student and all their signups (admin)
 * @param {string} studentId - Student UUID
 * @returns {Promise<Object>} Delete result
 */
const deleteStudent = async (studentId) => {
    try {
        const student = await studentRepository.findById(studentId);
        if (!student) {
            throw NotFoundError("Student not found", "STUDENT_NOT_FOUND");
        }

        await studentRepository.deleteStudent(studentId);

        logger.info("Student deleted with all signups", { studentId });
        return { message: "Student and all associated registrations deleted successfully" };
    } catch (error) {
        logger.error("Delete student failed", { error: error.message, studentId });
        throw transformError(error, "deleteStudent");
    }
};

module.exports = {
    getAllSignups,
    getSignupStats,
    updateSignup,
    deleteSignup,
    deleteStudent,
    getSignupById,
};
