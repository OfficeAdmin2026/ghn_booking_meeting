const { Room, RoomAmenity, Booking } = require('../models');
const { Op } = require('sequelize');

/**
 * Service layer cho room management
 * Xử lý: search phòng, check availability, CRUD operations
 */

class RoomService {
  /**
   * Lấy tất cả phòng
   */
  static async getAllRooms(filters = {}) {
    try {
      const where = { is_active: true };

      // Filter by location
      if (filters.location) {
        where.location = filters.location;
      }

      // Filter by floor
      if (filters.floor) {
        where.floor = filters.floor;
      }

      // Filter by capacity (>=)
      if (filters.min_capacity) {
        where.capacity = {
          [Op.gte]: parseInt(filters.min_capacity)
        };
      }

      // Filter by VIP
      if (filters.is_vip !== undefined) {
        where.is_vip = filters.is_vip === 'true' || filters.is_vip === true;
      }

      const rooms = await Room.findAll({
        where,
        include: [
          {
            association: 'amenities',
            attributes: ['id', 'amenity']
          }
        ],
        order: [['location', 'ASC'], ['floor', 'ASC']]
      });

      return rooms;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Tìm phòng trống theo thời gian + filters
   */
  static async searchAvailableRooms(filters = {}) {
    try {
      const {
        start_time,
        end_time,
        capacity,
        amenities,
        location,
        floor,
        is_vip
      } = filters;

      // Validate required fields
      if (!start_time || !end_time) {
        throw new Error('start_time and end_time are required');
      }

      const startTime = new Date(start_time);
      const endTime = new Date(end_time);

      if (endTime <= startTime) {
        throw new Error('end_time must be after start_time');
      }

      // Build where clause
      const whereRoom = { is_active: true };

      if (capacity) {
        whereRoom.capacity = {
          [Op.gte]: parseInt(capacity)
        };
      }

      if (location) {
        whereRoom.location = location;
      }

      if (floor) {
        whereRoom.floor = floor;
      }

      if (is_vip !== undefined) {
        whereRoom.is_vip = is_vip === 'true' || is_vip === true;
      }

      // Tìm phòng không có booking conflict
      const bookingsInTimeRange = await Booking.findAll({
        where: {
          status: {
            [Op.in]: ['pending', 'confirmed', 'active']
          },
          [Op.or]: [
            // Booking start trong range
            {
              start_time: {
                [Op.gte]: startTime,
                [Op.lt]: endTime
              }
            },
            // Booking end trong range
            {
              end_time: {
                [Op.gt]: startTime,
                [Op.lte]: endTime
              }
            },
            // Booking cover cả range
            {
              start_time: { [Op.lte]: startTime },
              end_time: { [Op.gte]: endTime }
            }
          ]
        },
        attributes: ['room_id'],
        raw: true
      });

      const bookedRoomIds = bookingsInTimeRange.map(b => b.room_id);

      if (bookedRoomIds.length > 0) {
        whereRoom.id = {
          [Op.notIn]: bookedRoomIds
        };
      }

      // Lấy rooms với amenities
      let rooms = await Room.findAll({
        where: whereRoom,
        include: [
          {
            association: 'amenities',
            attributes: ['id', 'amenity']
          }
        ],
        order: [['capacity', 'DESC']]
      });

      // Filter by amenities (nếu có)
      if (amenities && amenities.length > 0) {
        rooms = rooms.filter(room => {
          const roomAmenities = room.amenities.map(a => a.amenity);
          return amenities.every(a => roomAmenities.includes(a));
        });
      }

      return rooms;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Lấy chi tiết 1 phòng
   */
  static async getRoomById(roomId) {
    try {
      const room = await Room.findByPk(roomId, {
        include: [
          {
            association: 'amenities',
            attributes: ['id', 'amenity']
          }
        ]
      });

      if (!room) {
        throw new Error('Room not found');
      }

      return room;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Tạo phòng (admin only)
   */
  static async createRoom(roomData) {
    try {
      const { name, location, floor, capacity, code, is_vip, amenities } = roomData;

      // Validate required fields
      if (!name || !location || !floor || !capacity || !code) {
        throw new Error('Missing required fields');
      }

      // Tạo room
      const room = await Room.create({
        name,
        location,
        floor,
        capacity: parseInt(capacity),
        code,
        is_vip: is_vip || false,
        is_active: true
      });

      // Thêm amenities nếu có
      if (amenities && amenities.length > 0) {
        for (const amenity of amenities) {
          await RoomAmenity.create({
            room_id: room.id,
            amenity
          });
        }
      }

      // Return room with amenities
      return await this.getRoomById(room.id);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cập nhật phòng (admin only)
   */
  static async updateRoom(roomId, roomData) {
    try {
      const room = await Room.findByPk(roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      // Update fields
      const { name, location, floor, capacity, code, is_vip, is_active, amenities } = roomData;

      if (name) room.name = name;
      if (location) room.location = location;
      if (floor) room.floor = floor;
      if (capacity) room.capacity = capacity;
      if (code) room.code = code;
      if (is_vip !== undefined) room.is_vip = is_vip;
      if (is_active !== undefined) room.is_active = is_active;

      await room.save();

      // Update amenities
      if (amenities) {
        // Xoá amenities cũ
        await RoomAmenity.destroy({ where: { room_id: roomId } });

        // Thêm amenities mới
        for (const amenity of amenities) {
          await RoomAmenity.create({
            room_id: roomId,
            amenity
          });
        }
      }

      return await this.getRoomById(roomId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Xóa phòng (admin only)
   */
  static async deleteRoom(roomId) {
    try {
      const room = await Room.findByPk(roomId);
      if (!room) {
        throw new Error('Room not found');
      }

      // Xoá amenities
      await RoomAmenity.destroy({ where: { room_id: roomId } });

      // Soft delete (set is_active = false)
      room.is_active = false;
      await room.save();

      return room;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check nếu room available trong time range
   */
  static async isRoomAvailable(roomId, startTime, endTime) {
    try {
      const conflict = await Booking.findOne({
        where: {
          room_id: roomId,
          status: {
            [Op.in]: ['pending', 'confirmed', 'active']
          },
          [Op.or]: [
            { start_time: { [Op.lt]: endTime }, end_time: { [Op.gt]: startTime } }
          ]
        }
      });

      return !conflict;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = RoomService;
