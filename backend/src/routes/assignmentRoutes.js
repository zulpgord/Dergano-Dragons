const express = require('express');
const { assignShift, adminAssignUser, cancelAssignment, getUserAssignments } = require('../controllers/assignmentController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.post('/', authMiddleware, assignShift);
router.post('/admin/:shiftId', authMiddleware, adminOnly, adminAssignUser);
router.delete('/:id', authMiddleware, cancelAssignment);
router.get('/', authMiddleware, getUserAssignments);

module.exports = router;
