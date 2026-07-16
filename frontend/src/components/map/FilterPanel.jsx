import { FILTER_OPTIONS } from '../../data/officeMapData';

export default function FilterPanel({ filters, onChange }) {
  const toggle = (key) => onChange({ ...filters, [key]: !filters[key] });

  return (
    <div className="flex flex-wrap gap-2">
      {FILTER_OPTIONS.map(({ key, label }) => (
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
