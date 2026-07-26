

export const FLOORS_BY_LOCATION = {
  'Rivera Park': ['G', '1F', '3F'],
  Mipec: ['8F'],
};

/**
 * Dữ liệu `room.location` thực tế có 2 biến thể ("Rivera Park" / "RiveraPark")
 * — CalendarPage.jsx đã có normalizeOfficeName() xử lý y hệt việc này cho
 * lịch đặt phòng. Nhân bản logic đó ở đây (không import từ CalendarPage.jsx
 * để tránh đụng vào file của luồng đặt phòng hiện có).
 */
export function normalizeLocation(name) {
  if (!name) return '';
  const cleaned = name.replace(/\s+/g, '').toLowerCase();
  if (cleaned === 'riverapark') return 'Rivera Park';
  if (cleaned === 'mipec') return 'Mipec';
  return name.trim();
}

export const DEFAULT_LOCATION = 'Rivera Park';
export const DEFAULT_FLOOR = '3F';

export const FILTER_OPTIONS = [
  { key: 'room', label: 'Phòng họp' },
  { key: 'department', label: 'Phòng ban' },
  { key: 'pantry', label: 'Pantry' },
  { key: 'toilet', label: 'Toilet' },
  { key: 'printer', label: 'Máy in' },
  { key: 'elevator', label: 'Thang máy' },
  { key: 'exit', label: 'Lối thoát hiểm' },
];

export const DEFAULT_FILTERS = FILTER_OPTIONS.reduce((acc, o) => ({ ...acc, [o.key]: true }), {});

export const officeMapData = {
  'Rivera Park__G': {
    canvas: { width: 1200, height: 700 },
    rooms: [],
    pois: [],
  },
  // Rivera Park / 1F: ảnh nền là sơ đồ thật (frontend/public/floor-plans/
  // rivera-park-1f.png, cắt từ "sơ đồ tầng-1.pdf"). Toạ độ room/poi bên dưới
  // được đo trực tiếp trên ảnh 1600x667 này nên khớp đúng vị trí thật — chỉ
  // đặt overlay cho 4 phòng họp thật đang có trong hệ thống đặt phòng (Thành
  // Thái, Hưng Yên, Our Roads, Your Loads) + tiện ích chung (WC, Pantry,
  // thang máy, lối thoát hiểm). Các phòng họp khác/khu làm việc theo team
  // trong sơ đồ gốc không có overlay vì chưa tồn tại trong hệ thống đặt phòng.
  'Rivera Park__1F': {
    canvas: { width: 1600, height: 667 },
    background: { src: '/floor-plans/rivera-park-1f.png', width: 1600, height: 667 },
    rooms: [],
    pois: [],
    // Waypoint hành lang (đo theo vùng trắng/mở trên ảnh nền) — mũi tên chỉ
    // đường sẽ đi qua các node này thay vì cắt thẳng qua tường phòng.
    corridorGraph: {
      nodes: {
        n0: { x: 480, y: 270 },  // hành lang trái, gần thang máy 1
        n0s: { x: 480, y: 225 }, // vòng lên khoảng trống phía trên cụm phòng họp
        n1: { x: 480, y: 420 },  // hành lang trái, gần thang máy 2/3
        n1s: { x: 480, y: 510 }, // vòng xuống khoảng trống phía dưới cụm phòng họp
        n2: { x: 556, y: 396 },  // cửa vào cụm phòng họp (Your Loads/Our Roads)
        n3top: { x: 720, y: 225 }, // vòng qua khoảng trống phía trên, tới khu thang cuốn
        n3bot: { x: 720, y: 510 }, // vòng qua khoảng trống phía dưới, tới khu thang cuốn
        n4: { x: 800, y: 370 },  // khu vực thang cuốn (khoảng mở)
        n6: { x: 865, y: 333 },  // ngay trước cửa Thành Thái
        n7: { x: 865, y: 427 },  // ngay trước cửa Hưng Yên
      },
      edges: [
        ['n0', 'n0s'], ['n0', 'n1'], ['n1', 'n1s'], ['n1', 'n2'],
        ['n0s', 'n3top'], ['n1s', 'n3bot'],
        ['n3top', 'n4'], ['n3bot', 'n4'],
        ['n4', 'n6'], ['n4', 'n7'],
      ],
    },
  },
  // Rivera Park / 3F: ảnh nền là sơ đồ thật (frontend/public/floor-plans/
  // rivera-park-3f.png). Bản vẽ kỹ thuật này chỉ ghi nhãn chung "P. Họp 1/2",
  // không khớp tên 9 phòng trong hệ thống đặt phòng — nên KHÔNG đặt sẵn
  // khung phòng nào ở đây. Admin tự vẽ khung từng phòng trực tiếp trên web
  // (nút "Vẽ khung phòng" trong InfoPanel) rồi hệ thống tự lưu vào DB.
  'Rivera Park__3F': {
    canvas: { width: 1280, height: 598 },
    background: { src: '/floor-plans/rivera-park-3f.png', width: 1280, height: 598 },
    rooms: [],
    pois: [],
  },
  Mipec__8F: {
    canvas: { width: 1200, height: 700 },
    rooms: [],
    pois: [],
  },
};

export function getFloorKey(location, floor) {
  return `${location}__${floor}`;
}

export function getFloorData(location, floor) {
  return officeMapData[getFloorKey(location, floor)] ?? null;
}
