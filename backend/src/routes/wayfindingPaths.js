const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const WayfindingPathController = require('../controllers/WayfindingPathController');

// GET /api/wayfinding-paths - mọi user đăng nhập đều đọc được
router.get('/', authMiddleware, WayfindingPathController.list);

// PUT /api/wayfinding-paths/:roomId - chỉ admin lưu/ghi đè
router.put('/:roomId', authMiddleware, adminMiddleware, WayfindingPathController.save);

// DELETE /api/wayfinding-paths/:roomId - chỉ admin xoá
router.delete('/:roomId', authMiddleware, adminMiddleware, WayfindingPathController.remove);

module.exports = router;
