const express = require('express');
const { sendContact, CONTACT_EMAIL } = require('../controllers/contactController');

const router = express.Router();
router.post('/', sendContact);
// Indirizzo pubblico, per chi preferisce scrivere dalla propria casella.
router.get('/', (req, res) => res.json({ email: CONTACT_EMAIL }));
module.exports = router;
