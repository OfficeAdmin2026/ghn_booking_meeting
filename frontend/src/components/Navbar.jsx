import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  HomeIcon,
  MapIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkClass = (active) =>
    `flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-200 ${
      active
        ? 'bg-ghn-orange text-white shadow-sm shadow-ghn-orange/30'
        : 'text-gray-700 hover:bg-white hover:text-ghn-orange hover:shadow-sm'
    }`;

  const mobileLinkClass = (active) =>
    `flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors duration-200 ${
      active ? 'bg-ghn-orange text-white shadow-sm' : 'text-gray-700 hover:bg-white hover:text-ghn-orange'
    }`;

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img src="/images/logo.png" alt="GHN Logo" className="h-9 object-contain" />
            <div className="hidden sm:block">
              <p className="text-xs text-gray-500 leading-tight">Hệ thống đặt phòng họp</p>
            </div>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            <Link to="/" className={linkClass(location.pathname === '/')}>
              <HomeIcon className="w-4 h-4" /> Trang chủ
            </Link>
            <Link to="/rules" className={linkClass(location.pathname === '/rules')}>
              <ClipboardDocumentListIcon className="w-4 h-4" /> Nội quy phòng họp
            </Link>
            <Link to="/office-map" className={linkClass(location.pathname === '/office-map')}>
              <MapIcon className="w-4 h-4" /> Bản đồ văn phòng
            </Link>
            {isAdmin && (
              <>
                <Link to="/analytics" className={linkClass(location.pathname === '/analytics')}>
                  <ChartBarIcon className="w-4 h-4" /> Thống kê
                </Link>
                <Link to="/admin" className={linkClass(location.pathname.startsWith('/admin'))}>
                  <Cog6ToothIcon className="w-4 h-4" /> Quản trị
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

        {/* Mobile nav */}
        <div className="md:hidden flex items-center gap-1 pb-2 pt-1 overflow-x-auto px-0 bg-gray-100 rounded-xl">
          <Link to="/" className={mobileLinkClass(location.pathname === '/')}>
            <HomeIcon className="w-3.5 h-3.5" /> Trang chủ
          </Link>
          <Link to="/rules" className={mobileLinkClass(location.pathname === '/rules')}>
            <ClipboardDocumentListIcon className="w-3.5 h-3.5" /> Nội quy
          </Link>
          <Link to="/office-map" className={mobileLinkClass(location.pathname === '/office-map')}>
            <MapIcon className="w-3.5 h-3.5" /> Bản đồ
          </Link>
          {isAdmin && (
            <>
              <Link to="/analytics" className={mobileLinkClass(location.pathname === '/analytics')}>
                <ChartBarIcon className="w-3.5 h-3.5" /> Thống kê
              </Link>
              <Link to="/admin" className={mobileLinkClass(location.pathname.startsWith('/admin'))}>
                <Cog6ToothIcon className="w-3.5 h-3.5" /> Quản trị
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
