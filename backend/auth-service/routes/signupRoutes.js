// backend/auth-service/routes/signupRoutes.js
const express = require("express");
const router = express.Router();
const signupController = require("../controllers/signupController");
const { authenticateAdmin, requireSuperAdmin } = require("../middleware/authMiddleware");

// ============================================
// Admin Signup Management Routes
// NOTE: Authentication temporarily disabled for development/testing
// TODO: Re-enable authentication when admin login UI is implemented
// ============================================

// Get signup statistics (before :signupId to avoid conflict)
router.get("/stats", signupController.getStats); // authenticateAdmin removed temporarily

// List all signups with filters/pagination
router.get("/", signupController.getAllSignups); // authenticateAdmin removed temporarily

// Delete student and all their registrations (before :signupId to avoid conflict)
router.delete("/student/:studentId", signupController.deleteStudent); // authenticateAdmin removed temporarily

// Get specific signup by ID
router.get("/:signupId", signupController.getSignupById); // authenticateAdmin removed temporarily

// Update signup
router.patch("/:signupId", signupController.updateSignup); // authenticateAdmin removed temporarily

// Delete signup (Admin only for safety)
router.delete("/:signupId", signupController.deleteSignup); // authenticateAdmin and requireAdmin removed temporarily

module.exports = router;
