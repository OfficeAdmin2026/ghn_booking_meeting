const { User } = require('../models');
const jwt = require('jsonwebtoken');
const bcryptjs = require('bcryptjs');
const AllowedEmployeeService = require('./AllowedEmployeeService');
const { isCompanyEmail } = require('../utils/companyEmail');
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
   * Đăng nhập bằng MSNV (cách dùng chính hiện tại, trước khi có SSO) — tra allowlist theo
   * MSNV để lấy email đã liên kết, rồi tái dùng login() bên dưới để tạo/đồng bộ user + token.
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

    // Chưa có SSO nên nhiều MSNV trong allowlist chưa có email thật (import từ HR chỉ có
    // MSNV/Họ tên/Phòng ban) — tạm dùng {MSNV}@ghn.vn làm định danh đăng nhập để không chặn
    // truy cập. Khi nối SSO gửi email thật kèm đúng MSNV, login() bên dưới sẽ tự nhận diện
    // lại tài khoản qua MSNV và cập nhật sang email thật, không tạo tài khoản trùng.
    let email = match.email;
    if (!email) {
      email = `${id}@ghn.vn`;
    } else if (!isCompanyEmail(email)) {
      throw new Error('Email liên kết với MSNV này không hợp lệ. Vui lòng liên hệ quản trị viên.');
    }

    return this.login(email, fullName || match.full_name, id);
  }

  /**
   * Login user (tạo mới nếu chưa tồn tại)
   * employeeId: MSNV — sẽ do SSO gửi kèm khi tích hợp xong; cho phép truyền tay trong lúc chưa có SSO.
   */
  static async login(email, fullName = null, employeeId = null) {
    try {
      // Kiểm tra email format
      if (!isCompanyEmail(email)) {
        throw new Error('Only company email addresses (@ghn.vn / @giaohangnhanh.vn) are allowed');
      }

      // Tìm user theo email
      let user = await this.findUserByEmail(email);

      // Chưa thấy theo email nhưng có MSNV — có thể tài khoản này đã tồn tại với email khác
      // (VD: email tạm {MSNV}@ghn.vn của lần đăng nhập trước, giờ SSO gửi email thật) — dùng
      // lại đúng tài khoản đó, cập nhật email mới, tránh tạo trùng tài khoản cho cùng 1 người.
      if (!user && employeeId) {
        user = await User.findOne({ where: { employee_id: String(employeeId).trim() } });
        if (user) user.email = email;
      }

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

      // Đối chiếu với danh sách MSNV được phép (allowlist) — khớp theo MSNV (SSO gửi kèm lần
      // này, hoặc đã đồng bộ từ lần đăng nhập trước) hoặc theo email (dùng được ngay bây giờ,
      // trước khi có SSO). Allowlist là nguồn dữ liệu gốc: khớp được thì đồng bộ luôn MSNV/Họ
      // tên/Phòng ban vào user record.
      const match = await AllowedEmployeeService.findMatch(employeeId || user.employee_id, email);
      if (!match) {
        throw new Error('Tài khoản của bạn chưa được cấp quyền truy cập hệ thống đặt phòng. Vui lòng liên hệ quản trị viên để được thêm vào danh sách.');
      }

      user.employee_id = match.employee_id;
      if (match.full_name) user.full_name = match.full_name;
      if (match.department) user.department = match.department;

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
