const { MapAnnotation } = require('../models');

const TYPES = ['department', 'pantry', 'toilet', 'printer', 'elevator', 'exit'];
const SHAPES = ['point', 'polygon'];
const COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

/**
 * Service layer cho khu vực chung (thang máy, WC, pantry...) vẽ tay trên
 * Bản đồ văn phòng. Khác room_shapes/wayfinding_paths (khoá theo room_id),
 * 1 tầng có thể có nhiều bản ghi cùng loại nên cần CRUD thật theo id.
 */
class MapAnnotationService {
  static async getAll() {
    return await MapAnnotation.findAll();
  }

  static validate({ type, shape, points, color }) {
    if (!TYPES.includes(type)) {
      throw new Error('Loại khu vực không hợp lệ');
    }
    if (!SHAPES.includes(shape)) {
      throw new Error('Hình dạng khu vực không hợp lệ');
    }
    if (!Array.isArray(points) || (shape === 'point' && points.length !== 1) || (shape === 'polygon' && points.length < 3)) {
      throw new Error(shape === 'point' ? 'Khu vực dạng điểm cần đúng 1 điểm' : 'Khu vực dạng vùng cần ít nhất 3 điểm');
    }
    for (const p of points) {
      if (typeof p?.x !== 'number' || typeof p?.y !== 'number') {
        throw new Error('Mỗi điểm phải có toạ độ x, y dạng số');
      }
    }
    if (color != null && !COLOR_RE.test(color)) {
      throw new Error('Màu phải ở định dạng hex (vd #1B5FAF)');
    }
  }

  static async create({ location, floor, type, shape, points, color, label }, userId) {
    if (!location || !floor) {
      throw new Error('Thiếu location hoặc floor');
    }
    this.validate({ type, shape, points, color });
    return await MapAnnotation.create({
      location,
      floor,
      type,
      shape,
      points,
      color: color || null,
      label: label || null,
      created_by: userId
    });
  }

  static async update(id, { type, shape, points, color, label }, userId) {
    const existing = await MapAnnotation.findByPk(id);
    if (!existing) {
      throw new Error('Không tìm thấy khu vực này');
    }

    const nextType = type ?? existing.type;
    const nextShape = shape ?? existing.shape;
    const nextPoints = points ?? existing.points;
    const nextColor = color !== undefined ? color : existing.color;
    this.validate({ type: nextType, shape: nextShape, points: nextPoints, color: nextColor });

    existing.type = nextType;
    existing.shape = nextShape;
    existing.points = nextPoints;
    existing.color = nextColor || null;
    existing.label = label !== undefined ? (label || null) : existing.label;
    existing.created_by = userId;
    await existing.save();
    return existing;
  }

  static async remove(id) {
    const existing = await MapAnnotation.findByPk(id);
    if (!existing) return false;
    await existing.destroy();
    return true;
  }
}

module.exports = MapAnnotationService;
