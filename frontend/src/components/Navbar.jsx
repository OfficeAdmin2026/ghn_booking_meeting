import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const navLinks = [];

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/images/logo.png"
              alt="GHN Logo"
              className="h-9 object-contain"
            />
            <div className="hidden sm:block">
              <p className="text-xs text-gray-500 leading-tight">Hệ thống đặt phòng họp</p>
            </div>
          </Link>

          {/* Admin nav links */}
          <div className="hidden md:flex items-center gap-1">
            {isAdmin && (
              <>
                <Link
                  to="/"
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    location.pathname === '/'
                      ? 'bg-ghn-orange-light text-ghn-orange'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span>📅</span> Lịch phòng
                </Link>
                <Link
                  to="/analytics"
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    location.pathname === '/analytics'
                      ? 'bg-ghn-orange-light text-ghn-orange'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span>📊</span> Thống kê
                </Link>
                <Link
                  to="/admin"
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    location.pathname.startsWith('/admin')
                      ? 'bg-ghn-orange-light text-ghn-orange'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span>⚙️</span> Bảng điều khiển quản trị
                </Link>
              </>
            )}
          </div>

          {/* User menu */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-ghn-orange flex items-center justify-center text-white text-sm font-bold">
                {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-800 leading-tight">{user?.full_name}</p>
                <p className="text-xs text-gray-500 leading-tight capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-red-500 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors duration-200"
            >
              Đăng xuất
            </button>
          </div>
        </div>

        {/* Mobile admin nav */}
        {isAdmin && (
          <div className="md:hidden flex items-center gap-1 pb-2 overflow-x-auto px-0">
            <Link to="/" className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors duration-200 ${location.pathname === '/' ? 'bg-ghn-orange-light text-ghn-orange' : 'text-gray-600 hover:bg-gray-100'}`}>📅 Lịch phòng</Link>
            <Link to="/analytics" className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors duration-200 ${location.pathname === '/analytics' ? 'bg-ghn-orange-light text-ghn-orange' : 'text-gray-600 hover:bg-gray-100'}`}>📊 Thống kê</Link>
            <Link to="/admin" className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors duration-200 ${location.pathname.startsWith('/admin') ? 'bg-ghn-orange-light text-ghn-orange' : 'text-gray-600 hover:bg-gray-100'}`}>⚙️ Bảng điều khiển quản trị</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
