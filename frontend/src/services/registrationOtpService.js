import apiClient from './api';

/**
 * Initiate registration - send OTP to email/phone
 * @param {Object} data - { email?, phone?, classType, verificationChannel }
 * @returns {Promise<Object>} Registration token and expiry info
 */
export const initiateSignup = async (data) => {
  return await apiClient.post('/api/students/signup/initiate', data);
};

/**
 * Verify OTP for registration
 * @param {string} registrationToken - Token from initiate step
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<Object>} Verification token
 */
export const verifyOtp = async (registrationToken, otp) => {
  return await apiClient.post('/api/students/signup/verify', {
    registrationToken,
    otp,
  });
};

/**
 * Complete registration after OTP verification
 * @param {string} verificationToken - Token from verify step
 * @returns {Promise<Object>} Signup and student data
 */
export const completeSignup = async (verificationToken) => {
  return await apiClient.post('/api/students/signup/complete', {
    verificationToken,
  });
};

/**
 * Resend OTP for pending registration
 * @param {string} registrationToken - Token from initiate step
 * @returns {Promise<Object>} New expiry info
 */
export const resendOtp = async (registrationToken) => {
  return await apiClient.post('/api/students/signup/resend', {
    registrationToken,
  });
};
