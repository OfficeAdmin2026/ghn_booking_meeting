const CarBookingService = require('../services/CarBookingService');

/**
 * Controller layer cho đặt xe công ty.
 * Admin write access được enforce ở route level (adminMiddleware), không check lại ở đây.
 */

class CarBookingController {
  /**
   * GET /api/car-bookings?car_id=&start_date=&end_date=
   * Mọi user đăng nhập đều xem được lịch bận/trống. Chi tiết (title/notes/người tạo)
   * chỉ trả về nếu là admin hoặc setting car_booking_details_visible đang bật.
   */
  static async getBookings(req, res) {
    try {
      const { car_id, start_date, end_date } = req.query;

      if (!car_id || !start_date || !end_date) {
        return res.status(400).json({
          error: { status: 400, message: 'car_id, start_date, end_date are required' }
        });
      }

      const isAdmin = req.user.role === 'admin';
      const bookings = await CarBookingService.getBookingsForCalendar(
        car_id,
        new Date(start_date),
        new Date(end_date),
        isAdmin
      );

      res.json({
        status: 'success',
        data: { count: bookings.length, bookings }
      });
    } catch (error) {
      console.error('Get car bookings error:', error);
      res.status(500).json({
        error: { status: 500, message: error.message || 'Failed to get car bookings' }
      });
    }
  }

  /**
   * POST /api/car-bookings (admin only)
   */
  static async createBooking(req, res) {
    try {
      const booking = await CarBookingService.createBooking(req.user.id, req.body);
      res.status(201).json({ status: 'success', data: { booking } });
    } catch (error) {
      console.error('Create car booking error:', error);
      let statusCode = 500;
      if (error.message.includes('Missing') || error.message.includes('must be after')) statusCode = 400;
      if (error.message.includes('not found') || error.message.includes('inactive')) statusCode = 404;
      if (error.message.includes('đã được đặt')) statusCode = 409;
      res.status(statusCode).json({
        error: { status: statusCode, message: error.message || 'Failed to create car booking' }
      });
    }
  }

  /**
   * PUT /api/car-bookings/:id (admin only)
   */
  static async updateBooking(req, res) {
    try {
      const { id } = req.params;
      const booking = await CarBookingService.updateBooking(id, req.body);
      res.json({ status: 'success', data: { booking } });
    } catch (error) {
      console.error('Update car booking error:', error);
      let statusCode = 500;
      if (error.message.includes('not found')) statusCode = 404;
      if (error.message.includes('must be after')) statusCode = 400;
      if (error.message.includes('đã được đặt')) statusCode = 409;
      res.status(statusCode).json({
        error: { status: statusCode, message: error.message || 'Failed to update car booking' }
      });
    }
  }

  /**
   * DELETE /api/car-bookings/:id (admin only) — huỷ (soft cancel)
   */
  static async cancelBooking(req, res) {
    try {
      const { id } = req.params;
      const { message } = req.body || {};
      const booking = await CarBookingService.cancelBooking(id, message);
      res.json({ status: 'success', message: 'Car booking cancelled', data: { booking } });
    } catch (error) {
      console.error('Cancel car booking error:', error);
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        error: { status: statusCode, message: error.message || 'Failed to cancel car booking' }
      });
    }
  }
}

module.exports = CarBookingController;
