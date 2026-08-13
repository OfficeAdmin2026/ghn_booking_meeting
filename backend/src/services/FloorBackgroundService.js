const { FloorBackground } = require('../models');
const { imageSize } = require('image-size');

const ALLOWED_MIMETYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp'
};

/**
 * Service layer cho ảnh sơ đồ tầng. Ảnh được lưu dạng base64 data URI
 * ngay trong cột image_url (Postgres) — không phụ thuộc dịch vụ storage
 * ngoài. 1 tầng (location+floor) chỉ có 1 ảnh — upload lại là ghi đè.
 */
class FloorBackgroundService {
  // Danh sách nhẹ (không kèm image_url) — chỉ dùng để biết tầng nào đã có ảnh.
  // Muốn lấy ảnh thật của 1 tầng cụ thể thì dùng getOne().
  static async getAll() {
    return await FloorBackground.findAll({ attributes: { exclude: ['image_url'] } });
  }

  static async getOne(location, floor) {
    return await FloorBackground.findOne({ where: { location, floor } });
  }

  static async upload({ location, floor, buffer, mimetype, userId }) {
    const ext = ALLOWED_MIMETYPES[mimetype];
    if (!ext) {
      throw new Error(
        'Chỉ chấp nhận file ảnh PNG, JPG hoặc WebP. Nếu bạn có file PDF, vui lòng xuất/chụp thành ảnh PNG trước khi tải lên.'
      );
    }

    let dimensions;
    try {
      dimensions = imageSize(buffer);
    } catch {
      throw new Error('Không đọc được kích thước ảnh — file có thể bị hỏng');
    }

    const imageUrl = `data:${mimetype};base64,${buffer.toString('base64')}`;

    const existing = await FloorBackground.findOne({ where: { location, floor } });
    if (existing) {
      existing.image_url = imageUrl;
      existing.width = dimensions.width;
      existing.height = dimensions.height;
      existing.uploaded_by = userId;
      await existing.save();
      return existing;
    }

    return await FloorBackground.create({
      location,
      floor,
      image_url: imageUrl,
      width: dimensions.width,
      height: dimensions.height,
      uploaded_by: userId
    });
  }

  static async remove(location, floor) {
    const existing = await FloorBackground.findOne({ where: { location, floor } });
    if (!existing) return false;
    await existing.destroy();
    return true;
  }
}

module.exports = FloorBackgroundService;
