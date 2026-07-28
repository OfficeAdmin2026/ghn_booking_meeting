const jwt = require('jsonwebtoken');
const AdminSettingService = require('../services/AdminSettingService');

const authMiddleware = (req, res, next) => {
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
