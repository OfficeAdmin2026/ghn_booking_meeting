const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const CarController = require('../controllers/CarController');

// GET /api/cars - mọi user đăng nhập đều đọc được
router.get('/', authMiddleware, CarController.getAllCars);

// GET /api/cars/:id
router.get('/:id', authMiddleware, CarController.getCarById);

// POST /api/cars - chỉ admin thêm xe
router.post('/', authMiddleware, adminMiddleware, CarController.createCar);

// PUT /api/cars/:id - chỉ admin sửa xe
router.put('/:id', authMiddleware, adminMiddleware, CarController.updateCar);

// DELETE /api/cars/:id - chỉ admin xoá xe (soft delete)
router.delete('/:id', authMiddleware, adminMiddleware, CarController.deleteCar);

module.exports = router;
