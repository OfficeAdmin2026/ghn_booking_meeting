const AdminSetting = require('../models/AdminSetting');

const DEFAULTS = {
  booking_freeze_weekly_enabled: 'true',
  booking_freeze_weekly_day: '4', // 0=CN, 1=Thứ 2, ..., 4=Thứ 5
  booking_freeze_weekly_time: '14:00', // HH:mm
};

class AdminSettingService {
  /** Returns all settings as a plain key→value object */
  static async getAll() {
    const rows = await AdminSetting.findAll();
    const result = { ...DEFAULTS };
    rows.forEach((r) => { result[r.key] = r.value; });
    return result;
  }



  /** Check if booking freeze is currently active */
  static async isBookingFrozen() {
    // Đọc cấu hình ngày/giờ mở booking tuần
    const settings = await this.getAll();
    const weeklyEnabled = (settings.booking_freeze_weekly_enabled === 'true');
    if (!weeklyEnabled) return false;

    const openDay = parseInt(settings.booking_freeze_weekly_day ?? DEFAULTS.booking_freeze_weekly_day, 10); // 0-6
    const openTime = (settings.booking_freeze_weekly_time ?? DEFAULTS.booking_freeze_weekly_time).split(':');
    const openHour = parseInt(openTime[0], 10);
    const openMinute = parseInt(openTime[1], 10);

    const now = new Date();
    const vnTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const currentDay = vnTime.getDay();

    // Tìm thời điểm mở gần nhất (Thứ openDay tuần trước hoặc tuần này)
    let daysSinceOpen = (currentDay - openDay + 7) % 7;
    let lastOpen = new Date(vnTime);
    lastOpen.setDate(vnTime.getDate() - daysSinceOpen);
    lastOpen.setHours(openHour, openMinute, 0, 0);
    // Nếu hôm nay là ngày mở nhưng chưa đến giờ thì lùi về tuần trước
    if (daysSinceOpen === 0 && (vnTime.getHours() < openHour || (vnTime.getHours() === openHour && vnTime.getMinutes() < openMinute))) {
      lastOpen.setDate(lastOpen.getDate() - 7);
    }

    // Nếu chưa đến thời điểm mở gần nhất thì freeze, ngược lại luôn mở booking
    return vnTime < lastOpen;
  }

  /** Get weekly freeze enabled flag */
  static async getWeeklyFreezeEnabled() {
    const row = await AdminSetting.findOne({ where: { key: 'booking_freeze_weekly_enabled' } });
    return (row?.value ?? DEFAULTS.booking_freeze_weekly_enabled) === 'true';
  }

  /** Get detailed freeze info for display to user */
  static async getFreezeInfo() {
    const isFrozen = await this.isBookingFrozen();
    if (!isFrozen) {
      return null; // Not frozen, no message needed
    }

    const settings = await this.getAll();
    const openDay = parseInt(settings.booking_freeze_weekly_day ?? DEFAULTS.booking_freeze_weekly_day, 10); // 0-6
    const openTime = (settings.booking_freeze_weekly_time ?? DEFAULTS.booking_freeze_weekly_time).split(':');
    const openHour = parseInt(openTime[0], 10);
    const openMinute = parseInt(openTime[1], 10);

    const now = new Date();
    const vnTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const currentDay = vnTime.getDay();

    // Tìm ngày mở tiếp theo
    let daysToOpen = (openDay - currentDay + 7) % 7;
    if (daysToOpen === 0 && (vnTime.getHours() > openHour || (vnTime.getHours() === openHour && vnTime.getMinutes() >= openMinute))) {
      daysToOpen = 7; // Đã qua giờ mở hôm nay, sang tuần sau
    }
    const nextOpening = new Date(vnTime);
    nextOpening.setDate(nextOpening.getDate() + daysToOpen);
    nextOpening.setHours(openHour, openMinute, 0, 0);

    // Hiển thị thứ/ngày/giờ động
    const weekdayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const openLabel = `${weekdayNames[openDay]} lúc ${openHour.toString().padStart(2, '0')}:${openMinute.toString().padStart(2, '0')}`;

    return {
      type: 'weekly_opening',
      next_opening: nextOpening.toISOString(),
      message: `Chờ ${openLabel} để mở khóa booking tuần tiếp theo. Sẽ mở lúc ${nextOpening.toLocaleString('vi-VN')}`
    };
  }


  /** Upsert one or more settings. `data` is { key: value, ... } */
  static async updateSettings(data) {
    const ALLOWED_KEYS = [
      'booking_freeze_weekly_enabled',
      'booking_freeze_weekly_day', // 0=CN, 1=Thứ 2, ...
      'booking_freeze_weekly_time', // HH:mm
    ];
    for (const [key, value] of Object.entries(data)) {
      if (!ALLOWED_KEYS.includes(key)) continue;
      await AdminSetting.upsert({ key, value: String(value), updated_at: new Date() });
    }
    return this.getAll();
  }
}

module.exports = AdminSettingService;
