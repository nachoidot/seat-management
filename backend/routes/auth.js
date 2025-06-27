const express = require('express');
const { login, getMe, logout, changePassword } = require('../controllers/auth');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/logout', logout);
router.put('/change-password', protect, changePassword);

module.exports = router; 