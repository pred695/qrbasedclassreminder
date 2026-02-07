# Automated Reminder System - Implementation Plan

## Context

Students sign up for training classes (firearms, CPR, etc.) and need to be reminded to re-register/renew after a class-specific interval. Currently, `CLASS_REMINDER_INTERVALS` is hardcoded to 7 days for all types. This plan implements:
- Auto-scheduled reminders (4-11 months after signup, based on class type)
- Background cron job to send reminders automatically when due
- Manual "Send Reminder" button for admins in the dashboard
- Admin ability to edit/reschedule/reset reminder dates
- Dual-channel delivery (Email via nodemailer + SMS via Twilio)
- Delivery tracking via existing `DeliveryLog` model

**No Prisma schema changes needed** - all required models already exist (Signup, DeliveryLog, MessageTemplate, Student).

---

## Reminder Intervals by Class Type

| Class Type | Enum | Reminder After Signup |
|------------|------|----------------------|
| Initial Firearms | TYPE_1 | 4 months |
| Firearms Requalification | TYPE_2 | 5 months |
| CPR/AED & First Aid | TYPE_3 | 11 months |
| Handcuffing / Pepper Spray | TYPE_4 | 11 months |
| CEW / Taser | TYPE_5 | 11 months |
| Baton | TYPE_6 | 11 months |

---

## Phase 1: Backend - Update Reminder Intervals

### 1.1 Update `backend/auth-service/services/studentService.js`
- Change `CLASS_REMINDER_INTERVALS` from days to months:
  - TYPE_1: 4, TYPE_2: 5, TYPE_3-6: 11
- Update `calculateReminderDate()` to use `setMonth()` instead of day-based math

### 1.2 Update `frontend/src/utils/constants.js`
- Mirror the same month-based intervals in `CLASS_REMINDER_INTERVALS`

---

## Phase 2: Backend - Email & SMS Services

### 2.1 Create `backend/auth-service/services/emailService.js`
- Configure nodemailer with Gmail SMTP (already installed)
- Export `sendEmail({ to, subject, body, html })` returning `{ success, messageId, error? }`
- Gracefully handle missing `GMAIL_ADDRESS`/`GMAIL_PASSWORD` (warn, don't crash)

### 2.2 Create `backend/auth-service/services/smsService.js`
- Install `twilio` package: `npm install twilio`
- Export `sendSms({ to, body })` returning `{ success, messageId, error? }`
- Gracefully handle missing Twilio credentials (warn, don't crash)

---

## Phase 3: Backend - New Repositories

### 3.1 Create `backend/auth-service/repositories/deliveryLogRepository.js`
- Follow existing repository pattern (singleton DB access, field selections)
- Functions: `createDeliveryLog()`, `findBySignupId()`, `updateStatus()`, `deleteBySignupId()`

### 3.2 Create `backend/auth-service/repositories/templateRepository.js`
- Functions: `findByClassTypeAndChannel()`, `findAllTemplates()`, `upsertTemplate()`, `deleteTemplate()`
- Leverage existing `@@unique([classType, channel])` constraint

---

## Phase 4: Backend - Reminder Orchestration Service

### 4.1 Create `backend/auth-service/services/reminderService.js`
Core orchestrator that ties together templates, sending, logging, and status updates.

**Functions:**
- `sendReminder(signupId)` - Send reminder for a single signup (both EMAIL + SMS)
  1. Fetch signup with student data via `signupRepository.findById()`
  2. Check student opt-out preferences (skip opted-out channels)
  3. Fetch templates via `templateRepository.findByClassTypeAndChannel()`
  4. Interpolate template variables (`{{classTypeName}}`, `{{scheduleLink}}`, etc.)
  5. Attempt email if student has email and not opted out -> create DeliveryLog
  6. Attempt SMS if student has phone and not opted out -> create DeliveryLog
  7. Overall status: SENT if at least one channel succeeded, FAILED if both failed
  8. Update signup via `signupRepository.updateReminderStatus()`

- `processPendingReminders()` - Called by cron job
  1. Find all pending reminders due via `signupRepository.findPendingReminders()`
  2. Call `sendReminder()` for each
  3. Return summary `{ processed, sent, failed }`

- `rescheduleReminder(signupId, newDate)` - Admin reschedules
  1. Update `reminderScheduledDate` and reset status to PENDING

- `resetReminder(signupId)` - Admin resets
  1. Delete delivery logs, reset status to PENDING, clear `reminderSentAt`

- `getDeliveryDetails(signupId)` - Admin views delivery history

**Template interpolation utility:**
```javascript
const interpolateTemplate = (template, variables) => {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
};
```

---

## Phase 5: Backend - Controller, Routes, Registration

### 5.1 Create `backend/auth-service/controllers/reminderController.js`
Follow existing controller pattern (import service, use `createSuccessResponse`/`createErrorResponse`).

### 5.2 Create `backend/auth-service/routes/reminderRoutes.js`
**Endpoints:**
- `POST /:signupId/send` - Manual send reminder
- `PATCH /:signupId/reschedule` - Reschedule reminder (body: `{ reminderScheduledDate }`)
- `POST /:signupId/reset` - Reset reminder to PENDING
- `GET /:signupId/delivery` - Get delivery details/logs

### 5.3 Modify `backend/auth-service/server.js`
- Import and register routes: `app.use("/api/admin/reminders", reminderRoutes)`

---

## Phase 6: Backend - Cron Job

### 6.1 Install `node-cron`: `npm install node-cron`

### 6.2 Create `backend/auth-service/jobs/reminderCron.js`
- Schedule via `REMINDER_CRON_SCHEDULE` env var (default: `0 8 * * *` = daily 8 AM)
- Calls `reminderService.processPendingReminders()` on each tick
- Log summary after each run

### 6.3 Modify `backend/auth-service/server.js`
- Import and call `startReminderCron()` inside `startServer()` after DB init

---

## Phase 7: Backend - Template Seeding

### 7.1 Create `backend/auth-service/lib/seedTemplates.js`
- Seed 12 templates (6 class types x 2 channels)
- Email templates: subject + HTML body with `{{classTypeName}}`, `{{scheduleLink}}`, `{{optOutLink}}`
- SMS templates: short body with same variables
- Use `upsert` to be idempotent

---

## Phase 8: Frontend - API Service Layer

### 8.1 Modify `frontend/src/services/adminService.js`
Add functions:
- `sendReminder(signupId)` -> `POST /api/admin/reminders/:signupId/send`
- `rescheduleReminder(signupId, newDate)` -> `PATCH /api/admin/reminders/:signupId/reschedule`
- `resetReminder(signupId)` -> `POST /api/admin/reminders/:signupId/reset`
- `getDeliveryDetails(signupId)` -> `GET /api/admin/reminders/:signupId/delivery`

---

## Phase 9: Frontend - Store Updates

### 9.1 Modify `frontend/src/store/reminderStore.js`
Wire existing state shape to real API calls:
- `sendReminderAsync(signupId)` - calls API, manages sending/sent/failed state
- `rescheduleReminderAsync(signupId, newDate)` - calls API
- `resetReminderAsync(signupId)` - calls API
- `fetchDeliveryDetails(signupId)` - calls API, stores in `deliveryDetails` map

---

## Phase 10: Frontend - SignupsTable Actions

### 10.1 Modify `frontend/src/components/admin/SignupsTable.jsx`
Replace "View" button placeholder with:
- **"Send" button** (for PENDING/FAILED signups) - with loading spinner during send
- **Status badge** (for SENT signups) - green "Sent" badge
- **"..." menu button** - opens detail modal for reschedule/reset/view delivery logs

New props: `onSendReminder`, `onViewDetails`, `sendingReminders`

---

## Phase 11: Frontend - Reminder Detail Modal

### 11.1 Create `frontend/src/components/admin/ReminderDetailModal.jsx`
Uses existing `Modal`, `Button`, `Badge`, `Input` components.

**Content:**
- Student contact info (email, phone)
- Class type + current status badge
- Scheduled date + sent date
- Delivery logs table (channel, status, timestamp, error if any)
- **Action buttons:**
  - "Send Now" (if PENDING or FAILED)
  - "Reschedule" (date picker using `<Input type="datetime-local" />`)
  - "Reset to Pending" (with confirmation)

---

## Phase 12: Frontend - Dashboard Integration

### 12.1 Modify `frontend/src/pages/AdminDashboard.jsx`
- Add state for detail modal (`selectedSignup`, `isDetailModalOpen`)
- Wire `handleSendReminder` with toast notifications + data refresh
- Wire `handleViewDetails` to open modal
- Pass new props to `SignupsTable`
- Render `ReminderDetailModal`
- Add "Pending Reminders" stat card to dashboard header

---

## New Environment Variables (for Render)

```bash
# Email (Gmail SMTP)
GMAIL_ADDRESS=your-email@gmail.com
GMAIL_PASSWORD=your-gmail-app-password

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890

# Cron Schedule (default: daily at 8 AM)
REMINDER_CRON_SCHEDULE=0 8 * * *

# App URL (for opt-out links in templates)
APP_BASE_URL=https://qrbasedclassreminder-g9oe.vercel.app
```

---

## File Summary

### New Files (10):
| File | Purpose |
|------|---------|
| `backend/auth-service/services/emailService.js` | Nodemailer email sending |
| `backend/auth-service/services/smsService.js` | Twilio SMS sending |
| `backend/auth-service/services/reminderService.js` | Reminder orchestration |
| `backend/auth-service/repositories/deliveryLogRepository.js` | DeliveryLog CRUD |
| `backend/auth-service/repositories/templateRepository.js` | MessageTemplate CRUD |
| `backend/auth-service/controllers/reminderController.js` | HTTP handlers |
| `backend/auth-service/routes/reminderRoutes.js` | Express routes |
| `backend/auth-service/jobs/reminderCron.js` | Cron scheduler |
| `backend/auth-service/lib/seedTemplates.js` | Template seed data |
| `frontend/src/components/admin/ReminderDetailModal.jsx` | Detail/action modal |

### Modified Files (9):
| File | Changes |
|------|---------|
| `backend/auth-service/services/studentService.js` | Update intervals to months, fix `calculateReminderDate()` |
| `backend/auth-service/server.js` | Register reminder routes, start cron job |
| `backend/auth-service/package.json` | Add `twilio`, `node-cron` |
| `frontend/src/utils/constants.js` | Update `CLASS_REMINDER_INTERVALS` to months |
| `frontend/src/services/adminService.js` | Add 4 reminder API functions |
| `frontend/src/store/reminderStore.js` | Add async API-connected actions |
| `frontend/src/components/admin/SignupsTable.jsx` | Replace View with Send/Actions buttons |
| `frontend/src/pages/AdminDashboard.jsx` | Wire modal, send handler, stat card |
| `.env.example` | Add Twilio + cron env vars |

---

## Implementation Order

**Backend first (steps 1-12), then frontend (steps 13-18):**

1. `npm install twilio node-cron`
2. Update `CLASS_REMINDER_INTERVALS` (studentService.js)
3. Create `deliveryLogRepository.js`
4. Create `templateRepository.js`
5. Create `emailService.js`
6. Create `smsService.js`
7. Create `reminderService.js` (depends on 3-6)
8. Create `reminderController.js` (depends on 7)
9. Create `reminderRoutes.js` (depends on 8)
10. Create `reminderCron.js` (depends on 7)
11. Modify `server.js` (depends on 9-10)
12. Create + run `seedTemplates.js`
13. Update frontend `constants.js`
14. Add API functions to `adminService.js`
15. Update `reminderStore.js` (depends on 14)
16. Create `ReminderDetailModal.jsx` (depends on 15)
17. Modify `SignupsTable.jsx` (depends on 15)
18. Modify `AdminDashboard.jsx` (depends on 16-17)

---

## Verification Checklist

1. **Signup test**: Create signup via `POST /api/students/signup`, verify `reminderScheduledDate` is months in the future
2. **Manual send**: Call `POST /api/admin/reminders/{id}/send`, verify DeliveryLog created + status changes to SENT
3. **Reschedule**: Call `PATCH /api/admin/reminders/{id}/reschedule`, verify date updates + status resets to PENDING
4. **Reset**: Call `POST /api/admin/reminders/{id}/reset`, verify logs cleared + status PENDING
5. **Cron test**: Set `REMINDER_CRON_SCHEDULE=*/1 * * * *`, create signup with past reminder date, verify auto-sent
6. **Opt-out**: Set `optedOutEmail=true`, send reminder, verify only SMS attempted
7. **Frontend**: Verify Send button, detail modal, reschedule, and reset all work in admin dashboard

---

## Key Architectural Decisions

1. **node-cron in-process**: Runs inside the same Express process. Appropriate for Render Docker deployment with modest volume. Can migrate to BullMQ/Redis if scaling is needed later.
2. **Both channels per reminder**: EMAIL and SMS attempted independently. Overall status is SENT if at least one succeeds.
3. **Template-based messages**: Uses existing `MessageTemplate` model with `{{variable}}` interpolation. Editable via TemplateManager page without code changes.
4. **Graceful degradation**: Email/SMS services warn but don't crash if credentials are missing, allowing dev/testing without provider accounts.
5. **Existing models reused**: No schema migration needed - `DeliveryLog`, `MessageTemplate`, `Signup` already have all required fields.
