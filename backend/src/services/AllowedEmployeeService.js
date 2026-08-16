const { AllowedEmployee, User } = require('../models');
const { Op } = require('sequelize');

/**
 * Danh sách MSNV được phép truy cập hệ thống — allowlist độc lập, admin tự
 * quản lý (thêm tay hoặc import Excel). Đây cũng là nguồn dữ liệu gốc cho
 * MSNV/Họ tên/Phòng ban/Email — AuthService đồng bộ các trường này vào user
 * record lúc đăng nhập (khớp theo email, vì chưa có SSO gửi MSNV trực tiếp).
 */
class AllowedEmployeeService {
  static async list() {
    return await AllowedEmployee.findAll({
      order: [['created_at', 'DESC']],
      include: [{ model: User, as: 'user', attributes: ['id', 'role', 'is_active'], required: false }]
    });
  }

  static async isAllowed(employeeId) {
    if (!employeeId) return false;
    const found = await AllowedEmployee.findOne({ where: { employee_id: String(employeeId).trim() } });
    return !!found;
  }

  // Tìm bản ghi allowlist khớp theo MSNV (ưu tiên, sẽ có khi SSO gửi kèm) hoặc theo email
  // (dùng được ngay bây giờ, trước khi có SSO) — dùng để vừa xét quyền vừa đồng bộ thông tin.
  static async findMatch(employeeId, email) {
    const id = employeeId ? String(employeeId).trim() : null;
    const mail = email ? String(email).trim() : null;

    if (id) {
      const byId = await AllowedEmployee.findOne({ where: { employee_id: id } });
      if (byId) return byId;
    }
    if (mail) {
      return await AllowedEmployee.findOne({ where: { email: { [Op.iLike]: mail } } });
    }
    return null;
  }

  static async add(employeeId, fullName, department, email, addedBy, jobTitle) {
    const id = String(employeeId || '').trim();
    if (!id) throw new Error('MSNV không được để trống');

    const [record] = await AllowedEmployee.findOrCreate({
      where: { employee_id: id },
      defaults: {
        full_name: fullName ? String(fullName).trim() : null,
        department: department ? String(department).trim() : null,
        job_title: jobTitle ? String(jobTitle).trim() : null,
        email: email ? String(email).trim().toLowerCase() : null,
        added_by: addedBy || null
      }
    });
    return record;
  }

  // rows: [{ employee_id, full_name, department, job_title, email }] — dùng cho import từ Excel (đã parse ở frontend)
  static async bulkImport(rows, addedBy) {
    const cleaned = rows
      .map((r) => ({
        employee_id: String(r.employee_id || '').trim(),
        full_name: r.full_name ? String(r.full_name).trim() : null,
        department: r.department ? String(r.department).trim() : null,
        job_title: r.job_title ? String(r.job_title).trim() : null,
        email: r.email ? String(r.email).trim().toLowerCase() : null
      }))
      .filter((r) => r.employee_id);

    if (cleaned.length === 0) {
      throw new Error('Không tìm thấy MSNV hợp lệ nào trong file');
    }

    const existing = await AllowedEmployee.findAll({
      where: { employee_id: cleaned.map((r) => r.employee_id) },
      attributes: ['employee_id']
    });
    const existingSet = new Set(existing.map((e) => e.employee_id));
    const toInsert = cleaned.filter((r) => !existingSet.has(r.employee_id));

    // Cùng 1 MSNV lặp lại nhiều dòng trong file — chỉ giữ dòng đầu
    const seen = new Set();
    const deduped = toInsert.filter((r) => {
      if (seen.has(r.employee_id)) return false;
      seen.add(r.employee_id);
      return true;
    });

    if (deduped.length > 0) {
      await AllowedEmployee.bulkCreate(deduped.map((r) => ({ ...r, added_by: addedBy || null })));
    }

    return { inserted: deduped.length, skipped: cleaned.length - deduped.length };
  }

  static async remove(id) {
    const existing = await AllowedEmployee.findByPk(id);
    if (!existing) return false;
    await existing.destroy();
    return true;
  }

  static async removeMany(ids) {
    const list = Array.isArray(ids) ? ids.filter(Boolean) : [];
    if (list.length === 0) return 0;
    return await AllowedEmployee.destroy({ where: { id: list } });
  }
}

module.exports = AllowedEmployeeService;
