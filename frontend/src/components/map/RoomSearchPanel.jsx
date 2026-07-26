import { useMemo, useState } from 'react';
import { MagnifyingGlassIcon, XMarkIcon, MapPinIcon, PhotoIcon, TrashIcon } from '@heroicons/react/24/outline';
import { BuildingOffice2Icon } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/20/solid';
import FloorSelector from './FloorSelector';

export default function RoomSearchPanel({
  rooms,
  floorRooms,
  statusByCode,   // { [room.id]: 'available' | 'occupied' }
  selectedCode,
  onSelect,
  inputRef,
  floor,
  location,
  onFloorChange,
  isAdmin,
  onUploadModal,
  onDeleteAllPaths,
  deletingAllPaths,
  hasAnyPath,
  onDeleteAllShapes,
  deletingAllShapes,
  hasAnyShape,
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
      {/* Floor selector */}
      <div className="p-3 border-b border-gray-100 space-y-2">
        <FloorSelector location={location} floor={floor} onChange={onFloorChange} />
        {isAdmin && (
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={onUploadModal}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:border-ghn-orange hover:text-ghn-orange transition-colors"
            >
              <PhotoIcon className="w-3.5 h-3.5" /> Cập nhật sơ đồ tầng
            </button>
            {hasAnyPath && (
              <button
                type="button"
                onClick={onDeleteAllPaths}
                disabled={deletingAllPaths}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
              >
                <TrashIcon className="w-3.5 h-3.5" /> {deletingAllPaths ? 'Đang xoá...' : 'Xoá tất cả chỉ dẫn'}
              </button>
            )}
            {hasAnyShape && (
              <button
                type="button"
                onClick={onDeleteAllShapes}
                disabled={deletingAllShapes}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
              >
                <TrashIcon className="w-3.5 h-3.5" /> {deletingAllShapes ? 'Đang xoá...' : 'Xoá tất cả khung phòng'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Search input */}
      <div className="p-3 border-b border-gray-100">
        <div className="relative">
          <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm tên, phòng họp..."
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
      <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 shrink-0">
        <p className="text-xs text-gray-400">
          {query
            ? `${displayRooms.length} kết quả`
            : `Tầng ${floor} · ${floorRooms.length} phòng`}
        </p>
      </div>

      {/* Room list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {query && displayRooms.length === 0 && (
          <p className="px-3 py-8 text-sm text-gray-400 text-center">Không tìm thấy phòng</p>
        )}
        {displayRooms.map(({ room, crossFloor }) => {
          const status = statusByCode[room.id];
          const isSelected = room.code === selectedCode;
          return (
            <button
              key={room.id}
              type="button"
              onClick={() => onSelect(room)}
              className={`w-full flex items-start gap-3 px-3 py-3 text-left transition-colors duration-150 border-b border-gray-50 last:border-0 ${
                isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              {/* Room icon */}
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0 mt-0.5">
                <BuildingOffice2Icon className="w-4 h-4 text-ghn-orange" />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate leading-tight">{room.name}</p>
                  {room.is_vip && <StarIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 truncate leading-tight">
                  {crossFloor ? room.location : 'Phòng họp'}
                </p>
                <div className="mt-1.5">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    <MapPinIcon className="w-3 h-3" /> Tầng {room.floor}
                  </span>
                </div>
              </div>

              {/* Status dot */}
              <span
                className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                  status === 'occupied' ? 'bg-red-500' : 'bg-green-500'
                }`}
                title={status === 'occupied' ? 'Đang họp' : 'Trống'}
              />
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="border-t border-gray-100 p-3 shrink-0">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" /> Trống
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" /> Đang họp
          </div>
        </div>
      </div>
    </div>
  );
}
