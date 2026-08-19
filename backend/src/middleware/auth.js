const jwt = require('jsonwebtoken');
const AdminSettingService = require('../services/AdminSettingService');
const AllowedEmployeeService = require('../services/AllowedEmployeeService');
const { User } = require('../models');

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: {
        status: 401,
        message: 'No token provided'
      }
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    // Chỉ token thật sự sai/hết hạn mới trả 401 — frontend coi 401 là "đăng xuất".
    return res.status(401).json({
      error: {
        status: 401,
        message: 'Invalid or expired token'
      }
    });
  }
  req.user = decoded;

  try {
    // Kiểm tra allowlist MSNV mỗi request (không dựa vào JWT tĩnh) — admin gỡ
    // quyền của ai đó thì có hiệu lực ngay, không cần đợi họ đăng nhập lại.
    const user = await User.findByPk(decoded.id, { attributes: ['employee_id'] });
    const allowed = user && (await AllowedEmployeeService.isAllowed(user.employee_id));
    if (!allowed) {
      return res.status(403).json({
        error: {
          status: 403,
          message: 'Tài khoản của bạn chưa được cấp quyền truy cập hệ thống đặt phòng. Vui lòng liên hệ quản trị viên.'
        }
      });
    }
    next();
  } catch (error) {
    // Lỗi DB tạm thời (mất kết nối/timeout) khi kiểm tra allowlist — KHÔNG được trả 401, vì
    // trước đây gộp chung try/catch với jwt.verify() nên bug này khiến user bị đá về trang
    // login mỗi khi Neon có chút chập chờn, dù token vẫn còn hợp lệ. Trả 500 để frontend chỉ
    // báo lỗi thử lại, không xoá phiên đăng nhập.
    console.error('authMiddleware allowlist check error:', error);
    return res.status(500).json({
      error: {
        status: 500,
        message: 'Lỗi hệ thống, vui lòng thử lại'
      }
    });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      error: {
        status: 403,
        message: 'Admin access required'
      }
    });
  }
  next();
};

const vipMiddleware = (req, res, next) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'vip') {
    return res.status(403).json({
      error: {
        status: 403,
        message: 'VIP access required'
      }
    });
  }
  next();
};

// Blocks 'user'-role accounts from mutating bookings while the admin has locked the site for them
const blockLockedUsers = async (req, res, next) => {
  try {
    if (req.user?.role !== 'user') return next();
    const { locked, message } = await AdminSettingService.getSiteLockStatus();
    if (locked) {
      return res.status(423).json({ error: { status: 423, message } });
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authMiddleware,
  adminMiddleware,
  vipMiddleware,
  blockLockedUsers
};
