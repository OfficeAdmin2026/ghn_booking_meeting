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
      // Set last_login ngay trong INSERT — tránh phải UPDATE lại ngay sau đó (đỡ 1 round-trip DB).
      user = await User.create({
        employee_id: id,
        email: match.email || null,
        full_name: fullName || match.full_name || id,
        department: match.department || null,
        job_title: match.job_title || null,
        role: 'user',
        is_active: true,
        last_login: new Date()
      });
    } else {
      if (match.email && match.email !== user.email) user.email = match.email;
      if (match.full_name) user.full_name = match.full_name;
      if (match.department) user.department = match.department;
      if (match.job_title) user.job_title = match.job_title;
      user.last_login = new Date();
      await user.save();
    }

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
   * Đăng nhập qua GHN SSO (đã verify id_token + userinfo ở SsoService). SSO xác thực toàn công
   * ty (~20k người) nên vẫn phải khớp MSNV với allowlist mới cho vào — SSO chỉ thay cách xác
   * minh danh tính, không thay điều kiện truy cập hệ thống đặt phòng (chỉ 2 văn phòng, 849
   * MSNV). Họ tên/chức danh/phòng ban lấy trực tiếp từ SSO (nguồn sống) và luôn ghi đè, khác
   * với loginByEmployeeId chỉ đồng bộ từ allowlist tĩnh khi có dữ liệu.
   */
  static async loginFromSso(claims) {
    const id = String(claims.employee_id || '').trim();
    if (!id) {
      throw new Error('SSO không trả về MSNV hợp lệ');
    }

    const match = await AllowedEmployeeService.findMatch(id, null);
    if (!match) {
      throw new Error('MSNV không nằm trong danh sách được phép truy cập hệ thống đặt phòng. Vui lòng liên hệ quản trị viên.');
    }

    let user = await User.findOne({ where: { employee_id: id } });

    if (user && !user.is_active) {
      throw new Error('Tài khoản của bạn đã bị khóa truy cập. Vui lòng liên hệ quản trị viên.');
    }

    const fullName = claims.name || match.full_name || id;
    const jobTitle = claims.jobtitle_name || match.job_title || null;
    const department = claims.team_name || match.department || null;

    if (!user) {
      user = await User.create({
        employee_id: id,
        full_name: fullName,
        department,
        job_title: jobTitle,
        role: 'user',
        is_active: true,
        last_login: new Date()
      });
    } else {
      user.full_name = fullName;
      user.department = department;
      user.job_title = jobTitle;
      user.last_login = new Date();
      await user.save();
    }

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
   * Verify token
   */
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
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
