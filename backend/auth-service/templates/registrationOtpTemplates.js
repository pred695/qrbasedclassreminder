// backend/auth-service/templates/registrationOtpTemplates.js

/**
 * Generate a styled HTML email template for registration OTP
 * @param {Object} options - { otp, expiresInMinutes }
 * @returns {string} HTML email content
 */
const generateRegistrationOtpEmailHtml = ({ otp, expiresInMinutes }) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Registration</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 32px 32px 24px 32px; text-align: center;">
                            <div style="width: 64px; height: 64px; background-color: #3b82f6; border-radius: 50%; margin: 0 auto 16px auto; display: flex; align-items: center; justify-content: center;">
                                <span style="font-size: 28px; color: #ffffff; line-height: 64px;">&#128274;</span>
                            </div>
                            <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #18181b;">
                                Verify Your Email
                            </h1>
                            <p style="margin: 8px 0 0 0; font-size: 14px; color: #71717a;">
                                Complete your registration for Training Portal
                            </p>
                        </td>
                    </tr>

                    <!-- OTP Code -->
                    <tr>
                        <td style="padding: 0 32px 24px 32px;">
                            <div style="background-color: #f4f4f5; border-radius: 8px; padding: 24px; text-align: center;">
                                <p style="margin: 0 0 8px 0; font-size: 13px; color: #71717a; text-transform: uppercase; letter-spacing: 1px;">
                                    Your verification code
                                </p>
                                <p style="margin: 0; font-size: 36px; font-weight: 700; color: #18181b; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                                    ${otp}
                                </p>
                            </div>
                        </td>
                    </tr>

                    <!-- Expiry Notice -->
                    <tr>
                        <td style="padding: 0 32px 24px 32px; text-align: center;">
                            <p style="margin: 0; font-size: 14px; color: #71717a;">
                                This code will expire in <strong style="color: #18181b;">${expiresInMinutes} minutes</strong>
                            </p>
                        </td>
                    </tr>

                    <!-- Security Notice -->
                    <tr>
                        <td style="padding: 0 32px 32px 32px;">
                            <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; border-left: 4px solid #f59e0b;">
                                <p style="margin: 0; font-size: 13px; color: #92400e;">
                                    <strong>Security tip:</strong> Never share this code with anyone. Our team will never ask for your verification code.
                                </p>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 32px; border-top: 1px solid #e4e4e7; text-align: center;">
                            <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                                If you didn't request this code, you can safely ignore this email.
                            </p>
                            <p style="margin: 12px 0 0 0; font-size: 13px; color: #71717a;">
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
 * Generate plain text email for registration OTP
 * @param {Object} options - { otp, expiresInMinutes }
 * @returns {string} Plain text email content
 */
const generateRegistrationOtpEmailText = ({ otp, expiresInMinutes }) => {
    return `Verify Your Registration - Training Portal

Your verification code is: ${otp}

This code will expire in ${expiresInMinutes} minutes.

SECURITY TIP: Never share this code with anyone. Our team will never ask for your verification code.

If you didn't request this code, you can safely ignore this email.

---
Student Training Portal`;
};

module.exports = {
    generateRegistrationOtpEmailHtml,
    generateRegistrationOtpEmailText,
};
