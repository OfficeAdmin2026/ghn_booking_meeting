const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const AdminSettingService = require('../services/AdminSettingService');
const AllowedEmployeeService = require('../services/AllowedEmployeeService');
const BookingController = require('../controllers/BookingController');
const { User, AllowedEmployee } = require('../models');
const { Op } = require('sequelize');
const { randomUUID } = require('crypto');

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
      car_booking_details_visible,
      site_locked_for_users,
      site_lock_message,
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
    if (car_booking_details_visible !== undefined) {
      data.car_booking_details_visible = String(car_booking_details_visible);
    }
    if (site_locked_for_users !== undefined) {
      data.site_locked_for_users = String(site_locked_for_users);
    }
    if (site_lock_message !== undefined) {
      data.site_lock_message = site_lock_message;
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

// GET /api/admin/guide - All authenticated users can read
router.get('/guide', authMiddleware, async (req, res) => {
  try {
    const settings = await AdminSettingService.getAll();
    res.json({ status: 'success', data: { guide: settings.usage_guide || '' } });
  } catch (err) {
    res.status(500).json({ error: { status: 500, message: err.message } });
  }
});

// PUT /api/admin/guide - Admin only
router.put('/guide', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { guide } = req.body;
    await AdminSettingService.updateSettings({ usage_guide: guide ?? '' });
    res.json({ status: 'success', data: { guide: guide ?? '' } });
  } catch (err) {
    res.status(500).json({ error: { status: 500, message: err.message } });
  }
});

// GET /api/admin/car-rules - All authenticated users can read
router.get('/car-rules', authMiddleware, async (req, res) => {
  try {
    const settings = await AdminSettingService.getAll();
    res.json({ status: 'success', data: { rules: settings.car_booking_rules || '' } });
  } catch (err) {
    res.status(500).json({ error: { status: 500, message: err.message } });
  }
});

// PUT /api/admin/car-rules - Admin only
router.put('/car-rules', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { rules } = req.body;
    await AdminSettingService.updateSettings({ car_booking_rules: rules ?? '' });
    res.json({ status: 'success', data: { rules: rules ?? '' } });
  } catch (err) {
    res.status(500).json({ error: { status: 500, message: err.message } });
  }
});

// GET /api/admin/car-contact-note - All authenticated users can read
router.get('/car-contact-note', authMiddleware, async (req, res) => {
  try {
    const settings = await AdminSettingService.getAll();
    res.json({ status: 'success', data: { note: settings.car_booking_contact_note ?? '' } });
  } catch (err) {
    res.status(500).json({ error: { status: 500, message: err.message } });
  }
});

// PUT /api/admin/car-contact-note - Admin only
router.put('/car-contact-note', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { note } = req.body;
    await AdminSettingService.updateSettings({ car_booking_contact_note: note ?? '' });
    res.json({ status: 'success', data: { note: note ?? '' } });
  } catch (err) {
    res.status(500).json({ error: { status: 500, message: err.message } });
  }
});

// GET /api/admin/car-contact-admins - All authenticated users can read. Danh sách người phụ
// trách xe do admin tự thêm/xoá thủ công (không suy ra từ role, vì người phụ trách đổi theo
// thời điểm) — để nhân viên liên hệ khi thấy khung giờ trống (nhắn/copy MSNV hoặc tên).
router.get('/car-contact-admins', authMiddleware, async (req, res) => {
  try {
    const settings = await AdminSettingService.getAll();
    let admins = [];
    try { admins = JSON.parse(settings.car_booking_contact_admins || '[]'); } catch { admins = []; }
    res.json({ status: 'success', data: { admins } });
  } catch (err) {
    res.status(500).json({ error: { status: 500, message: err.message } });
  }
});

// PUT /api/admin/car-contact-admins - Admin only. Ghi đè toàn bộ danh sách người phụ trách xe.
router.put('/car-contact-admins', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const admins = Array.isArray(req.body.admins) ? req.body.admins : [];
    const cleaned = admins
      .map((a) => ({
        id: a.id || randomUUID(),
        full_name: a.full_name ? String(a.full_name).trim() : '',
        employee_id: a.employee_id ? String(a.employee_id).trim() : '',
      }))
      .filter((a) => a.full_name || a.employee_id);
    await AdminSettingService.updateSettings({ car_booking_contact_admins: JSON.stringify(cleaned) });
    res.json({ status: 'success', data: { admins: cleaned } });
  } catch (err) {
    res.status(500).json({ error: { status: 500, message: err.message } });
  }
});

// GET /api/admin/site-lock - All authenticated users can read (used to gate the UI for 'user' role)
router.get('/site-lock', authMiddleware, async (req, res) => {
  try {
    const status = await AdminSettingService.getSiteLockStatus();
    res.json({ status: 'success', data: status });
  } catch (err) {
    res.status(500).json({ error: { status: 500, message: err.message } });
  }
});

// GET /api/admin/bookings - List all bookings
router.get('/bookings', authMiddleware, adminMiddleware, BookingController.getAdminBookings);

// PATCH /api/admin/bookings/:id - Reschedule booking
router.patch('/bookings/:id', authMiddleware, adminMiddleware, BookingController.adminUpdateBooking);

// POST /api/admin/promote - Grant/revoke role by MSNV in one shot
router.post('/promote', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const employeeId = String(req.body.employee_id || '').trim();
    const role = req.body.role || 'admin';
    if (!employeeId) return res.status(400).json({ error: { status: 400, message: 'MSNV không được để trống' } });
    if (!['admin', 'vip', 'user'].includes(role))
      return res.status(400).json({ error: { status: 400, message: 'Role không hợp lệ' } });

    // Cấp quyền cho người không truy cập được hệ thống thì vô nghĩa — bắt buộc MSNV đã có
    // trong allowlist trước.
    const match = await AllowedEmployeeService.findMatch(employeeId, null);
    if (!match) {
      return res.status(400).json({ error: { status: 400, message: 'MSNV chưa nằm trong danh sách được phép truy cập hệ thống. Thêm vào allowlist trước.' } });
    }

    let user = await User.findOne({ where: { employee_id: employeeId } });

    if (!user) {
      user = await User.create({
        employee_id: employeeId,
        email: match.email || null,
        full_name: match.full_name || employeeId,
        department: match.department || null,
        job_title: match.job_title || null,
        role,
        is_active: true
      });
    } else {
      if (user.id === req.user.id)
        return res.status(400).json({ error: { status: 400, message: 'Không thể thay đổi quyền của chính mình' } });
      await user.update({ role, employee_id: employeeId, updated_at: new Date() });
    }
    res.json({
      status: 'success',
      data: { user: { id: user.id, email: user.email, full_name: user.full_name, employee_id: user.employee_id, role: user.role } },
    });
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
      attributes: ['id', 'email', 'full_name', 'employee_id', 'department', 'job_title', 'role', 'is_active', 'last_login', 'created_at'],
      order: [['role', 'ASC'], ['full_name', 'ASC']],
    });
    res.json({ status: 'success', data: { users } });
  } catch (err) {
    res.status(500).json({ error: { status: 500, message: err.message } });
  }
});

// GET /api/admin/users/search?q= - Tìm nhanh theo tên/MSNV (dùng cho autocomplete chọn "người
// sử dụng xe" khi admin đặt xe hộ). Tìm trên TOÀN BỘ danh sách MSNV được phép (849 người, nguồn
// dùng chung với phòng họp) — không chỉ những ai đã từng đăng nhập — để đặt hộ được cho bất kỳ
// ai trong danh sách mà không cần nhập tay. id = user account nếu MSNV đó đã có tài khoản (đăng
// nhập ít nhất 1 lần), null nếu chưa — khi đó chỉ lưu snapshot MSNV/tên/chức danh/phòng ban.
// Đặt trước /users/:id-style routes nếu có.
router.get('/users/search', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json({ status: 'success', data: { users: [] } });
    const employees = await AllowedEmployee.findAll({
      where: {
        [Op.or]: [
          { full_name: { [Op.iLike]: `%${q}%` } },
          { employee_id: { [Op.iLike]: `%${q}%` } },
        ],
      },
      include: [{ model: User, as: 'user', attributes: ['id'], required: false }],
      order: [['full_name', 'ASC']],
      limit: 10,
    });
    const users = employees.map((e) => ({
      id: e.user?.id || null,
      full_name: e.full_name,
      employee_id: e.employee_id,
      department: e.department,
      job_title: e.job_title,
    }));
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
      attributes: ['id', 'email', 'full_name', 'department', 'job_title', 'role', 'is_active'],
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
    await user.update({ role, updated_at: new Date() });
    res.json({
      status: 'success',
      data: { user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role } },
    });
  } catch (err) {
    res.status(500).json({ error: { status: 500, message: err.message } });
  }
});

// POST /api/admin/ban - Block access by MSNV (creates user record if not exists)
router.post('/ban', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const employeeId = String(req.body.employee_id || '').trim();
    if (!employeeId) return res.status(400).json({ error: { status: 400, message: 'MSNV không được để trống' } });

    const match = await AllowedEmployeeService.findMatch(employeeId, null);

    let user = await User.findOne({ where: { employee_id: employeeId } });

    if (!user) {
      user = await User.create({
        employee_id: employeeId,
        email: match?.email || null,
        full_name: match?.full_name || employeeId,
        department: match?.department || null,
        job_title: match?.job_title || null,
        role: 'user',
        is_active: false
      });
    } else {
      if (user.id === req.user.id)
        return res.status(400).json({ error: { status: 400, message: 'Không thể tự chặn chính mình' } });
      await user.update({ is_active: false, employee_id: employeeId, updated_at: new Date() });
    }
    res.json({
      status: 'success',
      data: { user: { id: user.id, email: user.email, full_name: user.full_name, employee_id: user.employee_id, role: user.role, is_active: user.is_active } },
    });
  } catch (err) {
    res.status(500).json({ error: { status: 500, message: err.message } });
  }
});

// PATCH /api/admin/users/:id/status - Ban / unban a user by id
router.patch('/users/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: { status: 400, message: 'is_active phải là true/false' } });
    }
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: { status: 400, message: 'Không thể tự chặn chính mình' } });
    }
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: { status: 404, message: 'Không tìm thấy người dùng' } });
    await user.update({ is_active, updated_at: new Date() });
    res.json({ status: 'success', data: { user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, is_active: user.is_active } } });
  } catch (err) {
    res.status(500).json({ error: { status: 500, message: err.message } });
  }
});

// PATCH /api/admin/users/:id/employee-id - Gán MSNV cho 1 user (để xét allowlist)
router.patch('/users/:id/employee-id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const employeeId = (req.body.employee_id || '').trim();
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: { status: 404, message: 'Không tìm thấy người dùng' } });
    await user.update({ employee_id: employeeId || null, updated_at: new Date() });
    res.json({
      status: 'success',
      data: { user: { id: user.id, email: user.email, full_name: user.full_name, employee_id: user.employee_id } },
    });
  } catch (err) {
    res.status(500).json({ error: { status: 500, message: err.message } });
  }
});

// ---- Allowlist MSNV (2 văn phòng có phòng họp) ----

// GET /api/admin/allowed-employees - Danh sách MSNV được phép
router.get('/allowed-employees', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const employees = await AllowedEmployeeService.list();
    res.json({ status: 'success', data: { employees } });
  } catch (err) {
    res.status(500).json({ error: { status: 500, message: err.message } });
  }
});

// POST /api/admin/allowed-employees - Thêm 1 MSNV
router.post('/allowed-employees', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { employee_id, full_name, department, email, job_title } = req.body;
    const record = await AllowedEmployeeService.add(employee_id, full_name, department, email, req.user.id, job_title);
    res.json({ status: 'success', data: { employee: record } });
  } catch (err) {
    res.status(400).json({ error: { status: 400, message: err.message } });
  }
});

// POST /api/admin/allowed-employees/bulk - Import nhiều MSNV (đã parse Excel ở frontend)
router.post('/allowed-employees/bulk', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    const result = await AllowedEmployeeService.bulkImport(rows, req.user.id);
    res.json({ status: 'success', data: result });
  } catch (err) {
    res.status(400).json({ error: { status: 400, message: err.message } });
  }
});

// DELETE /api/admin/allowed-employees/:id - Xoá 1 MSNV khỏi danh sách
router.delete('/allowed-employees/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const removed = await AllowedEmployeeService.remove(req.params.id);
    if (!removed) return res.status(404).json({ error: { status: 404, message: 'Không tìm thấy' } });
    res.json({ status: 'success' });
  } catch (err) {
    res.status(500).json({ error: { status: 500, message: err.message } });
  }
});

// POST /api/admin/allowed-employees/bulk-delete - Xoá nhiều MSNV cùng lúc (ids: [])
router.post('/allowed-employees/bulk-delete', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    const deleted = await AllowedEmployeeService.removeMany(ids);
    res.json({ status: 'success', data: { deleted } });
  } catch (err) {
    res.status(500).json({ error: { status: 500, message: err.message } });
  }
});

module.exports = router;
