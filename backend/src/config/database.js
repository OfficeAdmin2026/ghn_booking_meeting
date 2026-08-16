const { Sequelize } = require('sequelize');
const pg = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Parse TIMESTAMP WITHOUT TIMEZONE as UTC so values stored as UTC are read back correctly
pg.types.setTypeParser(1114, (val) => (val === null ? null : new Date(val + 'Z')));

// min: 1 — giữ ít nhất 1 kết nối luôn mở tới DB (Neon ở us-east-2, xa VN). Mặc định
// Sequelize dùng min: 0 nên hễ rảnh quá `idle` là đóng hết kết nối; request kế tiếp phải
// bắt tay TCP/TLS lại từ đầu, tốn thêm vài giây — đây là nguyên nhân chính khiến các lần
// đăng nhập sau một khoảng nghỉ (vài chục giây trở lên) bị chậm hẳn so với các lần liên tiếp.
const pool = { max: 5, min: 1, idle: 30000, acquire: 60000 };

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      timezone: '+00:00',
      logging: false,
      pool,
      dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false }
      },
      define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true
      }
    })
  : new Sequelize(
      process.env.DB_NAME || 'ghn_meeting_room_booking',
      process.env.DB_USER || 'postgres',
      process.env.DB_PASSWORD || 'postgres',
      {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        timezone: '+00:00',
        logging: false,
        pool,
        define: {
          timestamps: true,
          underscored: true,
          freezeTableName: true
        }
      }
    );

module.exports = { sequelize };
