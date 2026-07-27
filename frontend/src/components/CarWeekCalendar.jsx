import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

/*
 * Lịch tuần cho đặt xe công ty — component độc lập, không dùng chung code với
 * CalendarPage.jsx (phòng họp) để tránh rủi ro ảnh hưởng tới luồng đặt phòng
 * đang chạy ổn định. Toán học định vị (giờ → px) được viết lại gọn ở đây.
 */

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const START_HOUR = 6;
const END_HOUR = 22;
const HOUR_HEIGHT = 56; // px / giờ

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
function toVNDateStr(date) {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}
function toVNMinutes(date) {
  const vnStr = date.toLocaleString('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', hour: 'numeric', minute: 'numeric', hour12: false,
  });
  const [h, m] = vnStr.split(':').map(Number);
  return h * 60 + m;
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

export default function CarWeekCalendar({ bookings, isAdmin, onWeekChange, onCreateSlot, onEditBooking }) {
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const weekDays = useMemo(() => getWeekRange(weekAnchor), [weekAnchor]);
  const dragInfo = useRef(null);
  const [dragSel, setDragSel] = useState(null);
  const [slotWarning, setSlotWarning] = useState('');

  useEffect(() => {
    const start = new Date(weekDays[0]); start.setHours(0, 0, 0, 0);
    const end = new Date(weekDays[6]); end.setHours(23, 59, 59, 999);
    onWeekChange?.(start.toISOString(), end.toISOString());
  }, [weekDays]); // eslint-disable-line react-hooks/exhaustive-deps

  const bookingsByDay = useMemo(() => {
    const map = {};
    for (const b of bookings || []) {
      const ds = toVNDateStr(new Date(b.start_time));
      if (!map[ds]) map[ds] = [];
      map[ds].push(b);
    }
    return map;
  }, [bookings]);

  // Ref để mousemove/mouseup luôn đọc được bookingsByDay mới nhất, tránh closure cũ
  const bookingsByDayRef = useRef(bookingsByDay);
  useEffect(() => { bookingsByDayRef.current = bookingsByDay; }, [bookingsByDay]);

  function checkConflict(dayDateStr, startMin, endMin) {
    const dayBookings = bookingsByDayRef.current[dayDateStr] || [];
    return dayBookings.some((b) => {
      const bStart = toVNMinutes(new Date(b.start_time));
      const bEnd = toVNMinutes(new Date(b.end_time));
      return startMin < bEnd && endMin > bStart;
    });
  }

  const timeSlots = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

  function handleDayMouseDown(e, dayDate) {
    if (!isAdmin || e.button !== 0) return;
    setSlotWarning('');
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const startMin = Math.min(yToMin(y), (END_HOUR - 1) * 60);
    const endMin = Math.min(startMin + 60, END_HOUR * 60);
    dragInfo.current = { dayDate, dayEl: e.currentTarget, startMin };
    setDragSel({
      dayDateStr: toVNDateStr(dayDate), startMin, endMin,
      hasConflict: checkConflict(toVNDateStr(dayDate), startMin, endMin),
    });
    e.preventDefault();
  }

  useEffect(() => {
    if (!isAdmin) return;
    function onMove(e) {
      if (!dragInfo.current) return;
      const rect = dragInfo.current.dayEl.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const endMin = Math.min(END_HOUR * 60, Math.max(dragInfo.current.startMin + 30, yToMin(y)));
      const dayDateStr = toVNDateStr(dragInfo.current.dayDate);
      const hasConflict = checkConflict(dayDateStr, dragInfo.current.startMin, endMin);
      setDragSel((prev) => (prev ? { ...prev, endMin, hasConflict } : null));
    }
    function onUp(e) {
      if (!dragInfo.current) return;
      const { dayDate, dayEl, startMin } = dragInfo.current;
      dragInfo.current = null;
      const rect = dayEl.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const raw = yToMin(y);
      const endMin = raw <= startMin + 15
        ? Math.min(startMin + 60, END_HOUR * 60)
        : Math.min(END_HOUR * 60, Math.max(startMin + 30, raw));
      setDragSel(null);

      const dayDateStr = toVNDateStr(dayDate);
      if (checkConflict(dayDateStr, startMin, endMin)) {
        setSlotWarning('Khung giờ này đã có lịch đặt xe. Vui lòng chọn khung giờ khác.');
        setTimeout(() => setSlotWarning(''), 5000);
        return;
      }

      const start = new Date(dayDate);
      start.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
      const end = new Date(dayDate);
      end.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);
      onCreateSlot?.({ startTime: start.toISOString(), endTime: end.toISOString() });
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex-1 flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Week navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setWeekAnchor((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; })}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeftIcon className="w-4 h-4 text-gray-500" />
          </button>
          <button type="button" onClick={() => setWeekAnchor(new Date())}
            className="px-3 py-1 text-xs font-semibold rounded-lg border border-gray-200 hover:border-ghn-orange hover:text-ghn-orange transition-colors">
            Hôm nay
          </button>
          <button type="button" onClick={() => setWeekAnchor((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; })}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronRightIcon className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <p className="text-sm font-semibold text-gray-700">
          {weekDays[0].toLocaleDateString('vi-VN')} – {weekDays[6].toLocaleDateString('vi-VN')}
        </p>
      </div>

      {slotWarning && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-xs font-medium text-red-600 shrink-0">
          {slotWarning}
        </div>
      )}

      {/* Day headers */}
      <div className="flex border-b border-gray-100 shrink-0">
        <div className="w-14 shrink-0" />
        {weekDays.map((d) => {
          const isToday = toVNDateStr(d) === toVNDateStr(new Date());
          return (
            <div key={d.toISOString()} className={`flex-1 text-center py-2 ${isToday ? 'bg-orange-50' : ''}`}>
              <p className="text-[11px] text-gray-400 font-medium">{DAY_LABELS[d.getDay()]}</p>
              <p className={`text-sm font-bold ${isToday ? 'text-ghn-orange' : 'text-gray-800'}`}>{d.getDate()}</p>
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex" style={{ minHeight: HOUR_HEIGHT * timeSlots.length }}>
          {/* Hour labels */}
          <div className="w-14 shrink-0 relative">
            {timeSlots.map((h) => (
              <div key={h} className="absolute inset-x-0 text-right pr-2 text-[11px] text-gray-400"
                style={{ top: (h - START_HOUR) * HOUR_HEIGHT - 6 }}>
                {h}:00
              </div>
            ))}
          </div>

          {weekDays.map((d) => {
            const ds = toVNDateStr(d);
            const dayBookings = bookingsByDay[ds] || [];
            return (
              <div
                key={ds}
                className={`flex-1 relative border-l border-gray-100 ${isAdmin ? 'cursor-crosshair' : ''}`}
                style={{ minHeight: HOUR_HEIGHT * timeSlots.length }}
                onMouseDown={(e) => handleDayMouseDown(e, d)}
              >
                {timeSlots.map((h) => (
                  <div key={h} className="absolute inset-x-0 border-b border-gray-50"
                    style={{ top: (h - START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }} />
                ))}

                {dragSel && dragSel.dayDateStr === ds && (
                  <div
                    className={`absolute inset-x-0.5 rounded-md border-2 border-dashed pointer-events-none z-10 ${
                      dragSel.hasConflict ? 'bg-red-500/20 border-red-500' : 'bg-ghn-orange/25 border-ghn-orange'
                    }`}
                    style={{
                      top: (dragSel.startMin - START_HOUR * 60) * (HOUR_HEIGHT / 60),
                      height: Math.max((dragSel.endMin - dragSel.startMin) * (HOUR_HEIGHT / 60), 16),
                    }}
                  >
                    <span className={`text-[10px] font-bold px-1 ${dragSel.hasConflict ? 'text-red-600' : 'text-ghn-orange'}`}>
                      {minToTimeStr(dragSel.startMin)}–{minToTimeStr(dragSel.endMin)}
                      {dragSel.hasConflict ? ' ⚠' : ''}
                    </span>
                  </div>
                )}

                {dayBookings.map((b) => {
                  const startMin = toVNMinutes(new Date(b.start_time));
                  const endMin = toVNMinutes(new Date(b.end_time));
                  const top = (startMin - START_HOUR * 60) * (HOUR_HEIGHT / 60);
                  const height = Math.max((endMin - startMin) * (HOUR_HEIGHT / 60), 18);
                  const hasDetails = b.title !== undefined;
                  return (
                    <div
                      key={b.id}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => { if (isAdmin) { e.stopPropagation(); onEditBooking?.(b); } }}
                      className={`absolute inset-x-0.5 rounded-md px-1.5 py-0.5 overflow-hidden border ${
                        hasDetails
                          ? 'bg-ghn-blue-light border-ghn-blue text-ghn-blue'
                          : 'bg-gray-200 border-gray-300 text-gray-500'
                      } ${isAdmin ? 'cursor-pointer hover:opacity-80' : ''}`}
                      style={{ top, height }}
                    >
                      <p className="text-[11px] font-semibold truncate leading-tight">
                        {hasDetails ? b.title : 'Bận'}
                      </p>
                      <p className="text-[10px] opacity-75 leading-tight">
                        {minToTimeStr(startMin)}–{minToTimeStr(endMin)}
                      </p>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
