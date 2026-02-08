import { useState } from 'react';
import { X } from 'lucide-react';
import Button from '@components/shared/Button';
import { CLASS_TYPE_LABELS } from '@utils/constants';
import { createSignup } from '@services/studentService';
import toast from 'react-hot-toast';

const RegistrationModal = ({ isOpen, classType, onClose, onSuccess }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

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
            };

            const result = await createSignup(signupData);
            toast.success('Registration successful!');

            // Reset form
            setName('');
            setEmail('');
            setPhone('');

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
            <div className="relative w-full max-w-md mx-4 rounded-2xl bg-background p-6 shadow-2xl">
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
