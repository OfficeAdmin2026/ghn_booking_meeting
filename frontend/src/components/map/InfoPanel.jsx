import { motion } from 'framer-motion';
import {
  XMarkIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  TvIcon,
  FilmIcon,
  VideoCameraIcon,
  MicrophoneIcon,
  CheckIcon,
  ClockIcon,
  PencilIcon,
  ArrowUturnLeftIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/20/solid';
import { useAuth } from '../../contexts/AuthContext';

// Trùng với RoomCard.jsx's amenityIcons cho 4 loại tiện ích thật trong DB —
// nhân bản có chủ đích (thay vì import từ RoomCard) để không đụng vào file
// của luồng đặt phòng hiện có.
const AMENITY_ICONS = {
  TV: TvIcon,
  Projector: FilmIcon,
  'Video Conference': VideoCameraIcon,
  'Audio Conference': MicrophoneIcon,
};

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function InfoPanel({
  room,
  bookingsToday,
  occupiedInfo,
  onClose,
  onBook,
  hasCustomPath,
  hasCustomShape,
  activeDrawTool,
  drawingPoints,
  onStartDrawPath,
  onStartDrawShape,
  onUndoPoint,
  onClearDraw,
  onCancelDraw,
  onSavePath,
  onDeletePath,
  onDeleteShape,
  savingPath,
  savingShape,
}) {
  const { isAdmin } = useAuth();
  if (!room) return null;

  const sortedBookings = [...(bookingsToday || [])]
    .filter((b) => b.status !== 'cancelled')
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'tween', duration: 0.25 }}
      className="fixed top-16 right-0 bottom-0 w-full sm:w-48 bg-white shadow-xl border-l border-gray-100 z-40 overflow-y-auto"
    >
      <div className="px-3 py-3 border-b border-gray-100 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h2 className="text-sm font-bold text-gray-900 leading-tight">{room.name}</h2>
            {room.is_vip && (
              <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
                <StarIcon className="w-3 h-3" /> VIP
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">{room.code}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0">
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="p-3 space-y-3">
        <div className="flex flex-col gap-1 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <MapPinIcon className="w-3.5 h-3.5 shrink-0" /> {room.location}
          </span>
          <span className="flex items-center gap-1">
            <BuildingOfficeIcon className="w-3.5 h-3.5 shrink-0" /> Tầng {room.floor}
          </span>
          <span className="text-ghn-orange font-semibold">{room.capacity} người</span>
        </div>

        {(room.amenities || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {room.amenities.map((a, i) => {
              const Icon = AMENITY_ICONS[a.amenity] || CheckIcon;
              return (
                <span key={i} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  <Icon className="w-3.5 h-3.5" /> {a.amenity}
                </span>
              );
            })}
          </div>
        )}

        {occupiedInfo.occupied ? (
          <div className="bg-red-50 border border-red-200 rounded-lg px-2.5 py-2">
            <p className="text-xs font-semibold text-red-700">🔴 Đang sử dụng</p>
            <p className="text-xs text-red-600 mt-1">
              {formatTime(occupiedInfo.currentBooking.start_time)} – {formatTime(occupiedInfo.currentBooking.end_time)}
            </p>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg px-2.5 py-2">
            <p className="text-xs font-semibold text-green-700">🟢 Trống</p>
          </div>
        )}

        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Lịch hôm nay</h3>
          {sortedBookings.length === 0 ? (
            <p className="text-xs text-gray-400">Chưa có lịch trong hôm nay</p>
          ) : (
            <div className="space-y-1.5">
              {sortedBookings.map((b) => (
                <div key={b.id} className="flex items-start gap-1.5 text-xs border border-gray-100 rounded-lg px-2 py-1.5">
                  <ClockIcon className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 truncate">{b.title}</p>
                    <p className="text-xs text-gray-500">
                      {formatTime(b.start_time)} – {formatTime(b.end_time)}
                      {b.user?.full_name ? ` · ${b.user.full_name}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!occupiedInfo.occupied && (
          <button onClick={() => onBook(room)} className="btn-primary w-full">
            Đặt phòng
          </button>
        )}

        {isAdmin && (
          <div className="border-t border-gray-100 pt-3">
            {!activeDrawTool ? (
              <div className="space-y-1.5">
                <div className="flex gap-1.5">
                  <button
                    onClick={onStartDrawPath}
                    className="flex-1 inline-flex flex-col items-center justify-center gap-0.5 text-xs font-medium text-ghn-blue bg-ghn-blue-light hover:bg-blue-100 rounded-lg px-1.5 py-1.5 leading-tight text-center transition-colors"
                  >
                    <PencilIcon className="w-3.5 h-3.5" /> {hasCustomPath ? 'Vẽ lại' : 'Vẽ chỉ dẫn'}
                  </button>
                  {hasCustomPath && (
                    <button
                      onClick={onDeletePath}
                      disabled={savingPath}
                      title="Xoá đường chỉ dẫn"
                      className="shrink-0 px-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-40 transition-colors"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={onStartDrawShape}
                    className="flex-1 inline-flex flex-col items-center justify-center gap-0.5 text-xs font-medium text-ghn-orange bg-ghn-orange-light hover:bg-orange-100 rounded-lg px-1.5 py-1.5 leading-tight text-center transition-colors"
                  >
                    <PencilIcon className="w-3.5 h-3.5" /> {hasCustomShape ? 'Vẽ lại khung' : 'Vẽ khung phòng'}
                  </button>
                  {hasCustomShape && (
                    <button
                      onClick={onDeleteShape}
                      disabled={savingShape}
                      title="Xoá khung phòng"
                      className="shrink-0 px-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-40 transition-colors"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ) : activeDrawTool === 'shape' ? (
              <div className="space-y-1.5">
                <p className="text-xs text-gray-500">
                  Kéo chuột trên bản đồ để vẽ khung phòng. Khung sẽ được lưu tự động.
                </p>
                <button
                  onClick={onCancelDraw}
                  className="w-full text-xs font-medium text-gray-500 border border-gray-200 rounded-lg px-2 py-1.5 hover:bg-gray-50 transition-colors"
                >
                  Huỷ
                </button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <p className="text-xs text-gray-500">
                  Nhấp vào bản đồ để thêm điểm ({drawingPoints?.length || 0} điểm). Tự căn vuông góc 90°.
                </p>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={onUndoPoint}
                    disabled={!drawingPoints?.length}
                    className="inline-flex items-center justify-center gap-1 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-2 py-1.5 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  >
                    <ArrowUturnLeftIcon className="w-3.5 h-3.5" /> Hoàn tác
                  </button>
                  <button
                    onClick={onClearDraw}
                    disabled={!drawingPoints?.length}
                    className="inline-flex items-center justify-center gap-1 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-2 py-1.5 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  >
                    <TrashIcon className="w-3.5 h-3.5" /> Xoá hết
                  </button>
                  <button
                    onClick={onCancelDraw}
                    className="text-xs font-medium text-gray-500 border border-gray-200 rounded-lg px-2 py-1.5 hover:bg-gray-50 transition-colors"
                  >
                    Huỷ
                  </button>
                  <button
                    onClick={onSavePath}
                    disabled={(drawingPoints?.length || 0) < 2 || savingPath}
                    className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-white bg-ghn-orange rounded-lg px-2 py-1.5 hover:bg-ghn-orange-dark disabled:opacity-40 transition-colors"
                  >
                    <CheckIcon className="w-3.5 h-3.5" />{' '}
                    {savingPath ? 'Đang lưu...' : 'Lưu'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
