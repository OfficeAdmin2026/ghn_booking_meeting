# GHN Meeting Room Booking - Backend API

Express.js + PostgreSQL backend for the meeting room booking system.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

3. **Create PostgreSQL database**
   ```bash
   createdb ghn_meeting_room_booking
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

Server will be running on `http://localhost:5000`

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/          # Database configuration
│   ├── models/          # Database models (User, Room, Booking, etc.)
│   ├── routes/          # API routes
│   ├── controllers/      # Business logic (to be implemented)
│   ├── middleware/      # Auth, validation middleware
│   ├── services/        # External service integrations
│   ├── utils/           # Helpers and utilities
│   ├── app.js           # Express app setup
│   └── server.js        # Server entry point
├── migrations/          # Database migrations
├── .env.example         # Environment variables template
├── package.json
└── README.md
```

## 🔌 API Endpoints

All endpoints require authentication (JWT token) except `/api/auth/login`.

### Authentication
- `POST /api/auth/login` - Login with email
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Rooms
- `GET /api/rooms` - List all rooms
- `GET /api/rooms/search` - Search available rooms
- `GET /api/rooms/:id` - Get room details
- `POST /api/rooms` - Create room (admin)
- `PUT /api/rooms/:id` - Update room (admin)
- `DELETE /api/rooms/:id` - Delete room (admin)

### Bookings
- `GET /api/bookings` - Get my bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings/:id` - Get booking details
- `PUT /api/bookings/:id` - Extend or early finish
- `DELETE /api/bookings/:id` - Cancel booking

### Dashboard (admin only)
- `GET /api/dashboard/metrics` - Get metrics
- `GET /api/dashboard/rooms` - Get room stats
- `GET /api/dashboard/users` - Get user stats

### Admin
- `GET /api/admin/users` - List users
- `PUT /api/admin/users/:id` - Update user
- `POST /api/admin/policies` - Create policy
- `GET /api/admin/policies` - Get policies

## 📊 Database Models

### Users
- id (UUID)
- email (unique, @ghn.vn)
- full_name
- department
- role (user, admin, vip)
- is_active
- last_login

### Rooms
- id (UUID)
- name
- location (RiveraPark, Mipec)
- floor (1F, 3F, 8F, G)
- capacity
- code (unique, for QR)
- is_vip
- is_active

### Bookings
- id (UUID)
- room_id, user_id
- title, participants_count
- start_time, end_time
- status (pending, confirmed, active, completed, cancelled)
- recurring (none, weekly, monthly)

### Notifications
- id (UUID)
- booking_id, user_id
- type (booking_confirmed, reminder, cancelled, etc.)
- recipient_email
- sent_at, is_sent

## 🔐 Authentication

Uses JWT (JSON Web Tokens) for authentication. Currently designed for email-based login (company domain: @ghn.vn).

```javascript
// Example JWT payload
{
  id: "uuid",
  email: "user@ghn.vn",
  full_name: "John Doe",
  role: "user",
  iat: 1234567890,
  exp: 1234654290
}
```

## 📧 Email Service Integration

Configure in `.env`:
- `EMAIL_API_KEY` - Your email service API key
- `EMAIL_API_URL` - Email service endpoint
- `EMAIL_FROM` - Sender email address

## 🎯 Key Features

- Real-time room availability check
- Email notifications (15 min before meeting)
- Meeting extend/early finish functionality
- Role-based access control (user, admin, vip)
- Booking policy enforcement

## 🛠️ Development

### Adding new routes
1. Create route file in `src/routes/`
2. Import in `src/app.js`
3. Add `app.use('/api/path', require('./routes/path'));`

### Adding new models
1. Create model in `src/models/`
2. Define associations in `src/models/index.js`
3. Models are auto-synced on server start

### Database migrations
Use Sequelize migrations (setup pending):
```bash
npm run db:migrate
npm run db:seed
```

## 📝 Environment Variables

See `.env.example` for all available options:

```
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ghn_meeting_room_booking
JWT_SECRET=your_secret_key
EMAIL_API_KEY=your_key
```

## 🐛 Debugging

Enable verbose logging:
```
NODE_ENV=development
LOG_LEVEL=debug
```

Database queries will be logged to console.

## 📦 Production Deployment

1. Set `NODE_ENV=production`
2. Use strong JWT_SECRET
3. Configure PostgreSQL with proper security
4. Use environment variable for sensitive data
5. Setup PM2 or Docker for process management

```bash
npm install -g pm2
pm2 start src/server.js --name "ghn-booking-api"
```

## 📋 Implementation Status

- [x] Database schema & models
- [x] Express app setup
- [x] Authentication middleware
- [x] Route skeleton
- [ ] Authentication controller implementation
- [ ] Room management
- [ ] Booking management
- [ ] Email notifications
- [ ] Dashboard analytics
- [ ] Admin panel

## 🤝 Next Steps

1. Implement authentication (email login)
2. Implement room management (CRUD)
3. Implement booking logic
4. Setup email service integration
5. Build admin dashboard

---

**Happy coding! 🚀**
