import { Mail, Phone } from 'lucide-react';
import Button from '@components/shared/Button';
import { Card, CardContent } from '@components/shared/Card';

/**
 * Component for selecting verification method when both email and phone are provided
 */
const VerificationMethodSelector = ({
  email,
  phone,
  selectedChannel,
  onSelectChannel,
  onContinue,
  onBack,
  isLoading,
}) => {
  // Mask email for display (e.g., "u***@example.com")
  const maskEmail = (email) => {
    if (!email) return '';
    const [local, domain] = email.split('@');
    return `${local.charAt(0)}***@${domain}`;
  };

  // Mask phone for display (e.g., "***-***-7890")
  const maskPhone = (phone) => {
    if (!phone) return '';
    const last4 = phone.slice(-4);
    return `***-***-${last4}`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">Verify Your Contact</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose how you'd like to receive your verification code
        </p>
      </div>

      <div className="space-y-3">
        {/* Email Option */}
        {email && (
          <Card
            className={`cursor-pointer transition-all ${
              selectedChannel === 'email'
                ? 'ring-2 ring-primary border-primary'
                : 'hover:border-primary/50'
            }`}
            onClick={() => onSelectChannel('email')}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div
                className={`rounded-full p-3 ${
                  selectedChannel === 'email' ? 'bg-primary/20' : 'bg-muted'
                }`}
              >
                <Mail
                  className={`h-5 w-5 ${
                    selectedChannel === 'email' ? 'text-primary' : 'text-muted-foreground'
                  }`}
                />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">Email</p>
                <p className="text-sm text-muted-foreground">{maskEmail(email)}</p>
              </div>
              <div
                className={`h-5 w-5 rounded-full border-2 ${
                  selectedChannel === 'email'
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground'
                }`}
              >
                {selectedChannel === 'email' && (
                  <div className="h-full w-full flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-white" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Phone Option */}
        {phone && (
          <Card
            className={`cursor-pointer transition-all ${
              selectedChannel === 'phone'
                ? 'ring-2 ring-primary border-primary'
                : 'hover:border-primary/50'
            }`}
            onClick={() => onSelectChannel('phone')}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div
                className={`rounded-full p-3 ${
                  selectedChannel === 'phone' ? 'bg-primary/20' : 'bg-muted'
                }`}
              >
                <Phone
                  className={`h-5 w-5 ${
                    selectedChannel === 'phone' ? 'text-primary' : 'text-muted-foreground'
                  }`}
                />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">SMS</p>
                <p className="text-sm text-muted-foreground">{maskPhone(phone)}</p>
              </div>
              <div
                className={`h-5 w-5 rounded-full border-2 ${
                  selectedChannel === 'phone'
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground'
                }`}
              >
                {selectedChannel === 'phone' && (
                  <div className="h-full w-full flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-white" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <Button
          onClick={onContinue}
          className="flex-1"
          size="lg"
          loading={isLoading}
          disabled={!selectedChannel || isLoading}
        >
          Send Verification Code
        </Button>
        <Button
          onClick={onBack}
          variant="outline"
          className="flex-1"
          size="lg"
          disabled={isLoading}
        >
          Back
        </Button>
      </div>
    </div>
  );
};

export default VerificationMethodSelector;
