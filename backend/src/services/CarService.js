const { Car } = require('../models');

/**
 * Service layer cho quản lý xe công ty
 * Xử lý: CRUD xe (admin only để ghi, mọi user đăng nhập đọc được)
 */

class CarService {
  /**
   * Lấy tất cả xe. includeInactive=true để admin thấy cả xe đã ẩn (đã "xoá")
   */
  static async getAllCars(includeInactive = false) {
    try {
      const where = includeInactive ? {} : { is_active: true };
      return await Car.findAll({ where, order: [['created_at', 'ASC']] });
    } catch (error) {
      throw error;
    }
  }

  static async getCarById(carId) {
    try {
      const car = await Car.findByPk(carId);
      if (!car) {
        throw new Error('Car not found');
      }
      return car;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Tạo xe mới (admin only)
   */
  static async createCar(carData) {
    try {
      const { name, license_plate, seats, driver_note } = carData;

      if (!name) {
        throw new Error('Tên xe là bắt buộc');
      }

      return await Car.create({
        name,
        license_plate: license_plate || null,
        seats: seats ? parseInt(seats) : null,
        driver_note: driver_note || null,
        is_active: true
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cập nhật xe (admin only)
   */
  static async updateCar(carId, carData) {
    try {
      const car = await Car.findByPk(carId);
      if (!car) {
        throw new Error('Car not found');
      }

      const { name, license_plate, seats, driver_note, is_active } = carData;

      if (name !== undefined) car.name = name;
      if (license_plate !== undefined) car.license_plate = license_plate;
      if (seats !== undefined) car.seats = seats ? parseInt(seats) : null;
      if (driver_note !== undefined) car.driver_note = driver_note;
      if (is_active !== undefined) car.is_active = is_active;

      await car.save();
      return car;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Xoá xe (admin only) — soft delete để giữ lại lịch sử booking
   */
  static async deleteCar(carId) {
    try {
      const car = await Car.findByPk(carId);
      if (!car) {
        throw new Error('Car not found');
      }

      car.is_active = false;
      await car.save();
      return car;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = CarService;
