const { WayfindingPath } = require('../models');

/**
 * Service layer cho đường chỉ dẫn vẽ tay trên Bản đồ văn phòng.
 * 1 phòng chỉ có tối đa 1 đường (unique room_id) — lưu lại là ghi đè.
 */
class WayfindingPathService {
  static async getAll() {
    return await WayfindingPath.findAll();
  }

  static validatePoints(points) {
    if (!Array.isArray(points) || points.length < 2) {
      throw new Error('Đường chỉ dẫn cần ít nhất 2 điểm');
    }
    for (const p of points) {
      if (typeof p?.x !== 'number' || typeof p?.y !== 'number') {
        throw new Error('Mỗi điểm phải có toạ độ x, y dạng số');
      }
    }
  }

  static async upsert(roomId, points, userId) {
    this.validatePoints(points);

    const existing = await WayfindingPath.findOne({ where: { room_id: roomId } });
    if (existing) {
      existing.points = points;
      existing.created_by = userId;
      await existing.save();
      return existing;
    }

    return await WayfindingPath.create({ room_id: roomId, points, created_by: userId });
  }

  static async remove(roomId) {
    const existing = await WayfindingPath.findOne({ where: { room_id: roomId } });
    if (!existing) return false;
    await existing.destroy();
    return true;
  }
}

module.exports = WayfindingPathService;
