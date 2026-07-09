const { User } = require('../models');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

/**
 * Service layer cho authentication
 * Xử lý: login, register, JWT generation, password hashing
 */

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

class AuthService {
  /**
   * Tìm user bằng email
   */
  static async findUserByEmail(email) {
    return await User.findOne({ where: { email } });
  }

  /**
   * Tạo user mới (register)
   */
  static async createUser(email, fullName, department = null, role = 'user') {
    try {
      // Kiểm tra user đã tồn tại chưa
      const existingUser = await this.findUserByEmail(email);
      if (existingUser) {
        throw new Error('Email already registered');
      }

      // Tạo user mới
      const user = await User.create({
        email,
        full_name: fullName,
        department,
        role,
        is_active: true
      });

      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Tạo JWT token
   */
  static generateToken(user) {
    const payload = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    return token;
  }

  /**
   * Login user (tạo mới nếu chưa tồn tại)
   */
  static async login(email, fullName = null) {
    try {
      // Kiểm tra email format
      if (!email.endsWith('@ghn.vn')) {
        throw new Error('Only @ghn.vn email addresses are allowed');
      }

      // Tìm user
      let user = await this.findUserByEmail(email);

      // Tài khoản đã bị admin chặn truy cập
      if (user && !user.is_active) {
        throw new Error('Tài khoản của bạn đã bị khóa truy cập. Vui lòng liên hệ quản trị viên.');
      }

      // Nếu chưa tồn tại, tạo mới
      if (!user) {
        user = await this.createUser(
          email,
          fullName || email.split('@')[0],
          null,
          'user'
        );
      }

      // Cập nhật last_login
      user.last_login = new Date();
      await user.save();

      // Tạo token
      const token = this.generateToken(user);

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Login bằng Google ID token (Sign in with Google).
   * Google xác thực người dùng thực sự sở hữu email @ghn.vn trước khi trả token,
   * nên không thể tự gõ email người khác để đăng nhập như cách cũ.
   */
  static async loginWithGoogle(idToken) {
    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new Error('Google Sign-In chưa được cấu hình trên server');
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (err) {
      throw new Error('Xác thực Google thất bại');
    }

    if (!payload || !payload.email_verified) {
      throw new Error('Email Google chưa được xác thực');
    }

    const email = payload.email.toLowerCase();
    if (!email.endsWith('@ghn.vn')) {
      throw new Error('Chỉ chấp nhận tài khoản Google @ghn.vn');
    }

    return this.login(email, payload.name);
  }

  /**
   * Tạo admin account (dùng cho testing)
   */
  static async createAdminAccount(email, fullName = 'Admin User') {
    try {
      const existingUser = await this.findUserByEmail(email);
      if (existingUser) {
        // Nếu tồn tại, update role thành admin
        existingUser.role = 'admin';
        await existingUser.save();
        return existingUser;
      }

      // Tạo admin mới
      const admin = await this.createUser(
        email,
        fullName,
        'IT',
        'admin'
      );

      return admin;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verify token
   */
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId) {
    return await User.findByPk(userId);
  }
}

module.exports = AuthService;
