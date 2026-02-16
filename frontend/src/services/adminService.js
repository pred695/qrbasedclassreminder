import apiClient from './api';

/**
 * Get all students with their signups (Admin only)
 * Note: This fetches ALL data - pagination happens on frontend
 * @returns {Promise<Object>} All students and signups
 */
export const getAllStudents = async () => {
  // TODO: Implement when admin endpoints are ready
  // For now, return mock data structure
  return await apiClient.get('/api/admin/students');
};

/**
 * Get all signups (Admin only)
 * Fetches ALL signups without backend pagination - pagination happens on frontend
 * @param {Object} params - Query parameters (filters only, no pagination)
 * @returns {Promise<Object>} All signups
 */
export const getAllSignups = async (params = {}) => {
  // Don't send limit/page - backend will return all results
  return await apiClient.get('/api/admin/signups', {
    params: params
  });
};

/**
 * Update signup status (Admin only)
 * @param {string} signupId - Signup ID
 * @param {Object} updateData - Update data
 * @returns {Promise<Object>} Updated signup
 */
export const updateSignup = async (signupId, updateData) => {
  return await apiClient.patch(`/api/admin/signups/${signupId}`, updateData);
};

/**
 * Delete a signup (Admin only)
 * @param {string} signupId - Signup ID
 * @returns {Promise<Object>} Delete response
 */
export const deleteSignup = async (signupId) => {
  return await apiClient.delete(`/api/admin/signups/${signupId}`);
};

/**
 * Delete a student and all their registrations (Admin only)
 * @param {string} studentId - Student ID
 * @returns {Promise<Object>} Delete response
 */
export const deleteStudent = async (studentId) => {
  return await apiClient.delete(`/api/admin/signups/student/${studentId}`);
};

/**
 * Send reminder manually for a specific signup
 * @param {string} signupId - Signup ID
 * @returns {Promise<Object>} Send result
 */
export const sendReminder = async (signupId) => {
  return await apiClient.post(`/api/admin/reminders/${signupId}/send`);
};

/**
 * Reschedule a reminder
 * @param {string} signupId - Signup ID
 * @param {string} newDate - New scheduled date (ISO string)
 * @returns {Promise<Object>} Updated signup
 */
export const rescheduleReminder = async (signupId, newDate) => {
  return await apiClient.patch(`/api/admin/reminders/${signupId}/reschedule`, {
    reminderScheduledDate: newDate,
  });
};

/**
 * Reset a reminder back to PENDING
 * @param {string} signupId - Signup ID
 * @returns {Promise<Object>} Updated signup
 */
export const resetReminder = async (signupId) => {
  return await apiClient.post(`/api/admin/reminders/${signupId}/reset`);
};

/**
 * Get delivery details for a signup
 * @param {string} signupId - Signup ID
 * @returns {Promise<Object>} Signup with delivery logs
 */
export const getDeliveryDetails = async (signupId) => {
  return await apiClient.get(`/api/admin/reminders/${signupId}/delivery`);
};
