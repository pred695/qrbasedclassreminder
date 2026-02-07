// backend/auth-service/routes/reminderRoutes.js
const express = require("express");
const router = express.Router();
const reminderController = require("../controllers/reminderController");
// const { authenticateAdmin } = require("../middleware/authMiddleware");

// ============================================
// Admin Reminder Management Routes
// NOTE: Authentication temporarily disabled for development/testing
// ============================================

// Manual send reminder
router.post("/:signupId/send", reminderController.sendReminder);

// Reschedule reminder
router.patch("/:signupId/reschedule", reminderController.rescheduleReminder);

// Reset reminder to PENDING
router.post("/:signupId/reset", reminderController.resetReminder);

// Get delivery details/logs
router.get("/:signupId/delivery", reminderController.getDeliveryDetails);

module.exports = router;
