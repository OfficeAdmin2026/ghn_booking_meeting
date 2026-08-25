require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const app = require('./app');
const { sequelize } = require('./config/database');
const SsoService = require('./services/SsoService');

const PORT = process.env.PORT || 5000;

// Nếu production mà SSO chưa cấu hình đủ, /api/auth/login sẽ âm thầm mở lại chế độ đăng nhập
// chỉ-bằng-MSNV, không mật khẩu, cho BẤT KỲ MSNV nào kể cả admin — không log, không cảnh báo,
// chỉ có nút SSO biến mất khỏi trang login. Thà chặn hẳn lúc khởi động còn hơn để lỗ hổng đó
// âm thầm mở ra vì thiếu 1 biến môi trường. ALLOW_LOGIN_WITHOUT_SSO=true để tắt rào chắn này
// (vd: giai đoạn đầu triển khai, trước khi SSO có redirect_uri chính thức).
if (
  process.env.NODE_ENV === 'production' &&
  !SsoService.isEnabled() &&
  process.env.ALLOW_LOGIN_WITHOUT_SSO !== 'true'
) {
  console.error('❌ Production nhưng SSO chưa cấu hình đủ (SSO_ENABLED/SSO_BASE_URL/SSO_CLIENT_ID/SSO_CLIENT_SECRET/SSO_REDIRECT_URI).');
  console.error('   Thiếu bất kỳ biến nào ở trên sẽ mở lại đăng nhập không mật khẩu cho mọi MSNV.');
  console.error('   Đặt ALLOW_LOGIN_WITHOUT_SSO=true nếu đây là chủ ý.');
  process.exit(1);
}

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
      ALTER TABLE allowed_employees
        ADD COLUMN IF NOT EXISTS department VARCHAR(255),
        ADD COLUMN IF NOT EXISTS email VARCHAR(255),
        ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);
      ALTER TABLE users
        ALTER COLUMN email DROP NOT NULL,
        ADD COLUMN IF NOT EXISTS job_title VARCHAR(255);
      ALTER TABLE car_bookings
        ADD COLUMN IF NOT EXISTS requester_employee_id VARCHAR(255),
        ADD COLUMN IF NOT EXISTS requester_full_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS requester_job_title VARCHAR(255),
        ADD COLUMN IF NOT EXISTS requester_department VARCHAR(255);
      DO $do$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'users_employee_id_unique'
        ) THEN
          ALTER TABLE users ADD CONSTRAINT users_employee_id_unique UNIQUE (employee_id);
        END IF;
      END $do$;
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
