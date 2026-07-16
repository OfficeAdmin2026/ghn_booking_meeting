import { FLOORS_BY_LOCATION, DEFAULT_LOCATION, DEFAULT_FLOOR } from '../../data/officeMapData';

const LOCATIONS = Object.keys(FLOORS_BY_LOCATION);

export default function FloorSelector({ location, floor, onChange }) {
  const floors = FLOORS_BY_LOCATION[location] || [];

  const handleLocationChange = (nextLocation) => {
    if (nextLocation === location) return;
    const nextFloors = FLOORS_BY_LOCATION[nextLocation] || [];
    const defaultFloor = nextLocation === DEFAULT_LOCATION ? DEFAULT_FLOOR : nextFloors[0];
    onChange({ location: nextLocation, floor: defaultFloor });
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
        {LOCATIONS.map((loc) => (
          <button
            key={loc}
            type="button"
            onClick={() => handleLocationChange(loc)}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ${
              loc === location
                ? 'bg-ghn-blue text-white'
                : 'bg-white text-gray-600 hover:bg-ghn-blue-light'
            }`}
          >
            {loc}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5">
        {floors.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onChange({ location, floor: f })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-200 border ${
              f === floor
                ? 'bg-ghn-orange text-white border-ghn-orange shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-ghn-orange hover:text-ghn-orange'
            }`}
          >
            Tầng {f}
          </button>
        ))}
      </div>
    </div>
  );
}
