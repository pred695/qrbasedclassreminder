// backend/auth-service/services/smsService.js
const { createLogger } = require("../shared/utils/logger");

const logger = createLogger("sms-service");

let twilioClient = null;

/**
 * Get Twilio client (lazy initialization)
 */
const getClient = () => {
    if (twilioClient) return twilioClient;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
        logger.warn("TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set. SMS sending will be disabled.");
        return null;
    }

    const twilio = require("twilio");
    twilioClient = twilio(accountSid, authToken);
    return twilioClient;
};

/**
 * Send an SMS via Twilio
 * @param {Object} params - { to, body }
 * @returns {Promise<Object>} - { success, messageId, error? }
 */
const sendSms = async ({ to, body }) => {
    try {
        const client = getClient();

        if (!client) {
            logger.warn("Twilio client not configured, skipping SMS send", { to });
            return { success: false, error: "Twilio client not configured" };
        }

        const fromNumber = process.env.TWILIO_PHONE_NUMBER;
        if (!fromNumber) {
            logger.warn("TWILIO_PHONE_NUMBER not set, skipping SMS send");
            return { success: false, error: "Twilio phone number not configured" };
        }

        const message = await client.messages.create({
            body,
            from: fromNumber,
            to,
        });

        logger.info("SMS sent successfully", {
            to,
            messageSid: message.sid,
            status: message.status,
        });

        return { success: true, messageId: message.sid };
    } catch (error) {
        logger.error("Failed to send SMS", {
            to,
            error: error.message,
        });
        return { success: false, error: error.message };
    }
};

module.exports = { sendSms };
