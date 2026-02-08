// backend/auth-service/services/reminderService.js
const signupRepository = require("../repositories/signupRepository");
const deliveryLogRepository = require("../repositories/deliveryLogRepository");
const templateRepository = require("../repositories/templateRepository");
const emailService = require("./emailService");
const smsService = require("./smsService");
const { generateReminderEmailHtml, generateReminderEmailText } = require("../templates/emailTemplates");
const { NotFoundError, transformError } = require("../shared/utils/errors");
const { createLogger } = require("../shared/utils/logger");

const logger = createLogger("reminder-service");

// Class type to human-readable name mapping
const CLASS_TYPE_LABELS = {
    TYPE_1: "Initial Firearms",
    TYPE_2: "Firearms Requalification",
    TYPE_3: "CPR/AED and/or First Aid",
    TYPE_4: "Handcuffing and/or Pepper Spray",
    TYPE_5: "CEW / Taser",
    TYPE_6: "Baton",
};

/**
 * Interpolate template variables
 * @param {string} template - Template string with {{variable}} placeholders
 * @param {Object} variables - Key-value pairs for interpolation
 * @returns {string} Interpolated string
 */
const interpolateTemplate = (template, variables) => {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`{{${key}}}`, "g"), value || "");
    }
    return result;
};

/**
 * Build a default message when no template exists
 * @param {string} classTypeName - Human-readable class name
 * @param {string} channel - EMAIL or SMS
 * @returns {Object} { subject?, body }
 */
const buildDefaultMessage = (classTypeName, channel) => {
    const appUrl = process.env.APP_BASE_URL || "https://yourapp.com";

    if (channel === "EMAIL") {
        return {
            subject: `Reminder: ${classTypeName} Training Renewal`,
            body: `Hello,\n\nThis is a reminder that your ${classTypeName} training certification is approaching its renewal period.\n\nPlease schedule your next session at your earliest convenience.\n\nVisit: ${appUrl}\n\nIf you no longer wish to receive these reminders, you can update your preferences on our website.\n\nThank you,\nStudent Training Portal`,
        };
    }

    return {
        body: `Reminder: Your ${classTypeName} certification is due for renewal. Visit ${appUrl} to schedule.`,
    };
};

/**
 * Send reminder for a single signup (both EMAIL and SMS)
 * @param {string} signupId - The signup ID
 * @returns {Promise<Object>} - { emailResult, smsResult, overallStatus }
 */
const sendReminder = async (signupId) => {
    try {
        // 1. Fetch signup with student data
        const signup = await signupRepository.findById(signupId, true);
        if (!signup) {
            throw NotFoundError("Signup not found", "SIGNUP_NOT_FOUND");
        }

        const student = signup.student;
        const classTypeName = CLASS_TYPE_LABELS[signup.classType] || signup.classType;
        const appUrl = process.env.APP_BASE_URL || "https://yourapp.com";

        // Get student name - fallback to email prefix or generic greeting
        const studentName = student.name || (student.email ? student.email.split('@')[0] : null);

        const templateVariables = {
            classTypeName,
            studentName: studentName || '',
            scheduleLink: appUrl,
            optOutLink: `${appUrl}/opt-out/${student.id}`,
            studentEmail: student.email || "",
            studentPhone: student.phone || "",
        };

        let emailResult = null;
        let smsResult = null;

        // 2. Send email if student has email and not opted out
        if (student.email && !student.optedOutEmail) {
            const emailTemplate = await templateRepository.findByClassTypeAndChannel(signup.classType, "EMAIL");

            let subject, body, html;
            if (emailTemplate) {
                subject = interpolateTemplate(emailTemplate.subject || "", templateVariables);
                body = interpolateTemplate(emailTemplate.body, templateVariables);
                // Generate HTML version from template
                html = generateReminderEmailHtml({
                    studentName,
                    classTypeName,
                    scheduleLink: appUrl,
                    optOutLink: templateVariables.optOutLink,
                });
            } else {
                const defaultMsg = buildDefaultMessage(classTypeName, "EMAIL");
                subject = defaultMsg.subject;
                body = generateReminderEmailText({
                    studentName,
                    classTypeName,
                    scheduleLink: appUrl,
                    optOutLink: templateVariables.optOutLink,
                });
                html = generateReminderEmailHtml({
                    studentName,
                    classTypeName,
                    scheduleLink: appUrl,
                    optOutLink: templateVariables.optOutLink,
                });
            }

            emailResult = await emailService.sendEmail({
                to: student.email,
                subject,
                body,
                html,
            });

            // Log delivery
            await deliveryLogRepository.createDeliveryLog({
                signupId,
                channel: "EMAIL",
                status: emailResult.success ? "SENT" : "FAILED",
                providerMessageId: emailResult.messageId || null,
                errorMessage: emailResult.error || null,
                metadata: {},
            });
        }

        // 3. Send SMS if student has phone and not opted out
        if (student.phone && !student.optedOutSms) {
            const smsTemplate = await templateRepository.findByClassTypeAndChannel(signup.classType, "SMS");

            let body;
            if (smsTemplate) {
                body = interpolateTemplate(smsTemplate.body, templateVariables);
            } else {
                const defaultMsg = buildDefaultMessage(classTypeName, "SMS");
                body = defaultMsg.body;
            }

            smsResult = await smsService.sendSms({
                to: student.phone,
                body,
            });

            // Log delivery
            await deliveryLogRepository.createDeliveryLog({
                signupId,
                channel: "SMS",
                status: smsResult.success ? "SENT" : "FAILED",
                providerMessageId: smsResult.messageId || null,
                errorMessage: smsResult.error || null,
                metadata: {},
            });
        }

        // 4. Determine overall status
        const emailSuccess = emailResult?.success || false;
        const smsSuccess = smsResult?.success || false;
        const noChannelsAttempted = !emailResult && !smsResult;

        let overallStatus;
        if (noChannelsAttempted) {
            overallStatus = "FAILED";
            logger.warn("No channels available for reminder", { signupId });
        } else if (emailSuccess || smsSuccess) {
            overallStatus = "SENT";
        } else {
            overallStatus = "FAILED";
        }

        // 5. Update signup status
        await signupRepository.updateReminderStatus(signupId, overallStatus);

        logger.info("Reminder processed", {
            signupId,
            overallStatus,
            emailSent: emailSuccess,
            smsSent: smsSuccess,
        });

        return { emailResult, smsResult, overallStatus };
    } catch (error) {
        logger.error("Failed to send reminder", { signupId, error: error.message });
        throw transformError(error, "sendReminder");
    }
};

/**
 * Process all pending reminders whose scheduled date has arrived
 * @returns {Promise<Object>} - { processed, sent, failed }
 */
const processPendingReminders = async () => {
    try {
        const pendingSignups = await signupRepository.findPendingReminders(new Date());

        logger.info("Processing pending reminders", { count: pendingSignups.length });

        let sent = 0;
        let failed = 0;

        for (const signup of pendingSignups) {
            try {
                const result = await sendReminder(signup.id);
                if (result.overallStatus === "SENT") {
                    sent++;
                } else {
                    failed++;
                }
            } catch (error) {
                failed++;
                logger.error("Failed to process individual reminder", {
                    signupId: signup.id,
                    error: error.message,
                });
            }
        }

        const summary = { processed: pendingSignups.length, sent, failed };
        logger.info("Pending reminders processing complete", summary);
        return summary;
    } catch (error) {
        logger.error("Failed to process pending reminders", { error: error.message });
        throw transformError(error, "processPendingReminders");
    }
};

/**
 * Reschedule a reminder
 * @param {string} signupId - Signup ID
 * @param {Date|string} newDate - New scheduled date
 * @returns {Promise<Object>} Updated signup
 */
const rescheduleReminder = async (signupId, newDate) => {
    try {
        const signup = await signupRepository.findById(signupId);
        if (!signup) {
            throw NotFoundError("Signup not found", "SIGNUP_NOT_FOUND");
        }

        const updatedSignup = await signupRepository.updateSignup(signupId, {
            reminderScheduledDate: new Date(newDate),
            status: "PENDING",
        });

        logger.info("Reminder rescheduled", { signupId, newDate });
        return { signup: updatedSignup, message: "Reminder rescheduled successfully" };
    } catch (error) {
        logger.error("Failed to reschedule reminder", { signupId, error: error.message });
        throw transformError(error, "rescheduleReminder");
    }
};

/**
 * Reset a reminder back to PENDING
 * @param {string} signupId - Signup ID
 * @returns {Promise<Object>} Updated signup
 */
const resetReminder = async (signupId) => {
    try {
        const signup = await signupRepository.findById(signupId);
        if (!signup) {
            throw NotFoundError("Signup not found", "SIGNUP_NOT_FOUND");
        }

        // Delete existing delivery logs
        await deliveryLogRepository.deleteBySignupId(signupId);

        // Reset signup status
        const updatedSignup = await signupRepository.updateSignup(signupId, {
            status: "PENDING",
            reminderSentAt: null,
        });

        logger.info("Reminder reset to PENDING", { signupId });
        return { signup: updatedSignup, message: "Reminder reset successfully" };
    } catch (error) {
        logger.error("Failed to reset reminder", { signupId, error: error.message });
        throw transformError(error, "resetReminder");
    }
};

/**
 * Get delivery details for a signup
 * @param {string} signupId - Signup ID
 * @returns {Promise<Object>} Signup with delivery logs
 */
const getDeliveryDetails = async (signupId) => {
    try {
        const signup = await signupRepository.findById(signupId, true);
        if (!signup) {
            throw NotFoundError("Signup not found", "SIGNUP_NOT_FOUND");
        }

        const deliveryLogs = await deliveryLogRepository.findBySignupId(signupId);

        return { signup, deliveryLogs };
    } catch (error) {
        logger.error("Failed to get delivery details", { signupId, error: error.message });
        throw transformError(error, "getDeliveryDetails");
    }
};

module.exports = {
    sendReminder,
    processPendingReminders,
    rescheduleReminder,
    resetReminder,
    getDeliveryDetails,
    CLASS_TYPE_LABELS,
};
