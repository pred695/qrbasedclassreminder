import { create } from 'zustand';
import * as adminService from '@services/adminService';

const useReminderStore = create((set, get) => ({
  // State
  sendingReminders: [],
  deliveryDetails: {},

  // Error states
  sendError: null,

  // Actions - Send Reminder via API
  sendReminderAsync: async (signupId) => {
    set((state) => ({
      sendingReminders: [...state.sendingReminders, signupId],
      sendError: null,
    }));
    try {
      const result = await adminService.sendReminder(signupId);
      set((state) => ({
        sendingReminders: state.sendingReminders.filter((id) => id !== signupId),
      }));
      return result;
    } catch (error) {
      set((state) => ({
        sendingReminders: state.sendingReminders.filter((id) => id !== signupId),
        sendError: error.message,
      }));
      throw error;
    }
  },

  // Actions - Reschedule Reminder via API
  rescheduleReminderAsync: async (signupId, newDate) => {
    try {
      const result = await adminService.rescheduleReminder(signupId, newDate);
      return result;
    } catch (error) {
      throw error;
    }
  },

  // Actions - Reset Reminder via API
  resetReminderAsync: async (signupId) => {
    try {
      const result = await adminService.resetReminder(signupId);
      return result;
    } catch (error) {
      throw error;
    }
  },

  // Actions - Fetch Delivery Details
  fetchDeliveryDetails: async (signupId) => {
    try {
      const result = await adminService.getDeliveryDetails(signupId);
      set((state) => ({
        deliveryDetails: {
          ...state.deliveryDetails,
          [signupId]: result.data,
        },
      }));
      return result.data;
    } catch (error) {
      throw error;
    }
  },

  // Getters
  isSending: (signupId) => {
    return get().sendingReminders.includes(signupId);
  },

  getDeliveryDetailsForSignup: (signupId) => {
    return get().deliveryDetails[signupId] || null;
  },

  // Clear
  clearSendError: () => set({ sendError: null }),
}));

export default useReminderStore;
