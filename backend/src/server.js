require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const app = require('./app');
const { sequelize } = require('./config/database');

const PORT = process.env.PORT || 5000;

// Initialize database and start server
(async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Sync database (create tables if they don't exist)
    await sequelize.sync({ alter: false });
    console.log('✅ Database models synced');

    // Run safe column migrations
    await sequelize.query(`
      ALTER TABLE bookings
        ADD COLUMN IF NOT EXISTS cancellation_message TEXT,
        ADD COLUMN IF NOT EXISTS is_admin_hidden BOOLEAN DEFAULT false;
      ALTER TABLE bookings
        ALTER COLUMN participants_count SET DEFAULT 1,
        ALTER COLUMN participants_count DROP NOT NULL;
    `);
    console.log('✅ Booking columns migrated');

    // Start server
    app.listen(PORT, () => {
      console.log(`✅ Server is running on port ${PORT}`);
      console.log(`📍 API URL: http://localhost:${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
})();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await sequelize.close();
  process.exit(0);
});
