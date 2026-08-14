const { User } = require('../models');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
const AllowedEmployeeService = require('./AllowedEmployeeService');
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
      employee_id: user.employee_id,
      full_name: user.full_name,
      role: user.role
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    return token;
  }

  /**
   * Đăng nhập bằng MSNV — cách dùng chính, không cần email. Tra allowlist theo MSNV: khớp
   * thì tìm/tạo user theo đúng employee_id, đồng bộ Họ tên/Phòng ban (và Email nếu allowlist
   * đã có — ví dụ sau khi nối SSO) vào user record.
   */
  static async loginByEmployeeId(employeeId, fullName = null) {
    const id = String(employeeId || '').trim();
    if (!id) {
      throw new Error('Vui lòng nhập MSNV');
    }

    const match = await AllowedEmployeeService.findMatch(id, null);
    if (!match) {
      throw new Error('MSNV không nằm trong danh sách được phép truy cập hệ thống đặt phòng. Vui lòng liên hệ quản trị viên.');
    }

    let user = await User.findOne({ where: { employee_id: id } });

    if (user && !user.is_active) {
      throw new Error('Tài khoản của bạn đã bị khóa truy cập. Vui lòng liên hệ quản trị viên.');
    }

    if (!user) {
      user = await User.create({
        employee_id: id,
        email: match.email || null,
        full_name: fullName || match.full_name || id,
        department: match.department || null,
        role: 'user',
        is_active: true
      });
    } else {
      if (match.email && match.email !== user.email) user.email = match.email;
      if (match.full_name) user.full_name = match.full_name;
      if (match.department) user.department = match.department;
    }

    user.last_login = new Date();
    await user.save();

    const token = this.generateToken(user);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        employee_id: user.employee_id,
        role: user.role
      }
    };
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
