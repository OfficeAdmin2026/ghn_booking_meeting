const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CarBooking = sequelize.define('car_bookings', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  car_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'cars',
      key: 'id'
    }
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Mục đích / người yêu cầu, do admin nhập'
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'confirmed',
    validate: {
      isIn: [['confirmed', 'cancelled']]
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cancellation_message: {
    type: DataTypes.TEXT,
    allowNull: true
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
  tableName: 'car_bookings',
  indexes: [
    { fields: ['car_id', 'start_time', 'end_time'] },
    { fields: ['status'] }
  ]
});

module.exports = CarBooking;
