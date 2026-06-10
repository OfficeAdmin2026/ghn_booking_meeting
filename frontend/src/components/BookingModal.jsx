import { useState, useEffect } from 'react';
import { bookingsApi } from '../api';

// VN timezone helpers
function toVNTimeStr(isoStr) {
  return new Date(isoStr).toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}
function toVNDateStr(isoStr) {
  return new Date(isoStr).toLocaleDateString('sv', { timeZone: 'Asia/Ho_Chi_Minh' });
}
function vnToISO(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}:00+07:00`).toISOString();
}
function fmtDate(isoStr) {
  return new Date(isoStr).toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}
function fmtTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

export default function BookingModal({ room, startTime, endTime, onClose, onSuccess }) {
  const dateStr = toVNDateStr(startTime); // fixed date, can't change from modal
  const [startInput, setStartInput] = useState(() => toVNTimeStr(startTime));
  const [endInput,   setEndInput]   = useState(() => toVNTimeStr(endTime));
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const actualStart = vnToISO(dateStr, startInput);
  const actualEnd   = vnToISO(dateStr, endInput);
  const duration    = Math.round((new Date(actualEnd) - new Date(actualStart)) / 60000);
  const timeValid   = duration > 0;
  const isPastStart = new Date(actualStart) <= new Date();

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent background scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!timeValid) { setError('Giờ kết thúc phải sau giờ bắt đầu'); setLoading(false); return; }
      if (isPastStart) { setError('Không thể đặt phòng trong quá khứ'); setLoading(false); return; }
      await bookingsApi.create({
        room_id: room.id,
        title,
        start_time: actualStart,
        end_time: actualEnd,
        notes,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Đặt phòng thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-gray-900">Đặt phòng họp</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Success state */}
          {success ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">✅</div>
              <h3 className="text-lg font-bold text-gray-800 mb-1">Đặt phòng thành công!</h3>
              <p className="text-sm text-gray-500 mb-4">
                Phòng <strong>{room.name}</strong> đã được đặt từ{' '}
                <strong>{fmtTime(actualStart)}</strong> đến <strong>{fmtTime(actualEnd)}</strong>.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 text-left">
                <p className="text-sm font-semibold text-amber-700 mb-1">⏰ Lưu ý check-in</p>
                <p className="text-sm text-amber-600">
                  Vui lòng có mặt tại phòng trong vòng <strong>10 phút</strong> kể từ giờ đặt (<strong>{fmtTime(actualStart)}</strong>).
                  Sau thời gian này, phòng có thể được sử dụng cho các cuộc họp khác.
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => { onSuccess(); onClose(); }}
                  className="btn-primary"
                >
                  Đã hiểu
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Room info card */}
              <div className="rounded-xl border border-ghn-orange bg-orange-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 truncate">{room.name}</h3>

                      {room.is_vip && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">VIP</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {room.location}{room.floor ? ` · Tầng ${room.floor}` : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-bold text-ghn-orange leading-none">{room.capacity}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">người tối đa</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-orange-200">
                  <p className="text-xs text-gray-500 mb-2 font-medium">{fmtDate(startTime)}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">🕐 Bắt đầu</label>
                      <input
                        type="time"
                        value={startInput}
                        onChange={(e) => setStartInput(e.target.value)}
                        className="w-full text-sm font-medium bg-white border border-orange-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-ghn-orange"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1">🕑 Kết thúc</label>
                      <input
                        type="time"
                        value={endInput}
                        onChange={(e) => setEndInput(e.target.value)}
                        className={`w-full text-sm font-medium bg-white border rounded-lg px-2 py-1.5 focus:outline-none ${
                          timeValid ? 'border-orange-200 focus:border-ghn-orange' : 'border-red-300 focus:border-red-500'
                        }`}
                      />
                    </div>
                  </div>
                  {isPastStart ? (
                    <p className="mt-2 text-xs text-red-500 font-semibold">⚠ Không thể đặt phòng trong quá khứ</p>
                  ) : timeValid ? (
                    <p className="mt-2 text-xs text-ghn-orange font-semibold">
                      ⏱ Thời lượng: {Math.floor(duration / 60)}h{duration % 60 > 0 ? ` ${duration % 60}m` : ''}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-red-500 font-semibold">⚠ Giờ kết thúc phải sau giờ bắt đầu</p>
                  )}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tên cuộc họp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input-field"
                    placeholder="VD: Họp team product tuần này"
                    required
                    maxLength={200}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Ghi chú</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="input-field resize-none"
                    rows={3}
                    placeholder="Thiết bị cần chuẩn bị, yêu cầu đặc biệt..."
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={loading || !timeValid || isPastStart}
                    className="btn-primary flex-1"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Đang đặt...
                      </span>
                    ) : (
                      '✅ Xác nhận đặt phòng'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-ghost px-5"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
