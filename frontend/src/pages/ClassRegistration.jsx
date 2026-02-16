import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@components/shared/Card';
import Button from '@components/shared/Button';
import { CLASS_TYPE_LABELS } from '@utils/constants';
import { ClipboardList } from 'lucide-react';

const ClassRegistration = () => {
    const navigate = useNavigate();

    const handleRegisterClick = (classType) => {
        navigate(`/signup/${classType}`);
    };

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

                {/* Manage Registrations */}
                <div className="text-center">
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={() => navigate('/my-registrations')}
                        className="gap-2"
                    >
                        <ClipboardList className="h-5 w-5" />
                        View / Manage My Registrations
                    </Button>
                </div>

                {/* Footer */}
                <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                        Need help? Contact your training administrator
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ClassRegistration;
