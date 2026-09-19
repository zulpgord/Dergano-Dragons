const express = require('express');
const { getShifts, createShift, updateShift, cancelShift, deleteShift } = require('../controllers/shiftController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, getShifts);
router.post('/', authMiddleware, adminOnly, createShift);
router.put('/:id', authMiddleware, adminOnly, updateShift);
router.patch('/:id/cancel', authMiddleware, adminOnly, cancelShift);
router.delete('/:id', authMiddleware, adminOnly, deleteShift);

module.exports = router;
