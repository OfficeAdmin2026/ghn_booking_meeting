const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Render/nginx ngồi trước app dưới dạng 1 hop reverse proxy — không set cái này thì
// req.ip luôn là IP nội bộ của proxy, làm rate limit và log truy cập vô nghĩa (tính
// chung mọi request thành 1 "IP" duy nhất).
app.set('trust proxy', 1);

app.use(helmet());

// Middleware
const rawAllowedOrigins = (process.env.ALLOWED_ORIGINS || '').trim();
const allowedOrigins = rawAllowedOrigins
  ? rawAllowedOrigins.split(',').map((o) => o.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:5174'];

const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '').trim();
if (frontendUrl && !allowedOrigins.includes(frontendUrl)) {
  allowedOrigins.push(frontendUrl);
}

console.log('[CORS] Allowed origins:', allowedOrigins);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
// Mặc định của express.json()/urlencoded() chỉ 100kb — quá nhỏ cho import Excel danh sách
// nhân viên (gửi lên dạng JSON rows sau khi parse client-side), 10mb khớp với
// client_max_body_size của nginx phía trước để giới hạn thực sự nằm ở đây chứ không phải bị
// chặn sớm hơn dự kiến.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Giới hạn chung cho toàn bộ /api — /api/auth/login đã có loginLimiter riêng chặt hơn,
// đây là lớp ngoài rộng hơn chặn kiểu client hỏng/vòng lặp gọi API dồn dập làm cạn pool
// DB (5 kết nối). Ngưỡng đặt cao vì nhiều nhân viên GHN dùng chung 1 IP NAT văn phòng —
// chặt quá sẽ khoá nhầm cả văn phòng thay vì chỉ chặn client bất thường.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { status: 429, message: 'Quá nhiều request, vui lòng thử lại sau ít phút.' } },
});
app.use('/api', apiLimiter);

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/wayfinding-paths', require('./routes/wayfindingPaths'));
app.use('/api/room-shapes', require('./routes/roomShapes'));
app.use('/api/floor-backgrounds', require('./routes/floorBackgrounds'));
app.use('/api/map-annotations', require('./routes/mapAnnotations'));
app.use('/api/cars', require('./routes/cars'));
app.use('/api/car-bookings', require('./routes/carBookings'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);

  const status = err.status || 500;
  // 500 = lỗi không lường trước (thường là lỗi DB/nội bộ) — không trả err.message nguyên văn
  // ra ngoài (L-02). Lỗi có status riêng (400/403/404...) là message cố ý cho user nên giữ nguyên.
  const message = status === 500 ? 'Internal Server Error' : (err.message || 'Internal Server Error');

  res.status(status).json({
    error: {
      status,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      status: 404,
      message: 'Not Found'
    }
  });
});

module.exports = app;
