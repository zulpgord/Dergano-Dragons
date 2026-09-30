const express = require('express');
const { register, login, getUsers, updateUserRole, deleteMyAccount } = require('../controllers/authController');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/users', authMiddleware, adminOnly, getUsers);
router.put('/users/:id/role', authMiddleware, adminOnly, updateUserRole);
router.delete('/me', authMiddleware, deleteMyAccount);

module.exports = router;
