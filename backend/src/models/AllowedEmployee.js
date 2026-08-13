const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Danh sách MSNV được phép truy cập hệ thống (2 văn phòng có phòng họp).
// Admin tự thêm/xoá/import Excel qua UI — không liên quan tới role/is_active.
const AllowedEmployee = sequelize.define('allowed_employees', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  employee_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  full_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  added_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: false,
  tableName: 'allowed_employees'
});

module.exports = AllowedEmployee;
