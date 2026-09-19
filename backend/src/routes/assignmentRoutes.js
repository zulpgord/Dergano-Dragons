const express = require('express');
const { assignShift, cancelAssignment, getUserAssignments } = require('../controllers/assignmentController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/', authMiddleware, assignShift);
router.delete('/:id', authMiddleware, cancelAssignment);
router.get('/', authMiddleware, getUserAssignments);

module.exports = router;
