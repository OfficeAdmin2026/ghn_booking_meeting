const { Sequelize } = require('sequelize');
const pg = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Parse TIMESTAMP WITHOUT TIMEZONE as UTC so values stored as UTC are read back correctly
pg.types.setTypeParser(1114, (val) => (val === null ? null : new Date(val + 'Z')));

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      timezone: '+00:00',
      logging: false,
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
        define: {
          timestamps: true,
          underscored: true,
          freezeTableName: true
        }
      }
    );

module.exports = { sequelize };
