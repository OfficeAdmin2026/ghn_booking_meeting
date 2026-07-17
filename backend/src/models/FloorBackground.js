const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FloorBackground = sequelize.define('floor_backgrounds', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false
  },
  floor: {
    type: DataTypes.STRING,
    allowNull: false
  },
  image_url: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  width: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  height: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  uploaded_by: {
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
  tableName: 'floor_backgrounds',
  indexes: [
    { unique: true, fields: ['location', 'floor'] }
  ]
});

module.exports = FloorBackground;
