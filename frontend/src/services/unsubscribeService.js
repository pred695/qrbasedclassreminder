import apiClient from './api';

/**
 * Initiate opt-out flow - send OTP and get registrations
 * @param {string} destination - Email or phone number
 * @returns {Promise<Object>} Response with registrations and OTP delivery info
 */
export const initiateOptOut = async (destination) => {
  return await apiClient.post('/api/students/unsubscribe/initiate', {
    destination,
  });
};

/**
 * Verify OTP for unsubscribe flow
 * @param {string} destination - Email or phone number
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<Object>} Verification response with token
 */
export const verifyOtp = async (destination, otp) => {
  return await apiClient.post('/api/students/unsubscribe/verify', {
    destination,
    otp,
  });
};

/**
 * Confirm unsubscribe after OTP verification
 * @param {string} token - Verification token from verifyOtp
 * @param {Object} preferences - Opt-out preferences
 * @param {boolean} [preferences.optedOutEmail] - Opt out from email reminders
 * @param {boolean} [preferences.optedOutSms] - Opt out from SMS reminders
 * @returns {Promise<Object>} Confirmation response
 */
export const confirmUnsubscribe = async (token, preferences) => {
  return await apiClient.post('/api/students/unsubscribe/confirm', {
    token,
    ...preferences,
  });
};
