const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const AuthController = require('../controllers/AuthController');

// Giới hạn rộng rãi (nhiều nhân viên có thể chung 1 IP NAT văn phòng) — chỉ để chặn dò vét
// MSNV hàng loạt, không cản người dùng bình thường gõ nhầm vài lần.
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { status: 429, message: 'Quá nhiều lượt thử đăng nhập, vui lòng thử lại sau ít phút.' } },
});

// POST /api/auth/login - Login with email
router.post('/login', loginLimiter, AuthController.login);

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

module.exports = router;
