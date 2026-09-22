const express = require('express');
const { getContent, updateContent } = require('../controllers/contentController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/:key', getContent);
router.put('/:key', authMiddleware, adminOnly, updateContent);

module.exports = router;
