const AuthService = require('../services/AuthService');

/**
 * Controller layer cho authentication
 * Xử lý HTTP requests/responses
 */

class AuthController {
  /**
   * POST /api/auth/login
   * Login bằng email (đơn giản, không cần verify)
   */
  static async login(req, res) {
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
   * POST /api/auth/register
   * Register user mới (similar to login nhưng explicit)
   */
  static async register(req, res) {
    try {
      const { email, full_name, department } = req.body;

      if (!email || !full_name) {
        return res.status(400).json({
          error: {
            status: 400,
            message: 'Email and full_name are required'
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

      // Tạo user
      const user = await AuthService.createUser(email, full_name, department, 'user');

      // Tạo token
      const token = AuthService.generateToken(user);

      res.status(201).json({
        status: 'success',
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role
          }
        }
      });
    } catch (error) {
      console.error('Register error:', error);

      // Check nếu user đã tồn tại
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          error: {
            status: 409,
            message: 'Email already registered'
          }
        });
      }

      res.status(500).json({
        error: {
          status: 500,
          message: error.message || 'Registration failed'
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
