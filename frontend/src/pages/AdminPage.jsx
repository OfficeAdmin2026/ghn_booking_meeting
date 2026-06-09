import { useState, useEffect, useCallback } from 'react';
import { roomsApi, adminApi, bookingsApi } from '../api';
import RoomCard from '../components/RoomCard';

function RoleBadge({ role }) {
  if (role === 'admin') return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Admin</span>;
  if (role === 'vip')   return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">⭐ VIP</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">User</span>;
}

const EMPTY_FORM = {
  name: '', code: '', location: '', floor: '',
  capacity: '', is_vip: false, amenities: '',
};

export default function AdminPage() {
  // Tabs
  const [activeTab, setActiveTab] = useState('rooms'); // 'rooms' or 'settings'
  
  // Room management
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editRoom, setEditRoom] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  // Settings
  const [settings, setSettings] = useState({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    booking_freeze_weekly_enabled: false,
    booking_freeze_weekly_day: 4, // default: Thứ 5
    booking_freeze_weekly_time: '14:00',
  });
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');

  // Role management
  const [elevatedUsers, setElevatedUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [promoteEmail, setPromoteEmail] = useState('');
  const [promoteRole, setPromoteRole] = useState('admin');
  const [foundUser, setFoundUser] = useState(null);
  const [searchingUser, setSearchingUser] = useState(false);
  const [searchUserError, setSearchUserError] = useState('');
  const [roleActionLoading, setRoleActionLoading] = useState(null); // userId being changed
  const [roleActionError, setRoleActionError] = useState('');
  const [roleActionSuccess, setRoleActionSuccess] = useState('');

  // Bookings management
  const [adminBookings, setAdminBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsStatusFilter, setBookingsStatusFilter] = useState('upcoming');
  const [bookingsRefresh, setBookingsRefresh] = useState(0);
  // Cancel modal
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelMsg, setCancelMsg] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await roomsApi.getAll();
      setRooms(res.data.data.rooms || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const padTime = (val) => {
    if (!val) return '14:00';
    // Đảm bảo luôn là HH:mm
    const match = val.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
    if (!match) return '14:00';
    const h = String(match[1]).padStart(2, '0');
    const m = String(match[2] ?? '00').padStart(2, '0');
    return `${h}:${m}`;
  };
  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await adminApi.getSettings();
      const s = res.data.data.settings || {};
      setSettings(s);
      setSettingsForm({
        booking_freeze_weekly_enabled: s.booking_freeze_weekly_enabled === 'true' || false,
        booking_freeze_weekly_day: s.booking_freeze_weekly_day !== undefined ? Number(s.booking_freeze_weekly_day) : 4,
        booking_freeze_weekly_time: padTime(s.booking_freeze_weekly_time),
      });
    } catch (e) {
      console.error(e);
      setSettingsError('Tải cài đặt thất bại');
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const loadElevatedUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await adminApi.getUsers();
      const users = res.data.data.users || [];
      setElevatedUsers(users.filter(u => u.role !== 'user'));
    } catch (e) {
      console.error(e);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const handleSearchUser = async () => {
    const email = promoteEmail.trim().toLowerCase();
    if (!email) return;
    if (!email.endsWith('@ghn.vn')) {
      setSearchUserError('Email phải có đuôi @ghn.vn');
      return;
    }
    setSearchingUser(true);
    setSearchUserError('');
    setFoundUser(null);
    try {
      const res = await adminApi.findUserByEmail(email);
      setFoundUser(res.data.data.user);
    } catch (err) {
      setSearchUserError(err.response?.data?.error?.message || 'Không tìm thấy người dùng');
    } finally {
      setSearchingUser(false);
    }
  };

  const handleSetRole = async (userId, role) => {
    setRoleActionLoading(userId);
    setRoleActionError('');
    try {
      await adminApi.setUserRole(userId, role);
      await loadElevatedUsers();
      if (foundUser?.id === userId) {
        setFoundUser(null);
        setPromoteEmail('');
      }
      setRoleActionSuccess('Cập nhật quyền thành công');
      setTimeout(() => setRoleActionSuccess(''), 3000);
    } catch (err) {
      setRoleActionError(err.response?.data?.error?.message || 'Cập nhật thất bại');
      setTimeout(() => setRoleActionError(''), 3000);
    } finally {
      setRoleActionLoading(null);
    }
  };

  const loadAdminBookings = useCallback(async () => {
    setBookingsLoading(true);
    try {
      const params = {};
      if (bookingsStatusFilter === 'upcoming') {
        // No status filter — we'll filter client-side to include pending/confirmed/active
      } else if (bookingsStatusFilter !== 'all') {
        params.status = bookingsStatusFilter;
      }
      const res = await adminApi.getBookings(params);
      let data = res.data.data?.bookings || [];
      if (bookingsStatusFilter === 'upcoming') {
        data = data.filter((b) => ['pending', 'confirmed', 'active'].includes(b.status));
      }
      setAdminBookings(data);
    } catch (e) {
      console.error(e);
    } finally {
      setBookingsLoading(false);
    }
  }, [bookingsStatusFilter, bookingsRefresh]);

  useEffect(() => {
    loadRooms();
    loadSettings();
  }, [loadRooms, loadSettings]);

  useEffect(() => {
    if (activeTab === 'bookings') loadAdminBookings();
    if (activeTab === 'roles') loadElevatedUsers();
  }, [activeTab, loadAdminBookings, loadElevatedUsers]);

  const openCreate = () => {
    setEditRoom(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(true);
  };

  const openEdit = (room) => {
    setEditRoom(room);
    setForm({
      name: room.name,
      code: room.code,
      location: room.location,
      floor: room.floor,
      capacity: room.capacity,
      is_vip: room.is_vip,
      amenities: (room.amenities || []).map((a) => a.amenity || a.name || a).join(', '),
    });
    setError('');
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        capacity: Number(form.capacity),
        amenities: form.amenities
          ? form.amenities.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      };
      if (editRoom) {
        await roomsApi.update(editRoom.id, payload);
      } else {
        await roomsApi.create(payload);
      }
      setShowForm(false);
      loadRooms();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Xóa phòng "${name}"?`)) return;
    try {
      await roomsApi.delete(id);
      setRooms((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Không thể xóa');
    }
  };

  const handleAdminCancel = async () => {
    if (!cancelTarget) return;
    setCancelLoading(true);
    setCancelError('');
    try {
      await bookingsApi.cancel(cancelTarget.id, cancelMsg || null);
      setCancelTarget(null);
      setCancelMsg('');
      setBookingsRefresh((v) => v + 1);
    } catch (err) {
      setCancelError(err.response?.data?.error?.message || 'Hủy thất bại');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsError('');
    setSettingsSuccess('');
    try {
      const payload = {
        booking_freeze_weekly_enabled: String(settingsForm.booking_freeze_weekly_enabled),
        booking_freeze_weekly_day: settingsForm.booking_freeze_weekly_day,
        booking_freeze_weekly_time: padTime(settingsForm.booking_freeze_weekly_time),
      };
      await adminApi.updateSettings(payload);
      setSettingsSuccess('✅ Cài đặt đã lưu thành công');
      await loadSettings();
      setTimeout(() => setSettingsSuccess(''), 3000);
    } catch (err) {
      setSettingsError(err.response?.data?.error?.message || 'Lưu thất bại');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const filtered = rooms
    .filter(
      (r) =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.location?.toLowerCase().includes(search.toLowerCase()) ||
        r.code?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let av = a[sortCol];
      let bv = b[sortCol];
      if (sortCol === 'capacity') { av = Number(av); bv = Number(bv); }
      else if (sortCol === 'is_vip') { av = av ? 1 : 0; bv = bv ? 1 : 0; }
      else { av = String(av ?? '').toLowerCase(); bv = String(bv ?? '').toLowerCase(); }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with Tabs */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Bảng Điều Khiển Quản Trị</h1>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('rooms')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'rooms'
                ? 'border-ghn-orange text-ghn-orange'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            📋 Quản lý phòng
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'bookings'
                ? 'border-ghn-orange text-ghn-orange'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            📅 Quản lý lịch
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'roles'
                ? 'border-ghn-orange text-ghn-orange'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            👥 Quản lý quyền
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-ghn-orange text-ghn-orange'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            ⚙️ Cài đặt
          </button>
        </div>
      </div>

      {/* Rooms Tab */}
      {activeTab === 'rooms' && (
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Quản lý phòng họp</h2>
              <p className="text-gray-500 mt-1">{rooms.length} phòng</p>
            </div>
            <button onClick={openCreate} className="btn-primary">
              + Thêm phòng mới
            </button>
          </div>

          {/* Search */}
          <div className="mb-5">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field max-w-sm"
              placeholder="🔍 Tìm theo tên, địa điểm, mã..."
            />
          </div>

          {/* Rooms table */}
          {loading ? (
            <div className="card p-12 text-center text-gray-400">Đang tải...</div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {[
                      { key: 'name', label: 'Tên phòng', align: 'left' },
                      { key: 'code', label: 'Mã phòng', align: 'left' },
                      { key: 'location', label: 'Địa điểm', align: 'left' },
                      { key: 'floor', label: 'Tầng', align: 'left' },
                      { key: 'capacity', label: 'Sức chứa', align: 'center' },
                      { key: null, label: 'Tiện ích', align: 'left' },
                      { key: 'is_vip', label: 'Loại', align: 'center' },
                      { key: null, label: 'Thao tác', align: 'center' },
                    ].map(({ key, label, align }) => (
                      <th
                        key={label}
                        className={`px-4 py-3 font-semibold text-gray-600 text-${align} ${key ? 'cursor-pointer select-none hover:bg-gray-100' : ''}`}
                        onClick={() => key && handleSort(key)}
                      >
                        <span className="inline-flex items-center gap-1">
                          {label}
                          {key && (
                            <span className="text-xs text-gray-400">
                              {sortCol === key ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                            </span>
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-gray-400">Không có phòng nào</td>
                    </tr>
                  ) : (
                    filtered.map((room) => (
                      <tr key={room.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{room.name}</td>
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{room.code}</td>
                        <td className="px-4 py-3 text-gray-600">{room.location}</td>
                        <td className="px-4 py-3 text-gray-600">{room.floor}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-semibold text-ghn-orange">{room.capacity}</span>
                          <span className="text-gray-400 text-xs"> người</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(room.amenities || []).slice(0, 3).map((a, i) => (
                              <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{a.amenity || a.name || a}</span>
                            ))}
                            {(room.amenities || []).length > 3 && (
                              <span className="text-xs text-gray-400">+{(room.amenities || []).length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {room.is_vip ? (
                            <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full">⭐ VIP</span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Thường</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEdit(room)}
                              className="text-xs text-blue-600 hover:text-white hover:bg-blue-500 border border-blue-200 px-3 py-1.5 rounded-lg transition-all duration-200"
                            >
                              Chỉnh sửa
                            </button>
                            <button
                              onClick={() => handleDelete(room.id, room.name)}
                              className="text-xs text-red-500 hover:text-white hover:bg-red-500 border border-red-200 px-3 py-1.5 rounded-lg transition-all duration-200"
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {editRoom ? 'Chỉnh sửa phòng' : 'Thêm phòng mới'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên phòng *</label>
                  <input
                    className="input-field"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="Phòng họp A"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã phòng *</label>
                  <input
                    className="input-field"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    required
                    placeholder="HQ-3F-A"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sức chứa *</label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    required
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Địa điểm *</label>
                  <input
                    className="input-field"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    required
                    placeholder="Trụ sở HCM"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tầng *</label>
                  <input
                    className="input-field"
                    value={form.floor}
                    onChange={(e) => setForm({ ...form, floor: e.target.value })}
                    required
                    placeholder="3F"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tiện ích (ngăn cách bởi dấu phẩy)</label>
                  <input
                    className="input-field"
                    value={form.amenities}
                    onChange={(e) => setForm({ ...form, amenities: e.target.value })}
                    placeholder="TV, Projector, Whiteboard"
                  />
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_vip}
                      onChange={(e) => setForm({ ...form, is_vip: e.target.checked })}
                      className="w-4 h-4 accent-ghn-orange"
                    />
                    <span className="text-sm font-medium text-gray-700">Phòng VIP (chỉ admin/VIP mới được đặt)</span>
                  </label>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Đang lưu...' : editRoom ? 'Cập nhật' : 'Tạo phòng'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost px-6">
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </div>
      )}

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Quản lý lịch đặt phòng</h2>
              <p className="text-gray-500 mt-1">Xem và hủy lịch đặt phòng của tất cả người dùng</p>
            </div>
            <button
              onClick={() => setBookingsRefresh((v) => v + 1)}
              className="text-sm text-gray-500 hover:text-ghn-orange border border-gray-200 px-4 py-2 rounded-lg hover:border-ghn-orange transition-colors"
            >
              ↻ Làm mới
            </button>
          </div>

          {/* Status filter pills */}
          <div className="flex gap-2 mb-5">
            {[
              { value: 'upcoming', label: '📅 Sắp tới' },
              { value: 'all',      label: 'Tất cả'     },
              { value: 'cancelled', label: 'Đã hủy'   },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setBookingsStatusFilter(value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  bookingsStatusFilter === value
                    ? 'bg-ghn-orange text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {bookingsLoading ? (
            <div className="text-center py-12 text-gray-400">Đang tải...</div>
          ) : adminBookings.length === 0 ? (
            <div className="text-center py-12 text-gray-400">Không có lịch đặt nào</div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-left">
                    <th className="px-4 py-3 font-semibold text-gray-600">Thời gian</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Phòng</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Người đặt</th>
                    <th className="px-4 py-3 font-semibold text-gray-600">Tiêu đề</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 text-center">Trạng thái</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {adminBookings.map((b) => {
                    const start = new Date(b.start_time);
                    const end   = new Date(b.end_time);
                    const fmtDate = start.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short', day: 'numeric', month: 'numeric' });
                    const fmtStart = start.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false });
                    const fmtEnd   = end.toLocaleTimeString('vi-VN',   { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false });
                    const statusMap = {
                      pending:   { label: 'Chờ xác nhận', cls: 'bg-yellow-100 text-yellow-700' },
                      confirmed: { label: 'Đã xác nhận',  cls: 'bg-blue-100 text-blue-700'   },
                      active:    { label: 'Đang họp',     cls: 'bg-green-100 text-green-700'  },
                      completed: { label: 'Hoàn thành',   cls: 'bg-gray-100 text-gray-600'   },
                      cancelled: { label: 'Đã hủy',       cls: 'bg-red-100 text-red-600'     },
                    };
                    const st = statusMap[b.status] || { label: b.status, cls: 'bg-gray-100 text-gray-600' };
                    const canCancel = ['pending', 'confirmed', 'active'].includes(b.status);
                    return (
                      <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{fmtDate}</div>
                          <div className="text-xs text-gray-500">{fmtStart} – {fmtEnd}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">{b.room?.name || '—'}</div>
                          {b.room?.location && (
                            <div className="text-xs text-gray-400">{b.room.location}{b.room.floor ? ` • ${b.room.floor}` : ''}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-gray-800">{b.user?.full_name || '—'}</div>
                          <div className="text-xs text-gray-400">{b.user?.email || ''}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{b.title}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.cls}`}>{st.label}</span>
                          {b.cancellation_message && (
                            <div className="text-xs text-red-500 mt-1 max-w-[120px] truncate" title={b.cancellation_message}>
                              "{b.cancellation_message}"
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {canCancel ? (
                            <button
                              onClick={() => { setCancelTarget(b); setCancelMsg(''); setCancelError(''); }}
                              className="text-xs text-red-500 hover:text-white hover:bg-red-500 border border-red-200 px-3 py-1.5 rounded-lg transition-all"
                            >
                              Hủy lịch
                            </button>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Cancel modal */}
          {cancelTarget && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
              onClick={(e) => { if (e.target === e.currentTarget) { setCancelTarget(null); setCancelMsg(''); setCancelError(''); } }}
            >
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="bg-red-500 px-5 pt-5 pb-4">
                  <h3 className="font-bold text-white text-lg">Hủy lịch đặt phòng</h3>
                  <p className="text-red-100 text-sm mt-1">{cancelTarget.title}</p>
                  <p className="text-red-200 text-xs mt-0.5">
                    {cancelTarget.room?.name} · {new Date(cancelTarget.start_time).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Người đặt</label>
                    <p className="text-sm text-gray-600">{cancelTarget.user?.full_name} ({cancelTarget.user?.email})</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Lời nhắn cho người dùng <span className="text-gray-400 font-normal">(không bắt buộc)</span>
                    </label>
                    <textarea
                      value={cancelMsg}
                      onChange={(e) => setCancelMsg(e.target.value)}
                      placeholder="VD: Phòng cần bảo trì, vui lòng đặt phòng khác..."
                      rows={3}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-red-400"
                    />
                  </div>
                  {cancelError && (
                    <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{cancelError}</div>
                  )}
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={handleAdminCancel}
                      disabled={cancelLoading}
                      className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors disabled:opacity-50"
                    >
                      {cancelLoading ? 'Đang hủy...' : 'Xác nhận hủy'}
                    </button>
                    <button
                      onClick={() => { setCancelTarget(null); setCancelMsg(''); setCancelError(''); }}
                      disabled={cancelLoading}
                      className="flex-1 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-sm transition-colors"
                    >
                      Giữ lại
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Quản lý quyền người dùng</h2>
            <p className="text-gray-500 mt-1">Cấp / thu hồi quyền Admin và VIP (chỉ áp dụng với email @ghn.vn)</p>
          </div>

          {/* Promote form */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">➕ Thêm Admin / VIP theo email</h3>
            <div className="flex gap-3 flex-wrap">
              <input
                type="email"
                value={promoteEmail}
                onChange={e => { setPromoteEmail(e.target.value); setFoundUser(null); setSearchUserError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleSearchUser()}
                placeholder="ten.nhanvien@ghn.vn"
                className="input-field flex-1 min-w-[220px]"
              />
              <select
                value={promoteRole}
                onChange={e => setPromoteRole(e.target.value)}
                className="input-field w-32"
              >
                <option value="admin">Admin</option>
                <option value="vip">VIP (BOD)</option>
              </select>
              <button
                onClick={handleSearchUser}
                disabled={searchingUser || !promoteEmail.trim()}
                className="btn-primary px-5 disabled:opacity-50"
              >
                {searchingUser ? 'Đang tìm...' : 'Tìm kiếm'}
              </button>
            </div>

            {searchUserError && (
              <p className="mt-2 text-sm text-red-600">{searchUserError}</p>
            )}

            {/* Found user preview */}
            {foundUser && (
              <div className="mt-4 flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-ghn-orange flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {foundUser.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{foundUser.full_name}</p>
                    <p className="text-xs text-gray-500">{foundUser.email}{foundUser.department ? ` · ${foundUser.department}` : ''}</p>
                  </div>
                  <RoleBadge role={foundUser.role} />
                </div>
                <div className="flex gap-2">
                  {foundUser.role !== promoteRole && (
                    <button
                      onClick={() => handleSetRole(foundUser.id, promoteRole)}
                      disabled={roleActionLoading === foundUser.id}
                      className="text-sm font-medium px-4 py-1.5 rounded-lg bg-ghn-orange text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
                    >
                      {roleActionLoading === foundUser.id ? '...' : `Gán ${promoteRole === 'admin' ? 'Admin' : 'VIP'}`}
                    </button>
                  )}
                  {foundUser.role !== 'user' && (
                    <button
                      onClick={() => handleSetRole(foundUser.id, 'user')}
                      disabled={roleActionLoading === foundUser.id}
                      className="text-sm font-medium px-4 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                      Hạ xuống User
                    </button>
                  )}
                </div>
              </div>
            )}

            {roleActionSuccess && (
              <div className="mt-3 px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                ✅ {roleActionSuccess}
              </div>
            )}
            {roleActionError && (
              <div className="mt-3 px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {roleActionError}
              </div>
            )}
          </div>

          {/* Current elevated users list */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">
                Danh sách Admin & VIP hiện tại
                {elevatedUsers.length > 0 && <span className="ml-2 text-xs font-normal text-gray-400">({elevatedUsers.length})</span>}
              </h3>
              <button
                onClick={loadElevatedUsers}
                className="text-xs text-gray-500 hover:text-ghn-orange border border-gray-200 px-3 py-1.5 rounded-lg hover:border-ghn-orange transition-colors"
              >
                ↻ Làm mới
              </button>
            </div>

            {usersLoading ? (
              <div className="text-center py-8 text-gray-400">Đang tải...</div>
            ) : elevatedUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-400">Chưa có Admin hoặc VIP nào ngoài bạn</div>
            ) : (
              <div className="space-y-2">
                {['admin', 'vip'].map(roleGroup => {
                  const group = elevatedUsers.filter(u => u.role === roleGroup);
                  if (group.length === 0) return null;
                  return (
                    <div key={roleGroup}>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 mt-3">
                        {roleGroup === 'admin' ? '🔑 Admin' : '⭐ VIP (BOD)'}
                      </p>
                      <div className="space-y-1.5">
                        {group.map(u => (
                          <div key={u.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${roleGroup === 'admin' ? 'bg-ghn-orange' : 'bg-amber-400'}`}>
                                {u.full_name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-800">{u.full_name}</p>
                                <p className="text-xs text-gray-500">{u.email}{u.department ? ` · ${u.department}` : ''}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {roleGroup === 'admin' && (
                                <button
                                  onClick={() => handleSetRole(u.id, 'vip')}
                                  disabled={roleActionLoading === u.id}
                                  className="text-xs px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-50"
                                >
                                  → VIP
                                </button>
                              )}
                              {roleGroup === 'vip' && (
                                <button
                                  onClick={() => handleSetRole(u.id, 'admin')}
                                  disabled={roleActionLoading === u.id}
                                  className="text-xs px-3 py-1.5 rounded-lg border border-orange-200 text-orange-700 hover:bg-orange-50 transition-colors disabled:opacity-50"
                                >
                                  → Admin
                                </button>
                              )}
                              <button
                                onClick={() => handleSetRole(u.id, 'user')}
                                disabled={roleActionLoading === u.id}
                                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
                              >
                                {roleActionLoading === u.id ? '...' : 'Gỡ quyền'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Cài đặt hệ thống</h2>
          
          {settingsLoading ? (
            <div className="card p-12 text-center text-gray-400">Đang tải cài đặt...</div>
          ) : (
            <form onSubmit={handleSaveSettings}>
              <div className="card p-6 space-y-6">

                {/* Booking Freeze Settings */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Đóng băng đặt phòng</h3>
                  <div className="space-y-4">
                    {/* Weekly Opening Schedule */}
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-gray-800 mb-3">📅 Hệ thống mở booking hàng tuần</h4>
                      <div className="flex items-center gap-2 mb-4">
                        <input
                          type="checkbox"
                          id="weeklyEnabled"
                          checked={settingsForm.booking_freeze_weekly_enabled}
                          onChange={(e) =>
                            setSettingsForm({
                              ...settingsForm,
                              booking_freeze_weekly_enabled: e.target.checked,
                            })
                          }
                          className="w-4 h-4 accent-ghn-orange"
                        />
                        <label htmlFor="weeklyEnabled" className="text-sm font-medium text-gray-700">
                          Bật hệ thống mở booking tự động
                        </label>
                      </div>

                      {/* Chọn ngày/giờ mở booking */}
                      <div className="flex items-center gap-4 mb-4">
                        <label className="text-sm font-medium text-gray-700">Ngày mở booking:</label>
                        <select
                          value={settingsForm.booking_freeze_weekly_day}
                          onChange={e => setSettingsForm({ ...settingsForm, booking_freeze_weekly_day: Number(e.target.value) })}
                          className="input-field w-32"
                        >
                          <option value={1}>Thứ 2</option>
                          <option value={2}>Thứ 3</option>
                          <option value={3}>Thứ 4</option>
                          <option value={4}>Thứ 5</option>
                          <option value={5}>Thứ 6</option>
                          <option value={6}>Thứ 7</option>
                          <option value={0}>Chủ nhật</option>
                        </select>
                        <label className="text-sm font-medium text-gray-700">Giờ:</label>
                        <input
                          type="time"
                          value={padTime(settingsForm.booking_freeze_weekly_time)}
                          onChange={e => {
                            setSettingsForm({ ...settingsForm, booking_freeze_weekly_time: padTime(e.target.value) });
                          }}
                          className="input-field w-36"
                          step="60"
                        />
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-blue-900 mb-2">⏰ Quy tắc mở booking:</p>
                        <ul className="text-sm text-blue-800 space-y-1 ml-4">
                          <li>
                            • Mỗi <strong>{['Chủ nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'][settingsForm.booking_freeze_weekly_day]} lúc {settingsForm.booking_freeze_weekly_time}</strong> → Mở booking cho tuần tiếp theo (Thứ 2-CN)
                          </li>
                          <li>• Người dùng có thể book từ lúc đó cho đến hết Chủ nhật tuần tiếp theo</li>
                          <li>• Các tuần chưa mở sẽ hiển thị cảnh báo "Bạn chưa thể đặt phòng trong khoảng thời gian này. Lịch đặt sẽ được mở sau {['Chủ nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'][settingsForm.booking_freeze_weekly_day]} lúc {settingsForm.booking_freeze_weekly_time}" khi chọn slot</li>
                          <li>• Admin luôn có thể đặt phòng bất kể lúc nào</li>
                        </ul>
                      </div>

                      <p className="text-xs text-gray-600 mt-3">
                        {settingsForm.booking_freeze_weekly_enabled
                          ? '✅ Hệ thống mở booking tự động được bật'
                          : '⚠️ Hệ thống mở booking tự động được tắt - mọi người có thể đặt bất kỳ lúc nào'}
                      </p>
                    </div>

                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
                      <strong>💡 Mẹo:</strong> Với hệ thống này, bạn không cần phải điều chỉnh thêm gì. <br/>
                      Mỗi <strong>{['Chủ nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'][settingsForm.booking_freeze_weekly_day]} lúc {settingsForm.booking_freeze_weekly_time}</strong> sẽ tự động mở booking cho tuần tiếp theo.
                    </div>


                  </div>
                </div>
              </div>

              {/* Single Save Button */}
              <button
                type="submit"
                disabled={settingsSaving}
                className="btn-primary w-full mt-6"
              >
                {settingsSaving ? '⏳ Đang lưu...' : '💾 Lưu cài đặt'}
              </button>
            </form>
          )}

          {/* Messages */}
          {settingsError && (
            <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {settingsError}
            </div>
          )}
          {settingsSuccess && (
            <div className="mt-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {settingsSuccess}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

