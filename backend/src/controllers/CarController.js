const CarService = require('../services/CarService');

/**
 * Controller layer cho quản lý xe công ty.
 * Admin write access được enforce ở route level (adminMiddleware), không check lại ở đây.
 */

class CarController {
  /**
   * GET /api/cars
   * Mọi user đăng nhập đều xem được danh sách xe. Admin có thể truyền
   * ?include_inactive=true để thấy cả xe đã ẩn (phục vụ màn quản lý).
   */
  static async getAllCars(req, res) {
    try {
      const includeInactive = req.user.role === 'admin' && req.query.include_inactive === 'true';
      const cars = await CarService.getAllCars(includeInactive);

      res.json({
        status: 'success',
        data: { count: cars.length, cars }
      });
    } catch (error) {
      console.error('Get cars error:', error);
      res.status(500).json({
        error: { status: 500, message: error.message || 'Failed to get cars' }
      });
    }
  }

  /**
   * GET /api/cars/:id
   */
  static async getCarById(req, res) {
    try {
      const { id } = req.params;
      const car = await CarService.getCarById(id);

      res.json({ status: 'success', data: { car } });
    } catch (error) {
      console.error('Get car error:', error);
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        error: { status: statusCode, message: error.message || 'Failed to get car' }
      });
    }
  }

  /**
   * POST /api/cars (admin only)
   */
  static async createCar(req, res) {
    try {
      const car = await CarService.createCar(req.body);
      res.status(201).json({ status: 'success', data: { car } });
    } catch (error) {
      console.error('Create car error:', error);
      const statusCode = error.message.includes('bắt buộc') ? 400 : 500;
      res.status(statusCode).json({
        error: { status: statusCode, message: error.message || 'Failed to create car' }
      });
    }
  }

  /**
   * PUT /api/cars/:id (admin only)
   */
  static async updateCar(req, res) {
    try {
      const { id } = req.params;
      const car = await CarService.updateCar(id, req.body);
      res.json({ status: 'success', data: { car } });
    } catch (error) {
      console.error('Update car error:', error);
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        error: { status: statusCode, message: error.message || 'Failed to update car' }
      });
    }
  }

  /**
   * DELETE /api/cars/:id (admin only) — soft delete
   */
  static async deleteCar(req, res) {
    try {
      const { id } = req.params;
      const car = await CarService.deleteCar(id);
      res.json({ status: 'success', message: 'Car deleted successfully', data: { car } });
    } catch (error) {
      console.error('Delete car error:', error);
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        error: { status: statusCode, message: error.message || 'Failed to delete car' }
      });
    }
  }
}

module.exports = CarController;
