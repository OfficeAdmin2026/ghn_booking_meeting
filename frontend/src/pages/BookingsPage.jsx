import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingsApi } from '../api';
import BookingStatusBadge from '../components/BookingStatusBadge';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  InboxIcon,
  XMarkIcon,
  BuildingOfficeIcon,
  ClockIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

/* ─────────────────────────── helpers ─────────────────────────── */
const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const MON_LABELS = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
                    'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
const START_HOUR  = 7;
const END_HOUR    = 22;
const HOUR_HEIGHT = 64;

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

function getMonthGrid(year, month) {
  const first    = new Date(year, month, 1);
  const last     = new Date(year, month + 1, 0);
  const startPad = (first.getDay() + 6) % 7;
  const endPad   = (7 - (last.getDay() + 6) % 7 - 1) % 7;
  const cells = [];
  for (let i = startPad; i > 0; i--) {
    const d = new Date(first); d.setDate(d.getDate() - i);
    cells.push({ date: d, isCurrentMonth: false });
  }
  for (let i = 1; i <= last.getDate(); i++) {
    cells.push({ date: new Date(year, month, i), isCurrentMonth: true });
  }
  for (let i = 1; i <= endPad; i++) {
    const d = new Date(last); d.setDate(last.getDate() + i);
    cells.push({ date: d, isCurrentMonth: false });
  }
  return cells;
}

function toVNMinutes(utcDate) {
  const vnStr = utcDate.toLocaleString('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: 'numeric', minute: 'numeric', hour12: false,
  });
  const [h, m] = vnStr.split(':').map(Number);
  return h * 60 + m;
}

function toVNDateStr(utcDate) {
  return utcDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function fmtTime(date) {
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh',
  });
}

function fmtDateTime(isoStr) {
  return new Date(isoStr).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function fmtDuration(start, end) {
  const mins = Math.round((new Date(end) - new Date(start)) / 60000);
  return mins >= 60
    ? `${Math.floor(mins / 60)}h${mins % 60 > 0 ? ` ${mins % 60}m` : ''}`
    : `${mins}m`;
}

function blockColor(status) {
  switch (status) {
    case 'confirmed': return { bar: 'bg-green-500',  bg: 'bg-green-50 border-green-200',   text: 'text-green-900'  };
    case 'active':    return { bar: 'bg-red-500',    bg: 'bg-red-50 border-red-200',        text: 'text-red-900'    };
    case 'pending':   return { bar: 'bg-yellow-400', bg: 'bg-yellow-50 border-yellow-200',  text: 'text-yellow-900' };
    case 'completed': return { bar: 'bg-gray-400',   bg: 'bg-gray-50 border-gray-200',      text: 'text-gray-600'   };
    case 'cancelled': return { bar: 'bg-gray-300',   bg: 'bg-gray-50 border-gray-200',      text: 'text-gray-400'   };
    default:          return { bar: 'bg-blue-400',   bg: 'bg-blue-50 border-blue-200',      text: 'text-blue-900'   };
  }
}

function formatDateTime(dt) {
  return new Date(dt).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'medium',
    timeStyle: 'short',
    hour12: false,
  });
}

function formatDuration(start, end) {
  const mins = Math.round((new Date(end) - new Date(start)) / 60000);
  return mins >= 60
    ? `${Math.floor(mins / 60)}h${mins % 60 > 0 ? `${mins % 60}m` : ''}`
    : `${mins}m`;
}

export default function BookingsPage() {
  const navigate = useNavigate();
  const today = toVNDateStr(new Date());

  const [anchorDate, setAnchorDate] = useState(new Date());
  const [weekDays,   setWeekDays]   = useState(() => getWeekRange(new Date()));
  const [calYear,    setCalYear]    = useState(() => new Date().getFullYear());
  const [calMonth,   setCalMonth]   = useState(() => new Date().getMonth());

  const [allBookings,     setAllBookings]     = useState([]);
  const [loading,         setLoading]         = useState(false);
  const [statusFilter,    setStatusFilter]    = useState('all');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancelling,      setCancelling]      = useState(false);

  /* ── load all user bookings ── */
  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookingsApi.getMyBookings();
      setAllBookings(res.data.data?.bookings || []);
    } catch { setAllBookings([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  /* ── keep week in sync with anchor ── */
  useEffect(() => { setWeekDays(getWeekRange(anchorDate)); }, [anchorDate]);

  /* ── navigation ── */
  const prevWeek  = () => { const d = new Date(anchorDate); d.setDate(d.getDate() - 7); setAnchorDate(d); };
  const nextWeek  = () => { const d = new Date(anchorDate); d.setDate(d.getDate() + 7); setAnchorDate(d); };
  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); } else setCalMonth((m) => m - 1); };
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); } else setCalMonth((m) => m + 1); };

  function pickDay(date) {
    setAnchorDate(date);
    setCalYear(date.getFullYear());
    setCalMonth(date.getMonth());
  }

  /* ── derive week's bookings ── */
  const weekStartStr = toVNDateStr(weekDays[0]);
  const weekEndStr   = toVNDateStr(weekDays[6]);

  const weekBookings = allBookings.filter((b) => {
    const ds = toVNDateStr(new Date(b.start_time));
    return ds >= weekStartStr && ds <= weekEndStr &&
      (statusFilter === 'all' || b.status === statusFilter);
  });

  const bookingsByDay = {};
  for (const b of weekBookings) {
    const ds = toVNDateStr(new Date(b.start_time));
    if (!bookingsByDay[ds]) bookingsByDay[ds] = [];
    bookingsByDay[ds].push(b);
  }

  /* ── month grid ── */
  const monthGrid       = getMonthGrid(calYear, calMonth);
  const anchorWeekDates = new Set(weekDays.map((d) => toVNDateStr(d)));

  /* ── cancel booking ── */
  const handleCancel = async (id) => {
    if (!confirm('Bạn có chắc muốn hủy lịch đặt này?')) return;
    setCancelling(true);
    try {
      await bookingsApi.cancel(id);
      setAllBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: 'cancelled' } : b));
      setSelectedBooking((prev) => prev ? { ...prev, status: 'cancelled' } : null);
    } catch (e) {
      alert(e.response?.data?.error?.message || 'Không thể hủy');
    } finally { setCancelling(false); }
  };

  const timeSlots = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  const statuses = [
    { value: 'all',       label: 'Tất cả' },
    { value: 'confirmed', label: 'Đã xác nhận' },
    { value: 'active',    label: 'Đang họp' },
    { value: 'pending',   label: 'Chờ xác nhận' },
    { value: 'completed', label: 'Hoàn thành' },
    { value: 'cancelled', label: 'Đã hủy' },
  ];

  return (
    <div className="flex h-full overflow-hidden bg-white">

      {/* ═══════════════ Sidebar ═══════════════ */}
      <aside className="w-72 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-y-auto">
        <div className="p-4 space-y-5">

          {/* ── Full month mini-calendar ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100 text-gray-500">
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <span className="text-sm font-bold text-gray-800">{MON_LABELS[calMonth]} {calYear}</span>
              <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100 text-gray-500">
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 text-center mb-1">
              {['T2','T3','T4','T5','T6','T7','CN'].map((d) => (
                <span key={d} className="text-[11px] font-semibold text-gray-400 py-1">{d}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 text-center gap-y-0.5">
              {monthGrid.map(({ date, isCurrentMonth }, idx) => {
                const ds          = toVNDateStr(date);
                const isToday     = ds === today;
                const inWeek      = anchorWeekDates.has(ds);
                const isWeekStart = inWeek && date.getDay() === 1;
                const isWeekEnd   = inWeek && date.getDay() === 0;
                return (
                  <button
                    key={idx}
                    onClick={() => pickDay(date)}
                    className={[
                      'text-xs py-1 leading-5 font-medium transition-colors relative',
                      isToday ? 'z-10' : inWeek ? 'bg-orange-50' : 'hover:bg-gray-100 rounded-full',
                      isCurrentMonth ? 'text-gray-800' : 'text-gray-300',
                      isWeekStart ? 'rounded-l-full bg-orange-50' : '',
                      isWeekEnd   ? 'rounded-r-full bg-orange-50' : '',
                    ].join(' ')}
                  >
                    <span className={[
                      'inline-flex items-center justify-center w-6 h-6 rounded-full',
                      isToday ? 'bg-ghn-orange text-white font-bold' : '',
                    ].join(' ')}>
                      {date.getDate()}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
              <button onClick={prevWeek} className="flex items-center gap-1 text-xs text-gray-500 hover:text-ghn-orange px-2 py-1 rounded hover:bg-orange-50">
                <ChevronLeftIcon className="w-3.5 h-3.5" />
                Tuần trước
              </button>
              <button onClick={() => pickDay(new Date())} className="text-xs text-ghn-orange font-semibold px-2 py-1 rounded hover:bg-orange-50">
                Hôm nay
              </button>
              <button onClick={nextWeek} className="flex items-center gap-1 text-xs text-gray-500 hover:text-ghn-orange px-2 py-1 rounded hover:bg-orange-50">
                Tuần sau
                <ChevronRightIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ── Status filter ── */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Lọc theo trạng thái
            </label>
            <div className="flex flex-wrap gap-1.5">
              {statuses.map((s) => {
                const count = s.value === 'all'
                  ? allBookings.length
                  : allBookings.filter((b) => b.status === s.value).length;
                return (
                  <button
                    key={s.value}
                    onClick={() => setStatusFilter(s.value)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                      statusFilter === s.value
                        ? 'bg-ghn-orange text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {s.label}{count > 0 ? ` (${count})` : ''}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Legend ── */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Chú thích</p>
            <div className="space-y-1.5">
              {[
                { label: 'Đã xác nhận',  cls: 'bg-green-500'  },
                { label: 'Đang họp',     cls: 'bg-red-500'    },
                { label: 'Chờ xác nhận', cls: 'bg-yellow-400' },
                { label: 'Hoàn thành',   cls: 'bg-gray-400'   },
                { label: 'Đã hủy',       cls: 'bg-gray-300'   },
              ].map(({ label, cls }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-sm ${cls} flex-shrink-0`} />
                  <span className="text-xs text-gray-600">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── New booking button ── */}
          <button onClick={() => navigate('/calendar')} className="w-full btn-primary text-sm inline-flex items-center justify-center gap-1.5">
            <PlusIcon className="w-4 h-4" /> Đặt phòng mới
          </button>

        </div>
      </aside>

      {/* ═══════════════ Calendar Grid ═══════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Day header */}
        <div className="flex border-b border-gray-200 bg-white flex-shrink-0">
          <div className="w-14 flex-shrink-0 border-r border-gray-100" />
          {weekDays.map((d) => {
            const ds      = toVNDateStr(d);
            const isToday = ds === today;
            return (
              <div
                key={ds}
                className={`flex-1 min-w-0 text-center py-2 border-r border-gray-100 last:border-r-0 ${isToday ? 'bg-orange-50' : ''}`}
              >
                <div className={`text-xs font-medium ${isToday ? 'text-ghn-orange' : 'text-gray-500'}`}>
                  {DAY_LABELS[d.getDay()]}
                </div>
                <div className={`text-lg font-bold leading-tight ${
                  isToday
                    ? 'w-8 h-8 rounded-full bg-ghn-orange text-white flex items-center justify-center mx-auto'
                    : 'text-gray-800'
                }`}>
                  {d.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative" style={{ scrollbarGutter: 'stable' }}>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-ghn-orange border-t-transparent rounded-full animate-spin" />
              <span className="ml-2 text-sm text-gray-500">Đang tải...</span>
            </div>
          ) : (
            <>
              <div className="flex">
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
                  const ds          = toVNDateStr(d);
                  const isToday     = ds === today;
                  const dayBookings = bookingsByDay[ds] || [];
                  return (
                    <div
                      key={ds}
                      className={`flex-1 min-w-0 relative border-r border-gray-100 last:border-r-0 ${isToday ? 'bg-orange-50/30' : ''}`}
                      style={{ minHeight: HOUR_HEIGHT * timeSlots.length }}
                    >
                      {/* Hour grid lines */}
                      {timeSlots.map((h) => (
                        <div
                          key={h}
                          style={{ top: (h - START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                          className="absolute inset-x-0 border-b border-gray-100"
                        >
                          <div
                            className="absolute inset-x-0 border-b border-dashed border-gray-100"
                            style={{ top: HOUR_HEIGHT / 2 }}
                          />
                        </div>
                      ))}

                      {/* Booking blocks */}
                      {dayBookings.map((b) => {
                        const startMins = toVNMinutes(new Date(b.start_time));
                        const endMins   = toVNMinutes(new Date(b.end_time));
                        const top    = (startMins - START_HOUR * 60) * (HOUR_HEIGHT / 60);
                        const height = Math.max((endMins - startMins) * (HOUR_HEIGHT / 60), 22);
                        const colors = blockColor(b.status);
                        return (
                          <div
                            key={b.id}
                            style={{ top: top + 1, height: height - 2, left: 2, right: 2 }}
                            className={`absolute rounded overflow-hidden border ${colors.bg} ${colors.text} text-[11px] leading-tight z-20 cursor-pointer hover:shadow-md transition-shadow select-none`}
                            onClick={() => setSelectedBooking(b)}
                            title={`${b.title}\n${fmtTime(new Date(b.start_time))} – ${fmtTime(new Date(b.end_time))}`}
                          >
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${colors.bar}`} />
                            <div className="pl-2 pr-1 py-0.5 h-full flex flex-col justify-start overflow-hidden">
                              <div className="font-semibold truncate">
                                {fmtTime(new Date(b.start_time))} – {fmtTime(new Date(b.end_time))}
                              </div>
                              {height > 30 && (
                                <div className="truncate font-medium mt-0.5">{b.title}</div>
                              )}
                              {height > 45 && b.room && (
                                <div className="truncate text-[10px] opacity-70 mt-0.5">{b.room.name}</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Empty state */}
              {weekBookings.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <InboxIcon className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-gray-400 font-medium">Không có lịch đặt trong tuần này</p>
                  <p className="text-gray-300 text-sm mt-1">
                    {statusFilter !== 'all' ? 'Thử đổi bộ lọc trạng thái' : 'Nhấn "Đặt phòng mới" để tạo lịch'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ═══════════════ Booking detail modal ═══════════════ */}
      {selectedBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedBooking(null); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-900">Chi tiết lịch đặt</h2>
              <button
                onClick={() => setSelectedBooking(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Title + status */}
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-bold text-gray-900 text-base leading-snug">{selectedBooking.title}</h3>
                <BookingStatusBadge status={selectedBooking.status} />
              </div>

              {/* Room + time card */}
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 font-semibold text-gray-800">
                  <BuildingOfficeIcon className="w-4 h-4 flex-shrink-0" />
                  <span>{selectedBooking.room?.name}</span>
                  {selectedBooking.room?.location && (
                    <span className="text-gray-400 font-normal">
                      · {selectedBooking.room.location}
                      {selectedBooking.room?.floor ? ` · Tầng ${selectedBooking.room.floor}` : ''}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-gray-500"><ClockIcon className="w-4 h-4" /> {fmtDateTime(selectedBooking.start_time)}</div>
                <div className="flex items-center gap-1.5 text-gray-500"><ClockIcon className="w-4 h-4" /> {fmtDateTime(selectedBooking.end_time)}</div>
                <div className="flex gap-4 text-gray-500">
                  <span className="flex items-center gap-1"><ClockIcon className="w-4 h-4" /> {fmtDuration(selectedBooking.start_time, selectedBooking.end_time)}</span>
                  <span className="flex items-center gap-1"><UsersIcon className="w-4 h-4" /> {selectedBooking.participants_count} người</span>
                </div>
                {selectedBooking.notes && (
                  <p className="text-xs text-gray-400 italic border-t border-gray-200 pt-2 mt-1">
                    {selectedBooking.notes}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button onClick={() => setSelectedBooking(null)} className="btn-ghost px-5 flex-1">
                  Đóng
                </button>
                {(selectedBooking.status === 'confirmed' || selectedBooking.status === 'pending') && (
                  <button
                    onClick={() => handleCancel(selectedBooking.id)}
                    disabled={cancelling}
                    className="flex-1 px-4 py-2 rounded-lg bg-red-50 text-red-600 font-medium text-sm hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    {cancelling ? 'Đang hủy...' : 'Hủy lịch đặt'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

