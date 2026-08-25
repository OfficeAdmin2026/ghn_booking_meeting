const { AuditLog } = require('../models');

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Import hàng loạt MSNV có thể gửi vài trăm dòng trong 1 request — không lưu nguyên body đó
// vào audit_logs, chỉ lưu bản rút gọn để bảng không phình to vô ích.
function summarizeBody(body) {
  if (!body || typeof body !== 'object') return body ?? null;
  const str = JSON.stringify(body);
  if (str.length <= 5000) return body;
  return { _truncated: true, length: str.length, preview: str.slice(0, 5000) };
}

// Ghi lại ai gọi hành động ghi (POST/PUT/PATCH/DELETE) dưới /api/admin, lúc nào, vào path/params
// nào, kèm body request (đã rút gọn) — trước đây (M-04) chỉ có 1 dòng console.log ở /admin/rules,
// không ghi lại gì cho phần lớn hành động admin (cấp quyền, khoá tài khoản, sửa allowlist...).
function auditLogMiddleware(req, res, next) {
  if (!MUTATING_METHODS.has(req.method)) return next();

  res.on('finish', () => {
    AuditLog.create({
      actor_id: req.user?.id || null,
      actor_employee_id: req.user?.employee_id || null,
      method: req.method,
      path: req.originalUrl,
      params: req.params || null,
      body: summarizeBody(req.body),
      status_code: res.statusCode,
      ip: req.ip,
    }).catch((err) => console.error('[auditLog] Ghi audit log thất bại:', err));
  });

  next();
}

module.exports = auditLogMiddleware;
