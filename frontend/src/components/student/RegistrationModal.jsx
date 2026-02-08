import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Button from '@components/shared/Button';
import { CLASS_TYPE_LABELS } from '@utils/constants';
import { createSignup } from '@services/studentService';
import toast from 'react-hot-toast';

const RegistrationModal = ({ isOpen, classType, onClose, onSuccess }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [reminderPreference, setReminderPreference] = useState('BOTH');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Show preference selector only when both email and phone are provided
    const showPreferenceSelector = email.trim() && phone.trim();

    // Auto-select preference based on what's provided
    useEffect(() => {
        if (email.trim() && !phone.trim()) {
            setReminderPreference('EMAIL');
        } else if (!email.trim() && phone.trim()) {
            setReminderPreference('SMS');
        } else if (email.trim() && phone.trim()) {
            // Keep current preference or default to BOTH
            if (reminderPreference !== 'EMAIL' && reminderPreference !== 'SMS') {
                setReminderPreference('BOTH');
            }
        }
    }, [email, phone]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email && !phone) {
            toast.error('Please provide at least email or phone number');
            return;
        }

        setIsSubmitting(true);
        try {
            const signupData = {
                classType,
                ...(name && { name: name.trim() }),
                ...(email && { email: email.trim() }),
                ...(phone && { phone: phone.trim() }),
                reminderPreference,
            };

            const result = await createSignup(signupData);
            toast.success('Registration successful!');

            // Reset form
            setName('');
            setEmail('');
            setPhone('');
            setReminderPreference('BOTH');

            onSuccess?.(result, signupData);
        } catch (error) {
            if (error.message?.includes('already exists') || error.message?.includes('unique constraint')) {
                toast.error('This email or phone is already registered');
            } else {
                toast.error(error.message || 'Failed to register');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setName('');
            setEmail('');
            setPhone('');
            setReminderPreference('BOTH');
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md mx-4 rounded-2xl bg-background p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="mb-6 flex items-start justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Register for Training</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {CLASS_TYPE_LABELS[classType]}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name */}
                    <div className="space-y-2">
                        <label htmlFor="reg-name" className="text-sm font-medium text-foreground">
                            Your Name
                        </label>
                        <input
                            id="reg-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="John Doe"
                            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <label htmlFor="reg-email" className="text-sm font-medium text-foreground">
                            Email Address
                        </label>
                        <input
                            id="reg-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                        <label htmlFor="reg-phone" className="text-sm font-medium text-foreground">
                            Phone Number
                        </label>
                        <input
                            id="reg-phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+1 (555) 123-4567"
                            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Reminder Preference - only show when both email and phone are provided */}
                    {showPreferenceSelector && (
                        <div className="space-y-3 p-4 rounded-xl border bg-muted/30">
                            <label className="text-sm font-medium text-foreground">
                                How would you like to receive reminders?
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { value: 'EMAIL', label: 'Email Only' },
                                    { value: 'SMS', label: 'SMS Only' },
                                    { value: 'BOTH', label: 'Both' },
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setReminderPreference(option.value)}
                                        disabled={isSubmitting}
                                        className={`px-4 py-2 text-sm rounded-lg border transition-all ${reminderPreference === option.value
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-background text-foreground border-input hover:bg-muted'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                        * At least email or phone is required for reminder notifications
                    </p>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1"
                        >
                            {isSubmitting ? 'Registering...' : 'Register'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RegistrationModal;
