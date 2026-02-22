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

// ============================================
// User Management (Admin only)
// ============================================

/**
 * Get all users (admins and staff)
 * @param {Object} params - Query parameters (pagination, filters)
 * @returns {Promise<Object>} Paginated list of users
 */
export const getAllUsers = async (params = {}) => {
  const response = await apiClient.get('/api/admin/manage', { params });
  return response?.data || response;
};

/**
 * Create a new user (admin or staff)
 * @param {Object} data - { name, email, password, role }
 * @returns {Promise<Object>} Created user
 */
export const createUser = async (data) => {
  const response = await apiClient.post('/api/admin/manage', data);
  return response?.data || response;
};

/**
 * Update a user
 * @param {string} userId - User ID
 * @param {Object} data - Update data
 * @returns {Promise<Object>} Updated user
 */
export const updateUser = async (userId, data) => {
  const response = await apiClient.put(`/api/admin/manage/${userId}`, data);
  return response?.data || response;
};

/**
 * Change a user's role
 * @param {string} userId - User ID
 * @param {string} role - New role (ADMIN or STAFF)
 * @returns {Promise<Object>} Updated user
 */
export const changeUserRole = async (userId, role) => {
  const response = await apiClient.put(`/api/admin/manage/${userId}/role`, { role });
  return response?.data || response;
};

/**
 * Deactivate a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Result
 */
export const deactivateUser = async (userId) => {
  const response = await apiClient.delete(`/api/admin/manage/${userId}`);
  return response?.data || response;
};
