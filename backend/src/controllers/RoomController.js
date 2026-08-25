const RoomService = require('../services/RoomService');
const { sendServerError } = require('../utils/sendServerError');

/**
 * Controller layer cho room management
 */

class RoomController {
  /**
   * GET /api/rooms
   * Lấy danh sách tất cả phòng
   */
  static async getAllRooms(req, res) {
    try {
      const filters = {
        location: req.query.location,
        floor: req.query.floor,
        min_capacity: req.query.min_capacity,
        is_vip: req.query.is_vip
      };

      // User thường không được thấy phòng VIP
      if (req.user.role === 'user') {
        filters.is_vip = false;
      }

      const rooms = await RoomService.getAllRooms(filters);

      res.json({
        status: 'success',
        data: {
          count: rooms.length,
          rooms
        }
      });
    } catch (error) {
      console.error('Get rooms error:', error);
      sendServerError(res, error, 'Failed to get rooms');
    }
  }

  /**
   * GET /api/rooms/search
   * Tìm phòng trống theo time slot + filters
   * Query params: start_time, end_time, capacity, amenities, location, floor
   */
  static async searchRooms(req, res) {
    try {
      const filters = {
        start_time: req.query.start_time,
        end_time: req.query.end_time,
        capacity: req.query.capacity,
        amenities: req.query.amenities
          ? (Array.isArray(req.query.amenities)
              ? req.query.amenities
              : [req.query.amenities])
          : [],
        location: req.query.location,
        floor: req.query.floor
      };

      // User thường không được thấy phòng VIP trong kết quả tìm kiếm
      if (req.user.role === 'user') {
        filters.is_vip = false;
      }

      const rooms = await RoomService.searchAvailableRooms(filters);

      res.json({
        status: 'success',
        data: {
          count: rooms.length,
          rooms
        }
      });
    } catch (error) {
      console.error('Search rooms error:', error);

      if (error.message.includes('required') || error.message.includes('after')) {
        return res.status(400).json({ error: { status: 400, message: error.message } });
      }
      sendServerError(res, error, 'Failed to search rooms');
    }
  }

  /**
   * GET /api/rooms/:id
   * Lấy chi tiết 1 phòng
   */
  static async getRoomById(req, res) {
    try {
      const { id } = req.params;

      const room = await RoomService.getRoomById(id);

      res.json({
        status: 'success',
        data: { room }
      });
    } catch (error) {
      console.error('Get room error:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({ error: { status: 404, message: error.message } });
      }
      sendServerError(res, error, 'Failed to get room');
    }
  }

  /**
   * POST /api/rooms
   * Tạo phòng mới (admin only)
   */
  static async createRoom(req, res) {
    try {
      // Check admin role (middleware should enforce this)
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          error: {
            status: 403,
            message: 'Admin access required'
          }
        });
      }

      const roomData = req.body;

      const room = await RoomService.createRoom(roomData);

      res.status(201).json({
        status: 'success',
        data: { room }
      });
    } catch (error) {
      console.error('Create room error:', error);

      if (error.message.includes('Missing') || error.message.includes('required')) {
        return res.status(400).json({ error: { status: 400, message: error.message } });
      }
      sendServerError(res, error, 'Failed to create room');
    }
  }

  /**
   * PUT /api/rooms/:id
   * Cập nhật phòng (admin only)
   */
  static async updateRoom(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          error: {
            status: 403,
            message: 'Admin access required'
          }
        });
      }

      const { id } = req.params;
      const roomData = req.body;

      const room = await RoomService.updateRoom(id, roomData);

      res.json({
        status: 'success',
        data: { room }
      });
    } catch (error) {
      console.error('Update room error:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({ error: { status: 404, message: error.message } });
      }
      sendServerError(res, error, 'Failed to update room');
    }
  }

  /**
   * DELETE /api/rooms/:id
   * Xóa phòng (admin only)
   */
  static async deleteRoom(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          error: {
            status: 403,
            message: 'Admin access required'
          }
        });
      }

      const { id } = req.params;

      const room = await RoomService.deleteRoom(id);

      res.json({
        status: 'success',
        message: 'Room deleted successfully',
        data: { room }
      });
    } catch (error) {
      console.error('Delete room error:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({ error: { status: 404, message: error.message } });
      }
      sendServerError(res, error, 'Failed to delete room');
    }
  }
}

module.exports = RoomController;
