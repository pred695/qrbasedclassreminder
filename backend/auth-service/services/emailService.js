// backend/auth-service/services/emailService.js
const sgMail = require("@sendgrid/mail");
const { createLogger } = require("../shared/utils/logger");

const logger = createLogger("email-service");

let isInitialized = false;

/**
 * Initialize SendGrid with API key
 */
const initializeSendGrid = () => {
    if (isInitialized) return true;

    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
        logger.warn("SENDGRID_API_KEY not set. Email sending will be disabled.");
        return false;
    }

    sgMail.setApiKey(apiKey);
    isInitialized = true;
    logger.info("SendGrid initialized successfully");
    return true;
};

/**
 * Send an email via SendGrid
 * @param {Object} params - { to, subject, body, html }
 * @returns {Promise<Object>} - { success, messageId, error? }
 */
const sendEmail = async ({ to, subject, body, html }) => {
    try {
        if (!initializeSendGrid()) {
            logger.warn("SendGrid not configured, skipping email send", { to, subject });
            return { success: false, error: "SendGrid not configured" };
        }

        const fromEmail = process.env.SENDGRID_FROM_EMAIL;
        const fromName = process.env.SENDGRID_FROM_NAME || "Student Training Portal";

        if (!fromEmail) {
            logger.warn("SENDGRID_FROM_EMAIL not set, skipping email send");
            return { success: false, error: "SendGrid from email not configured" };
        }

        const msg = {
            to,
            from: {
                email: fromEmail,
                name: fromName,
            },
            subject,
            text: body,
            html: html || body.replace(/\n/g, "<br>"),
        };

        const [response] = await sgMail.send(msg);

        logger.info("Email sent successfully", {
            to,
            subject,
            statusCode: response.statusCode,
            messageId: response.headers["x-message-id"],
        });

        return {
            success: true,
            messageId: response.headers["x-message-id"],
            statusCode: response.statusCode,
        };
    } catch (error) {
        // Extract detailed error from SendGrid response
        const errorMessage = error.response?.body?.errors?.[0]?.message || error.message;
        const statusCode = error.response?.statusCode || error.code;

        logger.error("Failed to send email", {
            to,
            subject,
            error: errorMessage,
            statusCode,
            apiKeyPrefix: process.env.SENDGRID_API_KEY ? process.env.SENDGRID_API_KEY.substring(0, 10) + "..." : "NOT SET",
            fromEmail: process.env.SENDGRID_FROM_EMAIL || "NOT SET",
        });

        return { success: false, error: errorMessage };
    }
};

/**
 * Send bulk emails via SendGrid (more efficient for multiple recipients)
 * @param {Array<Object>} emails - Array of { to, subject, body, html }
 * @returns {Promise<Object>} - { success, sent, failed, results }
 */
const sendBulkEmails = async (emails) => {
    if (!initializeSendGrid()) {
        logger.warn("SendGrid not configured, skipping bulk email send");
        return { success: false, sent: 0, failed: emails.length, error: "SendGrid not configured" };
    }

    const fromEmail = process.env.SENDGRID_FROM_EMAIL;
    const fromName = process.env.SENDGRID_FROM_NAME || "Student Training Portal";

    if (!fromEmail) {
        logger.warn("SENDGRID_FROM_EMAIL not set, skipping bulk email send");
        return { success: false, sent: 0, failed: emails.length, error: "SendGrid from email not configured" };
    }

    const results = [];
    let sent = 0;
    let failed = 0;

    for (const email of emails) {
        try {
            const msg = {
                to: email.to,
                from: { email: fromEmail, name: fromName },
                subject: email.subject,
                text: email.body,
                html: email.html || email.body.replace(/\n/g, "<br>"),
            };

            const [response] = await sgMail.send(msg);
            sent++;
            results.push({
                to: email.to,
                success: true,
                messageId: response.headers["x-message-id"],
            });
        } catch (error) {
            failed++;
            const errorMessage = error.response?.body?.errors?.[0]?.message || error.message;
            results.push({
                to: email.to,
                success: false,
                error: errorMessage,
            });
            logger.error("Failed to send bulk email", { to: email.to, error: errorMessage });
        }
    }

    logger.info("Bulk email send complete", { total: emails.length, sent, failed });

    return {
        success: failed === 0,
        sent,
        failed,
        results,
    };
};

/**
 * Verify SendGrid configuration
 * @returns {Promise<Object>} - { configured, error? }
 */
const verifyConfiguration = async () => {
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;

    if (!apiKey) {
        return { configured: false, error: "SENDGRID_API_KEY not set" };
    }

    if (!fromEmail) {
        return { configured: false, error: "SENDGRID_FROM_EMAIL not set" };
    }

    return { configured: true };
};

module.exports = {
    sendEmail,
    sendBulkEmails,
    verifyConfiguration,
};
