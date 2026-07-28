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

  const login = async (email, fullName) => {
    setLoading(true);
    try {
      const res = await authApi.login(email, fullName);
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

  const logout = () => {
    localStorage.removeItem('ghn_token');
    localStorage.removeItem('ghn_user');
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';
  const isVip = user?.role === 'vip' || user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isVip, siteLock, refreshSiteLock }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
