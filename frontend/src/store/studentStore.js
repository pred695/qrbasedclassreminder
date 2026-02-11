import { create } from 'zustand';
import { isValidEmail, isValidPhone } from '@utils/formatters';
import { ERROR_MESSAGES } from '@utils/constants';
import {
  initiateSignup,
  verifyOtp,
  completeSignup,
  resendOtp,
} from '@services/registrationOtpService';

const useStudentStore = create((set, get) => ({
  // State
  selectedClassType: null,
  formData: {
    email: '',
    phone: '',
  },
  errors: {},
  isSubmitting: false,
  submitSuccess: false,
  submitError: null,
  signupResult: null,
  showConfirmation: false,

  // OTP Flow State
  otpStep: 'idle', // 'idle' | 'selecting' | 'sent' | 'verifying' | 'verified'
  registrationToken: null,
  verificationToken: null,
  verificationChannel: null,
  maskedDestination: null,
  otpExpiresAt: null,
  otpError: null,
  isVerifyingOtp: false,
  isResendingOtp: false,

  // Actions
  setSelectedClassType: (classType) => {
    set({ selectedClassType: classType });
  },

  updateFormData: (field, value) => {
    set((state) => ({
      formData: {
        ...state.formData,
        [field]: value,
      },
      errors: {
        ...state.errors,
        [field]: null, // Clear error when user types
      },
    }));
  },

  setFormData: (data) => {
    set({ formData: data });
  },

  validateForm: () => {
    const { formData, selectedClassType } = get();
    const errors = {};

    // Validate class type
    if (!selectedClassType) {
      errors.classType = 'Please select a training type';
    }

    // Validate contact info - require at least one
    const hasEmail = formData.email && formData.email.trim() !== '';
    const hasPhone = formData.phone && formData.phone.trim() !== '';

    if (!hasEmail && !hasPhone) {
      errors.contact = 'Please provide either email or phone number';
      errors.email = ERROR_MESSAGES.REQUIRED_FIELD('Email or Phone');
      errors.phone = ERROR_MESSAGES.REQUIRED_FIELD('Email or Phone');
    }

    // Validate email format if provided
    if (hasEmail && !isValidEmail(formData.email)) {
      errors.email = ERROR_MESSAGES.INVALID_EMAIL;
    }

    // Validate phone format if provided
    if (hasPhone && !isValidPhone(formData.phone)) {
      errors.phone = ERROR_MESSAGES.INVALID_PHONE;
    }

    set({ errors });
    return Object.keys(errors).length === 0;
  },

  showConfirmationScreen: () => {
    const isValid = get().validateForm();
    if (isValid) {
      set({ showConfirmation: true });
    }
    return isValid;
  },

  hideConfirmationScreen: () => {
    set({ showConfirmation: false });
  },

  // OTP Flow Actions
  selectVerificationChannel: (channel) => {
    set({ verificationChannel: channel });
  },

  /**
   * Start OTP flow - determine if channel selection is needed
   */
  startOtpFlow: () => {
    const { formData } = get();
    const hasEmail = formData.email && formData.email.trim() !== '';
    const hasPhone = formData.phone && formData.phone.trim() !== '';

    if (hasEmail && hasPhone) {
      // Both provided - show channel selector
      set({ otpStep: 'selecting', verificationChannel: 'email' }); // Default to email
    } else {
      // Only one provided - auto-select and initiate
      const channel = hasEmail ? 'email' : 'phone';
      set({ verificationChannel: channel });
      get().initiateOtpSignup(channel);
    }
  },

  /**
   * Initiate OTP signup - send verification code
   */
  initiateOtpSignup: async (channel) => {
    const { formData, selectedClassType, verificationChannel } = get();
    const selectedChannel = channel || verificationChannel;

    set({ isSubmitting: true, otpError: null, submitError: null });

    try {
      const result = await initiateSignup({
        email: formData.email || null,
        phone: formData.phone || null,
        classType: selectedClassType,
        verificationChannel: selectedChannel,
      });

      set({
        isSubmitting: false,
        otpStep: 'sent',
        registrationToken: result.data.registrationToken,
        otpExpiresAt: result.data.expiresAt,
        maskedDestination: result.data.maskedDestination,
        verificationChannel: result.data.verificationChannel,
      });

      return true;
    } catch (error) {
      console.error('Initiate signup error:', error);

      let errorMessage = error.message || 'Failed to send verification code. Please try again.';

      // Handle specific errors
      if (error.code === 'EMAIL_EXISTS' || error.code === 'PHONE_EXISTS' || error.status === 409) {
        errorMessage = 'This email or phone number is already registered.';
      }

      set({
        isSubmitting: false,
        otpError: errorMessage,
        submitError: errorMessage,
      });

      return false;
    }
  },

  /**
   * Verify OTP code
   */
  verifyOtpCode: async (otp) => {
    const { registrationToken } = get();

    set({ isVerifyingOtp: true, otpError: null });

    try {
      const result = await verifyOtp(registrationToken, otp);

      set({
        isVerifyingOtp: false,
        otpStep: 'verified',
        verificationToken: result.data.verificationToken,
      });

      // Auto-complete registration
      return await get().completeOtpSignup();
    } catch (error) {
      console.error('Verify OTP error:', error);

      set({
        isVerifyingOtp: false,
        otpError: error.message || 'Invalid verification code. Please try again.',
      });

      return false;
    }
  },

  /**
   * Complete registration after OTP verification
   */
  completeOtpSignup: async () => {
    const { verificationToken } = get();

    set({ isSubmitting: true, otpError: null });

    try {
      const result = await completeSignup(verificationToken);

      set({
        isSubmitting: false,
        submitSuccess: true,
        signupResult: result.data,
        otpStep: 'idle',
      });

      return true;
    } catch (error) {
      console.error('Complete signup error:', error);

      set({
        isSubmitting: false,
        otpError: error.message || 'Failed to complete registration. Please try again.',
        submitError: error.message || 'Failed to complete registration. Please try again.',
      });

      return false;
    }
  },

  /**
   * Resend OTP code
   */
  resendOtpCode: async () => {
    const { registrationToken } = get();

    set({ isResendingOtp: true, otpError: null });

    try {
      const result = await resendOtp(registrationToken);

      set({
        isResendingOtp: false,
        otpExpiresAt: result.data.expiresAt,
      });

      return true;
    } catch (error) {
      console.error('Resend OTP error:', error);

      set({
        isResendingOtp: false,
        otpError: error.message || 'Failed to resend code. Please try again.',
      });

      return false;
    }
  },

  /**
   * Go back from OTP step
   */
  backFromOtp: () => {
    const { otpStep } = get();

    if (otpStep === 'sent') {
      set({
        otpStep: 'idle',
        registrationToken: null,
        otpExpiresAt: null,
        maskedDestination: null,
        otpError: null,
        showConfirmation: true, // Go back to confirmation screen
      });
    } else if (otpStep === 'selecting') {
      set({
        otpStep: 'idle',
        verificationChannel: null,
        showConfirmation: true,
      });
    }
  },

  resetForm: () => {
    set({
      selectedClassType: null,
      formData: {
        email: '',
        phone: '',
      },
      errors: {},
      isSubmitting: false,
      submitSuccess: false,
      submitError: null,
      signupResult: null,
      showConfirmation: false,
      // OTP state reset
      otpStep: 'idle',
      registrationToken: null,
      verificationToken: null,
      verificationChannel: null,
      maskedDestination: null,
      otpExpiresAt: null,
      otpError: null,
      isVerifyingOtp: false,
      isResendingOtp: false,
    });
  },

  resetSubmissionState: () => {
    set({
      isSubmitting: false,
      submitSuccess: false,
      submitError: null,
      signupResult: null,
    });
  },

  resetOtpState: () => {
    set({
      otpStep: 'idle',
      registrationToken: null,
      verificationToken: null,
      verificationChannel: null,
      maskedDestination: null,
      otpExpiresAt: null,
      otpError: null,
      isVerifyingOtp: false,
      isResendingOtp: false,
    });
  },
}));

export default useStudentStore;
