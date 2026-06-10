const RoomService = require('../services/RoomService');

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
      res.status(500).json({
        error: {
          status: 500,
          message: error.message || 'Failed to get rooms'
        }
      });
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

      let statusCode = 500;
      if (error.message.includes('required') || error.message.includes('after')) {
        statusCode = 400;
      }

      res.status(statusCode).json({
        error: {
          status: statusCode,
          message: error.message || 'Failed to search rooms'
        }
      });
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

      let statusCode = 500;
      if (error.message.includes('not found')) {
        statusCode = 404;
      }

      res.status(statusCode).json({
        error: {
          status: statusCode,
          message: error.message || 'Failed to get room'
        }
      });
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

      let statusCode = 500;
      if (error.message.includes('Missing') || error.message.includes('required')) {
        statusCode = 400;
      }

      res.status(statusCode).json({
        error: {
          status: statusCode,
          message: error.message || 'Failed to create room'
        }
      });
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

      let statusCode = 500;
      if (error.message.includes('not found')) {
        statusCode = 404;
      }

      res.status(statusCode).json({
        error: {
          status: statusCode,
          message: error.message || 'Failed to update room'
        }
      });
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

      let statusCode = 500;
      if (error.message.includes('not found')) {
        statusCode = 404;
      }

      res.status(statusCode).json({
        error: {
          status: statusCode,
          message: error.message || 'Failed to delete room'
        }
      });
    }
  }
}

module.exports = RoomController;
