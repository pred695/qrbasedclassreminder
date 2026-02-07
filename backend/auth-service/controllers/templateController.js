// backend/auth-service/controllers/templateController.js
const templateRepository = require("../repositories/templateRepository");
const { createSuccessResponse, createErrorResponse } = require("../lib/utils");
const { createLogger } = require("../shared/utils/logger");
const { ValidationError } = require("../shared/utils/errors");

const logger = createLogger("template-controller");

// Valid class types and channels
const VALID_CLASS_TYPES = ["TYPE_1", "TYPE_2", "TYPE_3", "TYPE_4", "TYPE_5", "TYPE_6"];
const VALID_CHANNELS = ["EMAIL", "SMS"];

/**
 * Get all templates
 * GET /api/admin/templates
 */
const getAllTemplates = async (req, res) => {
    try {
        const templates = await templateRepository.findAllTemplates();

        logger.info("Templates retrieved", { count: templates.length });
        return createSuccessResponse(res, { templates }, "Templates retrieved successfully", 200);
    } catch (error) {
        logger.error("Failed to get templates", { error: error.message });
        return createErrorResponse(res, error, "getAllTemplates");
    }
};

/**
 * Get template by class type and channel
 * GET /api/admin/templates/:classType/:channel
 */
const getTemplate = async (req, res) => {
    try {
        const { classType, channel } = req.params;

        // Validate inputs
        if (!VALID_CLASS_TYPES.includes(classType)) {
            throw ValidationError(`Invalid class type: ${classType}`, "INVALID_CLASS_TYPE");
        }
        if (!VALID_CHANNELS.includes(channel.toUpperCase())) {
            throw ValidationError(`Invalid channel: ${channel}`, "INVALID_CHANNEL");
        }

        const template = await templateRepository.findByClassTypeAndChannel(classType, channel.toUpperCase());

        if (!template) {
            return createSuccessResponse(res, { template: null }, "No template found", 200);
        }

        return createSuccessResponse(res, { template }, "Template retrieved successfully", 200);
    } catch (error) {
        logger.error("Failed to get template", { error: error.message });
        return createErrorResponse(res, error, "getTemplate");
    }
};

/**
 * Create or update a template
 * PUT /api/admin/templates/:classType/:channel
 */
const upsertTemplate = async (req, res) => {
    try {
        const { classType, channel } = req.params;
        const { subject, body, scheduleLink, variables } = req.body;

        // Validate inputs
        if (!VALID_CLASS_TYPES.includes(classType)) {
            throw ValidationError(`Invalid class type: ${classType}`, "INVALID_CLASS_TYPE");
        }
        if (!VALID_CHANNELS.includes(channel.toUpperCase())) {
            throw ValidationError(`Invalid channel: ${channel}`, "INVALID_CHANNEL");
        }
        if (!body || typeof body !== "string" || body.trim().length === 0) {
            throw ValidationError("Template body is required", "BODY_REQUIRED");
        }

        // Email templates require subject
        if (channel.toUpperCase() === "EMAIL" && (!subject || subject.trim().length === 0)) {
            throw ValidationError("Subject is required for email templates", "SUBJECT_REQUIRED");
        }

        const templateData = {
            classType,
            channel: channel.toUpperCase(),
            subject: channel.toUpperCase() === "EMAIL" ? subject.trim() : null,
            body: body.trim(),
            scheduleLink: scheduleLink || null,
            variables: variables || [],
        };

        const template = await templateRepository.upsertTemplate(templateData);

        logger.info("Template saved", { classType, channel: channel.toUpperCase() });
        return createSuccessResponse(res, { template }, "Template saved successfully", 200);
    } catch (error) {
        logger.error("Failed to save template", { error: error.message });
        return createErrorResponse(res, error, "upsertTemplate");
    }
};

/**
 * Delete a template
 * DELETE /api/admin/templates/:templateId
 */
const deleteTemplate = async (req, res) => {
    try {
        const { templateId } = req.params;

        const result = await templateRepository.deleteTemplate(templateId);

        logger.info("Template deleted", { templateId });
        return createSuccessResponse(res, result, "Template deleted successfully", 200);
    } catch (error) {
        logger.error("Failed to delete template", { error: error.message });
        return createErrorResponse(res, error, "deleteTemplate");
    }
};

module.exports = {
    getAllTemplates,
    getTemplate,
    upsertTemplate,
    deleteTemplate,
};
