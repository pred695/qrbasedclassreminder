import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import useStudentStore from '@store/studentStore';
import { Card, CardContent, CardHeader, CardTitle } from '@components/shared/Card';
import ClassTypeSelector from '@components/student/ClassTypeSelector';
import SignupForm from '@components/student/SignupForm';
import ConfirmationScreen from '@components/student/ConfirmationScreen';
import VerificationMethodSelector from '@components/student/VerificationMethodSelector';
import OtpVerificationStep from '@components/student/OtpVerificationStep';
import SuccessScreen from '@components/student/SuccessScreen';

const StudentSignup = () => {
  const { classType: urlClassType } = useParams();
  const [searchParams] = useSearchParams();

  const {
    selectedClassType,
    formData,
    errors,
    isSubmitting,
    submitSuccess,
    submitError,
    signupResult,
    showConfirmation,
    // OTP state
    otpStep,
    verificationChannel,
    maskedDestination,
    otpExpiresAt,
    otpError,
    isVerifyingOtp,
    isResendingOtp,
    // Actions
    setSelectedClassType,
    updateFormData,
    showConfirmationScreen,
    hideConfirmationScreen,
    startOtpFlow,
    selectVerificationChannel,
    initiateOtpSignup,
    verifyOtpCode,
    resendOtpCode,
    backFromOtp,
    resetForm,
  } = useStudentStore();

  // Handle URL-based class type selection (from QR code or deep link)
  useEffect(() => {
    if (urlClassType) {
      setSelectedClassType(urlClassType.toUpperCase());
    } else {
      const classTypeParam = searchParams.get('type');
      if (classTypeParam) {
        setSelectedClassType(classTypeParam.toUpperCase());
      }
    }
  }, [urlClassType, searchParams, setSelectedClassType]);

  // Reset form on component unmount
  useEffect(() => {
    return () => {
      // Don't reset if user is in success state
      if (!submitSuccess) {
        resetForm();
      }
    };
  }, [submitSuccess]);

  // Show success toast
  useEffect(() => {
    if (submitSuccess && signupResult) {
      toast.success('Registration successful! You will receive a reminder before your training.', {
        duration: 4000,
      });
    }
  }, [submitSuccess, signupResult]);

  // Show error toast
  useEffect(() => {
    if (submitError) {
      // Check for UNIQUE constraint violation (email or phone already exists)
      if (submitError.includes('already exists') || submitError.includes('already registered') || submitError.includes('unique constraint') || submitError.includes('Unique constraint')) {
        toast.error('This email or phone number is already registered. Please use a different contact method.', {
          duration: 5000,
        });
      } else {
        toast.error(submitError || 'Failed to submit registration. Please try again.', {
          duration: 5000,
        });
      }
    }
  }, [submitError]);

  const handleClassTypeSelect = (classType) => {
    setSelectedClassType(classType);
  };

  const handleFormChange = (field, value) => {
    updateFormData(field, value);
  };

  const handleContinueToConfirmation = () => {
    showConfirmationScreen();
  };

  const handleEditInformation = () => {
    hideConfirmationScreen();
  };

  const handleConfirmSubmit = () => {
    // Start OTP flow instead of direct submission
    startOtpFlow();
  };

  const handleChannelSelect = (channel) => {
    selectVerificationChannel(channel);
  };

  const handleChannelContinue = () => {
    initiateOtpSignup(verificationChannel);
  };

  const handleOtpVerify = (otp) => {
    verifyOtpCode(otp);
  };

  const handleOtpResend = () => {
    resendOtpCode();
  };

  const handleBackFromOtp = () => {
    backFromOtp();
  };

  const handleBackFromChannelSelect = () => {
    backFromOtp();
  };

  const handleResetForm = () => {
    resetForm();
  };

  // Render success screen
  if (submitSuccess && signupResult) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <SuccessScreen signupData={signupResult} onReset={handleResetForm} />
        </div>
      </div>
    );
  }

  // Render OTP verification step
  if (otpStep === 'sent') {
    return (
      <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md">
          <Card>
            <CardContent className="pt-6">
              <OtpVerificationStep
                maskedDestination={maskedDestination}
                verificationChannel={verificationChannel}
                expiresAt={otpExpiresAt}
                onVerify={handleOtpVerify}
                onResend={handleOtpResend}
                onBack={handleBackFromOtp}
                isVerifying={isVerifyingOtp || isSubmitting}
                isResending={isResendingOtp}
                error={otpError}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Render channel selection step (when both email and phone provided)
  if (otpStep === 'selecting') {
    return (
      <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md">
          <Card>
            <CardContent className="pt-6">
              <VerificationMethodSelector
                email={formData.email}
                phone={formData.phone}
                selectedChannel={verificationChannel}
                onSelectChannel={handleChannelSelect}
                onContinue={handleChannelContinue}
                onBack={handleBackFromChannelSelect}
                isLoading={isSubmitting}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Render confirmation screen
  if (showConfirmation && selectedClassType) {
    return (
      <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <ConfirmationScreen
            classType={selectedClassType}
            formData={formData}
            onConfirm={handleConfirmSubmit}
            onEdit={handleEditInformation}
            isSubmitting={isSubmitting}
            error={submitError}
          />
        </div>
      </div>
    );
  }

  // Render main signup flow
  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Training Registration</CardTitle>
            <p className="text-center text-sm text-muted-foreground">
              Register for your upcoming training session
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Select Training Type */}
            {!selectedClassType && (
              <ClassTypeSelector
                selectedClassType={selectedClassType}
                onSelect={handleClassTypeSelect}
                disabled={isSubmitting}
              />
            )}

            {/* Step 2: Fill Form */}
            {selectedClassType && (
              <SignupForm
                classType={selectedClassType}
                formData={formData}
                errors={errors}
                onFormChange={handleFormChange}
                onSubmit={handleContinueToConfirmation}
                onBack={() => setSelectedClassType(null)}
                isSubmitting={isSubmitting}
              />
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            Need help? Contact your training administrator
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentSignup;
