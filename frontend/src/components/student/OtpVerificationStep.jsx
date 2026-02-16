import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import Button from '@components/shared/Button';
import Alert, { AlertDescription } from '@components/shared/Alert';

/**
 * OTP verification step component with 6-digit input
 */
const OtpVerificationStep = ({
  maskedDestination,
  verificationChannel,
  expiresAt,
  onVerify,
  onResend,
  onBack,
  isVerifying,
  isResending,
  error,
  verifiedChannels = [],
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  // Calculate time left until expiry
  useEffect(() => {
    if (!expiresAt) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));
      setTimeLeft(diff);

      // Enable resend after 60 seconds or if time left
      if (diff < 540) { // 9 minutes left means 1 minute has passed
        setCanResend(true);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  // Focus first input on mount and reset OTP when channel changes
  useEffect(() => {
    setOtp(['', '', '', '', '', '']);
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [verificationChannel]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace - move to previous input
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    // Handle Enter - submit if complete
    if (e.key === 'Enter' && otp.every(d => d !== '')) {
      handleVerify();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const newOtp = pastedData.split('').concat(Array(6 - pastedData.length).fill(''));
      setOtp(newOtp.slice(0, 6));
      // Focus last filled input or last input
      const lastFilledIndex = Math.min(pastedData.length - 1, 5);
      inputRefs.current[lastFilledIndex]?.focus();
    }
  };

  const handleVerify = () => {
    const otpValue = otp.join('');
    if (otpValue.length === 6) {
      onVerify(otpValue);
    }
  };

  const handleResend = async () => {
    if (!canResend || isResending) return;
    setCanResend(false);
    await onResend();
    // Reset OTP fields
    setOtp(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
    // Re-enable resend after 60 seconds
    setTimeout(() => setCanResend(true), 60000);
  };

  const isOtpComplete = otp.every(d => d !== '');
  const isExpired = timeLeft === 0;

  return (
    <div className="space-y-6">
      {/* Verification Progress */}
      {verifiedChannels.length > 0 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <span className="flex items-center gap-1 text-green-600">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
            {verifiedChannels[0] === 'email' ? 'Email' : 'Phone'} verified
          </span>
          <span className="text-muted-foreground">|</span>
          <span className="text-primary font-medium">
            Now verify {verificationChannel === 'email' ? 'Email' : 'Phone'}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">
          {verifiedChannels.length > 0 ? 'Verify Second Contact' : 'Enter Verification Code'}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a 6-digit code to{' '}
          <span className="font-medium text-foreground">{maskedDestination}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          via {verificationChannel === 'email' ? 'Email' : 'SMS'}
        </p>
      </div>

      {/* OTP Input */}
      <div className="flex justify-center gap-2 sm:gap-3">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleOtpChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={index === 0 ? handlePaste : undefined}
            disabled={isVerifying || isExpired}
            className={`w-11 h-14 sm:w-12 sm:h-14 text-center text-2xl font-bold rounded-lg border bg-background transition-all
              ${isExpired
                ? 'border-muted text-muted-foreground cursor-not-allowed'
                : 'border-input focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary'
              }
            `}
          />
        ))}
      </div>

      {/* Timer */}
      <div className="text-center">
        {isExpired ? (
          <p className="text-sm text-destructive font-medium">
            Code expired. Please request a new one.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Code expires in{' '}
            <span className={`font-medium ${timeLeft < 60 ? 'text-destructive' : 'text-foreground'}`}>
              {formatTime(timeLeft)}
            </span>
          </p>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Verify Button */}
      <Button
        onClick={handleVerify}
        className="w-full"
        size="lg"
        loading={isVerifying}
        disabled={!isOtpComplete || isVerifying || isExpired}
      >
        Verify Code
      </Button>

      {/* Resend Section */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Didn't receive the code?{' '}
          <button
            onClick={handleResend}
            disabled={!canResend || isResending || isExpired}
            className={`inline-flex items-center gap-1 font-medium transition-colors
              ${canResend && !isResending && !isExpired
                ? 'text-primary hover:text-primary/80 cursor-pointer'
                : 'text-muted-foreground cursor-not-allowed'
              }
            `}
          >
            <RefreshCw className={`h-3 w-3 ${isResending ? 'animate-spin' : ''}`} />
            {isResending ? 'Sending...' : 'Resend'}
          </button>
        </p>
      </div>

      {/* Back Button */}
      <Button
        onClick={onBack}
        variant="ghost"
        className="w-full"
        disabled={isVerifying}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Edit Information
      </Button>
    </div>
  );
};

export default OtpVerificationStep;
