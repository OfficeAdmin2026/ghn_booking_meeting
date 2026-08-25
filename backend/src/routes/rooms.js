const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const RoomController = require('../controllers/RoomController');

// GET /api/rooms - List all rooms
router.get('/', authMiddleware, RoomController.getAllRooms);

// GET /api/rooms/search - Search available rooms with filters
router.get('/search', authMiddleware, RoomController.searchRooms);

// POST /api/rooms - Create room (admin only)
router.post('/', authMiddleware, adminMiddleware, RoomController.createRoom);

// GET /api/rooms/:id - Get room details
router.get('/:id', authMiddleware, RoomController.getRoomById);

// PUT /api/rooms/:id - Update room (admin only)
router.put('/:id', authMiddleware, adminMiddleware, RoomController.updateRoom);

// DELETE /api/rooms/:id - Delete room (admin only)
router.delete('/:id', authMiddleware, adminMiddleware, RoomController.deleteRoom);

module.exports = router;
