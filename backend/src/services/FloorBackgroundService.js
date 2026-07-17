const { FloorBackground } = require('../models');
const { supabase, FLOOR_PLANS_BUCKET } = require('../config/supabase');
const { imageSize } = require('image-size');

const ALLOWED_MIMETYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp'
};

/**
 * Service layer cho ảnh sơ đồ tầng (upload trực tiếp lên Supabase Storage,
 * URL + kích thước lưu trong DB). 1 tầng (location+floor) chỉ có 1 ảnh —
 * upload lại là ghi đè.
 */
class FloorBackgroundService {
  static async getAll() {
    return await FloorBackground.findAll();
  }

  static async upload({ location, floor, buffer, mimetype, userId }) {
    if (!supabase) {
      throw new Error('Supabase Storage chưa được cấu hình trên server (thiếu SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)');
    }

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

    const safeLocation = location.replace(/\s+/g, '-').toLowerCase();
    const safeFloor = floor.replace(/\s+/g, '-').toLowerCase();
    const path = `${safeLocation}/${safeFloor}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(FLOOR_PLANS_BUCKET)
      .upload(path, buffer, { contentType: mimetype, upsert: true });
    if (uploadError) {
      throw new Error(`Tải ảnh lên Supabase Storage thất bại: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage.from(FLOOR_PLANS_BUCKET).getPublicUrl(path);
    const imageUrl = publicUrlData.publicUrl;

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
