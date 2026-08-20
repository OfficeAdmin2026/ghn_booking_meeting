import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ghn_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 (token hết hạn/không hợp lệ) và 403 do bị gỡ khỏi allowlist MSNV hoặc bị khoá
// (is_active=false) giữa phiên (kiểm tra lại mỗi request ở backend) → đăng xuất và về trang login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const message = err.response?.data?.error?.message || '';
    const revokedMidSession = status === 403 && (message.includes('cấp quyền truy cập') || message.includes('khóa truy cập'));
    if (status === 401 || revokedMidSession) {
      localStorage.removeItem('ghn_token');
      localStorage.removeItem('ghn_user');
      if (revokedMidSession) sessionStorage.setItem('ghn_login_notice', message);
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
