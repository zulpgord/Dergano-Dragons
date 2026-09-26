const express = require('express');
const {
  getSheets, downloadSheet, updateSheet,
  setSheetGroups, setSheetUsers, bulkVisibility,
} = require('../controllers/sheetController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Eroi
router.get('/', authMiddleware, getSheets);
router.get('/:slug/download', authMiddleware, downloadSheet);

// Admin
router.post('/bulk-visibility', authMiddleware, adminOnly, bulkVisibility);
router.put('/:id', authMiddleware, adminOnly, updateSheet);
router.put('/:id/groups', authMiddleware, adminOnly, setSheetGroups);
router.put('/:id/users', authMiddleware, adminOnly, setSheetUsers);

module.exports = router;
