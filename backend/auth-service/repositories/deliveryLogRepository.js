// backend/auth-service/repositories/deliveryLogRepository.js
const { getDatabase } = require("../config/database");
const { transformError } = require("../shared/utils/errors");
const { uuidSchema } = require("../models/studentSchema");
const { createLogger } = require("../shared/utils/logger");

const logger = createLogger("delivery-log-repository");
let dbInstance = null;

const getDB = async () => {
    if (!dbInstance) {
        dbInstance = await getDatabase();
    }
    return dbInstance;
};

const DELIVERY_LOG_FIELDS = {
    public: {
        id: true,
        signupId: true,
        channel: true,
        status: true,
        providerMessageId: true,
        errorMessage: true,
        metadata: true,
        createdAt: true,
    },
};

/**
 * Create a new delivery log entry
 * @param {Object} logData - { signupId, channel, status, providerMessageId?, errorMessage?, metadata? }
 * @returns {Promise<Object>} Created delivery log
 */
const createDeliveryLog = async (logData) => {
    try {
        const db = await getDB();
        const log = await db.deliveryLog.create({
            data: logData,
            select: DELIVERY_LOG_FIELDS.public,
        });
        logger.info("Delivery log created", { logId: log.id, channel: log.channel, status: log.status });
        return log;
    } catch (error) {
        logger.error("Failed to create delivery log", { error: error.message });
        throw transformError(error, "createDeliveryLog");
    }
};

/**
 * Find all delivery logs for a signup
 * @param {string} signupId - Signup ID
 * @returns {Promise<Array>} Array of delivery logs
 */
const findBySignupId = async (signupId) => {
    try {
        const validId = uuidSchema.parse(signupId);
        const db = await getDB();
        const logs = await db.deliveryLog.findMany({
            where: { signupId: validId },
            select: DELIVERY_LOG_FIELDS.public,
            orderBy: { createdAt: "desc" },
        });
        return logs;
    } catch (error) {
        logger.error("Failed to find delivery logs", { error: error.message, signupId });
        throw transformError(error, "findBySignupId");
    }
};

/**
 * Update delivery log status
 * @param {string} logId - Delivery log ID
 * @param {string} status - New status
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} Updated delivery log
 */
const updateStatus = async (logId, status, metadata = {}) => {
    try {
        const validId = uuidSchema.parse(logId);
        const db = await getDB();
        const log = await db.deliveryLog.update({
            where: { id: validId },
            data: { status, metadata },
            select: DELIVERY_LOG_FIELDS.public,
        });
        logger.info("Delivery log status updated", { logId: validId, status });
        return log;
    } catch (error) {
        logger.error("Failed to update delivery log status", { error: error.message, logId });
        throw transformError(error, "updateStatus");
    }
};

/**
 * Delete all delivery logs for a signup
 * @param {string} signupId - Signup ID
 * @returns {Promise<Object>} Delete count
 */
const deleteBySignupId = async (signupId) => {
    try {
        const validId = uuidSchema.parse(signupId);
        const db = await getDB();
        const result = await db.deliveryLog.deleteMany({
            where: { signupId: validId },
        });
        logger.info("Delivery logs deleted for signup", { signupId: validId, count: result.count });
        return result;
    } catch (error) {
        logger.error("Failed to delete delivery logs", { error: error.message, signupId });
        throw transformError(error, "deleteBySignupId");
    }
};

module.exports = {
    createDeliveryLog,
    findBySignupId,
    updateStatus,
    deleteBySignupId,
    DELIVERY_LOG_FIELDS,
};
