import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { roomsApi, bookingsApi, authApi } from '../api';
import BookingModal from '../components/BookingModal';

/* ─────────────────────────── helpers ─────────────────────────── */
const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MON_LABELS = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
                    'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
const START_HOUR = 7;
const END_HOUR = 22;
const HOUR_HEIGHT = 64; // px per hour

/** Return Monday-anchored 7-day array for the week containing `anchor` */
function getWeekRange(anchor) {
  const d = new Date(anchor);
  const day = d.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diffToMon);
  mon.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(mon);
    dd.setDate(mon.getDate() + i);
    return dd;
  });
}

/**
 * Build a full month calendar grid (Mon-first).
 * Returns an array of { date, isCurrentMonth } for every cell shown.
 */
function getMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  // Monday-first: 0=Mon … 6=Sun
  const startPad = (first.getDay() + 6) % 7; // days from Mon before 1st
  const endPad   = (7 - (last.getDay() + 6) % 7 - 1) % 7;
  const cells = [];
  for (let i = startPad; i > 0; i--) {
    const d = new Date(first);
    d.setDate(d.getDate() - i);
    cells.push({ date: d, isCurrentMonth: false });
  }
  for (let i = 1; i <= last.getDate(); i++) {
    cells.push({ date: new Date(year, month, i), isCurrentMonth: true });
  }
  for (let i = 1; i <= endPad; i++) {
    const d = new Date(last);
    d.setDate(last.getDate() + i);
    cells.push({ date: d, isCurrentMonth: false });
  }
  return cells;
}

function toVNMinutes(utcDate) {
  const vnStr = utcDate.toLocaleString('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const [h, m] = vnStr.split(':').map(Number);
  return h * 60 + m;
}

function toVNDateStr(utcDate) {
  return utcDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}
function toVNTimeStr(date) {
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh',
  });
}
function vnToISO(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}:00+07:00`).toISOString();
}

function fmtTime(date) {
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  });
}

function fmtFloor(floor) {
  return floor ? floor.replace(/F$/i, '') : floor;
}

function blockColor(status, isOwn = false) {
  switch (status) {
    case 'confirmed':
    case 'active':
      return isOwn
        ? { bar: 'bg-blue-500',    bg: 'bg-blue-50 border-blue-300',    text: 'text-blue-900'   }
        : { bar: 'bg-ghn-orange',  bg: 'bg-orange-50 border-orange-200', text: 'text-orange-900' };
    case 'pending':   return { bar: 'bg-yellow-400', bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-900' };
    case 'completed': return { bar: 'bg-gray-400',   bg: 'bg-gray-50 border-gray-200',     text: 'text-gray-600'   };
    case 'cancelled': return { bar: 'bg-red-300',    bg: 'bg-red-50 border-red-200',       text: 'text-red-400'    };
    default:          return { bar: 'bg-blue-400',   bg: 'bg-blue-50 border-blue-200',     text: 'text-blue-900'   };
  }
}

/* ─────────── room search helpers ─────────── */
function roundUpHalfHour(date = new Date()) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  return d;
}
function toLocalDTInput(date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}
function minToTimeStr(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function yToMin(y) {
  const raw = START_HOUR * 60 + (y / HOUR_HEIGHT) * 60;
  return Math.max(START_HOUR * 60, Math.min(END_HOUR * 60, Math.round(raw / 15) * 15));
}



function SectionToggle({ label, open, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between py-2.5 text-left group"
    >
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide group-hover:text-ghn-orange transition-colors">
        {label}
      </span>
      <svg
        className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${open ? '' : '-rotate-90'}`}
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

const MY_BOOKING_STATUSES = [
  { value: 'all',       label: 'Tất cả'  },
  { value: 'cancelled', label: 'Đã hủy' },
];

/* ─────────────────────────── component ─────────────────────────── */
export default function CalendarPage() {
  const today = toVNDateStr(new Date());
  const location = useLocation();
  const navStateHandled = useRef(false);
  const selRoomRestoredRef = useRef(false); // true after room restoration attempt completes

  // Calendar anchor
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [weekDays, setWeekDays]     = useState(() => getWeekRange(new Date()));
  // Month shown in mini-cal (year + month index)
  const [calYear,  setCalYear]  = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());

  // Rooms
  const [rooms, setRooms] = useState([]);

  // 3-layer filter state
  const [selOffice, setSelOffice] = useState('');   // '' = all
  const [selFloor,  setSelFloor]  = useState('');   // '' = all
  const [selRoom,   setSelRoom]   = useState(null);

  // Room dropdown
  const [showRoomDrop, setShowRoomDrop] = useState(false);
  const [roomSearch,   setRoomSearch]   = useState('');

  // Bookings
  const [bookings,        setBookings]        = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Booking modal
  const [modalSlot, setModalSlot] = useState(null);

  // Room availability search
  const [srchStart,    setSrchStart]    = useState(() => toLocalDTInput(roundUpHalfHour()));
  const [srchEnd,      setSrchEnd]      = useState(() => toLocalDTInput(new Date(roundUpHalfHour().getTime() + 3600000)));
  const [srchCapacity, setSrchCapacity] = useState('');
  const [srchLocation, setSrchLocation] = useState('');
  const [srchFloor,    setSrchFloor]    = useState('');
  const [srchResults,  setSrchResults]  = useState(null);  // null = not searched yet
  const [srchLoading,  setSrchLoading]  = useState(false);
  const [srchError,    setSrchError]    = useState('');

  // Sidebar tab: 'rooms' | 'mybookings'
  const [sidebarTab, setSidebarTab] = useState('rooms');
  const [myBookingsFilter, setMyBookingsFilter] = useState('all');
  const [roomSection, setRoomSection] = useState('search'); // kept for compat
  const [searchOpen, setSearchOpen] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(true);

  // My bookings (sidebar)
  const [myBookings,        setMyBookings]        = useState([]);
  const [myBookingsLoading, setMyBookingsLoading] = useState(false);
  const [myBookingsRefresh, setMyBookingsRefresh] = useState(0);

  // Slot booking warning
  const [slotWarning, setSlotWarning] = useState('');
  // Freeze status - can user book?
  const [canBook, setCanBook] = useState(true);
  // Cached schedule settings from getFreezeStatus
  const [freezeSchedule, setFreezeSchedule] = useState(null);
  // Current user — init from localStorage so it's available synchronously on first render
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('ghn_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  // Real-time now line
  const [nowMin, setNowMin] = useState(() => toVNMinutes(new Date()));
  // Drag-to-select
  const dragInfo = useRef(null);
  const [dragSel, setDragSel] = useState(null);
  const checkDragConflictRef = useRef(() => false);
  // Cancel booking modal
  const [cancelModal, setCancelModal]       = useState(null);
  const [cancelLoading, setCancelLoading]   = useState(false);
  const [cancelError,   setCancelError]     = useState('');
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  // Admin cancel with message
  const [adminCancelMode,    setAdminCancelMode]    = useState(false);
  const [adminCancelMessage, setAdminCancelMessage] = useState('');
  // Edit booking
  const [editMode,      setEditMode]        = useState(false);
  const [editTitle,     setEditTitle]       = useState('');
  const [editNotes,     setEditNotes]       = useState('');
  const [editStart,     setEditStart]       = useState('');
  const [editEnd,       setEditEnd]         = useState('');
  const [editLoading,   setEditLoading]     = useState(false);
  const [editError,     setEditError]       = useState('');

  /* ── derived filter options ── */
  // Chuẩn hóa tên văn phòng: gộp các biến thể 'Rivera Park', 'RiveraPark', 'rivera park' thành 'Rivera Park'
  function normalizeOfficeName(name) {
    if (!name) return '';
    // Loại bỏ khoảng trắng thừa, viết hoa chữ cái đầu, gộp các biến thể Rivera Park
    const cleaned = name.replace(/\s+/g, '').toLowerCase();
    if (cleaned === 'riverapark') return 'Rivera Park';
    // Có thể bổ sung thêm các quy tắc khác nếu cần
    // Viết hoa chữ cái đầu mỗi từ
    return name
      .toLowerCase()
      .replace(/(^|\s)\S/g, (t) => t.toUpperCase())
      .replace(/\s+/g, ' ')
      .trim();
  }
  const offices = [...new Set(
    rooms
      .map((r) => normalizeOfficeName(r.location))
      .filter(Boolean)
  )].sort();
  const floors  = [...new Set(
    rooms
      .filter((r) => !selOffice || normalizeOfficeName(r.location) === selOffice)
      .map((r) => r.floor)
      .filter(Boolean)
  )].sort();

  const filteredRooms = rooms.filter((r) => {
    const matchOffice = !selOffice || normalizeOfficeName(r.location) === selOffice;
    const matchFloor  = !selFloor  || r.floor    === selFloor;
    const matchSearch = !roomSearch ||
      r.name.toLowerCase().includes(roomSearch.toLowerCase()) ||
      (r.location || '').toLowerCase().includes(roomSearch.toLowerCase());
    return matchOffice && matchFloor && matchSearch;
  });

  /* ── load current user once ── */
  useEffect(() => {
    authApi.getMe().then((res) => setCurrentUser(res.data.data?.user || null)).catch(() => {});
  }, []);

  /* ── check freeze status on mount and periodically ── */
  useEffect(() => {
    const checkFreeze = async () => {
      try {
        const res = await bookingsApi.getFreezeStatus();
        setCanBook(res.data.data?.can_book !== false);
        if (res.data.data?.schedule) setFreezeSchedule(res.data.data.schedule);
      } catch (err) {
        console.error('Failed to check freeze status:', err);
        setCanBook(true);
      }
    };
    checkFreeze();
    const interval = setInterval(checkFreeze, 30000);
    return () => clearInterval(interval);
  }, []);

  /* ── real-time now line ── */
  useEffect(() => {
    const id = setInterval(() => setNowMin(toVNMinutes(new Date())), 60000);
    return () => clearInterval(id);
  }, []);

  /* ── persist selected room to sessionStorage ── */
  useEffect(() => {
    // Guard: don't run until restoration attempt is done (avoids wiping sessionStorage on initial null)
    if (!selRoomRestoredRef.current) return;
    if (selRoom) {
      sessionStorage.setItem('cal_selRoomId', selRoom.id);
      sessionStorage.setItem('cal_selOffice', selOffice);
      sessionStorage.setItem('cal_selFloor',  selFloor);
    } else {
      sessionStorage.removeItem('cal_selRoomId');
    }
  }, [selRoom, selOffice, selFloor]);

  /* ── load rooms once ── */
  useEffect(() => {
    roomsApi.getAll().then((res) => {
      const loaded = res.data.data?.rooms || [];
      setRooms(loaded);
      // restore room from sessionStorage (only if not navigated via location.state)
      if (!location.state?.room) {
        const savedId = sessionStorage.getItem('cal_selRoomId');
        if (savedId) {
          const restored = loaded.find((r) => r.id === savedId);
          if (restored) {
            setSelRoom(restored);
            setSelOffice(sessionStorage.getItem('cal_selOffice') || restored.location || '');
            setSelFloor(sessionStorage.getItem('cal_selFloor')  || restored.floor   || '');
          }
        }
      }
      selRoomRestoredRef.current = true;
    });
  }, []);

  /* ── pre-select room when navigated from RoomsPage ── */
  useEffect(() => {
    if (navStateHandled.current || !location.state?.room || rooms.length === 0) return;
    navStateHandled.current = true;
    const navRoom = rooms.find((r) => r.id === location.state.room.id) || location.state.room;
    setSelRoom(navRoom);
    if (navRoom.location) setSelOffice(navRoom.location);
    if (navRoom.floor)    setSelFloor(navRoom.floor);
    if (location.state.startTime) {
      const d = new Date(location.state.startTime);
      setAnchorDate(d);
      setCalYear(d.getFullYear());
      setCalMonth(d.getMonth());
      const endIso = location.state.endTime
        ? new Date(location.state.endTime).toISOString()
        : new Date(d.getTime() + 3600000).toISOString();
      tryOpenModal(d.toISOString(), endIso);
    }
  }, [rooms, location.state]);

  /* ── keep week in sync with anchor ── */
  useEffect(() => { setWeekDays(getWeekRange(anchorDate)); }, [anchorDate]);

  /* ── fetch bookings when room or week changes ── */
  const fetchBookings = useCallback(async () => {
    if (!selRoom) return;
    setLoadingBookings(true);
    try {
      const s = new Date(weekDays[0]); s.setHours(0, 0, 0, 0);
      const e = new Date(weekDays[6]); e.setHours(23, 59, 59, 999);
      const res = await bookingsApi.getRoomBookings(selRoom.id, s.toISOString(), e.toISOString());
      setBookings(res.data.data?.bookings || []);
    } catch { setBookings([]); }
    finally { setLoadingBookings(false); }
  }, [selRoom, weekDays]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  /* ── calendar navigation ── */
  // Removed duplicate prevWeek definition
  const nextWeek  = () => {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() + 7);
    setAnchorDate(d);
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth());
  };
  const prevWeek  = () => {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() - 7);
    setAnchorDate(d);
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth());
  };
  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); };
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); };

  function pickDay(date) {
    setAnchorDate(date);
    // sync mini-cal month to follow
    setCalYear(date.getFullYear());
    setCalMonth(date.getMonth());
  }

  /* ── synchronous booking-window check using cached state ── */
  function checkDateBookable(date) {
    if (currentUser?.role === 'admin') return { allowed: true };
    if (!canBook) {
      return { allowed: false, message: '🔒 Hệ thống đang đóng băng. Bạn chưa thể đặt phòng.' };
    }
    if (!freezeSchedule?.enabled) return { allowed: true };

    const { openDay, openTime, openLabel } = freezeSchedule;
    const [openHour, openMin] = openTime.split(':').map(Number);

    const vnNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const dow = vnNow.getDay();

    // Monday of current week
    const thisMonday = new Date(vnNow);
    thisMonday.setDate(vnNow.getDate() + (dow === 0 ? -6 : 1 - dow));
    thisMonday.setHours(0, 0, 0, 0);

    const nextMonday = new Date(thisMonday);
    nextMonday.setDate(thisMonday.getDate() + 7);
    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6);
    nextSunday.setHours(23, 59, 59, 999);

    // Opening time of this week (openDay: 0=Sun, 1=Mon... convert to Mon-anchored offset)
    const openOffset = openDay === 0 ? 6 : openDay - 1;
    const openingThisWeek = new Date(thisMonday);
    openingThisWeek.setDate(thisMonday.getDate() + openOffset);
    openingThisWeek.setHours(openHour, openMin, 0, 0);

    const hasOpened = vnNow >= openingThisWeek;

    const targetNoon = new Date(date);
    targetNoon.setHours(12, 0, 0, 0);

    if (!hasOpened) {
      if (targetNoon >= thisMonday && targetNoon < nextMonday) return { allowed: true };
      return { allowed: false, message: `Bạn chưa thể đặt phòng trong khoảng thời gian này. Lịch đặt sẽ được mở sau ${openLabel}.` };
    } else {
      if (targetNoon >= thisMonday && targetNoon <= nextSunday) return { allowed: true };
      return { allowed: false, message: `Bạn chưa thể đặt phòng trong khoảng thời gian này. Lịch đặt sẽ được mở sau ${openLabel}.` };
    }
  }

  /* ── room availability search ── */
  async function tryOpenModal(startTime, endTime) {
    // Block past times regardless of role
    if (new Date(startTime) <= new Date()) {
      setSlotWarning('Bạn không thể đặt phòng trong quá khứ');
      setTimeout(() => setSlotWarning(''), 5000);
      return;
    }
    if (currentUser?.role === 'admin') {
      setModalSlot({ startTime, endTime });
      return;
    }
    const check = checkDateBookable(new Date(startTime));
    if (!check.allowed) {
      setSlotWarning(check.message);
      setTimeout(() => setSlotWarning(''), 8000);
      return;
    }
    setModalSlot({ startTime, endTime });
  }

  async function handleRoomSearch(e) {
    e.preventDefault();
    setSrchError('');
    setSrchLoading(true);
    try {
      const params = {
        start_time: new Date(srchStart).toISOString(),
        end_time:   new Date(srchEnd).toISOString(),
      };
      if (srchCapacity) params.capacity = Number(srchCapacity);
      if (srchLocation) params.location  = srchLocation;
      if (srchFloor)    params.floor     = srchFloor;
      const res = await roomsApi.search(params);
      setSrchResults(res.data.data?.rooms || []);
    } catch (err) {
      setSrchError(err.response?.data?.error?.message || 'Lỗi tìm kiếm');
    } finally {
      setSrchLoading(false);
    }
  }

  function clearSearch() {
    setSrchResults(null);
    setSrchError(''); // Unused now since date constraint removed
  }

  function selectSearchRoom(room) {
    setSelRoom(room);
    if (room.location) setSelOffice(room.location);
    if (room.floor)    setSelFloor(room.floor);
    const d = new Date(srchStart);
    setAnchorDate(d);
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth());
    tryOpenModal(
      new Date(srchStart).toISOString(),
      new Date(srchEnd).toISOString(),
    );
  }

  /* ── fetch my bookings when tab switches ── */
  useEffect(() => {
    if (sidebarTab !== 'mybookings') return;
    setMyBookingsLoading(true);
    bookingsApi.getMyBookings({ limit: 30 })
      .then((res) => {
        const raw = res.data.data?.bookings || [];
        // deduplicate by id
        const unique = Array.from(new Map(raw.map((b) => [b.id, b])).values());
        setMyBookings(unique);
      })
      .catch(() => setMyBookings([]))
      .finally(() => setMyBookingsLoading(false));
  }, [sidebarTab, myBookingsRefresh]);

  /* ── jump calendar to a booking's room & week ── */
  function jumpToBooking(b) {
    if (b.room) {
      setSelRoom(b.room);
      if (b.room.location) setSelOffice(b.room.location);
      if (b.room.floor)    setSelFloor(b.room.floor);
    }
    const d = new Date(b.start_time);
    setAnchorDate(d);
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth());
  }

  /* ── edit booking ── */
  async function handleEditBooking(e) {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    try {
      const dateStr = toVNDateStr(new Date(cancelModal.start_time));
      const newStart = vnToISO(dateStr, editStart);
      if (new Date(cancelModal.start_time) < new Date()) {
        setEditError('Không thể chỉnh sửa lịch đặt đã qua');
        setEditLoading(false);
        return;
      }
      if (new Date(newStart) < new Date()) {
        setEditError('Không thể đặt lịch với thời gian trong quá khứ');
        setEditLoading(false);
        return;
      }
      await bookingsApi.update(cancelModal.id, {
        action: 'edit',
        title: editTitle,
        notes: editNotes,
        start_time: newStart,
        end_time:   vnToISO(dateStr, editEnd),
      });
      setEditMode(false);
      setCancelModal(null);
      fetchBookings();
      setMyBookingsRefresh((v) => v + 1);
    } catch (err) {
      setEditError(err.response?.data?.error?.message || 'Cập nhật thất bại');
    } finally {
      setEditLoading(false);
    }
  }

  /* ── cancel booking ── */
  async function handleCancelBooking(message = null) {
    if (!cancelModal) return;
    setCancelLoading(true);
    setCancelError('');
    try {
      await bookingsApi.cancel(cancelModal.id, message);
      setCancelModal(null);
      setConfirmingCancel(false);
      setAdminCancelMode(false);
      setAdminCancelMessage('');
      setMyBookingsRefresh((v) => v + 1);
      setBookings((prev) => prev.filter((b) => b.id !== cancelModal.id));
    } catch (err) {
      setCancelError(err.response?.data?.error?.message || 'Hủy đặt phòng thất bại');
    } finally {
      setCancelLoading(false);
    }
  }

  /* ── drag-to-select → modal ── */
  function handleDayMouseDown(e, dayDate) {
    if (e.button !== 0) return;
    if (!selRoom) return;

    // Block past dates outright
    const todayStr = toVNDateStr(new Date());
    const dayStr   = toVNDateStr(dayDate);
    if (dayStr < todayStr) {
      setSlotWarning('Bạn không thể đặt phòng trong quá khứ');
      setTimeout(() => setSlotWarning(''), 5000);
      dragInfo.current = null;
      return;
    }

    // Immediate synchronous check — no API call needed
    const check = checkDateBookable(dayDate);
    if (!check.allowed) {
      setSlotWarning(check.message);
      setTimeout(() => setSlotWarning(''), 8000);
    } else {
      setSlotWarning('');
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const startMin = Math.min(yToMin(y), (END_HOUR - 1) * 60);
    dragInfo.current = { dayDate, dayEl: e.currentTarget, startMin, blocked: !check.allowed };
    setDragSel({
      dayDateStr: toVNDateStr(dayDate),
      startMin,
      endMin: Math.min(startMin + 60, END_HOUR * 60),
    });
    e.preventDefault();
  }

  /* ── global drag tracking ── */
  useEffect(() => {
    function onMove(e) {
      if (!dragInfo.current) return;
      const rect = dragInfo.current.dayEl.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const raw = yToMin(y);
      const endMin = Math.min(END_HOUR * 60, Math.max(dragInfo.current.startMin + 30, raw));
      const dayDateStr = toVNDateStr(dragInfo.current.dayDate);
      const hasConflict = checkDragConflictRef.current(dayDateStr, dragInfo.current.startMin, endMin);
      setDragSel((prev) => (prev ? { ...prev, endMin, hasConflict } : null));
    }
    function onUp(e) {
      if (!dragInfo.current) return;
      const { dayDate, dayEl, startMin, blocked } = dragInfo.current;
      dragInfo.current = null;
      const rect = dayEl.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const raw = yToMin(y);
      const endMin = raw <= startMin + 15
        ? Math.min(startMin + 60, END_HOUR * 60)
        : Math.min(END_HOUR * 60, Math.max(startMin + 30, raw));
      setDragSel(null);

      // Already warned on mousedown — don't open modal
      if (blocked) return;

      const start = new Date(dayDate);
      start.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
      const end = new Date(dayDate);
      end.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);

      // Block if start time is in the past (handles today's past slots)
      if (start <= new Date()) {
        setSlotWarning('Bạn không thể đặt phòng trong quá khứ');
        setTimeout(() => setSlotWarning(''), 5000);
        return;
      }

      // Block if overlaps an existing booking
      const dayDateStr = toVNDateStr(dayDate);
      if (checkDragConflictRef.current(dayDateStr, startMin, endMin)) {
        setSlotWarning('Khung giờ này đã có lịch đặt. Vui lòng chọn giờ khác.');
        setTimeout(() => setSlotWarning(''), 5000);
        return;
      }

      setModalSlot({ startTime: start.toISOString(), endTime: end.toISOString() });
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── grid data ── */
  const timeSlots = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  const bookingsByDay = {};
  for (const b of bookings) {
    const ds = toVNDateStr(new Date(b.start_time));
    if (!bookingsByDay[ds]) bookingsByDay[ds] = [];
    bookingsByDay[ds].push(b);
  }
  // Keep ref in sync so drag handlers (defined in useEffect[]) can access latest bookings
  checkDragConflictRef.current = (dayDateStr, startMin, endMin) => {
    return (bookingsByDay[dayDateStr] || []).some(b => {
      const bStart = toVNMinutes(new Date(b.start_time));
      const bEnd   = toVNMinutes(new Date(b.end_time));
      return startMin < bEnd && endMin > bStart;
    });
  };

  /* ── month grid ── */
  const monthGrid = getMonthGrid(calYear, calMonth);
  // Which week is the current anchor in?
  const anchorWeekDates = new Set(weekDays.map((d) => toVNDateStr(d)));

  return (
    <div className="flex h-full overflow-hidden bg-white">
      {/* ═══════════════ Left Sidebar ═══════════════ */}
      <aside className="w-72 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-hidden">

        {/* ── Mini calendar (always visible) ── */}
        <div className="px-3 pt-2 pb-1 flex-shrink-0">
          <div>
            {/* Month header */}
            <div className="flex items-center justify-between mb-1">
              <button onClick={prevMonth} className="p-0.5 rounded hover:bg-gray-100 text-gray-500">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-xs font-bold text-gray-800">
                {MON_LABELS[calMonth]} {calYear}
              </span>
              <button onClick={nextMonth} className="p-0.5 rounded hover:bg-gray-100 text-gray-500">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Weekday headers — Mon first */}
            <div className="grid grid-cols-7 text-center mb-0.5">
              {['T2','T3','T4','T5','T6','T7','CN'].map((d) => (
                <span key={d} className="text-[10px] font-semibold text-gray-400 py-0.5">{d}</span>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 text-center gap-y-0">
              {monthGrid.map(({ date, isCurrentMonth }, idx) => {
                const ds = toVNDateStr(date);
                const isToday      = ds === today;
                const inWeek       = anchorWeekDates.has(ds);
                const isWeekStart  = inWeek && date.getDay() === 1; // Mon
                const isWeekEnd    = inWeek && date.getDay() === 0; // Sun
                const isWeekMiddle = inWeek && !isToday && !isWeekStart && !isWeekEnd;

                return (
                  <button
                    key={idx}
                    onClick={() => pickDay(date)}
                    className={[
                      'text-[11px] py-0.5 leading-4 font-medium transition-colors relative',
                      isToday
                        ? 'z-10'
                        : inWeek
                        ? 'bg-orange-50'
                        : 'hover:bg-gray-100 rounded-full',
                      isCurrentMonth ? 'text-gray-800' : 'text-gray-300',
                      // round week highlight edges
                      isWeekStart  ? 'rounded-l-full bg-orange-50' : '',
                      isWeekEnd    ? 'rounded-r-full bg-orange-50' : '',
                      isWeekMiddle ? '' : '',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'inline-flex items-center justify-center w-5 h-5 rounded-full',
                        isToday ? 'bg-ghn-orange text-white font-bold' : '',
                      ].join(' ')}
                    >
                      {date.getDate()}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Week nav arrows below calendar */}
            <div className="flex items-center justify-between mt-1 pt-1 border-t border-gray-100">
              <button
                onClick={prevWeek}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-ghn-orange px-2 py-1 rounded hover:bg-orange-50"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Tuần trước
              </button>
              <button
                onClick={() => pickDay(new Date())}
                className="text-xs text-ghn-orange font-semibold px-2 py-1 rounded hover:bg-orange-50"
              >
                Hôm nay
              </button>
              <button
                onClick={nextWeek}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-ghn-orange px-2 py-1 rounded hover:bg-orange-50"
              >
                Tuần sau
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

        </div>

        {/* ── Tab bar ── */}
        <div className="px-3 pt-3 pb-2 flex-shrink-0 border-t border-gray-100">
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {[
              { id: 'rooms',      label: '🏢 Phòng'        },
              { id: 'mybookings', label: '📅 Của tôi'      },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setSidebarTab(id)}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  sidebarTab === id
                    ? 'bg-white text-ghn-orange shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab content (scrollable) ── */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* ─── Tab: Phòng ─── */}
          {sidebarTab === 'rooms' && (
            <div>
              {/* Browse section – Lịch phòng */}
              <div className="border-b border-gray-100">
                <button
                  onClick={() => setBrowseOpen((v) => !v)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">📅 Lịch phòng</span>
                  <svg className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${browseOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
              {browseOpen && (
              <div className="px-4 pt-3 pb-4">
                <div className="space-y-3">
              {/* Layer 1+2: Văn phòng + Tầng (2-col dropdowns) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[11px] text-gray-400 font-medium">Văn phòng</span>
                  <select
                    value={selOffice}
                    onChange={(e) => {
                      const newOffice = e.target.value;
                      setSelOffice(newOffice);
                      setSelFloor('');
                      const first = rooms.find((r) => !newOffice || r.location === newOffice);
                      if (first) { setSelRoom(first); setSelFloor(first.floor || ''); }
                    }}
                    className="mt-1 w-full px-2 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-ghn-orange bg-white"
                  >
                    <option value="">Tất cả</option>
                    {offices.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-medium">Tầng</span>
                  <select
                    value={selFloor}
                    onChange={(e) => {
                      const newFloor = e.target.value;
                      setSelFloor(newFloor);
                      // Nếu phòng hiện tại không còn thuộc tầng mới, reset phòng
                      if (
                        selRoom &&
                        (normalizeOfficeName(selRoom.location) !== selOffice || (newFloor && selRoom.floor !== newFloor))
                      ) {
                        setSelRoom(null);
                      }
                    }}
                    disabled={floors.length === 0}
                    className="mt-1 w-full px-2 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-ghn-orange bg-white disabled:opacity-40"
                  >
                    <option value="">Tất cả</option>
                    {floors.map((f) => <option key={f} value={f}>Tầng {fmtFloor(f)}</option>)}
                  </select>
                </div>
              </div>

              {/* Layer 3: Phòng dropdown */}
              <div>
                <span className="text-[11px] text-gray-400 font-medium">Phòng</span>
                <div className="relative mt-1">
                  <button
                    onClick={() => setShowRoomDrop((v) => !v)}
                    className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-left hover:border-ghn-orange transition-colors bg-white"
                  >
                    <span className={selRoom ? 'text-gray-900 font-medium truncate pr-2' : 'text-gray-400'}>
                      {selRoom ? selRoom.name : 'Chọn phòng...'}
                    </span>
                    <svg
                      className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${showRoomDrop ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showRoomDrop && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                      <div className="p-2 border-b border-gray-100">
                        <input
                          autoFocus
                          type="text"
                          value={roomSearch}
                          onChange={(e) => setRoomSearch(e.target.value)}
                          placeholder="Tìm phòng..."
                          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:border-ghn-orange"
                        />
                      </div>
                      <ul className="max-h-52 overflow-y-auto py-1">
                        {filteredRooms.length === 0 ? (
                          <li className="px-3 py-2 text-sm text-gray-400">Không tìm thấy phòng</li>
                        ) : filteredRooms.map((r) => (
                          <li key={r.id}>
                            <button
                              onClick={() => { setSelRoom(r); setShowRoomDrop(false); setRoomSearch(''); }}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-orange-50 transition-colors ${
                                selRoom?.id === r.id ? 'bg-orange-50 text-ghn-orange font-medium' : 'text-gray-700'
                              }`}
                            >
                              <div className="font-medium">{r.name}</div>
                              {r.location && (
                                <div className="text-xs text-gray-400 mt-0.5">
                                  {normalizeOfficeName(r.location)}{r.floor ? ` • Tầng ${fmtFloor(r.floor)}` : ''} • {r.capacity} người
                                </div>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Selected room info */}
              {selRoom && (
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-100 text-sm">
                  <div className="font-semibold text-gray-800">{selRoom.name}</div>
                  {selRoom.location && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      {selRoom.location}{selRoom.floor ? ` • Tầng ${fmtFloor(selRoom.floor)}` : ''}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-0.5">Sức chứa: {selRoom.capacity} người</div>
                  {selRoom.is_vip && (
                    <span className="inline-block mt-1 text-[10px] font-bold bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">VIP</span>
                  )}
                </div>
              )}
                </div>
              </div>
              )}
              </div>

              {/* Search section */}
              <div className="border-b border-gray-100">
                <button
                  onClick={() => setSearchOpen((v) => {
                    const next = !v;
                    if (next) { setSrchLocation(selOffice); setSrchFloor(selFloor); }
                    return next;
                  })}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">🔍 Tìm phòng trống</span>
                  <svg className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${searchOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
              {searchOpen && (
              <div className="px-4 pb-3">
                <form onSubmit={handleRoomSearch} className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] text-gray-400 font-medium">Văn phòng</span>
                    <select
                      value={srchLocation}
                      onChange={(e) => { setSrchLocation(e.target.value); setSrchFloor(''); setSrchResults(null); }}
                      className="mt-1 w-full px-2 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-ghn-orange bg-white"
                    >
                      <option value="">Tất cả</option>
                      {offices.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-400 font-medium">Tầng</span>
                    <select
                      value={srchFloor}
                      onChange={(e) => { setSrchFloor(e.target.value); setSrchResults(null); }}
                      className="mt-1 w-full px-2 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-ghn-orange bg-white"
                    >
                      <option value="">Tất cả</option>
                      {(srchLocation
                        ? rooms.filter((r) => normalizeOfficeName(r.location) === srchLocation)
                        : rooms
                      ).map((r) => r.floor).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).sort()
                        .map((f) => <option key={f} value={f}>Tầng {fmtFloor(f)}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-medium">Bắt đầu</span>
                  <input
                    type="datetime-local"
                    value={srchStart}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSrchStart(val);
                      setSrchResults(null);
                      if (val) {
                        const dur = new Date(srchEnd).getTime() - new Date(srchStart).getTime();
                        const gap = dur > 0 ? dur : 3600000;
                        setSrchEnd(toLocalDTInput(new Date(new Date(val).getTime() + gap)));
                      }
                    }}
                    className="mt-1 w-full px-2.5 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-ghn-orange"
                    required
                  />
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-medium">Kết thúc</span>
                  <input
                    type="datetime-local"
                    value={srchEnd}
                    onChange={(e) => { setSrchEnd(e.target.value); setSrchResults(null); }}
                    className="mt-1 w-full px-2.5 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-ghn-orange"
                    required
                  />
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-medium">Số người (tối thiểu)</span>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={srchCapacity}
                    onChange={(e) => setSrchCapacity(e.target.value)}
                    className="mt-1 w-full px-2.5 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-ghn-orange"
                    placeholder="Bất kỳ"
                  />
                </div>
                {srchError && <p className="text-xs text-red-500">{srchError}</p>}
                <button
                  type="submit"
                  disabled={srchLoading}
                  className="w-full py-2 text-xs font-semibold rounded-lg bg-ghn-orange text-white hover:bg-ghn-orange-dark transition-colors disabled:opacity-60"
                >
                  {srchLoading ? 'Đang tìm...' : '🔍 Tìm phòng trống'}
                </button>
              </form>

              {/* Search results (inline, below form) */}
              {srchResults !== null && (
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500">
                      {srchResults.length > 0 ? `${srchResults.length} phòng trống` : 'Không có phòng trống'}
                    </span>
                    <button onClick={clearSearch} className="text-[11px] text-gray-400 hover:text-ghn-orange transition-colors">
                      ✕ Xóa
                    </button>
                  </div>
                  {srchResults.length === 0 ? (
                    <p className="text-xs text-gray-400 italic text-center py-3">
                      Không có phòng nào trống trong khung giờ này.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {srchResults.map((r) => (
                        <li key={r.id}>
                          <button
                            onClick={() => selectSearchRoom(r)}
                            className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-colors ${
                              selRoom?.id === r.id
                                ? 'bg-orange-50 border-ghn-orange text-ghn-orange'
                                : 'border-gray-200 text-gray-700 hover:border-ghn-orange hover:bg-orange-50'
                            }`}
                          >
                            <div className="font-semibold flex items-center gap-1.5">
                              {r.name}
                              {r.is_vip && (
                                <span className="text-[9px] font-bold bg-yellow-100 text-yellow-700 px-1 py-0.5 rounded">VIP</span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-400 mt-0.5">
                              {r.location}{r.floor ? ` • Tầng ${fmtFloor(r.floor)}` : ''} • {r.capacity} người
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
              )}
              </div>
            </div>
          )}

          {/* ── Tab: Lịch của tôi ── */}
          {sidebarTab === 'mybookings' && (() => {
            const filtered = myBookingsFilter === 'all'
              ? myBookings
              : myBookings.filter((b) => b.status === myBookingsFilter);
            return (
              <div className="px-4 py-4 space-y-4">

                {/* Status filter pills */}
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Lọc theo trạng thái
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {MY_BOOKING_STATUSES.map((s) => {
                      const cnt = s.value === 'all'
                        ? myBookings.length
                        : myBookings.filter((b) => b.status === s.value).length;
                      return (
                        <button
                          key={s.value}
                          onClick={() => setMyBookingsFilter(s.value)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                            myBookingsFilter === s.value
                              ? 'bg-ghn-orange text-white shadow-sm'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {s.label}{cnt > 0 ? ` (${cnt})` : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bookings list */}
                {myBookingsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-5 h-5 border-2 border-ghn-orange border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filtered.length === 0 ? (
                  <p className="text-xs text-gray-400 italic text-center py-4">Không có lịch đặt nào</p>
                ) : (
                  <ul className="space-y-1.5">
                    {filtered.slice(0, 15).map((b) => {
                      const start  = new Date(b.start_time);
                      const end    = new Date(b.end_time);
                      const isOwn = currentUser && b.user_id === currentUser.id;
                      const colors = blockColor(b.status, isOwn);
                      return (
                        <li key={b.id}>
                          <button
                            onClick={() => { jumpToBooking(b); setCancelError(''); setConfirmingCancel(false); setCancelModal(b); }}
                            className="w-full text-left px-3 py-2.5 rounded-lg border border-gray-200 hover:border-ghn-orange hover:bg-orange-50 transition-colors text-xs"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-semibold text-gray-800 truncate">{b.title}</span>
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.bar}`} />
                            </div>
                            <div className="text-[11px] text-gray-500 mt-0.5 truncate">{b.room?.name || ''}</div>
                            <div className="text-[11px] text-gray-400 mt-0.5">
                              {start.toLocaleDateString('vi-VN', {
                                timeZone: 'Asia/Ho_Chi_Minh',
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                              {' · '}{fmtTime(start)}–{fmtTime(end)}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* Actions */}
                <div className="pt-1 border-t border-gray-100 space-y-2">
                  <button
                    onClick={() => setSidebarTab('rooms')}
                    className="w-full py-2.5 text-sm font-semibold rounded-lg bg-ghn-orange text-white hover:bg-ghn-orange-dark transition-colors"
                  >
                    + Đặt phòng mới
                  </button>
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setMyBookingsRefresh((v) => v + 1)}
                      className="text-xs text-gray-400 hover:text-ghn-orange transition-colors"
                    >
                      ↻ Làm mới
                    </button>
                  </div>
                </div>

              </div>
            );
          })()}
        </div>


      </aside>

      {/* ───────── Calendar Grid ───────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Week navigation bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-white flex-shrink-0">
          <button
            onClick={prevWeek}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-ghn-orange px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-colors font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Tuần trước
          </button>
          <button
            onClick={nextWeek}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-ghn-orange px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-colors font-medium"
          >
            Tuần sau
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Scrollable body — header is sticky inside so columns always align */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Header row — sticky so it stays visible while scrolling */}
          <div className="flex border-b border-gray-200 bg-white sticky top-0 z-40">
            {/* time axis spacer */}
            <div className="w-14 flex-shrink-0 border-r border-gray-100" />
            {weekDays.map((d) => {
              const ds = toVNDateStr(d);
              const isToday = ds === today;
              return (
                <div
                  key={ds}
                  className={`flex-1 min-w-0 text-center py-2 border-r border-gray-100 last:border-r-0 ${
                    isToday ? 'bg-orange-50' : ''
                  }`}
                >
                  <div className={`text-xs font-medium ${isToday ? 'text-ghn-orange' : 'text-gray-500'}`}>
                    {DAY_LABELS[d.getDay()]}
                  </div>
                  <div
                    className={`text-lg font-bold leading-tight ${
                      isToday
                        ? 'w-8 h-8 rounded-full bg-ghn-orange text-white flex items-center justify-center mx-auto'
                        : 'text-gray-800'
                    }`}
                  >
                    {d.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Booking range warning */}
          {slotWarning && (
            <div className="mx-3 mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2 animate-pulse">
              <span>⚠️</span>
              <span>{slotWarning}</span>
            </div>
          )}
          {!selRoom ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <svg className="w-16 h-16 text-gray-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-400 font-medium text-lg">Chọn phòng để xem lịch</p>
              <p className="text-gray-300 text-sm mt-1">Chọn một phòng ở cột bên trái để xem lịch đặt trong tuần</p>

            </div>
          ) : loadingBookings ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-ghn-orange border-t-transparent rounded-full animate-spin" />
              <span className="ml-2 text-sm text-gray-500">Đang tải...</span>
            </div>
          ) : (
            <div className="flex relative">
              {/* Real-time now line */}
              {nowMin >= START_HOUR * 60 && nowMin <= END_HOUR * 60 && (() => {
                const topPx = (nowMin - START_HOUR * 60) * (HOUR_HEIGHT / 60);
                return (
                  <div className="absolute z-30 pointer-events-none" style={{ top: topPx, left: 56, right: 0 }}>
                    <div className="relative">
                      <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-red-500" />
                      <div className="h-px bg-red-500 opacity-80" />
                    </div>
                  </div>
                );
              })()}
              {/* Time axis */}
              <div className="w-14 flex-shrink-0 border-r border-gray-100 bg-white relative z-10">
                {timeSlots.map((h) => (
                  <div
                    key={h}
                    style={{ height: HOUR_HEIGHT }}
                    className="border-b border-gray-100 flex items-start justify-end pr-2 pt-1"
                  >
                    <span className="text-[11px] text-gray-400">
                      {h < 12 ? `${h} SA` : h === 12 ? '12 CH' : `${h - 12} CH`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((d) => {
                const ds = toVNDateStr(d);
                const isToday = ds === today;
                const isPastDay = ds < today;
                const dayBookings = bookingsByDay[ds] || [];

                return (
                  <div
                    key={ds}
                    className={`flex-1 min-w-0 relative border-r border-gray-100 last:border-r-0 ${
                      isToday ? 'bg-orange-50/30' : isPastDay ? 'bg-gray-50/60' : ''
                    } ${selRoom ? (isPastDay ? 'cursor-not-allowed' : 'cursor-crosshair') : ''}`}
                    style={{ minHeight: HOUR_HEIGHT * timeSlots.length }}
                    onMouseDown={(e) => handleDayMouseDown(e, d)}
                  >
                    {/* Past day overlay */}
                    {isPastDay && (
                      <div className="absolute inset-0 z-10 pointer-events-none"
                        style={{ background: 'repeating-linear-gradient(135deg, transparent, transparent 8px, rgba(156,163,175,0.08) 8px, rgba(156,163,175,0.08) 9px)' }}
                      />
                    )}
                    {/* Hour grid lines */}
                    {timeSlots.map((h) => (
                      <div
                        key={h}
                        style={{ top: (h - START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                        className="absolute inset-x-0 border-b border-gray-100 group"
                      >
                        {/* 15-min dotted line */}
                        <div className="absolute inset-x-0 border-b border-dotted border-gray-100/60" style={{ top: HOUR_HEIGHT * 0.25 }} />
                        {/* 30-min dashed line */}
                        <div className="absolute inset-x-0 border-b border-dashed border-gray-100" style={{ top: HOUR_HEIGHT * 0.5 }} />
                        {/* 45-min dotted line */}
                        <div className="absolute inset-x-0 border-b border-dotted border-gray-100/60" style={{ top: HOUR_HEIGHT * 0.75 }} />
                        {/* hover label */}
                        <span className="absolute right-1 top-1 text-[10px] text-ghn-orange opacity-0 group-hover:opacity-100 transition-opacity">
                          {h}:00
                        </span>
                      </div>
                    ))}
                    {/* Drag selection overlay */}
                    {dragSel && dragSel.dayDateStr === ds && (
                      <div
                        style={{
                          top: (dragSel.startMin - START_HOUR * 60) * (HOUR_HEIGHT / 60),
                          height: Math.max((dragSel.endMin - dragSel.startMin) * (HOUR_HEIGHT / 60), 20),
                          left: 2, right: 2,
                        }}
                        className={`absolute z-30 rounded border border-dashed pointer-events-none ${
                          dragSel.hasConflict
                            ? 'bg-red-500/20 border-red-500'
                            : 'bg-ghn-orange/20 border-ghn-orange'
                        }`}
                      >
                        <div className="px-1.5 pt-0.5">
                          <span className={`text-[10px] font-bold ${dragSel.hasConflict ? 'text-red-600' : 'text-ghn-orange'}`}>
                            {minToTimeStr(dragSel.startMin)} – {minToTimeStr(dragSel.endMin)}
                            {dragSel.hasConflict && ' ✕'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Booking blocks */}
                    {dayBookings.map((b) => {
                      const startMins = toVNMinutes(new Date(b.start_time));
                      const endMins   = toVNMinutes(new Date(b.end_time));
                      const top    = (startMins - START_HOUR * 60) * (HOUR_HEIGHT / 60);
                      const height = Math.max((endMins - startMins) * (HOUR_HEIGHT / 60), 22);
                      const isOwn = currentUser && b.user_id === currentUser.id;
                      const colors = blockColor(b.status, isOwn);

                      return (
                        <div
                          key={b.id}
                          style={{ top: top + 1, height: height - 2, left: 2, right: 2 }}
                          className={`absolute rounded overflow-hidden border ${colors.bg} ${colors.text} text-[11px] leading-tight z-20 cursor-pointer hover:shadow-md transition-shadow select-none`}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); setCancelError(''); setConfirmingCancel(false); setCancelModal(b); }}
                          title={`${b.title}\n${fmtTime(new Date(b.start_time))} – ${fmtTime(new Date(b.end_time))}\n${b.user?.full_name || ''}`}
                        >
                          {/* color bar */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${colors.bar}`} />
                          <div className="pl-2 pr-1 py-0.5 h-full flex flex-col justify-start overflow-hidden">
                            <div className="font-semibold truncate">{fmtTime(new Date(b.start_time))} – {fmtTime(new Date(b.end_time))}</div>
                            {height > 30 && (
                              <div className="truncate font-medium mt-0.5">{b.title}</div>
                            )}
                            {height > 45 && b.user && (
                              <div className="truncate text-[10px] opacity-70 mt-0.5">{b.user.full_name}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Close dropdown on outside click */}
      {showRoomDrop && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setShowRoomDrop(false); setRoomSearch(''); }}
        />
      )}

      {/* Booking modal */}
      {modalSlot && selRoom && (
        <BookingModal
          room={selRoom}
          startTime={modalSlot.startTime}
          endTime={modalSlot.endTime}
          onClose={() => setModalSlot(null)}
          onSuccess={() => { setModalSlot(null); fetchBookings(); }}
        />
      )}

      {/* Booking detail / edit / cancel modal */}
      {cancelModal && (() => {
        const isOwn = currentUser && cancelModal.user_id === currentUser.id;
        const room  = cancelModal.room || selRoom || {};
        const closeAll = () => { setCancelModal(null); setCancelError(''); setConfirmingCancel(false); setEditMode(false); setEditError(''); setAdminCancelMode(false); setAdminCancelMessage(''); };
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
            onClick={(e) => { if (e.target === e.currentTarget) closeAll(); }}
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              {/* Colored header */}
              <div className="bg-gradient-to-br from-ghn-orange to-ghn-orange-dark px-5 pt-5 pb-4 relative">
                <button onClick={closeAll} className="absolute top-3.5 right-3.5 w-7 h-7 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <p className="text-orange-100 text-xs font-medium mb-1">Cuộc họp</p>
                <h3 className="font-bold text-white text-lg leading-snug pr-10">{cancelModal.title}</h3>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {room.location && (
                    <span className="inline-flex items-center gap-1 bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                      📍 {room.location}
                    </span>
                  )}
                  {room.floor && (
                    <span className="inline-flex items-center gap-1 bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                      Tầng {fmtFloor(room.floor)}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                    🏢 {room.name || '—'}
                  </span>
                </div>
              </div>

              {/* Edit form */}
              {editMode ? (
                <form onSubmit={handleEditBooking} className="px-5 py-4 space-y-3">
                  <div>
                    <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Tên cuộc họp</label>
                    <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ghn-orange" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Bắt đầu</label>
                      <input type="time" value={editStart} onChange={(e) => setEditStart(e.target.value)} required
                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ghn-orange" />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Kết thúc</label>
                      <input type="time" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} required
                        className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-ghn-orange" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Ghi chú</label>
                    <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-ghn-orange" />
                  </div>
                  {editError && <p className="text-sm text-red-500">{editError}</p>}
                  <div className="flex gap-3 pt-1">
                    <button type="submit" disabled={editLoading}
                      className="flex-1 py-2.5 rounded-xl bg-ghn-orange hover:bg-ghn-orange-dark text-white font-semibold text-sm transition-colors disabled:opacity-50">
                      {editLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                    <button type="button" onClick={() => { setEditMode(false); setEditError(''); }}
                      className="flex-1 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-sm transition-colors">
                      Hủy bỏ
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {/* Detail view */}
                  <div className="px-5 py-4 space-y-3.5">
                    <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                      <svg className="w-4 h-4 text-ghn-orange flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <span className="text-base font-bold text-gray-900">{fmtTime(new Date(cancelModal.start_time))}</span>
                        <span className="text-gray-400 mx-2">→</span>
                        <span className="text-base font-bold text-gray-900">{fmtTime(new Date(cancelModal.end_time))}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      <div>
                        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">Người đặt</p>
                        <p className="text-sm font-semibold text-gray-800">{cancelModal.user?.full_name || '—'}</p>
                      </div>
                    </div>
                    {cancelModal.notes && (
                      <div className="border-t border-gray-100 pt-3">
                        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">Ghi chú</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{cancelModal.notes}</p>
                      </div>
                    )}
                    {cancelModal.status === 'cancelled' && cancelModal.cancellation_message && (
                      <div className="border-t border-red-100 pt-3 bg-red-50 -mx-5 -mb-3 px-5 py-3 rounded-b-xl">
                        <p className="text-[11px] font-medium text-red-600 uppercase tracking-wide mb-1">⚠️ Lý do hủy</p>
                        <p className="text-sm text-red-700 leading-relaxed font-medium">{cancelModal.cancellation_message}</p>
                      </div>
                    )}
                    {cancelModal.status === 'cancelled' && !cancelModal.cancellation_message && (
                      <div className="border-t border-red-100 pt-3 bg-red-50 -mx-5 -mb-3 px-5 py-3 rounded-b-xl">
                        <p className="text-[11px] font-medium text-red-600 uppercase tracking-wide">⚠️ Đã hủy</p>
                      </div>
                    )}
                  </div>

                  {/* Actions — own booking */}
                  {isOwn && (() => {
                    const isPastBooking = new Date(cancelModal.start_time) < new Date();
                    const canEdit = !isPastBooking && (cancelModal.status === 'confirmed' || cancelModal.status === 'pending');
                    return confirmingCancel ? (
                      <div className="px-5 pb-5">
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
                          <p className="text-sm font-semibold text-red-700 mb-0.5">Xác nhận hủy đặt phòng?</p>
                          <p className="text-xs text-red-500">Hành động này không thể hoàn tác.</p>
                        </div>
                        {cancelError && <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{cancelError}</div>}
                        <div className="flex gap-3">
                          <button onClick={() => handleCancelBooking()} disabled={cancelLoading}
                            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors disabled:opacity-50">
                            {cancelLoading ? (
                              <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Đang hủy...
                              </span>
                            ) : 'Xác nhận hủy'}
                          </button>
                          <button onClick={() => { setConfirmingCancel(false); setCancelError(''); }} disabled={cancelLoading}
                            className="flex-1 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-sm transition-colors">
                            Giữ lại
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="px-5 pb-5 flex gap-3">
                        {canEdit && (
                          <button
                            onClick={() => {
                              setEditTitle(cancelModal.title || '');
                              setEditNotes(cancelModal.notes || '');
                              setEditStart(toVNTimeStr(new Date(cancelModal.start_time)));
                              setEditEnd(toVNTimeStr(new Date(cancelModal.end_time)));
                              setEditError('');
                              setEditMode(true);
                            }}
                            className="flex-1 py-2.5 rounded-xl border border-blue-200 hover:bg-blue-50 text-blue-600 font-semibold text-sm transition-colors">
                            Chỉnh sửa
                          </button>
                        )}
                        {(cancelModal.status === 'confirmed' || cancelModal.status === 'pending') && (
                          <button onClick={() => setConfirmingCancel(true)}
                            className="flex-1 py-2.5 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 font-semibold text-sm transition-colors">
                            Hủy đặt phòng
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {/* Admin cancel for other users' bookings */}
                  {currentUser?.role === 'admin' && !isOwn && cancelModal.status !== 'cancelled' && (
                    adminCancelMode ? (
                      <div className="px-5 pb-5">
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
                          <p className="text-sm font-semibold text-red-700 mb-1">Hủy lịch của người dùng</p>
                          <p className="text-xs text-red-500 mb-2">Người đặt sẽ thấy lý do hủy này khi xem lịch của mình.</p>
                          <textarea
                            value={adminCancelMessage}
                            onChange={(e) => setAdminCancelMessage(e.target.value)}
                            placeholder="Lời nhắn gửi người dùng (không bắt buộc)..."
                            rows={3}
                            className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-red-400 bg-white"
                          />
                        </div>
                        {cancelError && <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{cancelError}</div>}
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleCancelBooking(adminCancelMessage || null)}
                            disabled={cancelLoading}
                            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors disabled:opacity-50"
                          >
                            {cancelLoading ? (
                              <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Đang hủy...
                              </span>
                            ) : 'Xác nhận hủy'}
                          </button>
                          <button
                            onClick={() => { setAdminCancelMode(false); setAdminCancelMessage(''); setCancelError(''); }}
                            disabled={cancelLoading}
                            className="flex-1 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-sm transition-colors"
                          >
                            Giữ lại
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="px-5 pb-5">
                        <button
                          onClick={() => setAdminCancelMode(true)}
                          className="w-full py-2.5 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 font-semibold text-sm transition-colors"
                        >
                          Hủy lịch (Admin)
                        </button>
                      </div>
                    )
                  )}
                </>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
