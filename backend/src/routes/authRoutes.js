const express = require('express');
const router = express.Router();
const { login, register, googleLogin, getMe } = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/google
router.post('/google', googleLogin);

// GET /api/auth/me
router.get('/me', authenticate, getMe);

module.exports = router;
