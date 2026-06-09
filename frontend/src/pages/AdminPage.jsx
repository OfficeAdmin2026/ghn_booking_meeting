import { useState, useEffect, useCallback } from 'react';
import { roomsApi, adminApi } from '../api';
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
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [roleActionLoading, setRoleActionLoading] = useState(null); // userId being changed
  const [roleActionError, setRoleActionError] = useState('');
  const [roleActionSuccess, setRoleActionSuccess] = useState('');

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

  const handlePromote = async () => {
    const email = promoteEmail.trim().toLowerCase();
    if (!email) return;
    setPromoteLoading(true);
    setRoleActionError('');
    setRoleActionSuccess('');
    try {
      const res = await adminApi.promote(email, promoteRole);
      const u = res.data.data.user;
      await loadElevatedUsers();
      setPromoteEmail('');
      setRoleActionSuccess(`Đã cấp quyền ${promoteRole === 'admin' ? 'Admin' : 'VIP'} cho ${u.full_name || email}`);
      setTimeout(() => setRoleActionSuccess(''), 4000);
    } catch (err) {
      setRoleActionError(err.response?.data?.error?.message || 'Thất bại');
      setTimeout(() => setRoleActionError(''), 5000);
    } finally {
      setPromoteLoading(false);
    }
  };

  const handleSetRole = async (userId, role) => {
    setRoleActionLoading(userId);
    setRoleActionError('');
    try {
      await adminApi.setUserRole(userId, role);
      await loadElevatedUsers();
      setRoleActionSuccess('Cập nhật quyền thành công');
      setTimeout(() => setRoleActionSuccess(''), 3000);
    } catch (err) {
      setRoleActionError(err.response?.data?.error?.message || 'Cập nhật thất bại');
      setTimeout(() => setRoleActionError(''), 3000);
    } finally {
      setRoleActionLoading(null);
    }
  };

  useEffect(() => {
    loadRooms();
    loadSettings();
  }, [loadRooms, loadSettings]);

  useEffect(() => {
    if (activeTab === 'roles') loadElevatedUsers();
  }, [activeTab, loadElevatedUsers]);

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
            1. Quản lý phòng
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'roles'
                ? 'border-ghn-orange text-ghn-orange'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            2. Phân quyền
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-ghn-orange text-ghn-orange'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            3. Đóng băng đặt phòng
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

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Quản lý quyền người dùng</h2>
            <p className="text-gray-500 mt-1">Cấp / thu hồi quyền Admin và VIP (chỉ áp dụng với email @ghn.vn)</p>
          </div>

          {/* Promote form */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">➕ Cấp quyền theo email</h3>
            <p className="text-xs text-gray-400 mb-4">Chỉ email đuôi @ghn.vn. Người dùng cần đăng nhập ít nhất 1 lần.</p>
            <div className="flex gap-3 flex-wrap">
              <input
                type="email"
                value={promoteEmail}
                onChange={e => { setPromoteEmail(e.target.value); setRoleActionError(''); }}
                onKeyDown={e => e.key === 'Enter' && handlePromote()}
                placeholder="ten.nhanvien@ghn.vn"
                className="input-field flex-1 min-w-[220px]"
              />
              <select
                value={promoteRole}
                onChange={e => setPromoteRole(e.target.value)}
                className="input-field w-36"
              >
                <option value="admin">Admin</option>
                <option value="vip">VIP (BOD)</option>
                <option value="user">User (gỡ quyền)</option>
              </select>
              <button
                onClick={handlePromote}
                disabled={promoteLoading || !promoteEmail.trim()}
                className="btn-primary px-6 disabled:opacity-50"
              >
                {promoteLoading ? 'Đang xử lý...' : 'Cấp quyền'}
              </button>
            </div>

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

