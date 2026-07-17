const WayfindingPathService = require('../services/WayfindingPathService');

/**
 * Controller layer cho đường chỉ dẫn vẽ tay trên Bản đồ văn phòng.
 */
class WayfindingPathController {
  /**
   * GET /api/wayfinding-paths
   * Mọi user đăng nhập đều đọc được (để hiển thị đường trên bản đồ)
   */
  static async list(req, res) {
    try {
      const paths = await WayfindingPathService.getAll();
      res.json({ status: 'success', data: { paths } });
    } catch (error) {
      console.error('List wayfinding paths error:', error);
      res.status(500).json({ error: { status: 500, message: error.message } });
    }
  }

  /**
   * PUT /api/wayfinding-paths/:roomId (admin only)
   */
  static async save(req, res) {
    try {
      const { roomId } = req.params;
      const { points } = req.body;
      const path = await WayfindingPathService.upsert(roomId, points, req.user.id);
      res.json({ status: 'success', data: { path } });
    } catch (error) {
      console.error('Save wayfinding path error:', error);
      res.status(400).json({ error: { status: 400, message: error.message } });
    }
  }

  /**
   * DELETE /api/wayfinding-paths/:roomId (admin only)
   */
  static async remove(req, res) {
    try {
      const { roomId } = req.params;
      await WayfindingPathService.remove(roomId);
      res.json({ status: 'success', message: 'Đã xoá đường chỉ dẫn' });
    } catch (error) {
      console.error('Remove wayfinding path error:', error);
      res.status(500).json({ error: { status: 500, message: error.message } });
    }
  }
}

module.exports = WayfindingPathController;
