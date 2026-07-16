import { MiniMap as RzppMiniMap } from 'react-zoom-pan-pinch';

const STATUS_COLOR = { available: '#22C55E', occupied: '#EF4444' };

/**
 * Bản đồ thu nhỏ — dùng luôn MiniMap có sẵn của react-zoom-pan-pinch (tự lo
 * việc theo dõi viewport + click-to-pan), chỉ vẽ lại các phòng dạng khối màu
 * phẳng, không nhãn/không POI, để giữ đơn giản.
 */
export default function MiniMap({ floorData, roomsByCode, statusByCode }) {
  const { canvas, rooms } = floorData;

  return (
    <RzppMiniMap
      width={160}
      height={(160 * canvas.height) / canvas.width}
      borderColor="#FF6C0A"
      className="!absolute !bottom-4 !right-4 !z-10 rounded-lg overflow-hidden border border-gray-200 shadow-md bg-white"
    >
      <svg viewBox={`0 0 ${canvas.width} ${canvas.height}`} className="w-full h-full">
        {rooms.map((r) => {
          const room = roomsByCode[r.code];
          if (!room) return null;
          const color = STATUS_COLOR[statusByCode[room.id] || 'available'];
          return <polygon key={r.code} points={r.points} fill={color} fillOpacity={0.5} stroke={color} strokeWidth={2} />;
        })}
      </svg>
    </RzppMiniMap>
  );
}
