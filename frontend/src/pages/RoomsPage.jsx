import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomsApi } from '../api';
import RoomCard from '../components/RoomCard';
import {
  ClockIcon,
  UsersIcon,
  MagnifyingGlassIcon,
  FaceFrownIcon,
} from '@heroicons/react/24/outline';

function toLocalDateTimeInput(date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function roundUpToNextHalfHour(date = new Date()) {
  const d = new Date(date);
  const minutes = d.getMinutes();
  const roundedMinutes = minutes < 30 ? 30 : 60;
  d.setMinutes(roundedMinutes, 0, 0);
  return d;
}

export default function RoomsPage() {
  const navigate = useNavigate();

  const defaultStart = roundUpToNextHalfHour();
  const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000);

  const [startTime, setStartTime] = useState(toLocalDateTimeInput(defaultStart));
  const [endTime, setEndTime] = useState(toLocalDateTimeInput(defaultEnd));
  const [capacity, setCapacity] = useState('');
  const [rooms, setRooms] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const params = {
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
      };
      if (capacity) params.capacity = Number(capacity);
      const res = await roomsApi.search(params);
      setRooms(res.data.data.rooms || []);
      setSearched(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Lỗi tìm kiếm');
    } finally {
      setLoading(false);
    }
  };

  const handleBook = (room) => {
    navigate('/calendar', {
      state: {
        room,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      },
    });
  };

  const duration = startTime && endTime
    ? Math.round((new Date(endTime) - new Date(startTime)) / 60000)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tìm phòng họp</h1>
        <p className="text-gray-500 mt-1">Chọn thời gian và sức chứa để tìm phòng trống</p>
      </div>

      {/* Search form */}
      <div className="card p-5 mb-6">
        <form onSubmit={handleSearch}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1.5">
                <ClockIcon className="w-4 h-4" /> Bắt đầu
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1.5">
                <ClockIcon className="w-4 h-4" /> Kết thúc
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1.5">
                <UsersIcon className="w-4 h-4" /> Số người (tối thiểu)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="input-field"
                placeholder="Bất kỳ"
              />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={loading} className="btn-primary w-full inline-flex items-center justify-center gap-1.5">
                {loading ? 'Đang tìm...' : (<><MagnifyingGlassIcon className="w-4 h-4" /> Tìm phòng</>)}
              </button>
            </div>
          </div>

          {duration > 0 && (
            <p className="text-sm text-gray-500">
              Thời lượng: <span className="font-medium text-ghn-orange">{Math.floor(duration / 60)}h{duration % 60 > 0 ? ` ${duration % 60}m` : ''}</span>
            </p>
          )}
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {searched && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">
              {rooms.length > 0
                ? `${rooms.length} phòng trống`
                : 'Không có phòng trống'}
            </h2>
          </div>

          {rooms.length === 0 ? (
            <div className="card p-12 text-center">
              <FaceFrownIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Không tìm thấy phòng trống</p>
              <p className="text-sm text-gray-400 mt-1">Thử chọn thời gian hoặc sức chứa khác</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((room) => (
                <RoomCard key={room.id} room={room} onBook={handleBook} />
              ))}
            </div>
          )}
        </div>
      )}

      {!searched && (
        <div className="card p-12 text-center border-dashed">
          <MagnifyingGlassIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Nhập thời gian họp và nhấn "Tìm phòng" để xem các phòng trống</p>
        </div>
      )}
    </div>
  );
}
