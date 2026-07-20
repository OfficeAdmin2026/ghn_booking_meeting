const MapAnnotationService = require('../services/MapAnnotationService');

/**
 * Controller layer cho khu vực chung (thang máy, WC, pantry...) vẽ tay
 * trên Bản đồ văn phòng.
 */
class MapAnnotationController {
  /**
   * GET /api/map-annotations
   * Mọi user đăng nhập đều đọc được (để hiển thị trên bản đồ)
   */
  static async list(req, res) {
    try {
      const annotations = await MapAnnotationService.getAll();
      res.json({ status: 'success', data: { annotations } });
    } catch (error) {
      console.error('List map annotations error:', error);
      res.status(500).json({ error: { status: 500, message: error.message } });
    }
  }

  /**
   * POST /api/map-annotations (admin only)
   */
  static async create(req, res) {
    try {
      const { location, floor, type, shape, points, color, label } = req.body;
      const annotation = await MapAnnotationService.create({ location, floor, type, shape, points, color, label }, req.user.id);
      res.json({ status: 'success', data: { annotation } });
    } catch (error) {
      console.error('Create map annotation error:', error);
      res.status(400).json({ error: { status: 400, message: error.message } });
    }
  }

  /**
   * PUT /api/map-annotations/:id (admin only)
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { type, shape, points, color, label } = req.body;
      const annotation = await MapAnnotationService.update(id, { type, shape, points, color, label }, req.user.id);
      res.json({ status: 'success', data: { annotation } });
    } catch (error) {
      console.error('Update map annotation error:', error);
      res.status(400).json({ error: { status: 400, message: error.message } });
    }
  }

  /**
   * DELETE /api/map-annotations/:id (admin only)
   */
  static async remove(req, res) {
    try {
      const { id } = req.params;
      await MapAnnotationService.remove(id);
      res.json({ status: 'success', message: 'Đã xoá khu vực' });
    } catch (error) {
      console.error('Remove map annotation error:', error);
      res.status(500).json({ error: { status: 500, message: error.message } });
    }
  }
}

module.exports = MapAnnotationController;
