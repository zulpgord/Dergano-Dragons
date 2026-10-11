const express = require('express');
const { getUsers, updateUserRole, updateUserName, resetUserPassword, getStats, getShiftStats, fixFutureShifts, sendUserResetLink, sendNewsletter, getNewsletterStats, sendNewsletterInvite } = require('../controllers/adminController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/users', authMiddleware, adminOnly, getUsers);
router.put('/users/:id/role', authMiddleware, adminOnly, updateUserRole);
router.put('/users/:id/name', authMiddleware, adminOnly, updateUserName);
router.put('/users/:id/password', authMiddleware, adminOnly, resetUserPassword);
router.post('/users/:id/reset-link', authMiddleware, adminOnly, sendUserResetLink);
router.get('/newsletter', authMiddleware, adminOnly, getNewsletterStats);
router.post('/newsletter', authMiddleware, adminOnly, sendNewsletter);
router.post('/newsletter/invite', authMiddleware, adminOnly, sendNewsletterInvite);
router.get('/stats', authMiddleware, adminOnly, getStats);
router.get('/shift-stats', authMiddleware, adminOnly, getShiftStats);
router.post('/fix-shifts', authMiddleware, adminOnly, fixFutureShifts);

module.exports = router;
