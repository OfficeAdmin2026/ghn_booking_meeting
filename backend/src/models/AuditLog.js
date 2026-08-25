const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Nhật ký hành động admin (cấp/thu quyền, khoá tài khoản, sửa/xoá allowlist MSNV...) — trước đây
// không có gì ghi lại ai làm, lúc nào, đổi từ gì sang gì (M-04). Ghi cả `body` request để biết
// giá trị mới được đặt; không có "before" (giá trị cũ) vì việc đọc lại record trước khi sửa ở
// từng route tốn thêm 1 query và không đáng với quy mô hiện tại — audit_logs vẫn trả lời được
// câu hỏi cốt lõi "ai đã làm gì, lúc nào".
const AuditLog = sequelize.define('audit_logs', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  actor_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  actor_employee_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  method: {
    type: DataTypes.STRING,
    allowNull: false
  },
  path: {
    type: DataTypes.STRING,
    allowNull: false
  },
  params: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  body: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  status_code: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  ip: {
    type: DataTypes.STRING,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: false,
  tableName: 'audit_logs'
});

module.exports = AuditLog;
