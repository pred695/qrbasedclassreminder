import Button from '@components/shared/Button';
import { Card, CardContent } from '@components/shared/Card';
import Alert, { AlertDescription } from '@components/shared/Alert';
import { CLASS_TYPE_LABELS } from '@utils/constants';
import { formatPhone } from '@utils/formatters';
import { CheckCircle2 } from 'lucide-react';

const ConfirmationScreen = ({ classType, formData, onConfirm, onEdit, isSubmitting, error }) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Confirm Your Signup</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Please review your information before submitting
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          {/* Training Type */}
          <div>
            <p className="text-sm font-medium text-muted-foreground">Training Type</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {CLASS_TYPE_LABELS[classType]}
            </p>
          </div>

          {/* Name */}
          {formData.name && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p className="mt-1 font-medium text-foreground">{formData.name}</p>
            </div>
          )}

          {/* Contact Information */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-muted-foreground">Contact Information</p>
            <div className="mt-2 space-y-2">
              {formData.email && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="font-medium text-foreground">{formData.email}</span>
                </div>
              )}
              {formData.phone && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Phone</span>
                  <span className="font-medium text-foreground">
                    {formatPhone(formData.phone)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Reminder Info */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-muted-foreground">Reminder</p>
            <p className="mt-1 text-sm text-foreground">
              You will receive a reminder 7 days before your scheduled training session via{' '}
              {formData.email && formData.phone
                ? 'email and SMS'
                : formData.email
                  ? 'email'
                  : 'SMS'}
              .
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <Button
          onClick={onConfirm}
          className="flex-1"
          size="lg"
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          Confirm & Submit
        </Button>
        <Button
          onClick={onEdit}
          variant="outline"
          className="flex-1"
          size="lg"
          disabled={isSubmitting}
        >
          Edit Information
        </Button>
      </div>

      {/* Privacy Note */}
      <p className="text-center text-xs text-muted-foreground">
        Your information will be used only for sending training reminders. You can opt out at any
        time.
      </p>
    </div>
  );
};

export default ConfirmationScreen;
