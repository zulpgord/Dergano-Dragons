const express = require('express');
const { register, login, makeAdmin, getUsers, updateUserRole, resetPassword } = require('../controllers/authController');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/make-admin', makeAdmin);
router.post('/reset-password', resetPassword);
router.get('/users', authMiddleware, adminOnly, getUsers);
router.put('/users/:id/role', authMiddleware, adminOnly, updateUserRole);

module.exports = router;
