import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@components/shared/Card';
import Button from '@components/shared/Button';
import Alert, { AlertDescription } from '@components/shared/Alert';
import Modal, { ModalFooter } from '@components/shared/Modal';
import { verifyOtp, confirmUnsubscribe } from '@services/unsubscribeService';
import { BellOff, Mail, Phone, CheckCircle, ArrowLeft, Shield } from 'lucide-react';

const STEPS = {
  CONTACT: 1,
  OTP: 2,
  CONFIRM: 3,
  SUCCESS: 4,
};

const UnsubscribeFlow = () => {
  const [searchParams] = useSearchParams();

  // Get pre-filled destination from URL params
  const initialEmail = searchParams.get('email') || '';
  const initialPhone = searchParams.get('phone') || '';
  const initialDestination = initialEmail || initialPhone;

  const [step, setStep] = useState(STEPS.CONTACT);
  const [destination, setDestination] = useState(initialDestination);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [verificationToken, setVerificationToken] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [preferences, setPreferences] = useState({
    optedOutEmail: true,
    optedOutSms: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Focus first OTP input when step changes to OTP
  useEffect(() => {
    if (step === STEPS.OTP) {
      const firstInput = document.getElementById('otp-0');
      if (firstInput) firstInput.focus();
    }
  }, [step]);

  const handleDestinationSubmit = (e) => {
    e.preventDefault();
    if (!destination.trim()) {
      setError('Please enter your email or phone number');
      return;
    }
    setError(null);
    setStep(STEPS.OTP);
  };

  const handleOtpChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    // Handle backspace - move to previous input
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const newOtp = pastedData.split('').concat(Array(6 - pastedData.length).fill(''));
      setOtp(newOtp.slice(0, 6));
      // Focus last filled input or last input
      const lastFilledIndex = Math.min(pastedData.length - 1, 5);
      const lastInput = document.getElementById(`otp-${lastFilledIndex}`);
      if (lastInput) lastInput.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otpValue = otp.join('');

    if (otpValue.length !== 6) {
      setError('Please enter all 6 digits of your verification code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await verifyOtp(destination, otpValue);
      setVerificationToken(response.data.token);
      setStudentData(response.data.student);
      setPreferences({
        optedOutEmail: response.data.student.optedOutEmail || true,
        optedOutSms: response.data.student.optedOutSms || true,
      });
      setStep(STEPS.CONFIRM);
    } catch (err) {
      setError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmClick = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmUnsubscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      await confirmUnsubscribe(verificationToken, preferences);
      setShowConfirmModal(false);
      setStep(STEPS.SUCCESS);
    } catch (err) {
      setError(err.message || 'Failed to update preferences. Please try again.');
      setShowConfirmModal(false);
    } finally {
      setLoading(false);
    }
  };

  const renderContactStep = () => (
    <form onSubmit={handleDestinationSubmit} className="space-y-6">
      <div>
        <label htmlFor="destination" className="block text-sm font-medium text-foreground mb-2">
          Email or Phone Number
        </label>
        <input
          id="destination"
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Enter your email or phone"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Enter the email or phone number you used when signing up for reminders.
        </p>
      </div>

      <Button type="submit" className="w-full" size="lg">
        Continue
      </Button>
    </form>
  );

  const renderOtpStep = () => (
    <form onSubmit={handleVerifyOtp} className="space-y-6">
      <div className="text-center mb-6">
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code from your reminder email/SMS
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Verifying: <span className="font-medium text-foreground">{destination}</span>
        </p>
      </div>

      {/* OTP Input */}
      <div className="flex justify-center gap-2">
        {otp.map((digit, index) => (
          <input
            key={index}
            id={`otp-${index}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleOtpChange(index, e.target.value)}
            onKeyDown={(e) => handleOtpKeyDown(index, e)}
            onPaste={index === 0 ? handleOtpPaste : undefined}
            className="w-12 h-14 text-center text-2xl font-bold rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all"
          />
        ))}
      </div>

      <div className="space-y-3">
        <Button type="submit" className="w-full" size="lg" loading={loading}>
          Verify Code
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => {
            setStep(STEPS.CONTACT);
            setOtp(['', '', '', '', '', '']);
            setError(null);
          }}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>
    </form>
  );

  const renderConfirmStep = () => (
    <div className="space-y-6">
      <Alert variant="info">
        <AlertDescription>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Your identity has been verified. Select your preferences below.</span>
          </div>
        </AlertDescription>
      </Alert>

      {/* Email Preference */}
      <div className="flex items-start justify-between rounded-lg border p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-blue-100 p-2">
            <Mail className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-foreground">Email Notifications</p>
            <p className="text-sm text-muted-foreground">
              {studentData?.email || 'No email on file'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setPreferences((prev) => ({ ...prev, optedOutEmail: !prev.optedOutEmail }))}
          disabled={!studentData?.email}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
            preferences.optedOutEmail ? 'bg-gray-200' : 'bg-primary'
          } ${!studentData?.email ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              preferences.optedOutEmail ? 'translate-x-1' : 'translate-x-6'
            }`}
          />
        </button>
      </div>

      {/* SMS Preference */}
      <div className="flex items-start justify-between rounded-lg border p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-green-100 p-2">
            <Phone className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-foreground">SMS Notifications</p>
            <p className="text-sm text-muted-foreground">
              {studentData?.phone || 'No phone on file'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setPreferences((prev) => ({ ...prev, optedOutSms: !prev.optedOutSms }))}
          disabled={!studentData?.phone}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
            preferences.optedOutSms ? 'bg-gray-200' : 'bg-primary'
          } ${!studentData?.phone ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              preferences.optedOutSms ? 'translate-x-1' : 'translate-x-6'
            }`}
          />
        </button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Toggle OFF (gray) to unsubscribe from that notification type.
      </p>

      <Button onClick={handleConfirmClick} className="w-full" size="lg" loading={loading}>
        Save Preferences
      </Button>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className="rounded-full bg-green-100 p-4">
          <CheckCircle className="h-12 w-12 text-green-600" />
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-foreground">Preferences Updated</h3>
        <p className="mt-2 text-muted-foreground">
          Your notification preferences have been successfully updated.
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 text-left">
        <p className="text-sm font-medium mb-2">Your current settings:</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email reminders: {preferences.optedOutEmail ? 'Disabled' : 'Enabled'}
          </li>
          <li className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            SMS reminders: {preferences.optedOutSms ? 'Disabled' : 'Enabled'}
          </li>
        </ul>
      </div>

      <p className="text-xs text-muted-foreground">
        You can update these preferences anytime using the link in your reminder emails.
      </p>
    </div>
  );

  const getStepContent = () => {
    switch (step) {
      case STEPS.CONTACT:
        return renderContactStep();
      case STEPS.OTP:
        return renderOtpStep();
      case STEPS.CONFIRM:
        return renderConfirmStep();
      case STEPS.SUCCESS:
        return renderSuccessStep();
      default:
        return renderContactStep();
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case STEPS.CONTACT:
        return 'Verify Your Identity';
      case STEPS.OTP:
        return 'Enter Verification Code';
      case STEPS.CONFIRM:
        return 'Update Preferences';
      case STEPS.SUCCESS:
        return 'All Done!';
      default:
        return 'Unsubscribe';
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-center">
              <div className="rounded-full bg-primary/10 p-3">
                <BellOff className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-center">{getStepTitle()}</CardTitle>
            {step !== STEPS.SUCCESS && (
              <p className="text-center text-sm text-muted-foreground">
                Manage your training reminder notifications
              </p>
            )}
          </CardHeader>

          <CardContent>
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {getStepContent()}
          </CardContent>
        </Card>

        {/* Step Indicator */}
        {step !== STEPS.SUCCESS && (
          <div className="flex justify-center gap-2 mt-6">
            {[STEPS.CONTACT, STEPS.OTP, STEPS.CONFIRM].map((s) => (
              <div
                key={s}
                className={`h-2 w-8 rounded-full transition-colors ${
                  step >= s ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Changes"
        description="Are you sure you want to update your notification preferences?"
        size="sm"
      >
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm">You are about to:</p>
            <ul className="mt-2 text-sm text-muted-foreground space-y-1">
              {preferences.optedOutEmail && <li>• Disable email reminders</li>}
              {preferences.optedOutSms && <li>• Disable SMS reminders</li>}
              {!preferences.optedOutEmail && <li>• Keep email reminders enabled</li>}
              {!preferences.optedOutSms && <li>• Keep SMS reminders enabled</li>}
            </ul>
          </div>

          {(preferences.optedOutEmail && preferences.optedOutSms) && (
            <Alert variant="warning">
              <AlertDescription>
                You are disabling all reminders. You may miss important training renewal notices.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirmUnsubscribe} loading={loading}>
            Confirm
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default UnsubscribeFlow;
