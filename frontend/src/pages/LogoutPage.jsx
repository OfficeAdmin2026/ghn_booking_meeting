import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Route ẩn — không có nút nào trên UI trỏ tới đây, chỉ gõ /logout trực tiếp.
// Dùng để xoá session nhanh lúc test nhiều MSNV khác nhau.
export default function LogoutPage() {
  const { logout } = useAuth();

  useEffect(() => { logout(); }, [logout]);

  return <Navigate to="/login" replace />;
}
