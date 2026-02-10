// backend/auth-service/templates/emailTemplates.js

/**
 * Generate a styled HTML email template
 * @param {Object} options - { studentName, classTypeName, scheduleLink, optOutLink, otpCode }
 * @returns {string} HTML email content
 */
const generateReminderEmailHtml = ({ studentName, classTypeName, scheduleLink, optOutLink, otpCode }) => {
    const displayName = studentName || 'there';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Training Reminder</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 480px; width: 100%; border-collapse: collapse;">
                    <!-- Logo/Header -->
                    <tr>
                        <td align="center" style="padding-bottom: 24px;">
                            <div style="width: 48px; height: 48px; background-color: #3b82f6; border-radius: 12px; display: inline-block; text-align: center; line-height: 48px;">
                                <span style="color: white; font-size: 24px; font-weight: bold;">T</span>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Main Card -->
                    <tr>
                        <td style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                <!-- Content -->
                                <tr>
                                    <td style="padding: 32px;">
                                        <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #18181b;">
                                            Hello, ${displayName}!
                                        </h1>
                                        <p style="margin: 0 0 24px 0; font-size: 15px; color: #71717a; line-height: 1.5;">
                                            This is a friendly reminder about your upcoming training.
                                        </p>
                                        
                                        <!-- Training Info Box -->
                                        <div style="background-color: #f4f4f5; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                                            <p style="margin: 0 0 4px 0; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">
                                                Training Type
                                            </p>
                                            <p style="margin: 0; font-size: 16px; font-weight: 600; color: #18181b;">
                                                ${classTypeName}
                                            </p>
                                        </div>
                                        
                                        <p style="margin: 0 0 24px 0; font-size: 15px; color: #52525b; line-height: 1.6;">
                                            Your certification is approaching its renewal period. Please schedule your next session at your earliest convenience.
                                        </p>
                                        
                                        <!-- CTA Button -->
                                        <a href="${scheduleLink}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 500; padding: 12px 24px; border-radius: 8px;">
                                            Schedule Training
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Unsubscribe Section -->
                    <tr>
                        <td style="padding: 24px 0;">
                            <div style="background-color: #fafafa; border-radius: 8px; padding: 16px; text-align: center; border: 1px solid #e4e4e7;">
                                <p style="margin: 0 0 8px 0; font-size: 12px; color: #71717a;">
                                    To unsubscribe from reminders, use this code:
                                </p>
                                <p style="margin: 0 0 12px 0; font-size: 24px; font-weight: 700; color: #18181b; letter-spacing: 4px;">
                                    ${otpCode || '------'}
                                </p>
                                <a href="${optOutLink}" style="display: inline-block; color: #3b82f6; font-size: 13px; text-decoration: underline;">
                                    Click here to unsubscribe
                                </a>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 0 0 24px 0; text-align: center;">
                            <p style="margin: 0; font-size: 13px; color: #a1a1aa;">
                                Student Training Portal
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};

/**
 * Generate plain text email for fallback
 * @param {Object} options - { studentName, classTypeName, scheduleLink, optOutLink, otpCode }
 * @returns {string} Plain text email content
 */
const generateReminderEmailText = ({ studentName, classTypeName, scheduleLink, optOutLink, otpCode }) => {
    const displayName = studentName || 'there';

    return `Hello, ${displayName}!

This is a friendly reminder about your upcoming training.

Training Type: ${classTypeName}

Your certification is approaching its renewal period. Please schedule your next session at your earliest convenience.

Schedule Training: ${scheduleLink}

---
Student Training Portal

To unsubscribe from reminders:
Your unsubscribe code: ${otpCode || '------'}
Click here: ${optOutLink}`;
};

module.exports = {
    generateReminderEmailHtml,
    generateReminderEmailText,
};
