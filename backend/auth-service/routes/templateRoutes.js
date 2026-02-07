// backend/auth-service/routes/templateRoutes.js
const express = require("express");
const router = express.Router();
const templateController = require("../controllers/templateController");
// const { authenticateAdmin } = require("../middleware/authMiddleware");

// ============================================
// Template Management Routes
// NOTE: Authentication temporarily disabled for development/testing
// ============================================

// Get all templates
router.get("/", templateController.getAllTemplates);

// Get specific template by class type and channel
router.get("/:classType/:channel", templateController.getTemplate);

// Create or update template
router.put("/:classType/:channel", templateController.upsertTemplate);

// Delete template
router.delete("/:templateId", templateController.deleteTemplate);

module.exports = router;
