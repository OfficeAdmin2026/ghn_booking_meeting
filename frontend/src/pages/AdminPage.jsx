import { useState, useEffect, useCallback } from 'react';
import { roomsApi, adminApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import {
  PlusIcon,
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  ArrowPathIcon,
  KeyIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  BookmarkIcon,
  NoSymbolIcon,
  MagnifyingGlassIcon,
  LockClosedIcon,
  DocumentArrowUpIcon,
  TrashIcon,
  IdentificationIcon,
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/20/solid';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

const EMPTY_FORM = {
  name: '', code: '', location: '', floor: '',
  capacity: '', is_vip: false, amenities: '',
};

export default function AdminPage() {
  const { refreshSiteLock, user: currentUser } = useAuth();

  // Tabs
  const [activeTab, setActiveTab] = useState('rooms'); // 'rooms' | 'access' | 'settings'
  const [settingsSubTab, setSettingsSubTab] = useState('lock'); // 'lock' | 'freeze'
  
  // Room management
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editRoom, setEditRoom] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState('location');
  const [sortDir, setSortDir] = useState('asc');

  // Settings
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [siteLockSaving, setSiteLockSaving] = useState(false);
  const [siteLockError, setSiteLockError] = useState('');
  const [siteLockSuccess, setSiteLockSuccess] = useState('');
  const [freezeSaving, setFreezeSaving] = useState(false);
  const [freezeError, setFreezeError] = useState('');
  const [freezeSuccess, setFreezeSuccess] = useState('');
  const [settingsForm, setSettingsForm] = useState({
    booking_freeze_weekly_enabled: false,
    booking_freeze_weekly_day: 4, // default: Thứ 5
    booking_freeze_weekly_time: '14:00',
    site_locked_for_users: false,
    site_lock_message: '',
  });

  // Role management (quản trị viên) — gộp chung với allowlist MSNV trong 1 tab
  const [elevatedUsers, setElevatedUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [roleActionLoading, setRoleActionLoading] = useState(null); // userId/employeeId đang xử lý
  const [roleActionError, setRoleActionError] = useState('');
  const [roleActionSuccess, setRoleActionSuccess] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all'); // all | admin | vip

  // Allowlist MSNV (truy cập theo 2 văn phòng)
  const [allowedEmployees, setAllowedEmployees] = useState([]);
  const [allowedLoading, setAllowedLoading] = useState(false);
  const [allowedSearch, setAllowedSearch] = useState('');
  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeDept, setNewEmployeeDept] = useState('');
  const [newEmployeeEmail, setNewEmployeeEmail] = useState('');
  const [addEmployeeLoading, setAddEmployeeLoading] = useState(false);
  const [addEmployeeError, setAddEmployeeError] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [removeEmployeeLoading, setRemoveEmployeeLoading] = useState(null); // id đang xoá
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState(new Set());
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

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
      setSettingsForm({
        booking_freeze_weekly_enabled: s.booking_freeze_weekly_enabled === 'true' || false,
        booking_freeze_weekly_day: s.booking_freeze_weekly_day !== undefined ? Number(s.booking_freeze_weekly_day) : 4,
        booking_freeze_weekly_time: padTime(s.booking_freeze_weekly_time),
        site_locked_for_users: s.site_locked_for_users === 'true' || false,
        site_lock_message: s.site_lock_message ?? '',
      });
    } catch (e) {
      console.error(e);
      setSiteLockError('Tải cài đặt thất bại');
      setFreezeError('Tải cài đặt thất bại');
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const loadElevatedUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await adminApi.getUsers();
      const users = res.data.data.users || [];
      setElevatedUsers(users.filter(u => u.role !== 'user' || !u.is_active));
    } catch (e) {
      console.error(e);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // Đổi vai trò theo MSNV — dùng cho dropdown trong bảng allowlist gộp chung.
  // Cũng dùng lại cho khối "Quản trị viên" (đổi Admin↔VIP, gỡ quyền) vì cả 2 đều thao tác qua MSNV.
  const handleSetRoleByEmployeeId = async (employeeId, role, label) => {
    setRoleActionLoading(employeeId);
    setRoleActionError('');
    setRoleActionSuccess('');
    try {
      const res = await adminApi.promote(employeeId, role);
      const u = res.data.data.user;
      await Promise.all([loadAllowedEmployees(), loadElevatedUsers()]);
      setRoleActionSuccess(`Đã cập nhật quyền ${role === 'admin' ? 'Admin' : role === 'vip' ? 'VIP' : 'User'} cho ${label || u.full_name || employeeId}`);
      setTimeout(() => setRoleActionSuccess(''), 4000);
    } catch (err) {
      setRoleActionError(err.response?.data?.error?.message || 'Cập nhật quyền thất bại');
      setTimeout(() => setRoleActionError(''), 5000);
    } finally {
      setRoleActionLoading(null);
    }
  };

  // Khoá/bỏ khoá theo MSNV — nếu chưa từng đăng nhập (chưa có user record) thì banUser sẽ tạo
  // sẵn tài khoản ở trạng thái bị chặn; bỏ khoá chỉ khả dụng khi đã có tài khoản.
  const handleToggleLockByRow = async (employeeId, userId, isActive, label) => {
    if (isActive === false && !confirm(`Chặn truy cập "${label}"? Người này sẽ không thể đăng nhập lại cho đến khi được bỏ chặn.`)) return;
    setRoleActionLoading(employeeId);
    setRoleActionError('');
    setRoleActionSuccess('');
    try {
      if (userId) {
        await adminApi.setUserStatus(userId, isActive);
      } else {
        await adminApi.banUser(employeeId);
      }
      await Promise.all([loadAllowedEmployees(), loadElevatedUsers()]);
      setRoleActionSuccess(isActive ? 'Đã bỏ chặn truy cập' : 'Đã chặn truy cập');
      setTimeout(() => setRoleActionSuccess(''), 3000);
    } catch (err) {
      setRoleActionError(err.response?.data?.error?.message || 'Cập nhật thất bại');
      setTimeout(() => setRoleActionError(''), 5000);
    } finally {
      setRoleActionLoading(null);
    }
  };

  // Đổi quyền/trạng thái theo user id — dùng cho khối "Quản trị viên hiện tại" vì thao tác
  // trên tài khoản đã tồn tại sẵn (kể cả những admin cũ chưa có MSNV, promote-theo-MSNV sẽ
  // không tìm được họ vì chưa có allowlist match).
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

  const handleSetStatus = async (userId, isActive, label) => {
    if (!isActive && !confirm(`Chặn truy cập "${label}"? Người này sẽ không thể đăng nhập lại cho đến khi được bỏ chặn.`)) return;
    setRoleActionLoading(userId);
    setRoleActionError('');
    try {
      await adminApi.setUserStatus(userId, isActive);
      await loadElevatedUsers();
      setRoleActionSuccess(isActive ? 'Đã bỏ chặn truy cập' : 'Đã chặn truy cập');
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

  const loadAllowedEmployees = useCallback(async () => {
    setAllowedLoading(true);
    try {
      const res = await adminApi.getAllowedEmployees();
      setAllowedEmployees(res.data.data.employees || []);
    } catch (e) {
      console.error(e);
    } finally {
      setAllowedLoading(false);
    }
  }, []);

  // Tab gộp: cần cả allowlist (MSNV) lẫn danh sách quản trị viên (Admin/VIP)
  useEffect(() => {
    if (activeTab === 'access') {
      loadAllowedEmployees();
      loadElevatedUsers();
    }
  }, [activeTab, loadAllowedEmployees, loadElevatedUsers]);

  const handleAddEmployee = async () => {
    const id = newEmployeeId.trim();
    if (!id) return;
    setAddEmployeeLoading(true);
    setAddEmployeeError('');
    try {
      await adminApi.addAllowedEmployee(id, newEmployeeName.trim(), newEmployeeDept.trim(), newEmployeeEmail.trim());
      await loadAllowedEmployees();
      setNewEmployeeId('');
      setNewEmployeeName('');
      setNewEmployeeDept('');
      setNewEmployeeEmail('');
    } catch (err) {
      setAddEmployeeError(err.response?.data?.error?.message || 'Thêm thất bại');
      setTimeout(() => setAddEmployeeError(''), 5000);
    } finally {
      setAddEmployeeLoading(false);
    }
  };

  const handleRemoveEmployee = async (id, label) => {
    if (!confirm(`Xoá "${label}" khỏi danh sách MSNV được phép truy cập?`)) return;
    setRemoveEmployeeLoading(id);
    try {
      await adminApi.removeAllowedEmployee(id);
      await loadAllowedEmployees();
    } catch (err) {
      setImportError(err.response?.data?.error?.message || 'Xoá thất bại');
      setTimeout(() => setImportError(''), 5000);
    } finally {
      setRemoveEmployeeLoading(null);
    }
  };

  const toggleSelectEmployee = (id) => {
    setSelectedEmployeeIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = (ids, allSelected) => {
    setSelectedEmployeeIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => { if (allSelected) next.delete(id); else next.add(id); });
      return next;
    });
  };

  const handleBulkDeleteEmployees = async () => {
    const ids = Array.from(selectedEmployeeIds);
    if (ids.length === 0) return;
    if (!confirm(`Xoá ${ids.length} MSNV đã chọn khỏi danh sách được phép truy cập? Hành động này không thể hoàn tác.`)) return;
    setBulkDeleteLoading(true);
    try {
      await adminApi.bulkRemoveAllowedEmployees(ids);
      setSelectedEmployeeIds(new Set());
      await loadAllowedEmployees();
    } catch (err) {
      setImportError(err.response?.data?.error?.message || 'Xoá thất bại');
      setTimeout(() => setImportError(''), 5000);
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  // Đọc file Excel (.xlsx/.xls/.csv) — nhận diện linh hoạt tên cột MSNV/Họ tên
  const handleImportFile = async (file) => {
    if (!file) return;
    setImportLoading(true);
    setImportError('');
    setImportSuccess('');
    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      // raw: false — đọc đúng text hiển thị trong file (giữ nguyên số 0 ở đầu MSNV nếu có),
      // không để thư viện tự diễn giải ô số thành kiểu Number rồi làm mất định dạng gốc.
      const raw = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

      const pickKey = (row, candidates) =>
        Object.keys(row).find(k => candidates.includes(k.trim().toLowerCase()));

      const rows = raw.map((row) => {
        const idKey = pickKey(row, ['msnv', 'employee_id', 'ma nhan vien', 'mã nhân viên', 'id']);
        const nameKey = pickKey(row, ['ho ten', 'họ tên', 'ho va ten', 'họ và tên', 'full_name', 'ten', 'tên', 'name']);
        const deptKey = pickKey(row, ['department', 'phong ban', 'phòng ban', 'dept']);
        const emailKey = pickKey(row, ['email', 'e-mail', 'mail']);
        return {
          employee_id: idKey ? String(row[idKey]).trim() : '',
          full_name: nameKey ? String(row[nameKey]).trim() : '',
          department: deptKey ? String(row[deptKey]).trim() : '',
          email: emailKey ? String(row[emailKey]).trim() : '',
        };
      }).filter(r => r.employee_id);

      if (rows.length === 0) {
        throw new Error('Không tìm thấy cột MSNV hợp lệ trong file — cần cột tên "MSNV" hoặc "employee_id"');
      }

      const res = await adminApi.bulkImportAllowedEmployees(rows);
      const { inserted, skipped } = res.data.data;
      setImportSuccess(`Đã thêm ${inserted} MSNV mới${skipped ? `, bỏ qua ${skipped} MSNV đã có sẵn` : ''}.`);
      setTimeout(() => setImportSuccess(''), 6000);
      await loadAllowedEmployees();
    } catch (err) {
      setImportError(err.response?.data?.error?.message || err.message || 'Import thất bại');
      setTimeout(() => setImportError(''), 6000);
    } finally {
      setImportLoading(false);
    }
  };

  const filteredAllowedEmployees = allowedEmployees.filter((e) => {
    const q = allowedSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      e.employee_id.toLowerCase().includes(q) ||
      (e.full_name || '').toLowerCase().includes(q) ||
      (e.department || '').toLowerCase().includes(q) ||
      (e.email || '').toLowerCase().includes(q)
    );
  });

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

  const handleSaveSiteLock = async (e) => {
    e.preventDefault();
    setSiteLockSaving(true);
    setSiteLockError('');
    setSiteLockSuccess('');
    try {
      const payload = {
        site_locked_for_users: String(settingsForm.site_locked_for_users),
        site_lock_message: settingsForm.site_lock_message,
      };
      await adminApi.updateSettings(payload);
      setSiteLockSuccess('Đã lưu cài đặt khoá hệ thống');
      await loadSettings();
      await refreshSiteLock();
      setTimeout(() => setSiteLockSuccess(''), 3000);
    } catch (err) {
      setSiteLockError(err.response?.data?.error?.message || 'Lưu thất bại');
    } finally {
      setSiteLockSaving(false);
    }
  };

  const handleSaveFreeze = async (e) => {
    e.preventDefault();
    setFreezeSaving(true);
    setFreezeError('');
    setFreezeSuccess('');
    try {
      const payload = {
        booking_freeze_weekly_enabled: String(settingsForm.booking_freeze_weekly_enabled),
        booking_freeze_weekly_day: settingsForm.booking_freeze_weekly_day,
        booking_freeze_weekly_time: padTime(settingsForm.booking_freeze_weekly_time),
      };
      await adminApi.updateSettings(payload);
      setFreezeSuccess('Đã lưu cài đặt đóng băng đặt phòng');
      await loadSettings();
      setTimeout(() => setFreezeSuccess(''), 3000);
    } catch (err) {
      setFreezeError(err.response?.data?.error?.message || 'Lưu thất bại');
    } finally {
      setFreezeSaving(false);
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

  const LOCATION_ORDER = { 'Rivera Park': 0, 'Mipec': 1 };
  const FLOOR_ORDER    = { 'G': 0, '1F': 1, '3F': 2, '8F': 3 };
  const locrank  = (r) => LOCATION_ORDER[r.location] ?? 99;
  const floorrank = (r) => FLOOR_ORDER[r.floor]    ?? 99;

  const filtered = rooms
    .filter(
      (r) =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.location?.toLowerCase().includes(search.toLowerCase()) ||
        r.code?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      // Primary: user-chosen column
      let av, bv;
      if (sortCol === 'capacity') { av = Number(a.capacity); bv = Number(b.capacity); }
      else if (sortCol === 'is_vip') { av = a.is_vip ? 1 : 0; bv = b.is_vip ? 1 : 0; }
      else if (sortCol === 'location') { av = locrank(a);  bv = locrank(b); }
      else if (sortCol === 'floor')    { av = floorrank(a); bv = floorrank(b); }
      else { av = String(a[sortCol] ?? '').toLowerCase(); bv = String(b[sortCol] ?? '').toLowerCase(); }
      if (av !== bv) return sortDir === 'asc' ? (av < bv ? -1 : 1) : (av < bv ? 1 : -1);

      // Tiebreaker: location → floor → name
      const locDiff = locrank(a) - locrank(b);
      if (locDiff !== 0) return locDiff;
      const floorDiff = floorrank(a) - floorrank(b);
      if (floorDiff !== 0) return floorDiff;
      return a.name.localeCompare(b.name, 'vi');
    });

  const matchesQuery = (u, q) => {
    if (!q) return true;
    return (u.employee_id || '').toLowerCase().includes(q) || (u.full_name || '').toLowerCase().includes(q);
  };

  const grantedUsers = elevatedUsers
    .filter(u => u.is_active && (u.role === 'admin' || u.role === 'vip'))
    .filter(u => userRoleFilter === 'all' || u.role === userRoleFilter)
    .filter(u => matchesQuery(u, userSearch.trim().toLowerCase()));

  return (
    <div className="p-4">
      <div className="flex gap-6 items-start">
        {/* Sidebar nav */}
        <div className="w-64 shrink-0 rounded-xl border border-gray-200 bg-white p-3">
          <button
            onClick={() => setActiveTab('rooms')}
            className={`w-full text-left rounded-lg px-3 py-2.5 font-medium transition-colors ${
              activeTab === 'rooms' ? 'bg-orange-50 text-ghn-orange' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            1. Quản lý phòng
          </button>
          <button
            onClick={() => setActiveTab('access')}
            className={`w-full text-left rounded-lg px-3 py-2.5 font-medium transition-colors mt-1 ${
              activeTab === 'access' ? 'bg-orange-50 text-ghn-orange' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            2. Truy cập &amp; Phân quyền
          </button>

          <div className="mt-1 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            3. Cài đặt hệ thống
          </div>
          <button
            onClick={() => { setActiveTab('settings'); setSettingsSubTab('lock'); }}
            className={`w-full text-left rounded-lg pl-6 pr-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'settings' && settingsSubTab === 'lock' ? 'bg-orange-50 text-ghn-orange' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            3.1 Khoá hệ thống (tài khoản User)
          </button>
          <button
            onClick={() => { setActiveTab('settings'); setSettingsSubTab('freeze'); }}
            className={`w-full text-left rounded-lg pl-6 pr-3 py-2 text-sm font-medium transition-colors mt-0.5 ${
              activeTab === 'settings' && settingsSubTab === 'freeze' ? 'bg-orange-50 text-ghn-orange' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            3.2 Đóng băng đặt phòng
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">

      {/* Rooms Tab */}
      {activeTab === 'rooms' && (
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Quản lý phòng họp</h2>
              <p className="text-gray-500 mt-1">{rooms.length} phòng</p>
            </div>
            <button onClick={openCreate} className="btn-primary inline-flex items-center gap-1.5">
              <PlusIcon className="w-4 h-4" /> Thêm phòng mới
            </button>
          </div>

          {/* Search */}
          <div className="mb-5">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field max-w-sm"
              placeholder="Tìm theo tên, địa điểm, mã..."
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
                    <th className="px-3 py-3 font-semibold text-gray-600 text-center w-10">STT</th>
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
                            <span className="text-gray-400">
                              {sortCol === key
                                ? (sortDir === 'asc' ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />)
                                : <ChevronUpDownIcon className="w-3 h-3" />}
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
                      <td colSpan={9} className="text-center py-12 text-gray-400">Không có phòng nào</td>
                    </tr>
                  ) : (
                    filtered.map((room, idx) => (
                      <tr key={room.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-3 text-center text-gray-400 text-xs">{idx + 1}</td>
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
                            <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full">
                              <StarIcon className="w-3 h-3" /> VIP
                            </span>
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
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
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
      {/* Access allowlist tab (gộp chung Truy cập MSNV + Phân quyền) */}
      {activeTab === 'access' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Truy cập &amp; Phân quyền theo MSNV</h2>
            <p className="text-gray-500 mt-1">
              Chỉ MSNV nằm trong danh sách dưới đây mới đăng nhập/truy cập được hệ thống (áp dụng cho
              mọi tài khoản, kể cả Admin/VIP). Đổi vai trò và khoá/bỏ khoá ngay tại từng dòng.
            </p>
          </div>

          {(roleActionSuccess || roleActionError) && (
            <div className={`px-4 py-2 rounded-lg text-sm inline-flex items-center gap-1.5 ${
              roleActionError ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'
            }`}>
              {roleActionError ? roleActionError : (<><CheckCircleIcon className="w-4 h-4" /> {roleActionSuccess}</>)}
            </div>
          )}

          {/* Quản trị viên hiện tại */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h3 className="text-sm font-semibold text-gray-700 inline-flex items-center gap-1.5">
                <KeyIcon className="w-4 h-4" /> Quản trị viên hiện tại
                <span className="ml-1 text-xs font-normal text-gray-400">({grantedUsers.length})</span>
              </h3>
              <button
                onClick={loadElevatedUsers}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-ghn-orange border border-gray-200 px-3 py-1.5 rounded-lg hover:border-ghn-orange transition-colors"
              >
                <ArrowPathIcon className="w-3.5 h-3.5" /> Làm mới
              </button>
            </div>

            {/* Filters */}
            <div className="flex gap-3 flex-wrap mb-4">
              <div className="relative flex-1 min-w-[220px]">
                <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Tìm theo tên hoặc MSNV..."
                  className="input-field pl-9 w-full"
                />
              </div>
              <select
                value={userRoleFilter}
                onChange={e => setUserRoleFilter(e.target.value)}
                className="input-field w-40"
              >
                <option value="all">Tất cả</option>
                <option value="admin">Admin</option>
                <option value="vip">VIP (BOD)</option>
              </select>
            </div>

            {usersLoading ? (
              <div className="text-center py-8 text-gray-400">Đang tải...</div>
            ) : grantedUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                {elevatedUsers.filter(u => u.is_active && u.role !== 'user').length === 0 ? 'Chưa có Admin hoặc VIP nào ngoài bạn' : 'Không tìm thấy kết quả phù hợp'}
              </div>
            ) : (
              <div className="space-y-2">
                {['admin', 'vip'].map(groupKey => {
                  const group = grantedUsers.filter(u => u.role === groupKey);
                  if (group.length === 0) return null;
                  return (
                    <div key={groupKey}>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 mt-3 inline-flex items-center gap-1">
                        {groupKey === 'admin' ? (<><KeyIcon className="w-3.5 h-3.5" /> Admin</>) : (<><StarIcon className="w-3.5 h-3.5" /> VIP (BOD)</>)}
                      </p>
                      <div className="space-y-1.5">
                        {group.map(u => (
                          <div key={u.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                                groupKey === 'admin' ? 'bg-ghn-orange' : 'bg-amber-400'
                              }`}>
                                {u.full_name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-800">{u.full_name}</p>
                                <p className="text-xs text-gray-500">{u.employee_id ? `MSNV ${u.employee_id}` : 'Chưa có MSNV'}{u.department ? ` · ${u.department}` : ''}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {groupKey === 'admin' && (
                                <button
                                  onClick={() => handleSetRole(u.id, 'vip')}
                                  disabled={roleActionLoading === u.id}
                                  className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-50"
                                >
                                  <ArrowRightIcon className="w-3 h-3" /> VIP
                                </button>
                              )}
                              {groupKey === 'vip' && (
                                <button
                                  onClick={() => handleSetRole(u.id, 'admin')}
                                  disabled={roleActionLoading === u.id}
                                  className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-orange-200 text-orange-700 hover:bg-orange-50 transition-colors disabled:opacity-50"
                                >
                                  <ArrowRightIcon className="w-3 h-3" /> Admin
                                </button>
                              )}
                              <button
                                onClick={() => handleSetRole(u.id, 'user')}
                                disabled={roleActionLoading === u.id}
                                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
                              >
                                {roleActionLoading === u.id ? '...' : 'Gỡ quyền'}
                              </button>
                              <button
                                onClick={() => handleSetStatus(u.id, false, u.full_name || u.employee_id)}
                                disabled={roleActionLoading === u.id}
                                className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                              >
                                <NoSymbolIcon className="w-3 h-3" /> Chặn
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

          {/* Import Excel */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-1 inline-flex items-center gap-1.5">
              <DocumentArrowUpIcon className="w-4 h-4" /> Import từ file Excel
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              File .xlsx/.xls/.csv có cột "Mã nhân viên"/"MSNV", "Họ và tên", "Department", "Email" — chỉ cột MSNV là bắt buộc, các cột còn lại tuỳ chọn. Có Email thì tài khoản đăng nhập trùng email đó sẽ tự đồng bộ đủ MSNV/Họ tên/Phòng ban ngay cả khi chưa có SSO.
            </p>
            <label className="btn-primary inline-flex items-center gap-2 px-5 cursor-pointer disabled:opacity-50">
              <DocumentArrowUpIcon className="w-4 h-4" />
              {importLoading ? 'Đang import...' : 'Chọn file Excel'}
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                disabled={importLoading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  handleImportFile(file);
                  e.target.value = '';
                }}
              />
            </label>

            {importSuccess && (
              <div className="mt-3 px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm inline-flex items-center gap-1.5">
                <CheckCircleIcon className="w-4 h-4" /> {importSuccess}
              </div>
            )}
            {importError && (
              <div className="mt-3 px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {importError}
              </div>
            )}
          </div>

          {/* Thêm 1 MSNV thủ công */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-1 inline-flex items-center gap-1.5">
              <IdentificationIcon className="w-4 h-4" /> Thêm 1 MSNV
            </h3>
            <div className="flex gap-3 flex-wrap mt-3">
              <input
                type="text"
                value={newEmployeeId}
                onChange={e => { setNewEmployeeId(e.target.value); setAddEmployeeError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleAddEmployee()}
                placeholder="MSNV, ví dụ: 3091620"
                className="input-field flex-1 min-w-[160px]"
              />
              <input
                type="text"
                value={newEmployeeName}
                onChange={e => setNewEmployeeName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddEmployee()}
                placeholder="Họ và tên (tuỳ chọn)"
                className="input-field flex-1 min-w-[200px]"
              />
              <input
                type="text"
                value={newEmployeeDept}
                onChange={e => setNewEmployeeDept(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddEmployee()}
                placeholder="Department (tuỳ chọn)"
                className="input-field flex-1 min-w-[180px]"
              />
              <input
                type="email"
                value={newEmployeeEmail}
                onChange={e => setNewEmployeeEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddEmployee()}
                placeholder="Email (tuỳ chọn, dùng để đăng nhập trước khi có SSO)"
                className="input-field flex-1 min-w-[240px]"
              />
              <button
                onClick={handleAddEmployee}
                disabled={addEmployeeLoading || !newEmployeeId.trim()}
                className="btn-primary px-6 disabled:opacity-50"
              >
                {addEmployeeLoading ? 'Đang thêm...' : 'Thêm'}
              </button>
            </div>
            {addEmployeeError && (
              <div className="mt-3 px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {addEmployeeError}
              </div>
            )}
          </div>

          {/* Danh sách */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h3 className="text-sm font-semibold text-gray-700">
                Danh sách MSNV được phép
                <span className="ml-2 text-xs font-normal text-gray-400">({allowedEmployees.length})</span>
              </h3>
              <div className="flex items-center gap-2">
                {selectedEmployeeIds.size > 0 && (
                  <button
                    onClick={handleBulkDeleteEmployees}
                    disabled={bulkDeleteLoading}
                    className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                    {bulkDeleteLoading ? 'Đang xoá...' : `Xoá đã chọn (${selectedEmployeeIds.size})`}
                  </button>
                )}
                <button
                  onClick={loadAllowedEmployees}
                  className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-ghn-orange border border-gray-200 px-3 py-1.5 rounded-lg hover:border-ghn-orange transition-colors"
                >
                  <ArrowPathIcon className="w-3.5 h-3.5" /> Làm mới
                </button>
              </div>
            </div>

            <div className="relative mb-4">
              <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={allowedSearch}
                onChange={e => setAllowedSearch(e.target.value)}
                placeholder="Tìm theo MSNV, họ tên, department hoặc email..."
                className="input-field pl-9 w-full"
              />
            </div>

            {allowedLoading ? (
              <p className="text-sm text-gray-400 text-center py-6">Đang tải...</p>
            ) : filteredAllowedEmployees.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                {allowedEmployees.length === 0 ? 'Chưa có MSNV nào trong danh sách.' : 'Không tìm thấy kết quả.'}
              </p>
            ) : (
              <>
                {(() => {
                  const visibleIds = filteredAllowedEmployees.map(e => e.id);
                  const allVisibleSelected = visibleIds.every(id => selectedEmployeeIds.has(id));
                  return (
                    <label className="flex items-center gap-2 pb-2 mb-1 border-b border-gray-100 text-xs text-gray-500 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={() => toggleSelectAllVisible(visibleIds, allVisibleSelected)}
                        className="w-4 h-4 rounded border-gray-300 text-ghn-orange focus:ring-ghn-orange"
                      />
                      Chọn tất cả ({filteredAllowedEmployees.length} đang hiển thị)
                    </label>
                  );
                })()}
                <div className="divide-y divide-gray-100 max-h-[28rem] overflow-y-auto">
                  {filteredAllowedEmployees.map((e) => (
                    <div key={e.id} className="flex items-center gap-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selectedEmployeeIds.has(e.id)}
                        onChange={() => toggleSelectEmployee(e.id)}
                        className="w-4 h-4 rounded border-gray-300 text-ghn-orange focus:ring-ghn-orange shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800">{e.employee_id}</p>
                        {(e.full_name || e.department || e.email) && (
                          <p className="text-xs text-gray-400 truncate">
                            {[e.full_name, e.department, e.email].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                      <select
                        value={e.user?.role || 'user'}
                        disabled={roleActionLoading === e.employee_id || (e.user && e.user.id === currentUser?.id)}
                        onChange={(ev) => handleSetRoleByEmployeeId(e.employee_id, ev.target.value, e.full_name)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-ghn-orange bg-white disabled:opacity-50 shrink-0"
                      >
                        <option value="user">User</option>
                        <option value="vip">VIP</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        onClick={() => handleToggleLockByRow(e.employee_id, e.user?.id || null, e.user ? !e.user.is_active : false, e.full_name || e.employee_id)}
                        disabled={roleActionLoading === e.employee_id || (e.user && e.user.id === currentUser?.id)}
                        title={!e.user ? 'MSNV chưa từng đăng nhập' : undefined}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors disabled:opacity-50 shrink-0 ${
                          e.user && !e.user.is_active ? 'border-green-200 text-green-700 hover:bg-green-50' : 'border-red-200 text-red-600 hover:bg-red-50'
                        }`}
                      >
                        {roleActionLoading === e.employee_id ? '...' : e.user && !e.user.is_active ? 'Bỏ khoá' : 'Khoá'}
                      </button>
                      <button
                        onClick={() => handleRemoveEmployee(e.id, e.full_name || e.employee_id)}
                        disabled={removeEmployeeLoading === e.id}
                        className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 shrink-0"
                      >
                        <TrashIcon className="w-3.5 h-3.5" /> {removeEmployeeLoading === e.id ? '...' : 'Xoá'}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div>
          {settingsLoading ? (
            <div className="card p-12 text-center text-gray-400">Đang tải cài đặt...</div>
          ) : (
            <div className="space-y-6">

              {/* Site Lock for User accounts */}
              {settingsSubTab === 'lock' && (
              <form onSubmit={handleSaveSiteLock}>
                <div className="card p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 inline-flex items-center gap-1.5">
                    <LockClosedIcon className="w-5 h-5" /> Khoá hệ thống (tài khoản User)
                  </h3>
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <input
                        type="checkbox"
                        id="siteLocked"
                        checked={settingsForm.site_locked_for_users}
                        onChange={(e) =>
                          setSettingsForm({ ...settingsForm, site_locked_for_users: e.target.checked })
                        }
                        className="w-4 h-4 accent-ghn-orange"
                      />
                      <label htmlFor="siteLocked" className="text-sm font-medium text-gray-700">
                        Khoá hệ thống đối với tài khoản User (Admin và VIP không bị ảnh hưởng)
                      </label>
                    </div>

                    <label className="text-sm font-medium text-gray-700 block mb-1.5">
                      Nội dung hiển thị cho User khi bị khoá
                    </label>
                    <textarea
                      value={settingsForm.site_lock_message}
                      onChange={(e) => setSettingsForm({ ...settingsForm, site_lock_message: e.target.value })}
                      rows={3}
                      className="input-field w-full"
                      placeholder="Hệ thống đặt phòng đang tạm khoá. Vui lòng quay lại sau."
                    />

                    <p className="text-xs text-gray-600 mt-3 inline-flex items-center gap-1.5">
                      {settingsForm.site_locked_for_users
                        ? (<><ExclamationTriangleIcon className="w-3.5 h-3.5 text-amber-500" /> User thường sẽ không thể vào hệ thống, chỉ thấy nội dung ở trên</>)
                        : (<><CheckCircleIcon className="w-3.5 h-3.5 text-green-600" /> Hệ thống đang mở bình thường cho mọi tài khoản</>)}
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={siteLockSaving}
                  className="btn-primary w-full mt-4 inline-flex items-center justify-center gap-1.5"
                >
                  {siteLockSaving
                    ? (<><ArrowPathIcon className="w-4 h-4 animate-spin" /> Đang lưu...</>)
                    : (<><BookmarkIcon className="w-4 h-4" /> Lưu cài đặt khoá hệ thống</>)}
                </button>

                {siteLockError && (
                  <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {siteLockError}
                  </div>
                )}
                {siteLockSuccess && (
                  <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg inline-flex items-center gap-1.5">
                    <CheckCircleIcon className="w-4 h-4" /> {siteLockSuccess}
                  </div>
                )}
              </form>
              )}

              {/* Booking Freeze Settings */}
              {settingsSubTab === 'freeze' && (
              <form onSubmit={handleSaveFreeze}>
              <div className="card p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Đóng băng đặt phòng</h3>
                  <div className="space-y-4">
                    {/* Weekly Opening Schedule */}
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-gray-800 mb-3 inline-flex items-center gap-1.5">
                        <CalendarDaysIcon className="w-4 h-4" /> Hệ thống mở booking hàng tuần
                      </h4>
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
                        <p className="text-sm font-medium text-blue-900 mb-2 inline-flex items-center gap-1.5">
                          <ClockIcon className="w-4 h-4" /> Quy tắc mở booking:
                        </p>
                        <ul className="text-sm text-blue-800 space-y-1 ml-4">
                          <li>
                            • Mỗi <strong>{['Chủ nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'][settingsForm.booking_freeze_weekly_day]} lúc {settingsForm.booking_freeze_weekly_time}</strong> → Mở booking cho tuần tiếp theo (Thứ 2-CN)
                          </li>
                          <li>• Người dùng có thể book từ lúc đó cho đến hết Chủ nhật tuần tiếp theo</li>
                          <li>• Các tuần chưa mở sẽ hiển thị cảnh báo "Bạn chưa thể đặt phòng trong khoảng thời gian này. Lịch đặt sẽ được mở sau {['Chủ nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'][settingsForm.booking_freeze_weekly_day]} lúc {settingsForm.booking_freeze_weekly_time}" khi chọn slot</li>
                          <li>• Admin luôn có thể đặt phòng bất kể lúc nào</li>
                        </ul>
                      </div>

                      <p className="text-xs text-gray-600 mt-3 inline-flex items-center gap-1.5">
                        {settingsForm.booking_freeze_weekly_enabled
                          ? (<><CheckCircleIcon className="w-3.5 h-3.5 text-green-600" /> Hệ thống mở booking tự động được bật</>)
                          : (<><ExclamationTriangleIcon className="w-3.5 h-3.5 text-amber-500" /> Hệ thống mở booking tự động được tắt - mọi người có thể đặt bất kỳ lúc nào</>)}
                      </p>
                    </div>

                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
                      <strong className="inline-flex items-center gap-1"><LightBulbIcon className="w-3.5 h-3.5" /> Mẹo:</strong> Với hệ thống này, bạn không cần phải điều chỉnh thêm gì. <br/>
                      Mỗi <strong>{['Chủ nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'][settingsForm.booking_freeze_weekly_day]} lúc {settingsForm.booking_freeze_weekly_time}</strong> sẽ tự động mở booking cho tuần tiếp theo.
                    </div>


                  </div>
                </div>
              </div>

                <button
                  type="submit"
                  disabled={freezeSaving}
                  className="btn-primary w-full mt-6 inline-flex items-center justify-center gap-1.5"
                >
                  {freezeSaving
                    ? (<><ArrowPathIcon className="w-4 h-4 animate-spin" /> Đang lưu...</>)
                    : (<><BookmarkIcon className="w-4 h-4" /> Lưu cài đặt đóng băng đặt phòng</>)}
                </button>

                {freezeError && (
                  <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {freezeError}
                  </div>
                )}
                {freezeSuccess && (
                  <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg inline-flex items-center gap-1.5">
                    <CheckCircleIcon className="w-4 h-4" /> {freezeSuccess}
                  </div>
                )}
              </form>
              )}
            </div>
          )}
        </div>
      )}

        </div>
      </div>
    </div>
  );
}

