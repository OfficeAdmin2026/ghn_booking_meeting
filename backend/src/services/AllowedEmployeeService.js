const { AllowedEmployee, User } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Danh sách MSNV được phép truy cập hệ thống — allowlist độc lập, admin tự
 * quản lý (thêm tay hoặc import Excel). Đây cũng là nguồn dữ liệu gốc cho
 * MSNV/Họ tên/Phòng ban/Email — AuthService đồng bộ các trường này vào user
 * record lúc đăng nhập (khớp theo email, vì chưa có SSO gửi MSNV trực tiếp).
 */
class AllowedEmployeeService {
  // Danh sách MSNV được phép để hiển thị ở Admin — allowlist là bảng admin tự nhập tay nên
  // thường trống Chức danh/Phòng ban cho tới khi có ai đó chỉnh sửa; trong khi đó nếu người đó
  // đã từng đăng nhập SSO thì `users` đã có sẵn dữ liệu thật, mới hơn (VD: booking hiển thị
  // đúng chức danh dù allowlist chưa có). Ưu tiên hiển thị dữ liệu thật từ `users` khi allowlist
  // đang trống ở trường đó, không cần admin phải tự tay nhập lại.
  static async list() {
    const rows = await AllowedEmployee.findAll({
      order: [['created_at', 'DESC']],
      include: [{ model: User, as: 'user', attributes: ['id', 'role', 'is_active', 'full_name', 'department', 'job_title'], required: false }]
    });
    return rows.map((r) => {
      const plain = r.get({ plain: true });
      return {
        ...plain,
        job_title: plain.job_title || plain.user?.job_title || null,
        department: plain.department || plain.user?.department || null
      };
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

    const fields = {
      full_name: fullName ? String(fullName).trim() : null,
      department: department ? String(department).trim() : null,
      job_title: jobTitle ? String(jobTitle).trim() : null,
      email: email ? String(email).trim().toLowerCase() : null
    };

    let record = await AllowedEmployee.findOne({ where: { employee_id: id } });
    if (record) {
      // MSNV đã có sẵn trong danh sách — trước đây dùng findOrCreate() nên defaults bị bỏ qua
      // khi bản ghi đã tồn tại: admin sửa lại thông tin (VD: bổ sung chức danh còn thiếu) qua
      // form "Thêm MSNV" bị âm thầm không có tác dụng gì dù giao diện báo thành công. Giờ cập
      // nhật các trường được nhập vào bản ghi đã có.
      if (fields.full_name) record.full_name = fields.full_name;
      if (fields.department) record.department = fields.department;
      if (fields.job_title) record.job_title = fields.job_title;
      if (fields.email) record.email = fields.email;
      await record.save();
    } else {
      record = await AllowedEmployee.create({ employee_id: id, ...fields, added_by: addedBy || null });
    }

    await AllowedEmployeeService._syncToUser(id, fields);
    return record;
  }

  // Đẩy ngay thông tin vừa sửa/thêm vào bản ghi users tương ứng (nếu người đó đã từng đăng
  // nhập) — không đợi tới lần đăng nhập kế tiếp mới đồng bộ.
  static async _syncToUser(employeeId, fields) {
    const user = await User.findOne({ where: { employee_id: employeeId } });
    if (!user) return;
    let changed = false;
    if (fields.full_name && user.full_name !== fields.full_name) { user.full_name = fields.full_name; changed = true; }
    if (fields.department && user.department !== fields.department) { user.department = fields.department; changed = true; }
    if (fields.job_title && user.job_title !== fields.job_title) { user.job_title = fields.job_title; changed = true; }
    if (fields.email && user.email !== fields.email) { user.email = fields.email; changed = true; }
    if (changed) await user.save();
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

    // Cùng 1 MSNV lặp lại nhiều dòng trong file — chỉ giữ dòng đầu
    const seen = new Set();
    const deduped = cleaned.filter((r) => {
      if (seen.has(r.employee_id)) return false;
      seen.add(r.employee_id);
      return true;
    });

    const existing = await AllowedEmployee.findAll({
      where: { employee_id: deduped.map((r) => r.employee_id) }
    });
    const existingMap = new Map(existing.map((e) => [e.employee_id, e]));

    // MSNV đã có sẵn trong danh sách — trước đây bị bỏ qua hoàn toàn khi re-import, nên sửa
    // dữ liệu sai (VD: bổ sung chức danh còn thiếu) bằng cách import lại Excel không có tác
    // dụng gì. Giờ cập nhật các trường có giá trị trong file cho bản ghi đã có.
    const toInsert = [];
    let updated = 0;
    for (const r of deduped) {
      const found = existingMap.get(r.employee_id);
      if (!found) {
        toInsert.push(r);
        continue;
      }
      let changed = false;
      if (r.full_name) { found.full_name = r.full_name; changed = true; }
      if (r.department) { found.department = r.department; changed = true; }
      if (r.job_title) { found.job_title = r.job_title; changed = true; }
      if (r.email) { found.email = r.email; changed = true; }
      if (changed) {
        await found.save();
        await AllowedEmployeeService._syncToUser(r.employee_id, r);
        updated++;
      }
    }

    if (toInsert.length > 0) {
      await AllowedEmployee.bulkCreate(toInsert.map((r) => ({ ...r, added_by: addedBy || null })));
      await Promise.all(toInsert.map((r) => AllowedEmployeeService._syncToUser(r.employee_id, r)));
    }

    return { inserted: toInsert.length, updated, skipped: deduped.length - toInsert.length - updated };
  }

  // Điền ngay Phòng ban/Chức danh từ allowlist vào các users đang thiếu (NULL) — dùng để "vá"
  // trường hợp allowlist đã có dữ liệu (admin vừa bổ sung) nhưng user chưa đăng nhập lại từ lúc
  // đó. Chỉ điền vào chỗ TRỐNG, không bao giờ ghi đè giá trị user đã có sẵn — vì dữ liệu hiện
  // có trong users có thể đến từ SSO (nguồn sống, mới hơn allowlist tĩnh), ghi đè vô điều kiện
  // có thể khiến dữ liệu mới hơn bị thay bằng dữ liệu cũ hơn của allowlist. Không đụng đến
  // full_name vì cột này luôn có giá trị sẵn (allowNull: false), không có "chỗ trống" để điền.
  static async syncAllToUsers() {
    const [result] = await sequelize.query(`
      UPDATE users u
      SET
        department = COALESCE(u.department, ae.department),
        job_title = COALESCE(u.job_title, ae.job_title),
        updated_at = NOW()
      FROM allowed_employees ae
      WHERE u.employee_id = ae.employee_id
        AND (
          (u.department IS NULL AND ae.department IS NOT NULL) OR
          (u.job_title IS NULL AND ae.job_title IS NOT NULL)
        )
      RETURNING u.id
    `);
    return { updated: result.length };
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
