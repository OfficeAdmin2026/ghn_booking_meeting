const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const CarBookingController = require('../controllers/CarBookingController');

// GET /api/car-bookings?car_id=&start_date=&end_date= - mọi user đăng nhập đều đọc được
// (chi tiết booking bị ẩn với user thường tuỳ theo setting car_booking_details_visible)
router.get('/', authMiddleware, CarBookingController.getBookings);

// POST /api/car-bookings - chỉ admin tạo booking
router.post('/', authMiddleware, adminMiddleware, CarBookingController.createBooking);

// PUT /api/car-bookings/:id - chỉ admin sửa booking
router.put('/:id', authMiddleware, adminMiddleware, CarBookingController.updateBooking);

// DELETE /api/car-bookings/:id - chỉ admin huỷ booking
router.delete('/:id', authMiddleware, adminMiddleware, CarBookingController.cancelBooking);

module.exports = router;
