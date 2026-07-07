import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { bookingsApi, roomsApi } from '../api';
import BookingStatusBadge from '../components/BookingStatusBadge';
import {
  BuildingOfficeIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusCircleIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

function formatDateTime(dt) {
  return new Date(dt).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'short',
    timeStyle: 'short',
    hour12: false,
  });
}

function formatDate(dt) {
  return new Date(dt).toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [totalRooms, setTotalRooms] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [bookRes, roomRes] = await Promise.all([
          bookingsApi.getMyBookings({ limit: 5 }),
          roomsApi.getAll({ limit: 1 }),
        ]);
        setBookings(bookRes.data.data.bookings || []);
        setTotalRooms(roomRes.data.data.count || 0);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const upcoming = bookings.filter(
    (b) => b.status === 'confirmed' && new Date(b.end_time) > new Date()
  );
  const confirmed = bookings.filter((b) => b.status === 'confirmed').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Xin chào, {user?.full_name?.split(' ').pop()}
        </h1>
        <p className="text-gray-500 mt-1">Hôm nay là {formatDate(new Date())}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<BuildingOfficeIcon className="w-6 h-6" />} label="Tổng phòng" value={totalRooms} color="bg-ghn-blue-light" />
        <StatCard icon={<CalendarDaysIcon className="w-6 h-6" />} label="Lịch đặt của tôi" value={bookings.length} color="bg-ghn-orange-light" />
        <StatCard icon={<CheckCircleIcon className="w-6 h-6" />} label="Đã xác nhận" value={confirmed} color="bg-green-50" />
        <StatCard icon={<ClockIcon className="w-6 h-6" />} label="Sắp diễn ra" value={upcoming.length} color="bg-purple-50" />
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => navigate('/calendar')}
          className="card p-5 text-left hover:shadow-md transition-all duration-200 border-2 border-transparent hover:border-ghn-orange group"
        >
          <div className="w-12 h-12 bg-ghn-orange-light rounded-xl flex items-center justify-center text-ghn-orange mb-3 group-hover:scale-110 transition-transform">
            <PlusCircleIcon className="w-7 h-7" />
          </div>
          <h3 className="font-semibold text-gray-800">Đặt phòng mới</h3>
          <p className="text-sm text-gray-500 mt-1">Chọn phòng và đặt lịch họp nhanh chóng</p>
        </button>

        <Link
          to="/bookings"
          className="card p-5 hover:shadow-md transition-all duration-200 border-2 border-transparent hover:border-ghn-blue"
        >
          <div className="w-12 h-12 bg-ghn-blue-light rounded-xl flex items-center justify-center text-ghn-blue mb-3">
            <ClipboardDocumentListIcon className="w-7 h-7" />
          </div>
          <h3 className="font-semibold text-gray-800">Lịch đặt của tôi</h3>
          <p className="text-sm text-gray-500 mt-1">Xem và quản lý các lịch đặt phòng</p>
        </Link>

        {isAdmin && (
          <>
            <Link
              to="/analytics"
              className="card p-5 hover:shadow-md transition-all duration-200 border-2 border-transparent hover:border-ghn-blue"
            >
              <div className="w-12 h-12 bg-ghn-blue-light rounded-xl flex items-center justify-center text-ghn-blue mb-3">
                <ChartBarIcon className="w-7 h-7" />
              </div>
              <h3 className="font-semibold text-gray-800">Thống kê &amp; Báo cáo</h3>
              <p className="text-sm text-gray-500 mt-1">Xem tỷ lệ sử dụng, giờ cao điểm, xuất CSV</p>
            </Link>
            <Link
              to="/admin"
              className="card p-5 hover:shadow-md transition-all duration-200 border-2 border-transparent hover:border-gray-300"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600 mb-3">
                <Cog6ToothIcon className="w-7 h-7" />
              </div>
              <h3 className="font-semibold text-gray-800">Quản lý phòng</h3>
              <p className="text-sm text-gray-500 mt-1">Thêm, sửa, xóa phòng họp</p>
            </Link>
          </>
        )}
      </div>

      {/* Recent bookings */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Lịch đặt gần đây</h2>
          <Link to="/bookings" className="text-sm text-ghn-orange hover:underline font-medium">
            Xem tất cả →
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Đang tải...</div>
        ) : bookings.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-400 text-sm mb-3">Bạn chưa có lịch đặt phòng nào</p>
            <button onClick={() => navigate('/calendar')} className="btn-primary text-sm">
              Đặt phòng ngay
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {bookings.map((b) => (
              <div key={b.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50">
                <div className="w-10 h-10 rounded-lg bg-ghn-orange-light flex items-center justify-center text-ghn-orange shrink-0">
                  <BuildingOfficeIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">{b.title}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {b.room?.name} · {formatDateTime(b.start_time)}
                  </p>
                </div>
                <BookingStatusBadge status={b.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
