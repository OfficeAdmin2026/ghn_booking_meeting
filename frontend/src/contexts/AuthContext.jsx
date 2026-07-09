import { createContext, useContext, useState } from 'react';
import { authApi } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('ghn_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);

  const loginWithGoogle = async (credential) => {
    setLoading(true);
    try {
      const res = await authApi.loginWithGoogle(credential);
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
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout, isAdmin, isVip }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
