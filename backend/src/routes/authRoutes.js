const express = require('express');
const { acceptPrivacy, register, login, getUsers, updateUserRole, deleteMyAccount, forgotPassword, resetPassword, changePassword, getMe, setNewsletter, unsubscribe, subscribe } = require('../controllers/authController');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/users', authMiddleware, adminOnly, getUsers);
router.put('/users/:id/role', authMiddleware, adminOnly, updateUserRole);
router.delete('/me', authMiddleware, deleteMyAccount);
router.get('/me', authMiddleware, getMe);
router.post('/me/privacy', authMiddleware, acceptPrivacy);
router.put('/me/newsletter', authMiddleware, setNewsletter);
router.put('/me/password', authMiddleware, changePassword);
router.post('/forgot', forgotPassword);
router.post('/reset', resetPassword);
router.get('/unsubscribe', unsubscribe);
router.get('/subscribe', subscribe);

module.exports = router;
