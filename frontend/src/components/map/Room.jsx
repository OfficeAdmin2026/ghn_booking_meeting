import { motion } from 'framer-motion';

const STATUS_COLOR = {
  available: '#22C55E',
  occupied: '#EF4444',
};

export default function Room({ code, points, centroid, label, status, selected, highlighted, hovered, onHover, onClick }) {
  const color = STATUS_COLOR[status] || STATUS_COLOR.available;
  const fillOpacity = selected ? 0.35 : hovered ? 0.3 : 0.2;

  return (
    <g
      onMouseEnter={() => onHover?.(code)}
      onMouseLeave={() => onHover?.(null)}
      onClick={() => onClick?.(code)}
      className="cursor-pointer"
    >
      <title>{label}</title>

      {highlighted && (
        <motion.polygon
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={3}
          initial={{ opacity: 0.9 }}
          animate={{ opacity: [0.9, 0, 0.9, 0] }}
          transition={{ duration: 1.6, repeat: 1 }}
        />
      )}

      <polygon
        points={points}
        fill={color}
        fillOpacity={fillOpacity}
        stroke={selected ? '#1B5FAF' : color}
        strokeWidth={selected ? 3 : 1.5}
        className="transition-[fill-opacity] duration-200"
      />

      <text
        x={centroid.x}
        y={centroid.y}
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-[11px] font-semibold fill-gray-800 select-none pointer-events-none"
      >
        {label}
      </text>
    </g>
  );
}
