const { User } = require('../models');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
require('dotenv').config();

/**
 * Service layer cho authentication
 * Xử lý: login, register, JWT generation, password hashing
 */

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
