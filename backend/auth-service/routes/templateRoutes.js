// backend/auth-service/routes/templateRoutes.js
const express = require("express");
const router = express.Router();
const templateController = require("../controllers/templateController");
const { authenticateAdmin, requireAdmin } = require("../middleware/authMiddleware");

// ============================================
// Template Management Routes
// ============================================

// Read routes - any authenticated user (admin or staff)
router.get("/", authenticateAdmin, templateController.getAllTemplates);
router.get("/:classType/:channel", authenticateAdmin, templateController.getTemplate);

// Write routes - admin only
router.put("/:classType/:channel", authenticateAdmin, requireAdmin, templateController.upsertTemplate);
router.delete("/:templateId", authenticateAdmin, requireAdmin, templateController.deleteTemplate);

module.exports = router;
