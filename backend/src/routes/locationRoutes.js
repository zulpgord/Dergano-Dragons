const express = require('express');
const { getLocations, createLocation, updateLocation } = require('../controllers/locationController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, getLocations);
router.post('/', authMiddleware, adminOnly, createLocation);
router.put('/:id', authMiddleware, adminOnly, updateLocation);

module.exports = router;
