// backend/auth-service/controllers/reminderController.js
const reminderService = require("../services/reminderService");
const { createSuccessResponse, createErrorResponse } = require("../lib/utils");
const { createLogger } = require("../shared/utils/logger");

const logger = createLogger("reminder-controller");

/**
 * Send reminder manually for a specific signup
 * POST /api/admin/reminders/:signupId/send
 */
const sendReminder = async (req, res) => {
    try {
        const { signupId } = req.params;

        const result = await reminderService.sendReminder(signupId);

        logger.info("Reminder sent manually", { signupId, status: result.overallStatus });
        return createSuccessResponse(res, result, "Reminder processed successfully", 200);
    } catch (error) {
        logger.error("Manual reminder send failed", { error: error.message });
        return createErrorResponse(res, error, "sendReminder");
    }
};

/**
 * Reschedule a reminder
 * PATCH /api/admin/reminders/:signupId/reschedule
 */
const rescheduleReminder = async (req, res) => {
    try {
        const { signupId } = req.params;
        const { reminderScheduledDate } = req.body;

        if (!reminderScheduledDate) {
            return res.status(400).json({
                success: false,
                error: { message: "reminderScheduledDate is required", code: "VALIDATION_ERROR" },
            });
        }

        const result = await reminderService.rescheduleReminder(signupId, reminderScheduledDate);

        logger.info("Reminder rescheduled", { signupId });
        return createSuccessResponse(res, result, result.message, 200);
    } catch (error) {
        logger.error("Reschedule reminder failed", { error: error.message });
        return createErrorResponse(res, error, "rescheduleReminder");
    }
};

/**
 * Reset a reminder back to PENDING
 * POST /api/admin/reminders/:signupId/reset
 */
const resetReminder = async (req, res) => {
    try {
        const { signupId } = req.params;

        const result = await reminderService.resetReminder(signupId);

        logger.info("Reminder reset", { signupId });
        return createSuccessResponse(res, result, result.message, 200);
    } catch (error) {
        logger.error("Reset reminder failed", { error: error.message });
        return createErrorResponse(res, error, "resetReminder");
    }
};

/**
 * Get delivery details for a signup
 * GET /api/admin/reminders/:signupId/delivery
 */
const getDeliveryDetails = async (req, res) => {
    try {
        const { signupId } = req.params;

        const result = await reminderService.getDeliveryDetails(signupId);

        return createSuccessResponse(res, result, "Delivery details retrieved successfully", 200);
    } catch (error) {
        logger.error("Get delivery details failed", { error: error.message });
        return createErrorResponse(res, error, "getDeliveryDetails");
    }
};

module.exports = {
    sendReminder,
    rescheduleReminder,
    resetReminder,
    getDeliveryDetails,
};
