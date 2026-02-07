// backend/auth-service/jobs/reminderCron.js
const cron = require("node-cron");
const reminderService = require("../services/reminderService");
const { createLogger } = require("../shared/utils/logger");

const logger = createLogger("reminder-cron");

/**
 * Start the reminder cron job.
 * Runs on a configurable schedule to check for pending reminders.
 * Default: daily at 8:00 AM ('0 8 * * *')
 */
const startReminderCron = () => {
    const schedule = process.env.REMINDER_CRON_SCHEDULE || "0 8 * * *";

    if (!cron.validate(schedule)) {
        logger.error("Invalid cron schedule expression", { schedule });
        return null;
    }

    const job = cron.schedule(schedule, async () => {
        logger.info("Reminder cron job started");
        try {
            const result = await reminderService.processPendingReminders();
            logger.info("Reminder cron job completed", result);
        } catch (error) {
            logger.error("Reminder cron job failed", {
                error: error.message,
                stack: error.stack,
            });
        }
    });

    logger.info("Reminder cron job scheduled", { schedule });
    return job;
};

module.exports = { startReminderCron };
