const AuthService = require('../services/AuthService');
const SsoService = require('../services/SsoService');
const { isCompanyEmail } = require('../utils/companyEmail');

// Trang frontend nhận lại token sau khi SSO login xong (redirect-based, không phải XHR nên
// không thể trả JSON trực tiếp — token được gắn vào query string của URL redirect).
const SSO_FRONTEND_URL = (process.env.SSO_FRONTEND_URL || (process.env.ALLOWED_ORIGINS || '').split(',')[0] || '').replace(/\/$/, '');

/**
 * Controller layer cho authentication
 * Xử lý HTTP requests/responses
 */

class AuthController {
  /**
   * POST /api/auth/login
   * Login bằng MSNV — tra allowlist để lấy email đã liên kết, không cần mật khẩu.
   */
  static async login(req, res) {
    try {
      // LỖ HỔNG NGHIÊM TRỌNG đã vá: khi SSO bật, đây là backend duy nhất còn xác thực danh
      // tính thật (mật khẩu + 2FA) — trước đây route này vẫn mở song song, chỉ ẩn form ở
      // frontend, nên bất kỳ ai biết 1 MSNV bất kỳ (kể cả admin) đều tự cấp được token hợp lệ
      // cho MSNV đó mà không cần xác thực gì. Chặn hẳn route này ở backend khi SSO bật.
      if (SsoService.isEnabled()) {
        return res.status(403).json({
          error: {
            status: 403,
            message: 'Vui lòng đăng nhập bằng GHN SSO.'
          }
        });
      }

      const { employee_id, full_name } = req.body;

      if (!employee_id || !String(employee_id).trim()) {
        return res.status(400).json({
          error: {
            status: 400,
            message: 'Vui lòng nhập MSNV'
          }
        });
      }

      const result = await AuthService.loginByEmployeeId(employee_id, full_name);

      res.json({
        status: 'success',
        data: {
          token: result.token,
          user: result.user
        }
      });
    } catch (error) {
      console.error('Login error:', error);

      // Các trường hợp từ chối có message rõ ràng cho user (chặn/không thuộc allowlist/thiếu email)
      const isAccessDenied =
        error.message.includes('khóa truy cập') ||
        error.message.includes('quyền truy cập') ||
        error.message.includes('MSNV') ||
        error.message.includes('liên kết email');
      if (isAccessDenied) {
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
   * GET /api/auth/sso/status
   * Cho frontend biết SSO đã bật chưa để quyết định hiện nút SSO hay form MSNV/tên.
   */
  static ssoStatus(req, res) {
    res.json({ status: 'success', data: { enabled: SsoService.isEnabled() } });
  }

  /**
   * GET /api/auth/sso/login
   * Redirect trình duyệt sang trang đăng nhập GHN SSO.
   */
  static ssoLogin(req, res) {
    if (!SsoService.isEnabled()) {
      return res.status(503).json({
        error: { status: 503, message: 'Đăng nhập SSO chưa được cấu hình. Vui lòng liên hệ quản trị viên.' }
      });
    }
    res.redirect(SsoService.createAuthorizationUrl());
  }

  /**
   * GET /api/auth/sso/callback
   * GHN SSO redirect về đây kèm ?code&state (hoặc ?error). Đổi code lấy token, verify id_token,
   * lấy userinfo, đăng nhập/đồng bộ user, rồi redirect trình duyệt về frontend kèm app token.
   */
  static async ssoCallback(req, res) {
    const redirectWithError = (message) => {
      const url = new URL(`${SSO_FRONTEND_URL}/sso-complete`);
      url.searchParams.set('error', message);
      res.redirect(url.toString());
    };

    if (!SsoService.isEnabled()) {
      return redirectWithError('Đăng nhập SSO chưa được cấu hình');
    }

    try {
      const { code, state, error, error_description } = req.query;
      if (error) {
        throw new Error(error_description || 'Đăng nhập SSO thất bại hoặc bị huỷ');
      }
      if (!code || !state) {
        throw new Error('Thiếu thông tin phản hồi từ SSO');
      }

      const { nonce } = SsoService.verifyState(state);
      const tokens = await SsoService.exchangeCodeForTokens(code);
      const idClaims = await SsoService.verifyIdToken(tokens.id_token, nonce);
      const userInfo = await SsoService.getUserInfo(tokens.access_token);

      const result = await AuthService.loginFromSso({ ...idClaims, ...userInfo });

      const url = new URL(`${SSO_FRONTEND_URL}/sso-complete`);
      url.searchParams.set('token', result.token);
      res.redirect(url.toString());
    } catch (err) {
      console.error('SSO callback error:', err);
      redirectWithError(err.message || 'Đăng nhập SSO thất bại');
    }
  }

  /**
   * POST /api/auth/register
   * Register user mới (similar to login nhưng explicit)
   */
  static async register(req, res) {
    try {
      // Endpoint cũ từ trước khi có allowlist MSNV — chỉ check domain email, KHÔNG check danh
      // sách 849 MSNV được phép, nên tự nó đã là lỗ hổng (bất kỳ ai gõ email @ghn.vn/... bất kỳ
      // đều tạo được tài khoản). Không còn được frontend gọi tới (đã chuyển hẳn sang MSNV/SSO)
      // — chặn hẳn khi SSO bật để không còn đường bypass nào song song với SSO.
      if (SsoService.isEnabled()) {
        return res.status(403).json({
          error: { status: 403, message: 'Vui lòng đăng nhập bằng GHN SSO.' }
        });
      }

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
      if (!isCompanyEmail(email)) {
        return res.status(400).json({
          error: {
            status: 400,
            message: 'Only company email addresses (@ghn.vn / @giaohangnhanh.vn) are allowed'
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
            employee_id: user.employee_id,
            job_title: user.job_title,
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
