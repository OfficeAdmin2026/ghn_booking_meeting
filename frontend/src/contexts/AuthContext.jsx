import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, adminApi } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('ghn_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);
  const [siteLock, setSiteLock] = useState({ locked: false, message: '' });

  const refreshSiteLock = useCallback(async () => {
    try {
      const res = await adminApi.getSiteLock();
      setSiteLock(res.data.data);
    } catch {
      // ignore - default to unlocked if the check itself fails
    }
  }, []);

  useEffect(() => {
    if (user) refreshSiteLock();
  }, [user, refreshSiteLock]);

  // Tự làm mới role/thông tin user định kỳ — trước đây admin đổi quyền (VD: user → admin) thì
  // giao diện người đó không đổi gì cho tới khi họ tự đăng xuất/đăng nhập lại, vì user chỉ được
  // set 1 lần lúc login rồi giữ nguyên suốt phiên. Bị khoá (is_active=false) đã có interceptor
  // ở axios.js tự đăng xuất khi gặp 403 — refresh này lo phần còn lại (đổi role/thông tin).
  // Poll mỗi 15s (thay vì 60s) + refresh ngay khi tab được focus lại, vì cách test/dùng thực tế
  // phổ biến là admin đổi quyền ở 1 tab rồi chuyển sang tab của user đó xem ngay lập tức.
  useEffect(() => {
    if (!user?.id) return;
    const refresh = () => {
      authApi.getMe()
        .then((res) => {
          const fresh = res.data.data.user;
          setUser((prev) => {
            if (!prev || JSON.stringify(prev) === JSON.stringify(fresh)) return prev;
            localStorage.setItem('ghn_user', JSON.stringify(fresh));
            return fresh;
          });
        })
        .catch(() => {}); // lỗi (kể cả 403 khoá) đã được axios interceptor xử lý riêng
    };
    const interval = setInterval(refresh, 15000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [user?.id]);

  const login = async (employeeId, fullName) => {
    setLoading(true);
    try {
      const res = await authApi.login(employeeId, fullName);
      const { token, user: userData } = res.data.data;
      localStorage.setItem('ghn_token', token);
      localStorage.setItem('ghn_user', JSON.stringify(userData));
      setUser(userData);
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Đăng nhập thất bại';
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  // Dùng cho luồng SSO — backend redirect trình duyệt về kèm token trên URL (không phải XHR
  // trả JSON như login thường), nên phải tự lưu token rồi gọi /auth/me lấy lại user.
  const loginWithToken = async (token) => {
    localStorage.setItem('ghn_token', token);
    try {
      const res = await authApi.getMe();
      const userData = res.data.data.user;
      localStorage.setItem('ghn_user', JSON.stringify(userData));
      setUser(userData);
      return { success: true };
    } catch (err) {
      localStorage.removeItem('ghn_token');
      const msg = err.response?.data?.error?.message || 'Đăng nhập thất bại';
      return { success: false, message: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('ghn_token');
    localStorage.removeItem('ghn_user');
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';
  const isVip = user?.role === 'vip' || user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithToken, logout, isAdmin, isVip, siteLock, refreshSiteLock }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
