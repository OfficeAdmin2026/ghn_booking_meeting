const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const AuthController = require('../controllers/AuthController');

// POST /api/auth/login - Login with email
router.post('/login', AuthController.login);

// GET /api/auth/sso/status - Frontend check nếu SSO đã bật
router.get('/sso/status', AuthController.ssoStatus);

// GET /api/auth/sso/login - Redirect sang GHN SSO
router.get('/sso/login', AuthController.ssoLogin);

// GET /api/auth/sso/callback - GHN SSO redirect về đây sau khi user đăng nhập
router.get('/sso/callback', AuthController.ssoCallback);

// POST /api/auth/register - Register new user
router.post('/register', AuthController.register);

// GET /api/auth/me - Get current user info
router.get('/me', authMiddleware, AuthController.getCurrentUser);

// POST /api/auth/logout - Logout
router.post('/logout', authMiddleware, AuthController.logout);

// POST /api/auth/admin - Create admin account (testing only)
router.post('/admin', AuthController.createAdminForTesting);

module.exports = router;
