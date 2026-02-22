import { useNavigate } from 'react-router-dom';
import Button from '@components/shared/Button';
import { Card, CardContent } from '@components/shared/Card';
import { CheckCircle2, Home } from 'lucide-react';
import { CLASS_TYPE_LABELS } from '@utils/constants';
import { formatDate } from '@utils/formatters';

const SuccessScreen = ({ signupData, onReset }) => {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Signup Successful!</h2>
        <p className="mt-2 text-muted-foreground">
          Your training registration has been confirmed
        </p>
      </div>

      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Training Type</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {CLASS_TYPE_LABELS[signupData?.signup?.classType]}
              </p>
            </div>

            {signupData?.signup?.reminderScheduledDate && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-muted-foreground">Reminder Scheduled</p>
                <p className="mt-1 text-foreground">
                  {formatDate(signupData.signup.reminderScheduledDate, 'MMM dd, yyyy hh:mm a')}
                </p>
              </div>
            )}

            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground">
                A confirmation has been sent to your provided contact information.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg bg-blue-50 p-4">
        <p className="text-sm font-medium text-blue-900">What's Next?</p>
        <ul className="mt-2 space-y-1 text-sm text-blue-800">
          <li>• You'll receive a reminder 7 days before your training</li>
          <li>• Make sure to check your email/phone for updates</li>
          <li>• You can opt out of reminders at any time</li>
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <Button onClick={() => navigate('/')} className="w-full gap-2" size="lg">
          <Home className="h-4 w-4" />
          Back to Home
        </Button>
        <Button onClick={onReset} variant="outline" className="w-full" size="lg">
          Register for Another Training
        </Button>
      </div>
    </div>
  );
};

export default SuccessScreen;
