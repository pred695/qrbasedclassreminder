import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@components/shared/Table';
import Badge from '@components/shared/Badge';
import Button from '@components/shared/Button';
import { formatDate, formatEmail, formatPhone, getClassTypeLabel } from '@utils/formatters';
import { getStatusColor } from '@utils/formatters';
import { ArrowUpDown, Mail, Phone, Send, MoreHorizontal } from 'lucide-react';
import clsx from 'clsx';

const SignupsTable = ({
  signups,
  sortConfig,
  onSort,
  onSelectSignup,
  selectedSignupIds,
  onSelectAll,
  onSendReminder,
  onViewDetails,
  sendingReminders = [],
}) => {
  const handleSort = (field) => {
    onSort(field);
  };

  const SortButton = ({ field, children }) => {
    const isActive = sortConfig.field === field;
    return (
      <button
        onClick={() => handleSort(field)}
        className="flex items-center gap-1 hover:text-foreground"
      >
        {children}
        <ArrowUpDown
          className={clsx('h-4 w-4', isActive ? 'text-primary' : 'text-muted-foreground')}
        />
      </button>
    );
  };

  if (signups.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center">
        <p className="text-muted-foreground">No signups found</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={signups.length > 0 && signups.every((s) => selectedSignupIds?.includes(s.id))}
                onChange={(e) => {
                  onSelectAll?.(e.target.checked);
                }}
              />
            </TableHead>
            <TableHead>
              <SortButton field="student.email">Contact</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="classType">Training Type</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="status">Status</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="reminderScheduledDate">Reminder Date</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="reminderSentAt">Sent At</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="createdAt">Signup Date</SortButton>
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {signups.map((signup) => {
            const isSending = sendingReminders.includes(signup.id);

            return (
              <TableRow key={signup.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={selectedSignupIds?.includes(signup.id)}
                    onChange={() => onSelectSignup?.(signup.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {/* Student Name */}
                    <div className="font-medium text-foreground">
                      {signup.student?.name ||
                        (signup.student?.email ? signup.student.email.split('@')[0] :
                          signup.student?.phone || 'Unknown')}
                    </div>
                    {/* Contact Info */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {signup.student?.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span>{formatEmail(signup.student.email)}</span>
                        </div>
                      )}
                      {signup.student?.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span>{formatPhone(signup.student.phone)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm font-medium">{getClassTypeLabel(signup.classType)}</span>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(signup.status)}>{signup.status}</Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {formatDate(signup.reminderScheduledDate, 'MMM dd, yyyy')}
                </TableCell>
                <TableCell className="text-sm">
                  {signup.reminderSentAt ? (
                    <span className="text-green-600">
                      {formatDate(signup.reminderSentAt, 'MMM dd, yyyy')}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Not sent</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(signup.createdAt, 'MMM dd, yyyy')}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {(signup.status === 'PENDING' || signup.status === 'FAILED') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onSendReminder?.(signup.id)}
                        disabled={isSending}
                      >
                        {isSending ? (
                          <span className="flex items-center gap-1">
                            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Sending
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Send className="h-3.5 w-3.5" />
                            Send
                          </span>
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails?.(signup)}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default SignupsTable;
