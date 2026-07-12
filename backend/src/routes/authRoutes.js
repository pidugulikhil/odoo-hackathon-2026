const express = require('express');
const router = express.Router();
const { login, getMe } = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/me
router.get('/me', authenticate, getMe);

module.exports = router;
