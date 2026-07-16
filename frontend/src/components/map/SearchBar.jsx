import { useMemo, useState } from 'react';
import { MagnifyingGlassIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';
import { POI_META } from './poiMeta';

const MAX_RESULTS = 8;

/**
 * Tìm trên toàn bộ toà nhà (không chỉ tầng đang xem) — nếu kết quả là phòng
 * ở tầng khác, OfficeMapPage sẽ tự chuyển tầng rồi focus vào phòng đó.
 */
export default function SearchBar({ rooms, pois, onSelect, inputRef }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const roomMatches = rooms
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
      .map((r) => ({ kind: 'room', id: r.code, label: r.name, sub: `${r.location} · Tầng ${r.floor}`, room: r }));

    const poiMatches = pois
      .filter((p) => p.label.toLowerCase().includes(q) || p.type.toLowerCase().includes(q))
      .map((p) => ({ kind: 'poi', id: p.id, label: p.label, sub: POI_META[p.type]?.label, poi: p }));

    return [...roomMatches, ...poiMatches].slice(0, MAX_RESULTS);
  }, [query, rooms, pois]);

  const handleSelect = (result) => {
    onSelect(result);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="relative w-full sm:w-80">
      <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Tìm phòng, phòng ban, pantry, toilet, máy in..."
        className="input-field pl-9 w-full text-sm"
      />

      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden max-h-72 overflow-y-auto">
          {results.map((r) => {
            const Icon = r.kind === 'room' ? BuildingOffice2Icon : POI_META[r.poi.type]?.Icon || BuildingOffice2Icon;
            const color = r.kind === 'room' ? '#FF6C0A' : POI_META[r.poi.type]?.color;
            return (
              <button
                key={`${r.kind}-${r.id}`}
                type="button"
                onMouseDown={() => handleSelect(r)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 transition-colors duration-150"
              >
                <Icon className="w-4 h-4 shrink-0" style={{ color }} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{r.label}</p>
                  {r.sub && <p className="text-xs text-gray-400 truncate">{r.sub}</p>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
