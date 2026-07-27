import { useState, useEffect, useCallback } from 'react';
import { dashboardApi } from '../api';
import {
  ClipboardDocumentListIcon,
  ArrowTrendingUpIcon,
  XCircleIcon,
  ClockIcon,
  TrophyIcon,
  ArrowDownTrayIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';

/* ── helpers (độc lập, không dùng chung với AnalyticsPage để tránh rủi ro
   ảnh hưởng báo cáo phòng họp đang chạy ổn định) ── */
function toVNDateStr(d) {
  return new Date(d).toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric',
  });
}
function toVNTimeStr(d) {
  return new Date(d).toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false,
  });
}
const STATUS_MAP = {
  confirmed: { label: 'Đã xác nhận', cls: 'bg-blue-100 text-blue-700' },
  cancelled: { label: 'Đã hủy',      cls: 'bg-red-100  text-red-600'  },
};
function statusLabel(s) { return STATUS_MAP[s]?.label || s; }
function statusColor(s) { return STATUS_MAP[s]?.cls || 'bg-gray-100 text-gray-600'; }
function fmtDuration(minutes) {
  if (!minutes) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h${m > 0 ? m + 'm' : ''}` : `${m}m`;
}

async function exportExcel(bookings) {
  const XLSX = await import('xlsx');
  const headers = ['STT', 'Xe', 'Biển số', 'MSNV', 'Người sử dụng xe', 'Phòng ban', 'Mục đích', 'Ghi chú', 'Người tạo lịch', 'Ngày', 'Bắt đầu', 'Kết thúc', 'Thời lượng (phút)', 'Trạng thái', 'Lý do hủy'];
  const rows = bookings.map((b, i) => [
    i + 1,
    b.car?.name || '',
    b.car?.license_plate || '',
    b.requester?.employee_id || '',
    b.requester?.full_name || '',
    b.requester?.department || '',
    b.title || '',
    b.notes || '',
    b.creator?.full_name || '',
    toVNDateStr(b.start_time),
    toVNTimeStr(b.start_time),
    toVNTimeStr(b.end_time),
    Math.round((new Date(b.end_time) - new Date(b.start_time)) / 60000),
    statusLabel(b.status),
    b.status === 'cancelled' ? (b.cancellation_message || '') : '',
  ]);
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Báo cáo đặt xe');
  XLSX.writeFile(workbook, `bao-cao-dat-xe-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function MetricCard({ icon, label, value, sub, color = 'bg-ghn-orange-light text-ghn-orange' }) {
  return (
    <div className="card p-5">
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-800 mt-0.5">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function HBar({ label, value, maxValue, sub, badge, colorClass = 'bg-ghn-orange' }) {
  const pct = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0;
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-700 font-medium truncate max-w-[170px]">{label}</span>
        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
          {badge != null && (
            <span className="text-[11px] text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 font-semibold">
              {badge}%
            </span>
          )}
          <span className="text-gray-600 font-semibold">{value} lượt</span>
        </div>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
      {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
    </div>
  );
}

export default function CarAnalyticsSection({ dateFrom, dateTo }) {
  const [metrics, setMetrics] = useState(null);
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortCol, setSortCol] = useState('start_time');
  const [sortDir, setSortDir] = useState('desc');
  const [colFilters, setColFilters] = useState({ car: '', employee_id: '', requester: '', department: '', title: '', notes: '', creator: '', status: '', reason: '' });
  const setCol = (key, val) => setColFilters((prev) => ({ ...prev, [key]: val }));

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { from: dateFrom, to: dateTo };
      const reportParams = { ...params };
      const [mRes, rRes] = await Promise.all([
        dashboardApi.getCarMetrics(params),
        dashboardApi.getCarReport(reportParams),
      ]);
      setMetrics(mRes.data.data);
      setReport(rRes.data.data.bookings || []);
    } catch (e) {
      setError(e.response?.data?.error?.message || 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
  };

  const sortValue = (b, col) => {
    switch (col) {
      case 'car':        return b.car?.name || '';
      case 'employee_id': return b.requester?.employee_id || '';
      case 'requester':   return b.requester?.full_name || '';
      case 'department':  return b.requester?.department || '';
      case 'title':       return b.title || '';
      case 'notes':       return b.notes || '';
      case 'creator':     return b.creator?.full_name || '';
      case 'start_time':  return new Date(b.start_time).getTime();
      case 'duration':    return new Date(b.end_time) - new Date(b.start_time);
      case 'status':      return b.status;
      case 'reason':      return b.cancellation_message || '';
      default: return '';
    }
  };

  const filteredReport = (() => {
    let list = [...report];
    if (colFilters.car)     list = list.filter((b) => b.car?.name?.toLowerCase().includes(colFilters.car.toLowerCase()) || b.car?.license_plate?.toLowerCase().includes(colFilters.car.toLowerCase()));
    if (colFilters.employee_id) list = list.filter((b) => b.requester?.employee_id?.toLowerCase().includes(colFilters.employee_id.toLowerCase()));
    if (colFilters.requester)   list = list.filter((b) => b.requester?.full_name?.toLowerCase().includes(colFilters.requester.toLowerCase()));
    if (colFilters.department)  list = list.filter((b) => b.requester?.department?.toLowerCase().includes(colFilters.department.toLowerCase()));
    if (colFilters.title)   list = list.filter((b) => b.title?.toLowerCase().includes(colFilters.title.toLowerCase()));
    if (colFilters.notes)   list = list.filter((b) => b.notes?.toLowerCase().includes(colFilters.notes.toLowerCase()));
    if (colFilters.creator) list = list.filter((b) => b.creator?.full_name?.toLowerCase().includes(colFilters.creator.toLowerCase()));
    if (colFilters.status)  list = list.filter((b) => b.status === colFilters.status);
    if (colFilters.reason)  list = list.filter((b) => b.cancellation_message?.toLowerCase().includes(colFilters.reason.toLowerCase()));
    list.sort((a, b) => {
      const av = sortValue(a, sortCol);
      const bv = sortValue(b, sortCol);
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  })();

  const peakHoursAll = Array.from({ length: 15 }, (_, i) => {
    const hour = i + 7;
    const found = metrics?.peak_hours?.find((h) => h.hour === hour);
    return { hour, count: found?.count || 0 };
  });
  const maxPeakCount = Math.max(...peakHoursAll.map((h) => h.count), 1);
  const maxCarCount = Math.max(...(metrics?.top_cars?.map((c) => c.booking_count) || []), 1);
  const s = metrics?.summary;

  return (
    <div className="space-y-6">
      {s && (
        <>
          {/* ── Summary metric cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={<ClipboardDocumentListIcon className="w-6 h-6" />}
              label="Tổng lượt đặt xe"
              value={s.total_bookings}
              sub={`${s.cancelled} đã hủy`}
            />
            <MetricCard
              icon={<ArrowTrendingUpIcon className="w-6 h-6" />}
              label="Tỷ lệ sử dụng"
              value={`${s.occupancy_rate}%`}
              sub={`${s.total_cars} xe hoạt động`}
              color="bg-blue-50 text-blue-600"
            />
            <MetricCard
              icon={<XCircleIcon className="w-6 h-6" />}
              label="Tỷ lệ hủy"
              value={`${s.cancellation_rate}%`}
              sub={`${s.cancelled} lượt hủy`}
              color="bg-red-50 text-red-500"
            />
            <MetricCard
              icon={<ClockIcon className="w-6 h-6" />}
              label="Thời lượng TB"
              value={fmtDuration(s.avg_duration_minutes)}
              sub="mỗi lượt đặt xe"
              color="bg-green-50 text-green-600"
            />
          </div>

          {/* ── Charts row ── */}
          <div className="grid lg:grid-cols-2 gap-5">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700 inline-flex items-center gap-1.5">
                  <TrophyIcon className="w-4 h-4 text-ghn-orange" /> Top xe được đặt nhiều nhất
                </h3>
                <span className="text-[11px] text-gray-400">badge = % thời gian sử dụng</span>
              </div>
              {(metrics.top_cars || []).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Không có dữ liệu trong kỳ này</p>
              ) : (
                <div className="space-y-3.5">
                  {metrics.top_cars.map((c, i) => (
                    <HBar
                      key={c.name}
                      label={`${i + 1}. ${c.name}`}
                      value={c.booking_count}
                      maxValue={maxCarCount}
                      badge={c.utilization}
                      sub={`${c.license_plate || '—'} • TB ${fmtDuration(c.avg_minutes)}/lần`}
                      colorClass={i === 0 ? 'bg-ghn-orange' : i === 1 ? 'bg-blue-400' : i === 2 ? 'bg-blue-300' : 'bg-gray-300'}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 inline-flex items-center gap-1.5">
                <ClockIcon className="w-4 h-4 text-ghn-orange" /> Giờ cao điểm
              </h3>
              <div className="space-y-1.5">
                {peakHoursAll.map(({ hour, count }) => (
                  <div key={hour} className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400 w-12 flex-shrink-0 text-right">
                      {hour < 12 ? `${hour}h SA` : hour === 12 ? '12h CH' : `${hour - 12}h CH`}
                    </span>
                    <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-ghn-blue rounded-full transition-all duration-500"
                        style={{ width: `${(count / maxPeakCount) * 100}%` }} />
                    </div>
                    <span className="text-[11px] text-gray-500 w-6 flex-shrink-0 text-right">
                      {count > 0 ? count : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Detailed report table ── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="text-sm font-semibold text-gray-700 inline-flex items-center gap-1.5">
            <TruckIcon className="w-4 h-4 text-ghn-orange" /> Chi tiết đặt xe
            {filteredReport.length > 0 && (
              <span className="ml-2 text-xs font-normal text-gray-400">({filteredReport.length} bản ghi)</span>
            )}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => exportExcel(filteredReport)}
              disabled={filteredReport.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-40"
            >
              <ArrowDownTrayIcon className="w-4 h-4" /> Xuất Excel
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-2 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide text-left">#</th>
                {[
                  { col: 'car',        label: 'Xe',              align: 'left'  },
                  { col: 'employee_id', label: 'MSNV',           align: 'left'  },
                  { col: 'requester',  label: 'Người sử dụng xe', align: 'left' },
                  { col: 'department', label: 'Phòng ban',       align: 'left'  },
                  { col: 'title',      label: 'Mục đích',        align: 'left'  },
                  { col: 'notes',      label: 'Ghi chú',         align: 'left'  },
                  { col: 'creator',    label: 'Người tạo lịch',  align: 'left'  },
                  { col: 'start_time', label: 'Thời gian',       align: 'left'  },
                  { col: 'duration',   label: 'TL',              align: 'right' },
                  { col: 'status',     label: 'Trạng thái',      align: 'left'  },
                  { col: 'reason',     label: 'Lý do hủy',       align: 'left'  },
                ].map(({ col, label, align }) => (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className={`pb-2 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide cursor-pointer select-none hover:text-gray-600 transition-colors text-${align}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {label}
                      {sortCol === col
                        ? (sortDir === 'asc' ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />)
                        : <ChevronUpDownIcon className="w-3 h-3 text-gray-300" />}
                    </span>
                  </th>
                ))}
              </tr>
              <tr className="border-b-2 border-gray-100">
                <td className="pb-2 px-2" />
                <td className="pb-2 px-2">
                  <input value={colFilters.car} onChange={(e) => setCol('car', e.target.value)} placeholder="Lọc xe..." className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-ghn-orange" />
                </td>
                <td className="pb-2 px-2">
                  <input value={colFilters.employee_id} onChange={(e) => setCol('employee_id', e.target.value)} placeholder="Lọc MSNV..." className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-ghn-orange" />
                </td>
                <td className="pb-2 px-2">
                  <input value={colFilters.requester} onChange={(e) => setCol('requester', e.target.value)} placeholder="Lọc người dùng xe..." className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-ghn-orange" />
                </td>
                <td className="pb-2 px-2">
                  <input value={colFilters.department} onChange={(e) => setCol('department', e.target.value)} placeholder="Lọc phòng ban..." className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-ghn-orange" />
                </td>
                <td className="pb-2 px-2">
                  <input value={colFilters.title} onChange={(e) => setCol('title', e.target.value)} placeholder="Lọc mục đích..." className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-ghn-orange" />
                </td>
                <td className="pb-2 px-2">
                  <input value={colFilters.notes} onChange={(e) => setCol('notes', e.target.value)} placeholder="Lọc ghi chú..." className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-ghn-orange" />
                </td>
                <td className="pb-2 px-2">
                  <input value={colFilters.creator} onChange={(e) => setCol('creator', e.target.value)} placeholder="Lọc người tạo..." className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-ghn-orange" />
                </td>
                <td className="pb-2 px-2" />
                <td className="pb-2 px-2" />
                <td className="pb-2 px-2">
                  <select value={colFilters.status} onChange={(e) => setCol('status', e.target.value)} className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-ghn-orange bg-white">
                    <option value="">Tất cả</option>
                    <option value="confirmed">Đã xác nhận</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>
                </td>
                <td className="pb-2 px-2">
                  <input value={colFilters.reason} onChange={(e) => setCol('reason', e.target.value)} placeholder="Lọc lý do..." className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-ghn-orange" />
                </td>
              </tr>
            </thead>
            <tbody>
              {filteredReport.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center text-gray-400 py-8">
                    {loading ? 'Đang tải...' : 'Không có dữ liệu trong kỳ này'}
                  </td>
                </tr>
              ) : filteredReport.map((b, i) => {
                const dur = Math.round((new Date(b.end_time) - new Date(b.start_time)) / 60000);
                return (
                  <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-2 text-gray-400 text-xs">{i + 1}</td>
                    <td className="py-3 px-2">
                      <div className="font-medium text-gray-800">{b.car?.name || '—'}</div>
                      <div className="text-xs text-gray-400">{b.car?.license_plate || ''}</div>
                    </td>
                    <td className="py-3 px-2 text-gray-700">{b.requester?.employee_id || '—'}</td>
                    <td className="py-3 px-2 font-medium text-gray-800">{b.requester?.full_name || '—'}</td>
                    <td className="py-3 px-2 text-gray-700">{b.requester?.department || '—'}</td>
                    <td className="py-3 px-2 max-w-[200px]">
                      <div className="truncate font-medium text-gray-700">{b.title}</div>
                    </td>
                    <td className="py-3 px-2 max-w-[180px]">
                      <div className="truncate text-gray-600">{b.notes || '—'}</div>
                    </td>
                    <td className="py-3 px-2 text-gray-700">{b.creator?.full_name || '—'}</td>
                    <td className="py-3 px-2 whitespace-nowrap">
                      <div className="text-gray-700">{toVNDateStr(b.start_time)}</div>
                      <div className="text-xs text-gray-400">{toVNTimeStr(b.start_time)} – {toVNTimeStr(b.end_time)}</div>
                    </td>
                    <td className="py-3 px-2 text-right font-medium text-gray-700">{fmtDuration(dur)}</td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(b.status)}`}>
                        {statusLabel(b.status)}
                      </span>
                    </td>
                    <td className="py-3 px-2 max-w-[200px]">
                      {b.cancellation_message
                        ? <span className="text-xs text-red-500 leading-snug">"{b.cancellation_message}"</span>
                        : <span className="text-gray-300">—</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
