import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { bookingsApi } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeftIcon, ClockIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

function formatDateTimeReadable(dt) {
  return new Date(dt).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function BookRoomPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { room, startTime, endTime } = location.state || {};

  const [title, setTitle] = useState('');
  const [participants, setParticipants] = useState('');
  const [notes, setNotes] = useState('');
  const [recurring, setRecurring] = useState('none');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!room || !startTime || !endTime) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 mb-4">Không có thông tin phòng. Vui lòng tìm phòng trước.</p>
        <button onClick={() => navigate('/rooms')} className="btn-primary">
          Tìm phòng
        </button>
      </div>
    );
  }

  const duration = Math.round((new Date(endTime) - new Date(startTime)) / 60000);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await bookingsApi.create({
        room_id: room.id,
        title,
        participants_count: Number(participants),
        start_time: startTime,
        end_time: endTime,
        notes,
        recurring,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Đặt phòng thất bại');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="card p-10">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto mb-4">
            <CheckCircleIcon className="w-9 h-9" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Đặt phòng thành công!</h2>
          <p className="text-gray-500 text-sm mb-6">
            Phòng <strong>{room.name}</strong> đã được đặt. Bạn có thể xem lịch đặt trong mục "Lịch đặt của tôi".
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('/bookings')} className="btn-primary">
              Xem lịch đặt
            </button>
            <button onClick={() => navigate('/rooms')} className="btn-secondary">
              Đặt phòng khác
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-3"
        >
          <ArrowLeftIcon className="w-4 h-4" /> Quay lại
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Đặt phòng họp</h1>
      </div>

      {/* Room info */}
      <div className="card p-5 mb-6 border-l-4 border-ghn-orange">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
              {room.name}
              {room.is_vip && (
                <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">VIP</span>
              )}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{room.location} · Tầng {room.floor}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-ghn-orange">{room.capacity}</p>
            <p className="text-xs text-gray-500">người tối đa</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100 grid sm:grid-cols-2 gap-2 text-sm text-gray-600">
          <div>
            <span className="text-gray-400 inline-flex items-center gap-1"><ClockIcon className="w-4 h-4" /> Bắt đầu:</span>{' '}
            <span className="font-medium">{formatDateTimeReadable(startTime)}</span>
          </div>
          <div>
            <span className="text-gray-400 inline-flex items-center gap-1"><ClockIcon className="w-4 h-4" /> Kết thúc:</span>{' '}
            <span className="font-medium">{formatDateTimeReadable(endTime)}</span>
          </div>
        </div>
        <p className="mt-2 text-sm text-ghn-orange font-medium inline-flex items-center gap-1">
          <ClockIcon className="w-4 h-4" /> Thời lượng: {Math.floor(duration / 60)}h{duration % 60 > 0 ? ` ${duration % 60}m` : ''}
        </p>
      </div>

      {/* Booking form */}
      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
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
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Số người tham gia <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max={room.capacity}
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              className="input-field"
              placeholder={`Tối đa ${room.capacity} người`}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Lặp lại
            </label>
            <select
              value={recurring}
              onChange={(e) => setRecurring(e.target.value)}
              className="input-field"
            >
              <option value="none">Không lặp lại</option>
              <option value="daily">Hàng ngày</option>
              <option value="weekly">Hàng tuần</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Ghi chú
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field resize-none"
              rows={3}
              placeholder="Thiết bị cần chuẩn bị, yêu cầu đặc biệt..."
              maxLength={500}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary flex-1 py-3 inline-flex items-center justify-center gap-1.5">
              {loading ? 'Đang đặt...' : (<><CheckCircleIcon className="w-5 h-5" /> Xác nhận đặt phòng</>)}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-ghost px-6"
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
