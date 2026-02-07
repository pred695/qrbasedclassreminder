// backend/auth-service/services/smsService.js
const { createLogger } = require("../shared/utils/logger");

const logger = createLogger("sms-service");

let twilioClient = null;

/**
 * Initialize Twilio client (lazy initialization)
 * @returns {Object|null} Twilio client or null if not configured
 */
const getClient = () => {
    if (twilioClient) return twilioClient;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
        logger.warn("TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set. SMS sending will be disabled.");
        return null;
    }

    try {
        const twilio = require("twilio");
        twilioClient = twilio(accountSid, authToken);
        logger.info("Twilio client initialized successfully");
        return twilioClient;
    } catch (error) {
        logger.error("Failed to initialize Twilio client", { error: error.message });
        return null;
    }
};

/**
 * Send an SMS via Twilio
 * @param {Object} params - { to, body }
 * @returns {Promise<Object>} - { success, messageId, status, error? }
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

        // Validate phone number format (basic check)
        const cleanedTo = to.replace(/[\s\-\(\)]/g, "");
        if (!cleanedTo.match(/^\+?[0-9]{10,15}$/)) {
            logger.warn("Invalid phone number format", { to });
            return { success: false, error: "Invalid phone number format" };
        }

        const message = await client.messages.create({
            body,
            from: fromNumber,
            to: cleanedTo.startsWith("+") ? cleanedTo : `+${cleanedTo}`,
        });

        logger.info("SMS sent successfully", {
            to: cleanedTo,
            messageSid: message.sid,
            status: message.status,
        });

        return {
            success: true,
            messageId: message.sid,
            status: message.status,
        };
    } catch (error) {
        // Extract Twilio-specific error details
        const errorMessage = error.message || "Unknown error";
        const errorCode = error.code;

        logger.error("Failed to send SMS", {
            to,
            error: errorMessage,
            code: errorCode,
        });

        return {
            success: false,
            error: errorMessage,
            code: errorCode,
        };
    }
};

/**
 * Send bulk SMS messages
 * @param {Array<Object>} messages - Array of { to, body }
 * @returns {Promise<Object>} - { success, sent, failed, results }
 */
const sendBulkSms = async (messages) => {
    const client = getClient();

    if (!client) {
        logger.warn("Twilio client not configured, skipping bulk SMS send");
        return { success: false, sent: 0, failed: messages.length, error: "Twilio not configured" };
    }

    const results = [];
    let sent = 0;
    let failed = 0;

    for (const msg of messages) {
        const result = await sendSms(msg);
        if (result.success) {
            sent++;
        } else {
            failed++;
        }
        results.push({ to: msg.to, ...result });
    }

    logger.info("Bulk SMS send complete", { total: messages.length, sent, failed });

    return {
        success: failed === 0,
        sent,
        failed,
        results,
    };
};

/**
 * Verify Twilio configuration
 * @returns {Promise<Object>} - { configured, accountSid?, error? }
 */
const verifyConfiguration = async () => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid) {
        return { configured: false, error: "TWILIO_ACCOUNT_SID not set" };
    }

    if (!authToken) {
        return { configured: false, error: "TWILIO_AUTH_TOKEN not set" };
    }

    if (!phoneNumber) {
        return { configured: false, error: "TWILIO_PHONE_NUMBER not set" };
    }

    // Try to verify the account
    try {
        const client = getClient();
        if (!client) {
            return { configured: false, error: "Failed to initialize Twilio client" };
        }

        // Make a lightweight API call to verify credentials
        await client.api.accounts(accountSid).fetch();

        return {
            configured: true,
            accountSid: accountSid.slice(0, 8) + "...",
            phoneNumber: phoneNumber,
        };
    } catch (error) {
        return { configured: false, error: error.message };
    }
};

module.exports = {
    sendSms,
    sendBulkSms,
    verifyConfiguration,
};
