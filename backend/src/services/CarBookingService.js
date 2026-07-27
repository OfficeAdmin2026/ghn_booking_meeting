const { CarBooking, Car, User } = require('../models');
const { Op, Transaction } = require('sequelize');
const { sequelize } = require('../config/database');
const AdminSettingService = require('./AdminSettingService');

/**
 * Service layer cho đặt xe công ty.
 * Chỉ admin được tạo/sửa/huỷ booking — nhân viên thường chỉ xem lịch bận/trống.
 */

class CarBookingService {
  /**
   * Kiểm tra conflict thời gian cho 1 xe
   */
  static async checkTimeConflict(carId, startTime, endTime, excludeBookingId = null, transaction = null) {
    try {
      const where = {
        car_id: carId,
        status: 'confirmed',
        [Op.or]: [
          { start_time: { [Op.gte]: startTime, [Op.lt]: endTime } },
          { end_time: { [Op.gt]: startTime, [Op.lte]: endTime } },
          { start_time: { [Op.lte]: startTime }, end_time: { [Op.gte]: endTime } }
        ]
      };

      if (excludeBookingId) {
        where.id = { [Op.ne]: excludeBookingId };
      }

      return await CarBooking.findOne({ where, ...(transaction ? { transaction, lock: transaction.LOCK.UPDATE } : {}) });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Lấy lịch đặt xe cho calendar trong khoảng thời gian.
   * viewerIsAdmin=true HOẶC setting car_booking_details_visible=true → trả đầy đủ chi tiết.
   * Ngược lại → chỉ trả khung giờ bận (không title/notes/người tạo).
   */
  static async getBookingsForCalendar(carId, startDate, endDate, viewerIsAdmin = false) {
    try {
      const bookings = await CarBooking.findAll({
        where: {
          car_id: carId,
          status: 'confirmed',
          start_time: { [Op.lt]: endDate },
          end_time: { [Op.gt]: startDate }
        },
        include: [
          { model: User, as: 'creator', attributes: ['id', 'full_name'] }
        ],
        order: [['start_time', 'ASC']]
      });

      const detailsVisible = viewerIsAdmin || (await AdminSettingService.isCarDetailsVisible());

      if (detailsVisible) return bookings;

      return bookings.map((b) => ({
        id: b.id,
        car_id: b.car_id,
        start_time: b.start_time,
        end_time: b.end_time,
        status: b.status
      }));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Tạo booking xe (admin only)
   */
  static async createBooking(adminUserId, bookingData) {
    try {
      const { car_id, title, start_time, end_time, notes } = bookingData;

      if (!car_id || !title || !start_time || !end_time) {
        throw new Error('Missing required fields');
      }

      const startTime = new Date(start_time);
      const endTime = new Date(end_time);

      if (endTime <= startTime) {
        throw new Error('end_time must be after start_time');
      }

      const car = await Car.findByPk(car_id);
      if (!car || !car.is_active) {
        throw new Error('Car not found or inactive');
      }

      const booking = await sequelize.transaction(
        { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
        async (t) => {
          const conflict = await this.checkTimeConflict(car_id, startTime, endTime, null, t);
          if (conflict) {
            throw new Error('Xe đã được đặt trong khung giờ này');
          }
          return CarBooking.create({
            car_id,
            created_by: adminUserId,
            title,
            start_time: startTime,
            end_time: endTime,
            status: 'confirmed',
            notes: notes || null
          }, { transaction: t });
        }
      );

      return booking;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cập nhật booking xe (admin only)
   */
  static async updateBooking(bookingId, updateData) {
    try {
      const booking = await CarBooking.findByPk(bookingId);
      if (!booking) {
        throw new Error('Car booking not found');
      }

      const { title, notes, start_time, end_time } = updateData;
      const newStart = start_time ? new Date(start_time) : new Date(booking.start_time);
      const newEnd = end_time ? new Date(end_time) : new Date(booking.end_time);

      if (newEnd <= newStart) {
        throw new Error('end_time must be after start_time');
      }
      if (title !== undefined && !title.trim()) {
        throw new Error('Mục đích / Người yêu cầu không được để trống');
      }

      const conflict = await this.checkTimeConflict(booking.car_id, newStart, newEnd, bookingId);
      if (conflict) {
        throw new Error('Xe đã được đặt trong khung giờ này');
      }

      if (title !== undefined) booking.title = title;
      if (notes !== undefined) booking.notes = notes;
      booking.start_time = newStart;
      booking.end_time = newEnd;

      await booking.save();
      return booking;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Huỷ booking xe (admin only) — soft cancel, giữ lịch sử
   */
  static async cancelBooking(bookingId, message = null) {
    try {
      const booking = await CarBooking.findByPk(bookingId);
      if (!booking) {
        throw new Error('Car booking not found');
      }

      booking.status = 'cancelled';
      booking.cancellation_message = message || null;
      await booking.save();
      return booking;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = CarBookingService;
