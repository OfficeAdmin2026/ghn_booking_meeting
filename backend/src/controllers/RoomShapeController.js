const RoomShapeService = require('../services/RoomShapeService');

/**
 * Controller layer cho khung phòng vẽ tay trên Bản đồ văn phòng.
 */
class RoomShapeController {
  /**
   * GET /api/room-shapes
   * Mọi user đăng nhập đều đọc được (để hiển thị khung phòng trên bản đồ)
   */
  static async list(req, res) {
    try {
      const shapes = await RoomShapeService.getAll();
      res.json({ status: 'success', data: { shapes } });
    } catch (error) {
      console.error('List room shapes error:', error);
      res.status(500).json({ error: { status: 500, message: error.message } });
    }
  }

  /**
   * PUT /api/room-shapes/:roomId (admin only)
   */
  static async save(req, res) {
    try {
      const { roomId } = req.params;
      const { points } = req.body;
      const shape = await RoomShapeService.upsert(roomId, points, req.user.id);
      res.json({ status: 'success', data: { shape } });
    } catch (error) {
      console.error('Save room shape error:', error);
      res.status(400).json({ error: { status: 400, message: error.message } });
    }
  }

  /**
   * DELETE /api/room-shapes/:roomId (admin only)
   */
  static async remove(req, res) {
    try {
      const { roomId } = req.params;
      await RoomShapeService.remove(roomId);
      res.json({ status: 'success', message: 'Đã xoá khung phòng' });
    } catch (error) {
      console.error('Remove room shape error:', error);
      res.status(500).json({ error: { status: 500, message: error.message } });
    }
  }
}

module.exports = RoomShapeController;
