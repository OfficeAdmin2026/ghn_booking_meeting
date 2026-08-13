const jwt = require('jsonwebtoken');
const AdminSettingService = require('../services/AdminSettingService');
const AllowedEmployeeService = require('../services/AllowedEmployeeService');
const { User } = require('../models');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: {
          status: 401,
          message: 'No token provided'
        }
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

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
    return res.status(401).json({
      error: {
        status: 401,
        message: 'Invalid or expired token'
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
