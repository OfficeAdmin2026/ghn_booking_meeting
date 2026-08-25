// Trả message chung cho lỗi 500 thay vì err.message nguyên văn (L-02) — lỗi Sequelize/DB thường
// lộ tên bảng, tên cột trong message. Log chi tiết thật ra console để còn điều tra được.
function sendServerError(res, err, fallbackMessage = 'Lỗi hệ thống, vui lòng thử lại') {
  console.error(err);
  res.status(500).json({ error: { status: 500, message: fallbackMessage } });
}

module.exports = { sendServerError };
