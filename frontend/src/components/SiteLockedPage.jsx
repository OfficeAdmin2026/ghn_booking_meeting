import { useNavigate } from 'react-router-dom';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

export default function SiteLockedPage({ message }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <img src="/images/logo.png" alt="GHN Logo" className="h-10 object-contain mx-auto mb-8" />
        <div className="card p-8">
          <div className="w-14 h-14 rounded-full bg-orange-100 text-ghn-orange flex items-center justify-center mx-auto mb-4">
            <LockClosedIcon className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Hệ thống tạm khoá</h1>
          <p className="text-gray-600 whitespace-pre-line">
            {message || 'Hệ thống đặt phòng đang tạm khoá. Vui lòng quay lại sau.'}
          </p>
          <button
            onClick={handleLogout}
            className="mt-6 text-sm text-gray-500 hover:text-red-500 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors duration-200"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
}
