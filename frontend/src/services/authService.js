import apiClient from './api';

/**
 * Login admin with email and password
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<Object>} Admin data
 */
export const login = async (email, password) => {
    return await apiClient.post('/api/admin/login', { email, password });
};

/**
 * Logout current admin
 * @returns {Promise<Object>}
 */
export const logout = async () => {
    return await apiClient.post('/api/admin/logout');
};

/**
 * Get current admin profile - used to verify auth status
 * @returns {Promise<Object>} Admin profile
 */
export const getProfile = async () => {
    return await apiClient.get('/api/admin/me');
};

/**
 * Refresh access token
 * @returns {Promise<Object>}
 */
export const refreshToken = async () => {
    return await apiClient.post('/api/admin/refresh');
};
