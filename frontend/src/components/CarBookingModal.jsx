import { useEffect, useState } from 'react';
import { carBookingsApi } from '../api';
import { XMarkIcon, ClockIcon, ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline';

function toVNTimeStr(isoStr) {
  return new Date(isoStr).toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false,
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
    timeZone: 'Asia/Ho_Chi_Minh', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function CarBookingModal({ car, booking, startTime, endTime, onClose, onSaved }) {
  const isEdit = !!booking;
  const initialStart = booking ? booking.start_time : startTime;
  const initialEnd = booking ? booking.end_time : endTime;
  const dateStr = toVNDateStr(initialStart);

  const [startInput, setStartInput] = useState(() => toVNTimeStr(initialStart));
  const [endInput, setEndInput] = useState(() => toVNTimeStr(initialEnd));
  const [title, setTitle] = useState(booking?.title || '');
  const [notes, setNotes] = useState(booking?.notes || '');
  const [cancelMessage, setCancelMessage] = useState('');
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const actualStart = vnToISO(dateStr, startInput);
  const actualEnd = vnToISO(dateStr, endInput);
  const duration = Math.round((new Date(actualEnd) - new Date(actualStart)) / 60000);
  const timeValid = duration > 0;

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!timeValid) { setError('Giờ kết thúc phải sau giờ bắt đầu'); return; }
    setLoading(true);
    try {
      if (isEdit) {
        await carBookingsApi.update(booking.id, {
          title, notes, start_time: actualStart, end_time: actualEnd,
        });
      } else {
        await carBookingsApi.create({
          car_id: car.id, title, notes, start_time: actualStart, end_time: actualEnd,
        });
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Lưu lịch đặt xe thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    setError('');
    setLoading(true);
    try {
      await carBookingsApi.cancel(booking.id, cancelMessage || null);
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Huỷ lịch đặt xe thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Sửa lịch đặt xe' : 'Đặt xe công ty'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="rounded-xl border border-ghn-orange bg-orange-50 p-4">
            <h3 className="font-bold text-gray-900">{car?.name || booking?.car?.name}</h3>
            <div className="mt-3 pt-3 border-t border-orange-200">
              <p className="text-xs text-gray-500 mb-2 font-medium">{fmtDate(initialStart)}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1 text-[10px] text-gray-400 mb-1"><ClockIcon className="w-3 h-3" /> Bắt đầu</label>
                  <input type="time" value={startInput} onChange={(e) => setStartInput(e.target.value)}
                    className="w-full text-sm font-medium bg-white border border-orange-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-ghn-orange" />
                </div>
                <div>
                  <label className="flex items-center gap-1 text-[10px] text-gray-400 mb-1"><ClockIcon className="w-3 h-3" /> Kết thúc</label>
                  <input type="time" value={endInput} onChange={(e) => setEndInput(e.target.value)}
                    className={`w-full text-sm font-medium bg-white border rounded-lg px-2 py-1.5 focus:outline-none ${
                      timeValid ? 'border-orange-200 focus:border-ghn-orange' : 'border-red-300 focus:border-red-500'
                    }`} />
                </div>
              </div>
              {!timeValid && (
                <p className="mt-2 text-xs text-red-500 font-semibold flex items-center gap-1">
                  <ExclamationTriangleIcon className="w-3.5 h-3.5" /> Giờ kết thúc phải sau giờ bắt đầu
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
          )}

          {!showCancelForm ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Mục đích / Người yêu cầu <span className="text-red-500">*</span>
                </label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  className="input-field" placeholder="VD: Chị Lan - Đi khách" required maxLength={200} autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ghi chú</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  className="input-field resize-none" rows={3} placeholder="Điểm đến, số điện thoại liên hệ..." />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={loading || !timeValid} className="btn-primary flex-1">
                  {loading ? 'Đang lưu...' : (isEdit ? 'Lưu thay đổi' : 'Xác nhận đặt xe')}
                </button>
                {isEdit && (
                  <button type="button" onClick={() => setShowCancelForm(true)}
                    className="inline-flex items-center gap-1.5 px-4 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                    <TrashIcon className="w-4 h-4" /> Huỷ lịch
                  </button>
                )}
                <button type="button" onClick={onClose} className="btn-ghost px-5">Đóng</button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Bạn có chắc muốn huỷ lịch đặt xe này?</p>
              <textarea value={cancelMessage} onChange={(e) => setCancelMessage(e.target.value)}
                className="input-field resize-none" rows={2} placeholder="Lý do huỷ (không bắt buộc)" />
              <div className="flex gap-3">
                <button type="button" onClick={handleCancelBooking} disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors disabled:opacity-50">
                  {loading ? 'Đang huỷ...' : 'Xác nhận huỷ'}
                </button>
                <button type="button" onClick={() => setShowCancelForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-sm transition-colors">
                  Quay lại
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
