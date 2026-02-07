// backend/auth-service/services/emailService.js
const nodemailer = require("nodemailer");
const { createLogger } = require("../shared/utils/logger");

const logger = createLogger("email-service");

let transporter = null;

/**
 * Create reusable transporter using Gmail SMTP
 */
const getTransporter = () => {
    if (transporter) return transporter;

    if (!process.env.GMAIL_ADDRESS || !process.env.GMAIL_PASSWORD) {
        logger.warn("GMAIL_ADDRESS or GMAIL_PASSWORD not set. Email sending will be disabled.");
        return null;
    }

    transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.GMAIL_ADDRESS,
            pass: process.env.GMAIL_PASSWORD,
        },
    });

    return transporter;
};

/**
 * Send an email
 * @param {Object} params - { to, subject, body, html }
 * @returns {Promise<Object>} - { success, messageId, error? }
 */
const sendEmail = async ({ to, subject, body, html }) => {
    try {
        const transport = getTransporter();

        if (!transport) {
            logger.warn("Email transport not configured, skipping email send", { to, subject });
            return { success: false, error: "Email transport not configured" };
        }

        const mailOptions = {
            from: `"Student Training Portal" <${process.env.GMAIL_ADDRESS}>`,
            to,
            subject,
            text: body,
            html: html || body,
        };

        const info = await transport.sendMail(mailOptions);

        logger.info("Email sent successfully", {
            to,
            subject,
            messageId: info.messageId,
        });

        return { success: true, messageId: info.messageId };
    } catch (error) {
        logger.error("Failed to send email", {
            to,
            subject,
            error: error.message,
        });
        return { success: false, error: error.message };
    }
};

module.exports = { sendEmail };
