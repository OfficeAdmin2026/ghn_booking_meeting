const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WayfindingPath = sequelize.define('wayfinding_paths', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  room_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'rooms',
      key: 'id'
    }
  },
  points: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  created_by: {
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
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true,
  tableName: 'wayfinding_paths'
});

module.exports = WayfindingPath;
