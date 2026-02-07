// backend/auth-service/repositories/templateRepository.js
const { getDatabase } = require("../config/database");
const { transformError } = require("../shared/utils/errors");
const { uuidSchema } = require("../models/studentSchema");
const { createLogger } = require("../shared/utils/logger");

const logger = createLogger("template-repository");
let dbInstance = null;

const getDB = async () => {
    if (!dbInstance) {
        dbInstance = await getDatabase();
    }
    return dbInstance;
};

const TEMPLATE_FIELDS = {
    public: {
        id: true,
        classType: true,
        channel: true,
        subject: true,
        body: true,
        scheduleLink: true,
        variables: true,
        updatedAt: true,
    },
};

/**
 * Find template by class type and channel
 * @param {string} classType - Class type enum
 * @param {string} channel - Channel (EMAIL or SMS)
 * @returns {Promise<Object|null>} Template or null
 */
const findByClassTypeAndChannel = async (classType, channel) => {
    try {
        const db = await getDB();
        const template = await db.messageTemplate.findUnique({
            where: {
                classType_channel: { classType, channel },
            },
            select: TEMPLATE_FIELDS.public,
        });
        return template;
    } catch (error) {
        logger.error("Failed to find template", { error: error.message, classType, channel });
        throw transformError(error, "findByClassTypeAndChannel");
    }
};

/**
 * Find all templates
 * @returns {Promise<Array>} All templates
 */
const findAllTemplates = async () => {
    try {
        const db = await getDB();
        const templates = await db.messageTemplate.findMany({
            select: TEMPLATE_FIELDS.public,
            orderBy: [{ classType: "asc" }, { channel: "asc" }],
        });
        return templates;
    } catch (error) {
        logger.error("Failed to find templates", { error: error.message });
        throw transformError(error, "findAllTemplates");
    }
};

/**
 * Create or update a template (upsert)
 * @param {Object} data - Template data
 * @returns {Promise<Object>} Created/updated template
 */
const upsertTemplate = async (data) => {
    try {
        const db = await getDB();
        const template = await db.messageTemplate.upsert({
            where: {
                classType_channel: { classType: data.classType, channel: data.channel },
            },
            update: {
                subject: data.subject,
                body: data.body,
                scheduleLink: data.scheduleLink,
                variables: data.variables,
            },
            create: data,
            select: TEMPLATE_FIELDS.public,
        });
        logger.info("Template upserted", { classType: data.classType, channel: data.channel });
        return template;
    } catch (error) {
        logger.error("Failed to upsert template", { error: error.message });
        throw transformError(error, "upsertTemplate");
    }
};

/**
 * Delete a template
 * @param {string} templateId - Template ID
 * @returns {Promise<Object>} Deleted template
 */
const deleteTemplate = async (templateId) => {
    try {
        const validId = uuidSchema.parse(templateId);
        const db = await getDB();
        const template = await db.messageTemplate.delete({
            where: { id: validId },
            select: { id: true },
        });
        logger.info("Template deleted", { templateId: validId });
        return { success: true, deletedId: template.id };
    } catch (error) {
        logger.error("Failed to delete template", { error: error.message, templateId });
        throw transformError(error, "deleteTemplate");
    }
};

module.exports = {
    findByClassTypeAndChannel,
    findAllTemplates,
    upsertTemplate,
    deleteTemplate,
    TEMPLATE_FIELDS,
};
