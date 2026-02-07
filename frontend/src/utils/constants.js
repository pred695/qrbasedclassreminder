// Training class types
export const CLASS_TYPES = {
  TYPE_1: 'TYPE_1',
  TYPE_2: 'TYPE_2',
  TYPE_3: 'TYPE_3',
  TYPE_4: 'TYPE_4',
  TYPE_5: 'TYPE_5',
  TYPE_6: 'TYPE_6',
};

// Human-readable class type labels
export const CLASS_TYPE_LABELS = {
  TYPE_1: 'Initial Firearms',
  TYPE_2: 'Firearms Requalification',
  TYPE_3: 'CPR/AED and/or First Aid',
  TYPE_4: 'Handcuffing and/or Pepper Spray',
  TYPE_5: 'CEW / Taser',
  TYPE_6: 'Baton',
};

// Signup statuses
export const SIGNUP_STATUS = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
};

// Signup status labels
export const SIGNUP_STATUS_LABELS = {
  PENDING: 'Pending',
  SENT: 'Sent',
  FAILED: 'Failed',
};

// Message channels
export const MESSAGE_CHANNEL = {
  EMAIL: 'EMAIL',
  SMS: 'SMS',
};

// Delivery status
export const DELIVERY_STATUS = {
  SENT: 'SENT',
  FAILED: 'FAILED',
  DELIVERED: 'DELIVERED',
  BOUNCED: 'BOUNCED',
};

// Form field types
export const CONTACT_TYPE = {
  EMAIL: 'email',
  PHONE: 'phone',
};

// Validation patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s\-()]+$/,
};

// Pagination defaults
export const PAGINATION_DEFAULTS = {
  PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
};

// API endpoints
export const API_ENDPOINTS = {
  // Student endpoints
  STUDENT_SIGNUP: '/api/students/signup',
  STUDENT_SIGNUPS: (studentId) => `/api/students/${studentId}/signups`,
  STUDENT_OPT_OUT: (studentId) => `/api/students/${studentId}/opt-out`,
  SIGNUP_DETAILS: (signupId) => `/api/students/signup/${signupId}`,

  // Admin endpoints (to be defined when needed)
  ADMIN_STUDENTS: '/api/admin/students',
  ADMIN_SIGNUPS: '/api/admin/signups',
};

// Date formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM dd, yyyy',
  DISPLAY_TIME: 'MMM dd, yyyy hh:mm a',
  ISO: "yyyy-MM-dd'T'HH:mm:ss",
};

// Error messages
export const ERROR_MESSAGES = {
  REQUIRED_FIELD: (field) => `${field} is required`,
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PHONE: 'Please enter a valid phone number',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  SUBMISSION_ERROR: 'Failed to submit signup. Please try again.',
  DUPLICATE_SIGNUP: 'You already have an active signup for this training.',
};

// Success messages
export const SUCCESS_MESSAGES = {
  SIGNUP_SUCCESS: 'Signup successful! You will receive a reminder before your class.',
  OPT_OUT_SUCCESS: 'Your preferences have been updated successfully.',
};

// Class type reminder intervals (in months after signup)
export const CLASS_REMINDER_INTERVALS = {
  TYPE_1: 4,   // Initial Firearms - 4 months
  TYPE_2: 5,   // Firearms Requalification - 5 months
  TYPE_3: 11,  // CPR/AED & First Aid - 11 months
  TYPE_4: 11,  // Handcuffing / Pepper Spray - 11 months
  TYPE_5: 11,  // CEW / Taser - 11 months
  TYPE_6: 11,  // Baton - 11 months
};
