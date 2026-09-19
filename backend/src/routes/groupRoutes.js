const express = require('express');
const { getGroups, createGroup, deleteGroup, setGroupMembers } = require('../controllers/groupController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, adminOnly, getGroups);
router.post('/', authMiddleware, adminOnly, createGroup);
router.delete('/:id', authMiddleware, adminOnly, deleteGroup);
router.put('/:id/members', authMiddleware, adminOnly, setGroupMembers);

module.exports = router;
