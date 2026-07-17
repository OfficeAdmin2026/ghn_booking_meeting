const User = require('./User');
const Room = require('./Room');
const RoomAmenity = require('./RoomAmenity');
const Booking = require('./Booking');
const Notification = require('./Notification');
const AdminSetting = require('./AdminSetting');
const WayfindingPath = require('./WayfindingPath');

// Define associations
Room.hasMany(RoomAmenity, { foreignKey: 'room_id', as: 'amenities' });
RoomAmenity.belongsTo(Room, { foreignKey: 'room_id' });

Room.hasOne(WayfindingPath, { foreignKey: 'room_id', as: 'wayfindingPath' });
WayfindingPath.belongsTo(Room, { foreignKey: 'room_id' });

Room.hasMany(Booking, { foreignKey: 'room_id', as: 'bookings' });
Booking.belongsTo(Room, { foreignKey: 'room_id' });

User.hasMany(Booking, { foreignKey: 'user_id', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'user_id' });

Booking.hasMany(Notification, { foreignKey: 'booking_id', as: 'notifications' });
Notification.belongsTo(Booking, { foreignKey: 'booking_id' });

User.hasMany(Notification, { foreignKey: 'user_id' });
Notification.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
  User,
  Room,
  RoomAmenity,
  Booking,
  Notification,
  AdminSetting,
  WayfindingPath
};
