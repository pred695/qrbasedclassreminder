import { useState, useEffect } from 'react';
import Modal, { ModalFooter } from '@components/shared/Modal';
import Button from '@components/shared/Button';
import Badge from '@components/shared/Badge';
import Input from '@components/shared/Input';
import { formatDate, formatEmail, formatPhone, getClassTypeLabel, getStatusColor } from '@utils/formatters';
import { Mail, Phone, Send, RotateCcw, Calendar, Trash2, UserX } from 'lucide-react';
import useReminderStore from '@store/reminderStore';
import { deleteSignup, deleteStudent } from '@services/adminService';
import toast from 'react-hot-toast';

const ReminderDetailModal = ({ isOpen, onClose, signup, onRefresh }) => {
  const [deliveryLogs, setDeliveryLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDeleteSignup, setConfirmDeleteSignup] = useState(false);
  const [confirmDeleteStudent, setConfirmDeleteStudent] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { sendReminderAsync, rescheduleReminderAsync, resetReminderAsync, fetchDeliveryDetails, sendingReminders } = useReminderStore();

  const isSending = signup ? sendingReminders.includes(signup.id) : false;

  useEffect(() => {
    if (isOpen && signup) {
      loadDeliveryDetails();
      setIsRescheduling(false);
      setConfirmReset(false);
      setConfirmDeleteSignup(false);
      setConfirmDeleteStudent(false);
      setNewDate('');
    }
  }, [isOpen, signup?.id]);

  const loadDeliveryDetails = async () => {
    if (!signup) return;
    setIsLoadingLogs(true);
    try {
      const details = await fetchDeliveryDetails(signup.id);
      setDeliveryLogs(details?.deliveryLogs || []);
    } catch {
      setDeliveryLogs([]);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleSendReminder = async () => {
    try {
      await sendReminderAsync(signup.id);
      toast.success('Reminder sent successfully');
      onRefresh?.();
      loadDeliveryDetails();
    } catch (error) {
      toast.error(`Failed to send reminder: ${error.message}`);
    }
  };

  const handleReschedule = async () => {
    if (!newDate) {
      toast.error('Please select a date');
      return;
    }
    try {
      await rescheduleReminderAsync(signup.id, newDate);
      toast.success('Reminder rescheduled successfully');
      setIsRescheduling(false);
      setNewDate('');
      onRefresh?.();
    } catch (error) {
      toast.error(`Failed to reschedule: ${error.message}`);
    }
  };

  const handleReset = async () => {
    try {
      await resetReminderAsync(signup.id);
      toast.success('Reminder reset to pending');
      setConfirmReset(false);
      onRefresh?.();
      loadDeliveryDetails();
    } catch (error) {
      toast.error(`Failed to reset: ${error.message}`);
    }
  };

  const handleDeleteSignup = async () => {
    setIsDeleting(true);
    try {
      await deleteSignup(signup.id);
      toast.success('Registration deleted successfully');
      setConfirmDeleteSignup(false);
      onRefresh?.();
      onClose();
    } catch (error) {
      toast.error(`Failed to delete: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteStudent = async () => {
    setIsDeleting(true);
    try {
      await deleteStudent(signup.student?.id);
      toast.success('Student and all registrations deleted');
      setConfirmDeleteStudent(false);
      onRefresh?.();
      onClose();
    } catch (error) {
      toast.error(`Failed to delete: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!signup) return null;

  const student = signup.student;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reminder Details" size="lg">
      <div className="space-y-5">
        {/* Student Info */}
        <div className="rounded-md border p-4">
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase">Student Contact</h3>
          <div className="space-y-1.5">
            {student?.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{student.email}</span>
                {student.optedOutEmail && <Badge variant="warning">Opted Out</Badge>}
              </div>
            )}
            {student?.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{formatPhone(student.phone)}</span>
                {student.optedOutSms && <Badge variant="warning">Opted Out</Badge>}
              </div>
            )}
          </div>
        </div>

        {/* Signup Details */}
        <div className="rounded-md border p-4">
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase">Signup Info</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Training Type:</span>
              <p className="font-medium">{getClassTypeLabel(signup.classType)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>
              <div className="mt-0.5">
                <Badge className={getStatusColor(signup.status)}>{signup.status}</Badge>
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Scheduled Date:</span>
              <p className="font-medium">{formatDate(signup.reminderScheduledDate, 'MMM dd, yyyy')}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Sent At:</span>
              <p className="font-medium">
                {signup.reminderSentAt
                  ? formatDate(signup.reminderSentAt, 'MMM dd, yyyy hh:mm a')
                  : 'Not sent yet'}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Signup Date:</span>
              <p className="font-medium">{formatDate(signup.createdAt, 'MMM dd, yyyy')}</p>
            </div>
          </div>
        </div>

        {/* Delivery Logs */}
        <div className="rounded-md border p-4">
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase">Delivery History</h3>
          {isLoadingLogs ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : deliveryLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No delivery attempts yet</p>
          ) : (
            <div className="space-y-2">
              {deliveryLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded bg-muted/50 px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    {log.channel === 'EMAIL' ? (
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className="font-medium">{log.channel}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={log.status === 'SENT' || log.status === 'DELIVERED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {log.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(log.createdAt, 'MMM dd, yyyy hh:mm a')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reschedule Section */}
        {isRescheduling && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
            <h3 className="mb-2 text-sm font-semibold">Reschedule Reminder</h3>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  type="datetime-local"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  label="New Date"
                />
              </div>
              <Button size="sm" onClick={handleReschedule}>Save</Button>
              <Button variant="ghost" size="sm" onClick={() => setIsRescheduling(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Reset Confirmation */}
        {confirmReset && (
          <div className="rounded-md border border-orange-200 bg-orange-50 p-4">
            <p className="mb-2 text-sm">Are you sure you want to reset this reminder? This will clear all delivery logs and set the status back to PENDING.</p>
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={handleReset}>Yes, Reset</Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Delete Signup Confirmation */}
        {confirmDeleteSignup && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4">
            <p className="mb-2 text-sm font-medium text-red-800">Delete this registration?</p>
            <p className="mb-3 text-sm text-red-700">This will permanently delete this signup and all its delivery logs. This cannot be undone.</p>
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={handleDeleteSignup} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Yes, Delete Registration'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteSignup(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Delete Student Confirmation */}
        {confirmDeleteStudent && (
          <div className="rounded-md border border-red-300 bg-red-50 p-4">
            <p className="mb-2 text-sm font-medium text-red-800">Delete this student entirely?</p>
            <p className="mb-3 text-sm text-red-700">
              This will permanently delete the student ({student?.email || student?.phone}) and <strong>ALL</strong> their registrations. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={handleDeleteStudent} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Yes, Delete Student'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteStudent(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>

      <ModalFooter>
        {(signup.status === 'PENDING' || signup.status === 'FAILED') && (
          <Button onClick={handleSendReminder} disabled={isSending}>
            {isSending ? (
              <span className="flex items-center gap-1">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending...
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Send className="h-4 w-4" />
                Send Now
              </span>
            )}
          </Button>
        )}
        {!isRescheduling && (
          <Button variant="outline" onClick={() => setIsRescheduling(true)}>
            <Calendar className="mr-1 h-4 w-4" />
            Reschedule
          </Button>
        )}
        {!confirmReset && (
          <Button variant="outline" onClick={() => setConfirmReset(true)}>
            <RotateCcw className="mr-1 h-4 w-4" />
            Reset
          </Button>
        )}
        {!confirmDeleteSignup && !confirmDeleteStudent && (
          <Button variant="outline" onClick={() => setConfirmDeleteSignup(true)} className="text-destructive border-destructive/50 hover:bg-destructive/10">
            <Trash2 className="mr-1 h-4 w-4" />
            Delete Registration
          </Button>
        )}
        {!confirmDeleteStudent && !confirmDeleteSignup && signup?.student?.id && (
          <Button variant="outline" onClick={() => setConfirmDeleteStudent(true)} className="text-destructive border-destructive/50 hover:bg-destructive/10">
            <UserX className="mr-1 h-4 w-4" />
            Delete Student
          </Button>
        )}
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </ModalFooter>
    </Modal>
  );
};

export default ReminderDetailModal;
