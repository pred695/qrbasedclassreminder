// backend/auth-service/lib/seedTemplates.js
const path = require("path");

// Load environment variables
require("dotenv").config({
    path: path.resolve(__dirname, "../../../.env"),
});

const { initializeDatabase, disconnectDatabase } = require("../config/database");
const templateRepository = require("../repositories/templateRepository");
const { createLogger } = require("../shared/utils/logger");

const logger = createLogger("seed-templates");

const CLASS_TYPE_LABELS = {
    TYPE_1: "Initial Firearms",
    TYPE_2: "Firearms Requalification",
    TYPE_3: "CPR/AED and/or First Aid",
    TYPE_4: "Handcuffing and/or Pepper Spray",
    TYPE_5: "CEW / Taser",
    TYPE_6: "Baton",
};

const CLASS_TYPES = ["TYPE_1", "TYPE_2", "TYPE_3", "TYPE_4", "TYPE_5", "TYPE_6"];

const APP_URL = process.env.APP_BASE_URL || "https://yourapp.com";

const buildEmailTemplate = (classType) => {
    const label = CLASS_TYPE_LABELS[classType];
    return {
        classType,
        channel: "EMAIL",
        subject: `Reminder: ${label} Training Renewal`,
        body: `Hello,

This is a reminder that your {{classTypeName}} training certification is approaching its renewal period.

Please schedule your next session at your earliest convenience using the link below:
{{scheduleLink}}

If you no longer wish to receive these reminders, you can opt out here:
{{optOutLink}}

Thank you,
Student Training Portal`,
        scheduleLink: APP_URL,
        variables: { classTypeName: label, scheduleLink: APP_URL, optOutLink: `${APP_URL}/opt-out` },
    };
};

const buildSmsTemplate = (classType) => {
    const label = CLASS_TYPE_LABELS[classType];
    return {
        classType,
        channel: "SMS",
        subject: null,
        body: `Reminder: Your {{classTypeName}} certification is due for renewal. Schedule now: {{scheduleLink}}`,
        scheduleLink: APP_URL,
        variables: { classTypeName: label, scheduleLink: APP_URL },
    };
};

const seedTemplates = async () => {
    try {
        logger.info("Starting template seeding...");

        await initializeDatabase();

        let created = 0;

        for (const classType of CLASS_TYPES) {
            // Email template
            await templateRepository.upsertTemplate(buildEmailTemplate(classType));
            created++;

            // SMS template
            await templateRepository.upsertTemplate(buildSmsTemplate(classType));
            created++;
        }

        logger.info(`Template seeding complete. ${created} templates upserted.`);
    } catch (error) {
        logger.error("Template seeding failed", { error: error.message, stack: error.stack });
        throw error;
    } finally {
        await disconnectDatabase();
    }
};

if (require.main === module) {
    seedTemplates()
        .then(() => {
            logger.info("Template seeding process completed");
            process.exit(0);
        })
        .catch((error) => {
            logger.error("Template seeding process failed:", error);
            process.exit(1);
        });
}

module.exports = { seedTemplates };
