import { motion } from 'framer-motion';

/** Mũi tên chỉ đường đi theo hành lang (nhiều đoạn) từ mốc (vd. thang máy) tới phòng. */
export default function DirectionArrow({ points }) {
  if (!points || points.length < 2) return null;

  const pointsAttr = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <motion.polyline
      points={pointsAttr}
      fill="none"
      stroke="#1B5FAF"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      markerEnd="url(#direction-arrowhead)"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    />
  );
}
