import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@components/shared/Card';
import Button from '@components/shared/Button';
import Alert, { AlertDescription } from '@components/shared/Alert';
import Modal, { ModalFooter } from '@components/shared/Modal';
import Badge from '@components/shared/Badge';
import { initiateOptOut, verifyOtp, confirmUnsubscribe } from '@services/unsubscribeService';
import { CLASS_TYPE_LABELS } from '@utils/constants';
import { formatDate } from '@utils/formatters';
import {
  ClipboardList,
  Mail,
  Phone,
  CheckCircle,
  ArrowLeft,
  Shield,
  Calendar,
  BookOpen,
} from 'lucide-react';

const STEPS = {
  CONTACT: 1,
  OTP: 2,
  PREFERENCES: 3,
  SUCCESS: 4,
};

const MyRegistrations = () => {
  const [step, setStep] = useState(STEPS.CONTACT);
  const [destination, setDestination] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [verificationToken, setVerificationToken] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [signups, setSignups] = useState([]);
  const [maskedDestination, setMaskedDestination] = useState('');
  const [preferences, setPreferences] = useState({
    optedOutEmail: false,
    optedOutSms: false,
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

  const handleDestinationSubmit = async (e) => {
    e.preventDefault();
    if (!destination.trim()) {
      setError('Please enter your email or phone number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await initiateOptOut(destination);
      setSignups(response.data.signups || []);
      setMaskedDestination(response.data.maskedDestination);
      setStudentData(response.data.student);
      setPreferences({
        optedOutEmail: response.data.student?.optedOutEmail ?? false,
        optedOutSms: response.data.student?.optedOutSms ?? false,
      });
      setStep(STEPS.OTP);
    } catch (err) {
      setError(err.message || 'Failed to find your registrations. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
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
      setStep(STEPS.PREFERENCES);
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

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'PENDING': return 'warning';
      case 'SENT': return 'success';
      case 'FAILED': return 'error';
      default: return 'outline';
    }
  };

  const renderRegistrationsList = () => (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">Your Registrations</p>
      {signups.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-center">
          <p className="text-sm text-muted-foreground">No registrations found.</p>
        </div>
      ) : (
        signups.map((signup) => (
          <div key={signup.id} className="flex items-start justify-between rounded-lg border p-3">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2">
                <BookOpen className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {CLASS_TYPE_LABELS[signup.classType] || signup.classType}
                </p>
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>Reminder: {formatDate(signup.reminderScheduledDate)}</span>
                </div>
              </div>
            </div>
            <Badge variant={getStatusBadgeVariant(signup.status)}>
              {signup.status}
            </Badge>
          </div>
        ))
      )}
    </div>
  );

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
          Enter the email or phone number you used when signing up for training reminders.
        </p>
      </div>

      <Button type="submit" className="w-full" size="lg" loading={loading}>
        Look Up My Registrations
      </Button>
    </form>
  );

  const renderOtpStep = () => (
    <div className="space-y-6">
      {/* Registrations List */}
      {renderRegistrationsList()}

      {/* OTP Verification */}
      <div className="border-t pt-6">
        <form onSubmit={handleVerifyOtp} className="space-y-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              A verification code has been sent to
            </p>
            <p className="text-sm font-medium text-foreground mt-1">
              {maskedDestination}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Enter the code below to manage your notification preferences.
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
      </div>
    </div>
  );

  const renderPreferencesStep = () => (
    <div className="space-y-6">
      <Alert variant="info">
        <AlertDescription>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Your identity has been verified. Manage your preferences below.</span>
          </div>
        </AlertDescription>
      </Alert>

      {/* Registrations List */}
      {renderRegistrationsList()}

      {/* Notification Preferences */}
      <div className="border-t pt-6">
        <p className="text-sm font-medium text-foreground mb-3">Notification Preferences</p>

        {/* Email Preference */}
        <div className="flex items-start justify-between rounded-lg border p-4 mb-3">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-blue-100 p-2">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-foreground">Email Reminders</p>
              <p className="text-sm text-muted-foreground">
                {preferences.optedOutEmail ? 'Currently disabled' : 'Currently enabled'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setPreferences((prev) => ({ ...prev, optedOutEmail: !prev.optedOutEmail }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
              preferences.optedOutEmail ? 'bg-gray-200' : 'bg-primary'
            }`}
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
              <p className="font-medium text-foreground">SMS Reminders</p>
              <p className="text-sm text-muted-foreground">
                {preferences.optedOutSms ? 'Currently disabled' : 'Currently enabled'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setPreferences((prev) => ({ ...prev, optedOutSms: !prev.optedOutSms }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
              preferences.optedOutSms ? 'bg-gray-200' : 'bg-primary'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                preferences.optedOutSms ? 'translate-x-1' : 'translate-x-6'
              }`}
            />
          </button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          Toggle OFF (gray) to stop receiving that notification type.
        </p>
      </div>

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

      <Button
        onClick={() => {
          setStep(STEPS.CONTACT);
          setDestination('');
          setOtp(['', '', '', '', '', '']);
          setVerificationToken(null);
          setStudentData(null);
          setSignups([]);
          setError(null);
        }}
        variant="outline"
        className="w-full"
        size="lg"
      >
        Look Up Another Account
      </Button>
    </div>
  );

  const getStepContent = () => {
    switch (step) {
      case STEPS.CONTACT: return renderContactStep();
      case STEPS.OTP: return renderOtpStep();
      case STEPS.PREFERENCES: return renderPreferencesStep();
      case STEPS.SUCCESS: return renderSuccessStep();
      default: return renderContactStep();
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case STEPS.CONTACT: return 'My Registrations';
      case STEPS.OTP: return 'Verify Your Identity';
      case STEPS.PREFERENCES: return 'Manage Preferences';
      case STEPS.SUCCESS: return 'All Done!';
      default: return 'My Registrations';
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-center">
              <div className="rounded-full bg-primary/10 p-3">
                <ClipboardList className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-center">{getStepTitle()}</CardTitle>
            {step === STEPS.CONTACT && (
              <p className="text-center text-sm text-muted-foreground">
                View your training registrations and manage notification preferences
              </p>
            )}
          </CardHeader>

          <CardContent>
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
            {[STEPS.CONTACT, STEPS.OTP, STEPS.PREFERENCES].map((s) => (
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
              {preferences.optedOutEmail && <li>- Disable email reminders</li>}
              {preferences.optedOutSms && <li>- Disable SMS reminders</li>}
              {!preferences.optedOutEmail && <li>- Keep email reminders enabled</li>}
              {!preferences.optedOutSms && <li>- Keep SMS reminders enabled</li>}
            </ul>
          </div>

          {preferences.optedOutEmail && preferences.optedOutSms && (
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

export default MyRegistrations;
