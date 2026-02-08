import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@components/shared/Card';
import Button from '@components/shared/Button';
import RegistrationModal from '@components/student/RegistrationModal';
import { CLASS_TYPE_LABELS } from '@utils/constants';
import { Copy, Check, ArrowLeft, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

const ClassRegistration = () => {
    const [selectedClass, setSelectedClass] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [registrationSuccess, setRegistrationSuccess] = useState(null);
    const [copied, setCopied] = useState(false);

    // Get class scheduling link from environment or use default
    const classLink = import.meta.env.VITE_CLASS_LINK || 'https://schedule.example.com';

    const handleRegisterClick = (classType) => {
        setSelectedClass(classType);
        setShowModal(true);
    };

    const handleModalClose = () => {
        setShowModal(false);
        setSelectedClass(null);
    };

    const handleRegistrationSuccess = (result, formData) => {
        setShowModal(false);
        setRegistrationSuccess({
            ...result,
            studentName: formData.name || formData.email?.split('@')[0] || 'Student',
            classType: selectedClass,
        });
    };

    const handleBackToClasses = () => {
        setRegistrationSuccess(null);
        setSelectedClass(null);
    };

    // Shorten URL for display (show domain + path hint)
    const shortenUrlForDisplay = (url) => {
        try {
            const parsed = new URL(url);
            const path = parsed.pathname.length > 15
                ? parsed.pathname.substring(0, 15) + '...'
                : parsed.pathname;
            return `${parsed.hostname}${path}`;
        } catch {
            return url.length > 40 ? url.substring(0, 40) + '...' : url;
        }
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(classLink);
            setCopied(true);
            toast.success('Link copied!');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast.error('Failed to copy');
        }
    };

    const handleOpenLink = () => {
        window.open(classLink, '_blank');
    };

    // Success Screen
    if (registrationSuccess) {
        return (
            <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
                <div className="mx-auto max-w-lg space-y-6">
                    {/* Back Button */}
                    <Button variant="ghost" onClick={handleBackToClasses}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Register for another class
                    </Button>

                    {/* Success Card */}
                    <Card>
                        <CardHeader className="text-center">
                            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                                <Check className="h-6 w-6 text-green-600" />
                            </div>
                            <CardTitle>Registration Complete!</CardTitle>
                            <CardDescription>
                                Welcome, {registrationSuccess.studentName}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Class Info */}
                            <div className="text-center rounded-lg border bg-muted/50 p-3">
                                <p className="text-xs text-muted-foreground">Registered for</p>
                                <p className="font-semibold text-foreground">
                                    {CLASS_TYPE_LABELS[registrationSuccess.classType]}
                                </p>
                            </div>

                            {/* Scheduling Link */}
                            <div className="rounded-lg border bg-muted/50 p-4">
                                <p className="text-sm font-medium text-foreground mb-2">
                                    Schedule Your Training
                                </p>
                                <p className="text-xs text-muted-foreground mb-3">
                                    Use the link below to schedule your training session:
                                </p>
                                <div className="flex items-center gap-2 rounded-lg border bg-background p-3">
                                    <span className="flex-1 text-sm font-mono text-primary truncate">
                                        {shortenUrlForDisplay(classLink)}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleCopyLink}
                                        className="shrink-0"
                                    >
                                        {copied ? (
                                            <Check className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="space-y-3">
                                <Button onClick={handleOpenLink} className="w-full">
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Open Scheduling Link
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={handleCopyLink}
                                    className="w-full"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="mr-2 h-4 w-4 text-green-500" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="mr-2 h-4 w-4" />
                                            Copy Link
                                        </>
                                    )}
                                </Button>
                            </div>

                            {/* Reminder Info */}
                            <p className="text-center text-xs text-muted-foreground">
                                You'll receive a reminder 7 days before your training
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Class Selection Grid
    return (
        <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-5xl space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        Training Registration
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Select a training class to register
                    </p>
                </div>

                {/* Class Grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(CLASS_TYPE_LABELS).map(([classType, label]) => (
                        <Card
                            key={classType}
                            className="transition-shadow hover:shadow-md"
                        >
                            <CardHeader>
                                <CardTitle className="text-base">{label}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    className="w-full"
                                    onClick={() => handleRegisterClick(classType)}
                                >
                                    Register
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Footer */}
                <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                        Need help? Contact your training administrator
                    </p>
                </div>
            </div>

            {/* Registration Modal */}
            <RegistrationModal
                isOpen={showModal}
                classType={selectedClass}
                onClose={handleModalClose}
                onSuccess={handleRegistrationSuccess}
            />
        </div>
    );
};

export default ClassRegistration;
