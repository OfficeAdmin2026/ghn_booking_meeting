const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Booking = sequelize.define('bookings', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  room_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'rooms',
      key: 'id'
    }
  },
  user_id: {
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
    comment: 'Meeting title'
  },
  participants_count: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1
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
    type: DataTypes.ENUM(
      'pending',      // Not yet confirmed
      'confirmed',    // Confirmed but not started
      'active',       // Meeting in progress
      'completed',    // Finished
      'cancelled'     // Cancelled by user or admin
    ),
    defaultValue: 'pending'
  },
  recurring: {
    type: DataTypes.ENUM('none', 'weekly', 'monthly'),
    defaultValue: 'none'
  },
  recurring_end_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When to stop the recurring booking'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  cancellation_message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Message left by admin when cancelling someone else\'s booking'
  },
  is_admin_hidden: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Admin can book now but users cannot see until freeze ends'
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
  tableName: 'bookings',
  indexes: [
    { fields: ['room_id', 'start_time', 'end_time'] },
    { fields: ['user_id'] },
    { fields: ['status'] }
  ]
});

module.exports = Booking;
