import { useMemo, useState } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/20/solid';
import { POI_META } from './poiMeta';

const ROOM_STATUS_LEGEND = [
  { label: 'Trống', color: '#22C55E' },
  { label: 'Đang họp', color: '#EF4444' },
];

export default function RoomSearchPanel({
  rooms,
  floorRooms,
  statusByCode,   // { [room.id]: 'available' | 'occupied' }
  selectedCode,
  onSelect,
  hasBackground,
  inputRef,
}) {
  const [query, setQuery] = useState('');

  const displayRooms = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return floorRooms.map((r) => ({ room: r, crossFloor: false }));
    return rooms
      .filter((r) => {
        const amenityMatch = (r.amenities || []).some((a) => a.amenity.toLowerCase().includes(q));
        return (
          r.name.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q) ||
          r.floor.toLowerCase().includes(q) ||
          amenityMatch
        );
      })
      .map((r) => ({ room: r, crossFloor: !floorRooms.some((fr) => fr.id === r.id) }));
  }, [query, rooms, floorRooms]);

  return (
    <div className="flex flex-col w-56 sm:w-64 shrink-0 bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Search input */}
      <div className="p-3 border-b border-gray-100">
        <div className="relative">
          <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm phòng họp..."
            className="input-field pl-9 pr-8 w-full text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Section label */}
      <div className="px-3 py-2 border-b border-gray-50 shrink-0">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {query ? `${displayRooms.length} kết quả` : `${floorRooms.length} phòng tầng này`}
        </p>
      </div>

      {/* Room list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {query && displayRooms.length === 0 && (
          <p className="px-3 py-6 text-sm text-gray-400 text-center">Không tìm thấy phòng</p>
        )}
        {displayRooms.map(({ room, crossFloor }) => {
          const status = statusByCode[room.id];
          const isSelected = room.code === selectedCode;
          return (
            <button
              key={room.id}
              type="button"
              onClick={() => onSelect(room)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors duration-150 border-b border-gray-50 last:border-0 ${
                isSelected
                  ? 'bg-orange-50 border-l-2 border-l-ghn-orange'
                  : 'hover:bg-gray-50'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${
                  status === 'occupied' ? 'bg-red-500' : 'bg-green-500'
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate leading-tight">{room.name}</p>
                  {room.is_vip && <StarIcon className="w-3 h-3 text-amber-500 shrink-0" />}
                </div>
                <p className="text-xs text-gray-400 truncate leading-tight mt-0.5">
                  {crossFloor ? `${room.location} · Tầng ${room.floor}` : `${room.capacity} người`}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="border-t border-gray-100 p-3 shrink-0">
        <p className="text-xs font-semibold text-gray-500 mb-2">Chú thích</p>
        <div className="space-y-1.5">
          {ROOM_STATUS_LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-xs text-gray-600">
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
              {item.label}
            </div>
          ))}
          {!hasBackground && (
            <>
              <div className="border-t border-gray-100 my-1" />
              {Object.entries(POI_META).map(([type, meta]) => (
                <div key={type} className="flex items-center gap-2 text-xs text-gray-600">
                  <meta.Icon className="w-3.5 h-3.5 shrink-0" style={{ color: meta.color }} />
                  {meta.label}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
