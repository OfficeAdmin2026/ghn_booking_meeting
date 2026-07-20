const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
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
