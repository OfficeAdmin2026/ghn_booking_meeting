const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const BookingController = require('../controllers/BookingController');

// GET /api/bookings - Get my bookings
router.get('/', authMiddleware, BookingController.getMyBookings);

// GET /api/bookings/freeze-status - Check if booking is currently frozen
router.get('/freeze-status', authMiddleware, BookingController.getFreezeStatus);

// GET /api/bookings/room/:roomId - Get all bookings for a room (calendar view)
router.get('/room/:roomId', authMiddleware, BookingController.getRoomBookings);

// POST /api/bookings - Create booking
router.post('/', authMiddleware, BookingController.createBooking);

// GET /api/bookings/:id - Get booking details
router.get('/:id', authMiddleware, BookingController.getBookingById);

// PUT /api/bookings/:id - Update booking (extend/early finish)
router.put('/:id', authMiddleware, BookingController.updateBooking);

// DELETE /api/bookings/:id - Cancel booking
router.delete('/:id', authMiddleware, BookingController.cancelBooking);

module.exports = router;
