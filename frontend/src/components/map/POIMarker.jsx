import { motion } from 'framer-motion';
import { POI_META } from './poiMeta';
import { poiCenter } from '../../utils/svgGeometry';

export default function POIMarker({ type, shape, points, x, y, label, color: colorOverride, highlighted, onHover, onClick }) {
  const meta = POI_META[type];
  if (!meta) return null;
  const { Icon, color: defaultColor, label: defaultLabel } = meta;
  const color = colorOverride || defaultColor;
  const displayLabel = label || defaultLabel;
  const center = poiCenter({ shape, points, x, y });

  return (
    <g
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      onClick={onClick}
      className={onClick ? 'cursor-pointer' : 'cursor-default'}
    >
      <title>{displayLabel}</title>

      {shape === 'polygon' && (
        <polygon
          points={points}
          fill={color}
          fillOpacity={0.12}
          stroke={color}
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
      )}

      {highlighted && (
        <motion.circle
          cx={center.x}
          cy={center.y}
          r={22}
          fill="none"
          stroke={color}
          strokeWidth={2}
          initial={{ opacity: 0.8, scale: 0.8 }}
          animate={{ opacity: 0, scale: 1.6 }}
          transition={{ duration: 1.1, repeat: 2 }}
        />
      )}

      <circle cx={center.x} cy={center.y} r={14} fill="white" stroke={color} strokeWidth={1.5} />
      <foreignObject x={center.x - 8} y={center.y - 8} width={16} height={16} className="pointer-events-none">
        <Icon style={{ color }} className="w-4 h-4" />
      </foreignObject>

      {shape === 'polygon' && (
        <text
          x={center.x}
          y={center.y + 26}
          textAnchor="middle"
          className="text-[10px] fill-gray-500 select-none pointer-events-none"
        >
          {displayLabel}
        </text>
      )}
    </g>
  );
}
