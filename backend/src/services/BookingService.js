const { Booking, Room, User, CheckIn } = require('../models');
const { Op } = require('sequelize');
const AdminSettingService = require('./AdminSettingService');
require('dotenv').config();

/**
 * Service layer cho booking management
 * Xử lý: create, list, update, delete bookings + conflict detection
 */

class BookingService {
  /**
   * Lấy danh sách booking của user
   */
  static async getUserBookings(userId, status = null) {
    try {
      const where = { user_id: userId };

      // Filter by status nếu có
      if (status) {
        where.status = status;
      }

      const bookings = await Booking.findAll({
        where,
        include: [
          {
            association: 'checkin',
            attributes: ['id', 'check_in_time', 'method', 'is_valid']
          },
          {
            model: Room,
            attributes: ['id', 'name', 'location', 'floor', 'capacity', 'code'],
            include: [
              {
                association: 'amenities',
                attributes: ['amenity']
              }
            ]
          }
        ],
        order: [['start_time', 'DESC']]
      });

      return bookings;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Lấy chi tiết 1 booking
   */
  static async getBookingById(bookingId) {
    try {
      const booking = await Booking.findByPk(bookingId, {
        include: [
          {
            association: 'checkin',
            attributes: ['id', 'check_in_time', 'method', 'is_valid']
          },
          {
            model: Room,
            attributes: ['id', 'name', 'location', 'floor', 'capacity', 'code'],
            include: [
              {
                association: 'amenities',
                attributes: ['amenity']
              }
            ]
          },
          {
            model: User,
            attributes: ['id', 'email', 'full_name', 'department']
          }
        ]
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      return booking;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Lấy tất cả booking của 1 phòng trong khoảng thời gian.
   * isAdmin=true → trả hết; isAdmin=false → chỉ trả non-hidden + hidden đã đến giờ mở
   */
  static async getRoomBookings(roomId, startDate, endDate, isAdmin = false) {
    try {
      const where = {
        room_id: roomId,
        status: { [Op.in]: ['pending', 'confirmed', 'active', 'completed'] },
        start_time: { [Op.lt]: endDate },
        end_time: { [Op.gt]: startDate }
      };

      const bookings = await Booking.findAll({
        where,
        include: [
          {
            model: User,
            attributes: ['id', 'full_name', 'email', 'department']
          },
          {
            model: Room,
            attributes: ['id', 'name', 'code', 'location', 'floor']
          }
        ],
        order: [['start_time', 'ASC']]
      });

      if (isAdmin) return bookings;

      // Regular users: show non-hidden bookings + admin-hidden ones now in visible range
      const visibleRange = await this.getVisibleRange();
      return bookings.filter(b => {
        if (!b.is_admin_hidden) return true;
        return this.isDateVisibleToUsers(new Date(b.start_time), visibleRange);
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Computes the booking window currently visible to regular users.
   */
  static async getVisibleRange() {
    const settings = await AdminSettingService.getAll();
    const weeklyEnabled = settings.booking_freeze_weekly_enabled === 'true';

    const vnNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const dow = vnNow.getDay();

    const thisMonday = new Date(vnNow);
    thisMonday.setDate(vnNow.getDate() + (dow === 0 ? -6 : 1 - dow));
    thisMonday.setHours(0, 0, 0, 0);

    const nextMonday = new Date(thisMonday);
    nextMonday.setDate(thisMonday.getDate() + 7);

    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6);
    nextSunday.setHours(23, 59, 59, 999);

    let hasOpened = true;
    if (weeklyEnabled) {
      const openDay = parseInt(settings.booking_freeze_weekly_day ?? '4', 10);
      const [openHour, openMinute] = (settings.booking_freeze_weekly_time ?? '14:00').split(':').map(Number);
      const openOffset = openDay === 0 ? 6 : openDay - 1;
      const openingThisWeek = new Date(thisMonday);
      openingThisWeek.setDate(thisMonday.getDate() + openOffset);
      openingThisWeek.setHours(openHour, openMinute, 0, 0);
      hasOpened = vnNow >= openingThisWeek;
    }

    return { weeklyEnabled, thisMonday, nextMonday, nextSunday, hasOpened };
  }

  /**
   * Returns true if the given date is within the range regular users can currently see/book.
   */
  static isDateVisibleToUsers(date, { weeklyEnabled, thisMonday, nextMonday, nextSunday, hasOpened }) {
    if (!weeklyEnabled) return true;
    if (date >= thisMonday && date < nextMonday) return true;
    if (hasOpened && date >= nextMonday && date <= nextSunday) return true;
    return false;
  }

  /**
   * Kiểm tra conflict booking
   * @param {string} roomId
   * @param {Date} startTime
   * @param {Date} endTime
   * @param {string|null} excludeBookingId - booking id to exclude from conflict check
   */
  static async checkTimeConflict(roomId, startTime, endTime, excludeBookingId = null) {
    try {
      const where = {
        room_id: roomId,
        status: {
          [Op.in]: ['pending', 'confirmed', 'active']
        },
        [Op.or]: [
          { start_time: { [Op.gte]: startTime, [Op.lt]: endTime } },
          { end_time: { [Op.gt]: startTime, [Op.lte]: endTime } },
          { start_time: { [Op.lte]: startTime }, end_time: { [Op.gte]: endTime } }
        ]
      };

      if (excludeBookingId) {
        where.id = { [Op.ne]: excludeBookingId };
      }

      const conflict = await Booking.findOne({ where });
      return conflict;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Tạo booking mới
   */
  static async createBooking(userId, bookingData) {
    try {
      const {
        room_id,
        title,
        participants_count,
        start_time,
        end_time,
        recurring,
        notes
      } = bookingData;

      // Validate required fields
      if (!room_id || !title || !participants_count || !start_time || !end_time) {
        throw new Error('Missing required fields');
      }

      const startTime = new Date(start_time);
      const endTime = new Date(end_time);

      // Validate time
      if (endTime <= startTime) {
        throw new Error('end_time must be after start_time');
      }

      // Get room để check capacity & constraints
      const room = await Room.findByPk(room_id);
      if (!room || !room.is_active) {
        throw new Error('Room not found or inactive');
      }

      // Get user để check role & constraints
      const user = await User.findByPk(userId);
      if (!user || !user.is_active) {
        throw new Error('User not found or inactive');
      }

      // Validate capacity
      if (participants_count > room.capacity) {
        throw new Error(`Room capacity is ${room.capacity}, but ${participants_count} participants requested`);
      }

      // Validate VIP rooms (chỉ admin/vip được book)
      if (room.is_vip && user.role !== 'admin' && user.role !== 'vip') {
        throw new Error('This is a VIP room. Only admins and VIPs can book');
      }


      // Only allow booking in current or next week based on weekly opening schedule
      if (user.role !== 'admin') {
        const settings = await AdminSettingService.getAll();
        const weeklyEnabled = settings.booking_freeze_weekly_enabled === 'true';

        if (weeklyEnabled) {
          const vnNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
          const openDay = parseInt(settings.booking_freeze_weekly_day ?? '4', 10);
          const [openHour, openMinute] = (settings.booking_freeze_weekly_time ?? '14:00').split(':').map(Number);

          const dow = vnNow.getDay();
          const thisMonday = new Date(vnNow);
          thisMonday.setDate(vnNow.getDate() + (dow === 0 ? -6 : 1 - dow));
          thisMonday.setHours(0, 0, 0, 0);

          const nextMonday = new Date(thisMonday);
          nextMonday.setDate(thisMonday.getDate() + 7);
          const nextSunday = new Date(nextMonday);
          nextSunday.setDate(nextMonday.getDate() + 6);
          nextSunday.setHours(23, 59, 59, 999);

          // Compute this week's opening datetime (Mon-anchored offset)
          const openOffset = openDay === 0 ? 6 : openDay - 1;
          const openingThisWeek = new Date(thisMonday);
          openingThisWeek.setDate(thisMonday.getDate() + openOffset);
          openingThisWeek.setHours(openHour, openMinute, 0, 0);

          const hasOpened = vnNow >= openingThisWeek;

          if (!hasOpened) {
            // Before opening: only allow booking THIS week
            if (!(startTime >= thisMonday && startTime < nextMonday)) {
              throw new Error('Chưa mở booking cho tuần tiếp theo.');
            }
          } else {
            // After opening: allow THIS week + NEXT week
            if (!(startTime >= thisMonday && startTime <= nextSunday)) {
              throw new Error('Chỉ được đặt phòng trong tuần này và tuần tiếp theo.');
            }
          }
        }
      }

      // Check for time conflicts (checks against all bookings including admin-hidden)
      const conflict = await this.checkTimeConflict(room_id, startTime, endTime, null);
      if (conflict) {
        throw new Error(`Room is already booked for this time slot`);
      }

      // Admin bookings for dates not yet visible to users are hidden until opening time
      let isAdminHidden = false;
      if (user.role === 'admin') {
        const visibleRange = await this.getVisibleRange();
        isAdminHidden = !this.isDateVisibleToUsers(startTime, visibleRange);
      }

      // Tạo booking
      const booking = await Booking.create({
        room_id,
        user_id: userId,
        title,
        participants_count: parseInt(participants_count),
        start_time: startTime,
        end_time: endTime,
        status: 'confirmed', // Tạo ngay với status confirmed (không cần pending)
        recurring: recurring || 'none',
        notes,
        is_admin_hidden: isAdminHidden
      });

      return await this.getBookingById(booking.id);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cập nhật booking (extend/early finish)
   */
  static async updateBooking(bookingId, updateData) {
    try {
      const booking = await Booking.findByPk(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      const { action, new_end_time } = updateData;

      if (action === 'edit') {
        const { title, notes, start_time, end_time, participants_count } = updateData;
        const newStart = start_time ? new Date(start_time) : new Date(booking.start_time);
        const newEnd   = end_time   ? new Date(end_time)   : new Date(booking.end_time);

        if (newEnd <= newStart) {
          throw new Error('Giờ kết thúc phải sau giờ bắt đầu');
        }

        // Check conflict
        const conflict = await this.checkTimeConflict(booking.room_id, newStart, newEnd, bookingId);
        if (conflict) {
          throw new Error('Phòng đã có người đặt trong khung giờ này');
        }

        if (title !== undefined)             booking.title              = title;
        if (notes !== undefined)             booking.notes              = notes;
        if (participants_count !== undefined) booking.participants_count = participants_count;
        booking.start_time = newStart;
        booking.end_time   = newEnd;
      } else if (action === 'extend') {
        if (!new_end_time) {
          throw new Error('new_end_time is required for extend action');
        }

        const newEndTime = new Date(new_end_time);
        const currentEndTime = new Date(booking.end_time);

        if (newEndTime <= currentEndTime) {
          throw new Error('new_end_time must be after current end_time');
        }

        // Check conflict với next booking
        const conflict = await this.checkTimeConflict(
          booking.room_id,
          currentEndTime,
          newEndTime,
          bookingId
        );
        if (conflict) {
          throw new Error('Cannot extend: next booking conflicts');
        }

        booking.end_time = newEndTime;
      } else if (action === 'early_finish') {
        booking.status = 'completed';
      } else {
        throw new Error('Invalid action. Use "extend" or "early_finish"');
      }

      await booking.save();
      return await this.getBookingById(bookingId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Hủy booking
   * @param {string} bookingId
   * @param {string} userId - người thực hiện hủy
   * @param {string|null} message - lời nhắn của admin khi hủy booking người khác
   */
  static async cancelBooking(bookingId, userId, message = null) {
    try {
      const booking = await Booking.findByPk(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Kiểm tra user là owner hoặc admin
      if (booking.user_id !== userId) {
        const user = await User.findByPk(userId);
        if (user.role !== 'admin') {
          throw new Error('You can only cancel your own bookings');
        }
      }

      // Không thể hủy booking đã hoàn thành
      if (booking.status === 'completed') {
        throw new Error('Cannot cancel a booking that has already completed');
      }

      booking.status = 'cancelled';
      if (message) booking.cancellation_message = message.trim();
      await booking.save();

      return booking;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Admin update booking time (reschedule)
   * @param {string} bookingId
   * @param {string} userId - admin user ID
   * @param {Object} updateData - { start_time?, end_time? }
   */
  static async adminUpdateBooking(bookingId, userId, updateData) {
    try {
      // Verify user is admin
      const user = await User.findByPk(userId);
      if (!user || user.role !== 'admin') {
        throw new Error('Only admins can update bookings');
      }

      const booking = await Booking.findByPk(bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      const { start_time, end_time } = updateData;
      
      // Update times if provided
      if (start_time) {
        booking.start_time = new Date(start_time);
      }
      if (end_time) {
        booking.end_time = new Date(end_time);
      }

      // Validate times
      if (booking.end_time <= booking.start_time) {
        throw new Error('end_time must be after start_time');
      }

      const conflict = await this.checkTimeConflict(
        booking.room_id,
        booking.start_time,
        booking.end_time,
        bookingId
      );
      if (conflict) {
        throw new Error(`Room is already booked for this new time slot`);
      }

      await booking.save();
      return await this.getBookingById(bookingId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Lấy tất cả booking (admin only)
   */
  static async getAllBookings({ status, roomId, startDate, endDate, limit = 100, offset = 0 } = {}) {
    try {
      const where = {};

      if (status && status !== 'all') {
        where.status = status;
      }

      if (roomId) where.room_id = roomId;

      if (startDate) where.start_time = { [Op.gte]: new Date(startDate) };
      if (endDate) where.end_time = { ...(where.end_time || {}), [Op.lte]: new Date(endDate) };

      const bookings = await Booking.findAll({
        where,
        include: [
          { model: User, attributes: ['id', 'full_name', 'email', 'department'] },
          { model: Room, attributes: ['id', 'name', 'code', 'location', 'floor'] }
        ],
        order: [['start_time', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      return bookings;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Auto-cancel booking (background job)
   * Gọi mỗi phút từ cron job
   */
  static async autoCancelNoShowBookings() {
    try {
      const timeoutMinutes = parseInt(process.env.AUTO_CHECKIN_TIMEOUT_MINUTES || 15);
      const timeoutMs = timeoutMinutes * 60 * 1000;
      const now = new Date();
      const cutoffTime = new Date(now.getTime() - timeoutMs);

      // Tìm booking:
      // - Status = confirmed (chưa check-in)
      // - Start time trong quá khứ nhưng không quá 15 phút
      const noShowBookings = await Booking.findAll({
        where: {
          status: 'confirmed',
          start_time: {
            [Op.lte]: cutoffTime
          }
        },
        include: [
          {
            association: 'checkin',
            attributes: ['id'],
            required: false
          }
        ]
      });

      // Filter những booking không có checkin
      const toCancel = noShowBookings.filter(b => !b.checkin);

      for (const booking of toCancel) {
        booking.status = 'cancelled';
        await booking.save();
        console.log(`[Auto-Cancel] Booking ${booking.id} cancelled (no check-in)`);
      }

      return toCancel.length;
    } catch (error) {
      console.error('Auto-cancel error:', error);
      throw error;
    }
  }
}

module.exports = BookingService;
