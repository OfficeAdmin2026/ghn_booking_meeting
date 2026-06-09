import { useState, useEffect, useCallback } from 'react';
import { dashboardApi } from '../api';

/* ── helpers ── */
function toVNDateStr(d) {
  return new Date(d).toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}
function toVNTimeStr(d) {
  return new Date(d).toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}
function toLocalISO(d) {
  return new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}
function statusLabel(s) {
  return { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', active: 'Đang họp', completed: 'Hoàn thành', cancelled: 'Đã hủy' }[s] || s;
}
function statusColor(s) {
  return {
    pending:   'text-yellow-700 bg-yellow-50 border border-yellow-200',
    confirmed: 'text-green-700  bg-green-50  border border-green-200',
    active:    'text-red-700    bg-red-50    border border-red-200',
    completed: 'text-gray-600   bg-gray-50   border border-gray-200',
    cancelled: 'text-gray-400   bg-gray-50   border border-gray-100',
  }[s] || 'text-gray-600';
}
function fmtDuration(minutes) {
  if (!minutes) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h${m > 0 ? m + 'm' : ''}` : `${m}m`;
}

function exportCSV(bookings) {
  const headers = ['STT', 'Phòng', 'Vị trí', 'Tiêu đề', 'Người đặt', 'Email', 'Ngày', 'Bắt đầu', 'Kết thúc', 'Thời lượng (phút)', 'Trạng thái'];
  const rows = bookings.map((b, i) => [
    i + 1,
    b.room?.name || '',
    b.room ? `${b.room.location} Tầng ${b.room.floor}` : '',
    b.title || '',
    b.user?.full_name || '',
    b.user?.email || '',
    toVNDateStr(b.start_time),
    toVNTimeStr(b.start_time),
    toVNTimeStr(b.end_time),
    Math.round((new Date(b.end_time) - new Date(b.start_time)) / 60000),
    statusLabel(b.status),
  ]);
  const csv = [headers, ...rows]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bao-cao-dat-phong-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── sub-components ── */
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

/* ── main page ── */
export default function AnalyticsPage() {
  const now = new Date();
  const [dateFrom, setDateFrom] = useState(
    () => new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA')
  );
  const [dateTo, setDateTo] = useState(
    () => new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString('en-CA')
  );
  const [metrics,      setMetrics]      = useState(null);
  const [report,       setReport]       = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery,  setSearchQuery]  = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { from: dateFrom, to: dateTo };
      const reportParams = { ...params, ...(statusFilter ? { status: statusFilter } : {}) };
      const [mRes, rRes] = await Promise.all([
        dashboardApi.getMetrics(params),
        dashboardApi.getReport(reportParams),
      ]);
      setMetrics(mRes.data.data);
      setReport(rRes.data.data.bookings || []);
    } catch (e) {
      setError(e.response?.data?.error?.message || 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredReport = searchQuery
    ? report.filter(b =>
        b.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.room?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : report;

  // Build full 7–21 peak hour array
  const peakHoursAll = Array.from({ length: 15 }, (_, i) => {
    const hour = i + 7;
    const found = metrics?.peak_hours?.find(h => h.hour === hour);
    return { hour, count: found?.count || 0 };
  });
  const maxPeakCount = Math.max(...peakHoursAll.map(h => h.count), 1);
  const maxRoomCount = Math.max(...(metrics?.top_rooms?.map(r => r.booking_count) || []), 1);
  const s = metrics?.summary;

  /* ── quick date presets ── */
  function setThisMonth() {
    setDateFrom(new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA'));
    setDateTo(new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString('en-CA'));
  }
  function setLastMonth() {
    setDateFrom(new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString('en-CA'));
    setDateTo(new Date(now.getFullYear(), now.getMonth(), 0).toLocaleDateString('en-CA'));
  }
  function setThisYear() {
    setDateFrom(new Date(now.getFullYear(), 0, 1).toLocaleDateString('en-CA'));
    setDateTo(new Date(now.getFullYear(), 11, 31).toLocaleDateString('en-CA'));
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">📊 Thống kê & Báo cáo</h1>
        <p className="text-gray-500 text-sm mt-0.5">Phân tích hiệu suất sử dụng phòng họp</p>
      </div>

      {/* ── Date range filter ── */}
      <div className="card p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Từ ngày</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field text-sm py-2" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Đến ngày</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field text-sm py-2" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { label: 'Tháng này',   fn: setThisMonth },
            { label: 'Tháng trước', fn: setLastMonth },
            { label: 'Năm nay',     fn: setThisYear  },
          ].map(({ label, fn }) => (
            <button key={label} onClick={fn}
              className="px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg hover:border-ghn-orange hover:text-ghn-orange transition-colors">
              {label}
            </button>
          ))}
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-400 ml-auto">
            <div className="w-4 h-4 border-2 border-ghn-orange border-t-transparent rounded-full animate-spin" />
            Đang tải...
          </div>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      {s && (
        <>
          {/* ── Summary metric cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon="📋"
              label="Tổng đặt phòng"
              value={s.total_bookings}
              sub={`${s.cancelled} đã hủy`}
            />
            <MetricCard
              icon="📈"
              label="Tỷ lệ sử dụng giờ làm việc"
              value={`${s.working_hours_utilization ?? s.occupancy_rate}%`}
              sub={`${s.total_rooms} phòng • ${s.working_days ?? 0} ngày T2–T6 • 8h30–18h (trừ 12–13h)`}
              color="bg-blue-50 text-blue-600"
            />
            <MetricCard
              icon="❌"
              label="Tỷ lệ hủy"
              value={`${s.no_show_rate}%`}
              sub={`${s.cancelled} lượt hủy`}
              color="bg-red-50 text-red-500"
            />
            <MetricCard
              icon="⏱️"
              label="Thời lượng TB"
              value={fmtDuration(s.avg_duration_minutes)}
              sub="mỗi cuộc họp"
              color="bg-green-50 text-green-600"
            />
          </div>

          {/* ── Status breakdown ── */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Chờ xác nhận', val: s.pending,   cls: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
              { label: 'Đã xác nhận',  val: s.confirmed, cls: 'text-green-700  bg-green-50  border-green-200'  },
              { label: 'Đang họp',     val: s.active,    cls: 'text-red-700    bg-red-50    border-red-200'    },
              { label: 'Hoàn thành',   val: s.completed, cls: 'text-gray-600   bg-gray-50   border-gray-200'   },
            ].map(({ label, val, cls }) => (
              <div key={label} className={`card p-3 text-center border ${cls}`}>
                <div className="text-xl font-bold">{val}</div>
                <div className="text-xs mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* ── Charts row ── */}
          <div className="grid lg:grid-cols-2 gap-5">

            {/* Top rooms */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">🏆 Top phòng được đặt nhiều nhất</h3>
                <span className="text-[11px] text-gray-400">badge = % sử dụng T2–T6</span>
              </div>
              {metrics.top_rooms.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Không có dữ liệu trong kỳ này</p>
              ) : (
                <div className="space-y-3.5">
                  {metrics.top_rooms.map((r, i) => (
                    <HBar
                      key={r.name}
                      label={`${i + 1}. ${r.name}`}
                      value={r.booking_count}
                      maxValue={maxRoomCount}
                      badge={r.utilization}
                      sub={`${r.location} • Tầng ${r.floor} • TB ${fmtDuration(r.avg_minutes)}/lần`}
                      colorClass={i === 0 ? 'bg-ghn-orange' : i === 1 ? 'bg-blue-400' : i === 2 ? 'bg-blue-300' : 'bg-gray-300'}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Peak hours */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">⏰ Giờ cao điểm</h3>
              <div className="space-y-1.5">
                {peakHoursAll.map(({ hour, count }) => (
                  <div key={hour} className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400 w-12 flex-shrink-0 text-right">
                      {hour < 12 ? `${hour}h SA` : hour === 12 ? '12h CH' : `${hour - 12}h CH`}
                    </span>
                    <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-ghn-blue rounded-full transition-all duration-500"
                        style={{ width: `${(count / maxPeakCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-gray-500 w-6 flex-shrink-0 text-right">
                      {count > 0 ? count : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Top users ── */}
          {metrics.top_users.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">👤 Top người đặt phòng</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">#</th>
                      <th className="text-left pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide px-2">Tên</th>
                      <th className="text-left pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide px-2">Email</th>
                      <th className="text-right pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide px-2">Đặt phòng</th>
                      <th className="text-right pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide px-2">Đã hủy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.top_users.map((u, i) => (
                      <tr key={u.email} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-2.5 text-gray-400 text-xs font-medium">{i + 1}</td>
                        <td className="py-2.5 px-2 font-medium text-gray-800">{u.full_name}</td>
                        <td className="py-2.5 px-2 text-gray-500 text-xs">{u.email}</td>
                        <td className="py-2.5 px-2 text-right font-bold text-gray-800">{u.total}</td>
                        <td className="py-2.5 px-2 text-right">
                          {u.cancelled > 0
                            ? <span className="text-red-500 font-medium">{u.cancelled}</span>
                            : <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Detailed report table ── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="text-sm font-semibold text-gray-700">
            📋 Chi tiết đặt phòng
            {filteredReport.length > 0 && (
              <span className="ml-2 text-xs font-normal text-gray-400">({filteredReport.length} bản ghi)</span>
            )}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="input-field text-sm py-1.5 pr-8"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="pending">Chờ xác nhận</option>
              <option value="confirmed">Đã xác nhận</option>
              <option value="active">Đang họp</option>
              <option value="completed">Hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
            </select>
            <input
              type="text"
              placeholder="Tìm phòng, tiêu đề, người đặt..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-field text-sm py-1.5 w-56"
            />
            <button
              onClick={() => exportCSV(filteredReport)}
              disabled={filteredReport.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-40"
            >
              ⬇️ Xuất CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-100">
                <th className="text-left pb-2.5 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">#</th>
                <th className="text-left pb-2.5 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Phòng</th>
                <th className="text-left pb-2.5 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Tiêu đề</th>
                <th className="text-left pb-2.5 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Người đặt</th>
                <th className="text-left pb-2.5 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Thời gian</th>
                <th className="text-right pb-2.5 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">TL</th>
                <th className="text-left pb-2.5 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filteredReport.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-gray-400 py-10">
                    {loading ? 'Đang tải...' : 'Không có dữ liệu trong kỳ này'}
                  </td>
                </tr>
              ) : filteredReport.map((b, i) => {
                const dur = Math.round((new Date(b.end_time) - new Date(b.start_time)) / 60000);
                return (
                  <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-2 text-gray-400 text-xs">{i + 1}</td>
                    <td className="py-3 px-2">
                      <div className="font-medium text-gray-800">{b.room?.name || '—'}</div>
                      <div className="text-xs text-gray-400">{b.room ? `${b.room.location} • T.${b.room.floor}` : ''}</div>
                    </td>
                    <td className="py-3 px-2 max-w-[200px]">
                      <div className="truncate font-medium text-gray-700">{b.title}</div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="text-gray-700">{b.user?.full_name || '—'}</div>
                      <div className="text-xs text-gray-400">{b.user?.email}</div>
                    </td>
                    <td className="py-3 px-2 whitespace-nowrap">
                      <div className="text-gray-700">{toVNDateStr(b.start_time)}</div>
                      <div className="text-xs text-gray-400">{toVNTimeStr(b.start_time)} – {toVNTimeStr(b.end_time)}</div>
                    </td>
                    <td className="py-3 px-2 text-right font-medium text-gray-700">{fmtDuration(dur)}</td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(b.status)}`}>
                        {statusLabel(b.status)}
                      </span>
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
