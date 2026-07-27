const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Car = sequelize.define('cars', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  license_plate: {
    type: DataTypes.STRING,
    allowNull: true
  },
  seats: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1
    }
  },
  driver_note: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
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
  tableName: 'cars'
});

module.exports = Car;
