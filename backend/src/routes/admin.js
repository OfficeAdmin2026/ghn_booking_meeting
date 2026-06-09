const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const AdminSettingService = require('../services/AdminSettingService');
const BookingController = require('../controllers/BookingController');
const { User } = require('../models');
const { Op } = require('sequelize');

// GET /api/admin/settings
router.get('/settings', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const settings = await AdminSettingService.getAll();
    res.json({ status: 'success', data: { settings } });
  } catch (err) {
    res.status(500).json({ error: { status: 500, message: err.message } });
  }
});

// PUT /api/admin/settings
router.put('/settings', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      booking_freeze_weekly_enabled,
      booking_freeze_weekly_day,
      booking_freeze_weekly_time,
    } = req.body;
    const data = {};

    if (booking_freeze_weekly_enabled !== undefined) {
      data.booking_freeze_weekly_enabled = String(booking_freeze_weekly_enabled);
    }
    if (booking_freeze_weekly_day !== undefined) {
      data.booking_freeze_weekly_day = String(booking_freeze_weekly_day);
    }
    if (booking_freeze_weekly_time !== undefined) {
      data.booking_freeze_weekly_time = String(booking_freeze_weekly_time);
    }

    const settings = await AdminSettingService.updateSettings(data);
    res.json({ status: 'success', data: { settings } });
  } catch (err) {
    res.status(500).json({ error: { status: 500, message: err.message } });
  }
});

// GET /api/admin/rules - All authenticated users can read
router.get('/rules', authMiddleware, async (req, res) => {
  try {
    const settings = await AdminSettingService.getAll();
    res.json({ status: 'success', data: { rules: settings.meeting_room_rules || '' } });
  } catch (err) {
    res.status(500).json({ error: { status: 500, message: err.message } });
  }
});

// PUT /api/admin/rules - Admin only
router.put('/rules', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { rules } = req.body;
    await AdminSettingService.updateSettings({ meeting_room_rules: rules ?? '' });
    console.log('[admin/rules] saved, length:', (rules ?? '').length);
    res.json({ status: 'success', data: { rules: rules ?? '' } });
  } catch (err) {
    console.error('[admin/rules] save error:', err);
    res.status(500).json({ error: { status: 500, message: err.message } });
  }
});

// GET /api/admin/bookings - List all bookings
router.get('/bookings', authMiddleware, adminMiddleware, BookingController.getAdminBookings);

// PATCH /api/admin/bookings/:id - Reschedule booking
router.patch('/bookings/:id', authMiddleware, adminMiddleware, BookingController.adminUpdateBooking);

// POST /api/admin/promote - Grant/revoke role by email in one shot
router.post('/promote', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const role  = req.body.role || 'admin';
    if (!email) return res.status(400).json({ error: { status: 400, message: 'Email không được để trống' } });
    if (!['admin', 'vip', 'user'].includes(role))
      return res.status(400).json({ error: { status: 400, message: 'Role không hợp lệ' } });
    if (!email.endsWith('@ghn.vn') && role !== 'user')
      return res.status(400).json({ error: { status: 400, message: 'Chỉ email @ghn.vn mới được cấp quyền admin / VIP' } });
    const user = await User.findOne({ where: { email: { [Op.iLike]: email } } });
    if (!user)
      return res.status(404).json({ error: { status: 404, message: 'Không tìm thấy người dùng. Họ cần đăng nhập ít nhất 1 lần trước.' } });
    if (user.id === req.user.id)
      return res.status(400).json({ error: { status: 400, message: 'Không thể thay đổi quyền của chính mình' } });
    await user.update({ role, updated_at: new Date() });
    res.json({ status: 'success', data: { user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role } } });
  } catch (err) {
    res.status(500).json({ error: { status: 500, message: err.message } });
  }
});

// GET /api/admin/users - List users (optional ?role= filter)
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const where = {};
    if (req.query.role) where.role = req.query.role;
    const users = await User.findAll({
      where,
      attributes: ['id', 'email', 'full_name', 'department', 'role', 'is_active', 'last_login', 'created_at'],
      order: [['role', 'ASC'], ['full_name', 'ASC']],
    });
    res.json({ status: 'success', data: { users } });
  } catch (err) {
    res.status(500).json({ error: { status: 500, message: err.message } });
  }
});

// POST /api/admin/users/by-email - Find user by email
router.post('/users/by-email', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: { status: 400, message: 'Email không được để trống' } });
    const user = await User.findOne({
      where: { email: { [Op.iLike]: email } },
      attributes: ['id', 'email', 'full_name', 'department', 'role', 'is_active'],
    });
    if (!user) return res.status(404).json({ error: { status: 404, message: 'Không tìm thấy người dùng với email này' } });
    res.json({ status: 'success', data: { user } });
  } catch (err) {
    res.status(500).json({ error: { status: 500, message: err.message } });
  }
});

// PATCH /api/admin/users/:id/role - Promote / demote user role
router.patch('/users/:id/role', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'vip', 'admin'].includes(role)) {
      return res.status(400).json({ error: { status: 400, message: 'Role không hợp lệ (user / vip / admin)' } });
    }
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: { status: 400, message: 'Không thể thay đổi quyền của chính mình' } });
    }
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: { status: 404, message: 'Không tìm thấy người dùng' } });
    if (!user.email.endsWith('@ghn.vn') && role !== 'user') {
      return res.status(400).json({ error: { status: 400, message: 'Chỉ email @ghn.vn mới được cấp quyền admin / VIP' } });
    }
    await user.update({ role, updated_at: new Date() });
    res.json({
      status: 'success',
      data: { user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role } },
    });
  } catch (err) {
    res.status(500).json({ error: { status: 500, message: err.message } });
  }
});

module.exports = router;
