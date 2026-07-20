const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const MapAnnotationController = require('../controllers/MapAnnotationController');

// GET /api/map-annotations - mọi user đăng nhập đều đọc được
router.get('/', authMiddleware, MapAnnotationController.list);

// POST /api/map-annotations - chỉ admin tạo mới
router.post('/', authMiddleware, adminMiddleware, MapAnnotationController.create);

// PUT /api/map-annotations/:id - chỉ admin sửa
router.put('/:id', authMiddleware, adminMiddleware, MapAnnotationController.update);

// DELETE /api/map-annotations/:id - chỉ admin xoá
router.delete('/:id', authMiddleware, adminMiddleware, MapAnnotationController.remove);

module.exports = router;
