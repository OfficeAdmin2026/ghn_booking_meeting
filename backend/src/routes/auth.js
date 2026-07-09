const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const AuthController = require('../controllers/AuthController');

// POST /api/auth/google - Login with Google Sign-In (production)
router.post('/google', AuthController.googleLogin);

// POST /api/auth/login - Login with email only (dev only, disabled in production)
router.post('/login', AuthController.login);

// GET /api/auth/me - Get current user info
router.get('/me', authMiddleware, AuthController.getCurrentUser);

// POST /api/auth/logout - Logout
router.post('/logout', authMiddleware, AuthController.logout);

// POST /api/auth/admin - Create admin account (testing only)
router.post('/admin', AuthController.createAdminForTesting);

module.exports = router;
