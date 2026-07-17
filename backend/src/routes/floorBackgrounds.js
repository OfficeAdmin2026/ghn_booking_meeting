const express = require('express');
const multer = require('multer');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const FloorBackgroundController = require('../controllers/FloorBackgroundController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 } // 8MB
});

// multer ném lỗi qua next(err) mặc định (không có .status) — bọc lại để trả 400 rõ ràng
function uploadSingleImage(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: { status: 400, message: err.message || 'Tải file thất bại' } });
    }
    next();
  });
}

// GET /api/floor-backgrounds - mọi user đăng nhập đều đọc được
router.get('/', authMiddleware, FloorBackgroundController.list);

// POST /api/floor-backgrounds - chỉ admin upload (multipart: image, location, floor)
router.post('/', authMiddleware, adminMiddleware, uploadSingleImage, FloorBackgroundController.upload);

// DELETE /api/floor-backgrounds/:location/:floor - chỉ admin xoá
router.delete('/:location/:floor', authMiddleware, adminMiddleware, FloorBackgroundController.remove);

module.exports = router;
