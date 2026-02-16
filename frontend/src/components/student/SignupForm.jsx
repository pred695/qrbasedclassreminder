import { useState, useEffect } from 'react';
import Input from '@components/shared/Input';
import PhoneInput from '@components/shared/PhoneInput';
import Button from '@components/shared/Button';
import Alert, { AlertDescription } from '@components/shared/Alert';
import { CLASS_TYPE_LABELS } from '@utils/constants';
import Badge from '@components/shared/Badge';

const SignupForm = ({
  classType,
  formData,
  errors,
  onFormChange,
  onSubmit,
  onBack,
  isSubmitting,
}) => {
  const [contactMethod, setContactMethod] = useState('email'); // 'email' | 'phone' | 'both'

  // Clear hidden fields when contact method changes
  useEffect(() => {
    if (contactMethod === 'email' && formData.phone) {
      onFormChange('phone', ''); // Clear phone if email-only
    } else if (contactMethod === 'phone' && formData.email) {
      onFormChange('email', ''); // Clear email if phone-only
    }
  }, [contactMethod, formData.phone, formData.email, onFormChange]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Training Type Display */}
      <div className="rounded-lg bg-accent p-4">
        <p className="text-sm font-medium text-muted-foreground">Selected Training</p>
        <div className="mt-1 flex items-center gap-2">
          <p className="text-lg font-semibold text-foreground">{CLASS_TYPE_LABELS[classType]}</p>
          <Badge variant="outline" className="text-xs">
            {classType}
          </Badge>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="mt-2 text-sm text-primary hover:underline"
          disabled={isSubmitting}
        >
          Change training type
        </button>
      </div>

      {/* Contact Method Toggle */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">
          Preferred Contact Method <span className="text-destructive">*</span>
        </label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={contactMethod === 'email' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setContactMethod('email')}
            disabled={isSubmitting}
            className="flex-1"
          >
            Email
          </Button>
          <Button
            type="button"
            variant={contactMethod === 'phone' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setContactMethod('phone')}
            disabled={isSubmitting}
            className="flex-1"
          >
            Phone
          </Button>
          <Button
            type="button"
            variant={contactMethod === 'both' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setContactMethod('both')}
            disabled={isSubmitting}
            className="flex-1"
          >
            Both
          </Button>
        </div>
      </div>

      {/* Email Input */}
      {(contactMethod === 'email' || contactMethod === 'both') && (
        <Input
          type="email"
          name="email"
          label="Email Address"
          placeholder="your.email@example.com"
          value={formData.email}
          onChange={(e) => onFormChange('email', e.target.value)}
          error={errors.email}
          required={contactMethod === 'email'}
          disabled={isSubmitting}
          autoComplete="email"
          inputMode="email"
        />
      )}

      {/* Phone Input */}
      {(contactMethod === 'phone' || contactMethod === 'both') && (
        <PhoneInput
          label="Phone Number"
          value={formData.phone}
          onChange={(e) => onFormChange('phone', e.target.value)}
          error={errors.phone}
          required={contactMethod === 'phone'}
          disabled={isSubmitting}
        />
      )}

      {/* General Error */}
      {errors.contact && (
        <Alert variant="destructive">
          <AlertDescription>{errors.contact}</AlertDescription>
        </Alert>
      )}

      {/* Info Alert */}
      <Alert variant="info">
        <AlertDescription>
          You will receive a reminder 7 days before your scheduled training session.
        </AlertDescription>
      </Alert>

      {/* Submit Button */}
      <Button type="submit" className="w-full" size="lg" loading={isSubmitting} disabled={isSubmitting}>
        Continue to Confirmation
      </Button>
    </form>
  );
};

export default SignupForm;
