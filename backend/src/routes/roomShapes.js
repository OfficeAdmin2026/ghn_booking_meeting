const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const RoomShapeController = require('../controllers/RoomShapeController');

// GET /api/room-shapes - mọi user đăng nhập đều đọc được
router.get('/', authMiddleware, RoomShapeController.list);

// PUT /api/room-shapes/:roomId - chỉ admin lưu/ghi đè
router.put('/:roomId', authMiddleware, adminMiddleware, RoomShapeController.save);

// DELETE /api/room-shapes - chỉ admin xoá tất cả (đặt trước /:roomId)
router.delete('/', authMiddleware, adminMiddleware, RoomShapeController.removeAll);

// DELETE /api/room-shapes/:roomId - chỉ admin xoá từng phòng
router.delete('/:roomId', authMiddleware, adminMiddleware, RoomShapeController.remove);

module.exports = router;
