import { useState } from 'react';
import { X } from 'lucide-react';
import Button from '@components/shared/Button';
import PhoneInput from '@components/shared/PhoneInput';
import { CLASS_TYPES, CLASS_TYPE_LABELS } from '@utils/constants';
import { createSignup } from '@services/studentService';
import toast from 'react-hot-toast';

const AddStudentModal = ({ isOpen, onClose, onSuccess }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [classType, setClassType] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email && !phone) {
            toast.error('Please enter at least email or phone');
            return;
        }

        if (!classType) {
            toast.error('Please select a training type');
            return;
        }

        setIsSubmitting(true);
        try {
            const signupData = {
                classType,
                ...(name && { name: name.trim() }),
                ...(email && { email }),
                ...(phone && { phone }),
            };

            await createSignup(signupData);
            toast.success('Student added successfully!');

            // Reset form
            setName('');
            setEmail('');
            setPhone('');
            setClassType('');

            onSuccess?.();
            onClose();
        } catch (error) {
            toast.error(error.message || 'Failed to add student');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md rounded-lg bg-background p-6 shadow-xl">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-foreground">Add Student</h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name */}
                    <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium text-foreground">
                            Student Name
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="John Doe"
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium text-foreground">
                            Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="student@example.com"
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Phone */}
                    <PhoneInput
                        label="Phone Number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={isSubmitting}
                    />

                    {/* Training Type */}
                    <div className="space-y-2">
                        <label htmlFor="classType" className="text-sm font-medium text-foreground">
                            Training Type *
                        </label>
                        <select
                            id="classType"
                            value={classType}
                            onChange={(e) => setClassType(e.target.value)}
                            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            disabled={isSubmitting}
                            required
                        >
                            <option value="">Select training type</option>
                            {Object.entries(CLASS_TYPE_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        * At least one contact method (email or phone) is required
                    </p>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
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
                            {isSubmitting ? 'Adding...' : 'Add Student'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddStudentModal;
