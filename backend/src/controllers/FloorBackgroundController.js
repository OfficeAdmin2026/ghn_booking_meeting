const FloorBackgroundService = require('../services/FloorBackgroundService');

/**
 * Controller layer cho ảnh sơ đồ tầng.
 */
class FloorBackgroundController {
  /**
   * GET /api/floor-backgrounds
   * Mọi user đăng nhập đều đọc được
   */
  static async list(req, res) {
    try {
      const backgrounds = await FloorBackgroundService.getAll();
      res.json({ status: 'success', data: { backgrounds } });
    } catch (error) {
      console.error('List floor backgrounds error:', error);
      res.status(500).json({ error: { status: 500, message: error.message } });
    }
  }

  /**
   * POST /api/floor-backgrounds (admin only, multipart: image, location, floor)
   */
  static async upload(req, res) {
    try {
      const { location, floor } = req.body;
      if (!location || !floor) {
        return res.status(400).json({ error: { status: 400, message: 'Thiếu location hoặc floor' } });
      }
      if (!req.file) {
        return res.status(400).json({ error: { status: 400, message: 'Thiếu file ảnh' } });
      }

      const background = await FloorBackgroundService.upload({
        location,
        floor,
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
        userId: req.user.id
      });

      res.json({ status: 'success', data: { background } });
    } catch (error) {
      console.error('Upload floor background error:', error);
      res.status(400).json({ error: { status: 400, message: error.message } });
    }
  }

  /**
   * DELETE /api/floor-backgrounds/:location/:floor (admin only)
   */
  static async remove(req, res) {
    try {
      const { location, floor } = req.params;
      await FloorBackgroundService.remove(location, floor);
      res.json({ status: 'success', message: 'Đã xoá ảnh nền' });
    } catch (error) {
      console.error('Remove floor background error:', error);
      res.status(500).json({ error: { status: 500, message: error.message } });
    }
  }
}

module.exports = FloorBackgroundController;
