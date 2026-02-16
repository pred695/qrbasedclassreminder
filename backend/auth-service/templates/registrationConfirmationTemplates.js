// backend/auth-service/templates/registrationConfirmationTemplates.js

/**
 * Generate HTML email for registration confirmation with booking link
 * @param {Object} options - { classTypeName, bookingLink }
 * @returns {string} HTML email content
 */
const generateRegistrationConfirmationHtml = ({ classTypeName, bookingLink }) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registration Confirmed</title>
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
                                <tr>
                                    <td style="padding: 32px;">
                                        <!-- Success Icon -->
                                        <div style="text-align: center; margin-bottom: 24px;">
                                            <div style="width: 56px; height: 56px; background-color: #dcfce7; border-radius: 50%; display: inline-block; text-align: center; line-height: 56px;">
                                                <span style="color: #16a34a; font-size: 28px;">&#10003;</span>
                                            </div>
                                        </div>

                                        <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600; color: #18181b; text-align: center;">
                                            Registration Confirmed!
                                        </h1>
                                        <p style="margin: 0 0 24px 0; font-size: 15px; color: #71717a; line-height: 1.5; text-align: center;">
                                            You have successfully registered for the following training.
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
                                            Please use the link below to book your training session. You will also receive a reminder before your scheduled date.
                                        </p>

                                        <!-- Booking Link Button -->
                                        <div style="text-align: center;">
                                            <a href="${bookingLink}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 500; padding: 12px 24px; border-radius: 8px;">
                                                Book Your Training Session
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 0; text-align: center;">
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
 * Generate plain text email for registration confirmation
 * @param {Object} options - { classTypeName, bookingLink }
 * @returns {string} Plain text email content
 */
const generateRegistrationConfirmationText = ({ classTypeName, bookingLink }) => {
    return `Registration Confirmed!

You have successfully registered for the following training:

Training Type: ${classTypeName}

Please use the link below to book your training session. You will also receive a reminder before your scheduled date.

Book Your Training Session: ${bookingLink}

---
Student Training Portal`;
};

module.exports = {
    generateRegistrationConfirmationHtml,
    generateRegistrationConfirmationText,
};
