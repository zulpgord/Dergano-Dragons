const express = require('express');
const { getGroups, createGroup, deleteGroup, setGroupMembers, sendGroupEmail } = require('../controllers/groupController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, adminOnly, getGroups);
router.post('/', authMiddleware, adminOnly, createGroup);
router.delete('/:id', authMiddleware, adminOnly, deleteGroup);
router.put('/:id/members', authMiddleware, adminOnly, setGroupMembers);
router.post('/:id/email', authMiddleware, adminOnly, sendGroupEmail);

module.exports = router;
