// frontend/src/services/templateService.js
import apiClient from './api';

/**
 * Get all message templates
 * @returns {Promise<Array>} List of templates
 */
export const getAllTemplates = async () => {
    const response = await apiClient.get('/api/admin/templates');
    return response.data?.data?.templates || [];
};

/**
 * Get a specific template by class type and channel
 * @param {string} classType - Class type (TYPE_1, TYPE_2, etc.)
 * @param {string} channel - Channel (EMAIL or SMS)
 * @returns {Promise<Object|null>} Template or null
 */
export const getTemplate = async (classType, channel) => {
    const response = await apiClient.get(`/api/admin/templates/${classType}/${channel}`);
    return response.data.data.template;
};

/**
 * Create or update a template
 * @param {string} classType - Class type
 * @param {string} channel - Channel (EMAIL or SMS)
 * @param {Object} data - { subject?, body, scheduleLink?, variables? }
 * @returns {Promise<Object>} Saved template
 */
export const saveTemplate = async (classType, channel, data) => {
    const response = await apiClient.put(`/api/admin/templates/${classType}/${channel}`, data);
    return response.data.data.template;
};

/**
 * Delete a template
 * @param {string} templateId - Template ID
 * @returns {Promise<Object>} Deletion result
 */
export const deleteTemplate = async (templateId) => {
    const response = await apiClient.delete(`/api/admin/templates/${templateId}`);
    return response.data;
};

export default {
    getAllTemplates,
    getTemplate,
    saveTemplate,
    deleteTemplate,
};
