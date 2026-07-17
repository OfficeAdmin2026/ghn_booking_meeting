import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { POI_META } from './poiMeta';

const ROOM_STATUS_LEGEND = [
  { label: 'Trống', color: '#22C55E' },
  { label: 'Đang họp', color: '#EF4444' },
];

export default function Legend({ hasBackground }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="absolute bottom-4 left-4 z-10 card p-3 max-w-[220px] shadow-md">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between w-full text-xs font-semibold text-gray-600 sm:pointer-events-none"
      >
        Chú thích
        <span className="sm:hidden">
          {expanded ? <ChevronDownIcon className="w-3.5 h-3.5" /> : <ChevronUpIcon className="w-3.5 h-3.5" />}
        </span>
      </button>

      {expanded && (
        <div className="mt-2 space-y-1.5">
          {ROOM_STATUS_LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-xs text-gray-600">
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
              {item.label}
            </div>
          ))}
          {/* Tầng đã có ảnh sơ đồ thật thì icon/note các loại POI đã có sẵn trong ảnh */}
          {!hasBackground && (
            <>
              <div className="border-t border-gray-100 my-1.5" />
              {Object.entries(POI_META).map(([type, meta]) => (
                <div key={type} className="flex items-center gap-2 text-xs text-gray-600">
                  <meta.Icon className="w-3.5 h-3.5 shrink-0" style={{ color: meta.color }} />
                  {meta.label}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
