import { FILTER_OPTIONS } from '../../data/officeMapData';

// Tầng đã có ảnh sơ đồ thật (background) thì icon/note các loại POI đã có
// sẵn trong ảnh — chỉ còn cần lọc hiện/ẩn phòng họp.
const ROOM_ONLY_OPTIONS = FILTER_OPTIONS.filter((o) => o.key === 'room');

export default function FilterPanel({ filters, onChange, hasBackground }) {
  const toggle = (key) => onChange({ ...filters, [key]: !filters[key] });
  const options = hasBackground ? ROOM_ONLY_OPTIONS : FILTER_OPTIONS;

  return (
    <div className="flex flex-wrap gap-2">
      {options.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => toggle(key)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-200 border ${
            filters[key]
              ? 'bg-ghn-orange text-white border-ghn-orange shadow-sm'
              : 'bg-white text-gray-500 border-gray-200 hover:border-ghn-orange hover:text-ghn-orange'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
