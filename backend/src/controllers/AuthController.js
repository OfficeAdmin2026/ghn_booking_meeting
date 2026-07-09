const AuthService = require('../services/AuthService');

/**
 * Controller layer cho authentication
 * Xử lý HTTP requests/responses
 */

class AuthController {
  /**
   * POST /api/auth/login
   * Login bằng email, không verify danh tính (chỉ dùng khi phát triển local).
   * Production bắt buộc dùng /api/auth/google để tránh giả mạo email người khác.
   */
  static async login(req, res) {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          error: {
            status: 403,
            message: 'Vui lòng đăng nhập bằng Google'
          }
        });
      }

      const { email, full_name } = req.body;

      if (!email) {
        return res.status(400).json({
          error: {
            status: 400,
            message: 'Email is required'
          }
        });
      }

      // Validate email domain
      if (!email.endsWith('@ghn.vn')) {
        return res.status(400).json({
          error: {
            status: 400,
            message: 'Only @ghn.vn email addresses are allowed'
          }
        });
      }

      // Login (tạo user nếu chưa tồn tại)
      const result = await AuthService.login(email, full_name);

      res.json({
        status: 'success',
        data: {
          token: result.token,
          user: result.user
        }
      });
    } catch (error) {
      console.error('Login error:', error);

      // Tài khoản bị chặn truy cập
      if (error.message.includes('khóa truy cập')) {
        return res.status(403).json({
          error: {
            status: 403,
            message: error.message
          }
        });
      }

      res.status(500).json({
        error: {
          status: 500,
          message: error.message || 'Login failed'
        }
      });
    }
  }

  /**
   * POST /api/auth/google
   * Login bằng Google Sign-In (ID token). Đây là đường đăng nhập chính thức
   * cho production — Google xác thực người dùng thực sự sở hữu email @ghn.vn.
   */
  static async googleLogin(req, res) {
    try {
      const { credential } = req.body;

      if (!credential) {
        return res.status(400).json({
          error: {
            status: 400,
            message: 'Thiếu Google credential'
          }
        });
      }

      const result = await AuthService.loginWithGoogle(credential);

      res.json({
        status: 'success',
        data: {
          token: result.token,
          user: result.user
        }
      });
    } catch (error) {
      console.error('Google login error:', error);

      if (error.message.includes('khóa truy cập')) {
        return res.status(403).json({
          error: {
            status: 403,
            message: error.message
          }
        });
      }

      // Lỗi xác thực Google / sai domain email → 401
      res.status(401).json({
        error: {
          status: 401,
          message: error.message || 'Đăng nhập Google thất bại'
        }
      });
    }
  }

  /**
   * GET /api/auth/me
   * Lấy thông tin user hiện tại
   */
  static async getCurrentUser(req, res) {
    try {
      const userId = req.user.id;

      const user = await AuthService.getUserById(userId);

      if (!user) {
        return res.status(404).json({
          error: {
            status: 404,
            message: 'User not found'
          }
        });
      }

      res.json({
        status: 'success',
        data: {
          user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            department: user.department,
            is_active: user.is_active,
            last_login: user.last_login
          }
        }
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        error: {
          status: 500,
          message: 'Failed to get user'
        }
      });
    }
  }

  /**
   * POST /api/auth/logout
   * Logout (client side delete token)
   */
  static async logout(req, res) {
    res.json({
      status: 'success',
      message: 'Logged out successfully'
    });
  }

  /**
   * POST /api/auth/admin (TESTING ONLY)
   * Tạo admin account để test
   */
  static async createAdminForTesting(req, res) {
    try {
      const { email, full_name } = req.body;

      if (!email) {
        return res.status(400).json({
          error: {
            status: 400,
            message: 'Email is required'
          }
        });
      }

      // Kiểm tra environment
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          error: {
            status: 403,
            message: 'This endpoint is not available in production'
          }
        });
      }

      const admin = await AuthService.createAdminAccount(
        email,
        full_name || 'Admin User'
      );

      const token = AuthService.generateToken(admin);

      res.json({
        status: 'success',
        message: 'Admin account created/updated',
        data: {
          token,
          user: {
            id: admin.id,
            email: admin.email,
            full_name: admin.full_name,
            role: admin.role
          }
        }
      });
    } catch (error) {
      console.error('Create admin error:', error);
      res.status(500).json({
        error: {
          status: 500,
          message: error.message || 'Failed to create admin'
        }
      });
    }
  }
}

module.exports = AuthController;
