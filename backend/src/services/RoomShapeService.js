const { RoomShape } = require('../models');

/**
 * Service layer cho khung phòng vẽ tay trên Bản đồ văn phòng.
 * 1 phòng chỉ có tối đa 1 khung (unique room_id) — vẽ lại là ghi đè.
 */
class RoomShapeService {
  static async getAll() {
    return await RoomShape.findAll();
  }

  static validatePoints(points) {
    if (!Array.isArray(points) || points.length < 3) {
      throw new Error('Khung phòng cần ít nhất 3 điểm');
    }
    for (const p of points) {
      if (typeof p?.x !== 'number' || typeof p?.y !== 'number') {
        throw new Error('Mỗi điểm phải có toạ độ x, y dạng số');
      }
    }
  }

  static async upsert(roomId, points, userId) {
    this.validatePoints(points);

    const existing = await RoomShape.findOne({ where: { room_id: roomId } });
    if (existing) {
      existing.points = points;
      existing.created_by = userId;
      await existing.save();
      return existing;
    }

    return await RoomShape.create({ room_id: roomId, points, created_by: userId });
  }

  static async remove(roomId) {
    const existing = await RoomShape.findOne({ where: { room_id: roomId } });
    if (!existing) return false;
    await existing.destroy();
    return true;
  }
}

module.exports = RoomShapeService;
