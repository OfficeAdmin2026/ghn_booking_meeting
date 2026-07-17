import { motion } from 'framer-motion';

/** Mũi tên chỉ đường từ 1 điểm mốc (vd. thang máy) tới phòng đang chọn. */
export default function DirectionArrow({ from, to }) {
  if (!from || !to) return null;

  return (
    <motion.line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke="#1B5FAF"
      strokeWidth={3}
      strokeLinecap="round"
      markerEnd="url(#direction-arrowhead)"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    />
  );
}
