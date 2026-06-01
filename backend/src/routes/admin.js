const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const AdminSettingService = require('../services/AdminSettingService');
const BookingController = require('../controllers/BookingController');

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

// GET /api/admin/bookings - List all bookings
router.get('/bookings', authMiddleware, adminMiddleware, BookingController.getAdminBookings);

// PATCH /api/admin/bookings/:id - Reschedule booking
router.patch('/bookings/:id', authMiddleware, adminMiddleware, BookingController.adminUpdateBooking);

// GET /api/admin/users - List all users
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  res.status(501).json({ error: { status: 501, message: 'Not implemented' } });
});

module.exports = router;
