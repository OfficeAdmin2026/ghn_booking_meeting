const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const AuthController = require('../controllers/AuthController');

// POST /api/auth/login - Login with email
router.post('/login', AuthController.login);

// POST /api/auth/register - Register new user
router.post('/register', AuthController.register);

// GET /api/auth/me - Get current user info
router.get('/me', authMiddleware, AuthController.getCurrentUser);

// POST /api/auth/logout - Logout
router.post('/logout', authMiddleware, AuthController.logout);

// POST /api/auth/admin - Create admin account (testing only)
router.post('/admin', AuthController.createAdminForTesting);

module.exports = router;
