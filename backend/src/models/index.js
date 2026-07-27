const User = require('./User');
const Room = require('./Room');
const RoomAmenity = require('./RoomAmenity');
const Booking = require('./Booking');
const Notification = require('./Notification');
const AdminSetting = require('./AdminSetting');
const WayfindingPath = require('./WayfindingPath');
const RoomShape = require('./RoomShape');
const FloorBackground = require('./FloorBackground');
const MapAnnotation = require('./MapAnnotation');
const Car = require('./Car');
const CarBooking = require('./CarBooking');

// Define associations
Room.hasMany(RoomAmenity, { foreignKey: 'room_id', as: 'amenities' });
RoomAmenity.belongsTo(Room, { foreignKey: 'room_id' });

Room.hasOne(WayfindingPath, { foreignKey: 'room_id', as: 'wayfindingPath' });
WayfindingPath.belongsTo(Room, { foreignKey: 'room_id' });

Room.hasOne(RoomShape, { foreignKey: 'room_id', as: 'shape' });
RoomShape.belongsTo(Room, { foreignKey: 'room_id' });

Room.hasMany(Booking, { foreignKey: 'room_id', as: 'bookings' });
Booking.belongsTo(Room, { foreignKey: 'room_id' });

User.hasMany(Booking, { foreignKey: 'user_id', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'user_id' });

Booking.hasMany(Notification, { foreignKey: 'booking_id', as: 'notifications' });
Notification.belongsTo(Booking, { foreignKey: 'booking_id' });

User.hasMany(Notification, { foreignKey: 'user_id' });
Notification.belongsTo(User, { foreignKey: 'user_id' });

Car.hasMany(CarBooking, { foreignKey: 'car_id', as: 'bookings' });
CarBooking.belongsTo(Car, { foreignKey: 'car_id' });

User.hasMany(CarBooking, { foreignKey: 'created_by', as: 'carBookings' });
CarBooking.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

CarBooking.belongsTo(User, { foreignKey: 'requester_user_id', as: 'requester' });

module.exports = {
  User,
  Room,
  RoomAmenity,
  Booking,
  Notification,
  AdminSetting,
  WayfindingPath,
  RoomShape,
  FloorBackground,
  MapAnnotation,
  Car,
  CarBooking
};
