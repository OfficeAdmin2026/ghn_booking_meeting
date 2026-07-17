/**
 * Dữ liệu hình học mẫu cho Bản đồ văn phòng (SVG placeholder).
 *
 * Đây KHÔNG phải bản vẽ mặt bằng thật — chỉ là layout dạng lưới để module
 * hoạt động được ngay. Mỗi phòng chỉ lưu `code` (khớp với `room.code` từ
 * `/api/rooms`) + toạ độ SVG; dữ liệu "sống" (tên, sức chứa, tiện ích...)
 * được lấy từ API và ghép vào theo `code` ở OfficeMapPage.
 *
 * Khi có bản vẽ mặt bằng thật: chỉ cần thay `points`/`canvas`/`centroid`
 * bên dưới (hoặc tạo hàm build khác) — không cần đổi bất kỳ component nào.
 */

const CELL_W = 200;
const CELL_H = 140;
const GAP = 24;
const ORIGIN_X = 40;
const ORIGIN_Y = 40;
const POI_W = 160;
const POI_H = 100;
const POI_ROW_GAP = 120;

/** Sinh layout dạng lưới cho danh sách mã phòng + danh sách POI của 1 tầng. */
function buildFloorLayout(roomCodes, cols, poiList) {
  const rooms = roomCodes.map((code, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = ORIGIN_X + col * (CELL_W + GAP);
    const y = ORIGIN_Y + row * (CELL_H + GAP);
    return {
      code,
      points: `${x},${y} ${x + CELL_W},${y} ${x + CELL_W},${y + CELL_H} ${x},${y + CELL_H}`,
      centroid: { x: x + CELL_W / 2, y: y + CELL_H / 2 },
    };
  });

  const rows = Math.max(1, Math.ceil(roomCodes.length / cols));
  const gridWidth = ORIGIN_X + cols * (CELL_W + GAP);
  const gridHeight = ORIGIN_Y + rows * (CELL_H + GAP);

  const poiOriginX = gridWidth + 40;
  const pois = poiList.map((poi, i) => {
    const y = ORIGIN_Y + i * POI_ROW_GAP;
    if (poi.shape === 'point') {
      return { ...poi, x: poiOriginX + POI_W / 2, y: y + POI_H / 2 };
    }
    return {
      ...poi,
      points: `${poiOriginX},${y} ${poiOriginX + POI_W},${y} ${poiOriginX + POI_W},${y + POI_H} ${poiOriginX},${y + POI_H}`,
    };
  });

  return {
    canvas: {
      width: poiOriginX + POI_W + 40,
      height: Math.max(gridHeight, ORIGIN_Y + poiList.length * POI_ROW_GAP + POI_H + 40),
    },
    rooms,
    pois,
  };
}

const STANDARD_POIS = [
  { id: 'dept', type: 'department', shape: 'polygon', label: 'Phòng ban' },
  { id: 'pantry', type: 'pantry', shape: 'polygon', label: 'Pantry' },
  { id: 'toilet', type: 'toilet', shape: 'point', label: 'Toilet' },
  { id: 'printer', type: 'printer', shape: 'point', label: 'Máy in' },
  { id: 'elevator', type: 'elevator', shape: 'point', label: 'Thang máy' },
  { id: 'exit', type: 'exit', shape: 'point', label: 'Lối thoát hiểm' },
];

/** Tạo danh sách POI có id duy nhất theo tầng (tránh trùng id giữa các tầng). */
function poisFor(floorKey) {
  return STANDARD_POIS.map((p) => ({ ...p, id: `${floorKey}-${p.id}` }));
}

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
  'Rivera Park__G': buildFloorLayout(
    ['RPARK-G-001', 'RPARK-G-002', 'RPARK-G-003'],
    3,
    poisFor('rpark-g')
  ),
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
    rooms: [
      { code: 'RPARK-1F-004', points: '542,366 626,366 626,426 542,426', centroid: { x: 584, y: 396 } }, // Your Loads
      { code: 'RPARK-1F-003', points: '542,426 626,426 626,494 542,494', centroid: { x: 584, y: 460 } }, // Our Roads
      { code: 'RPARK-1F-001', points: '882,306 1025,306 1025,360 882,360', centroid: { x: 953, y: 333 } }, // Thành Thái
      { code: 'RPARK-1F-002', points: '882,360 1040,360 1040,494 882,494', centroid: { x: 961, y: 427 } }, // Hưng Yên (phòng lớn, 40 người)
    ],
    pois: [
      { id: 'rpark-1f-toilet-1', type: 'toilet', shape: 'point', x: 286, y: 70, label: 'WC' },
      { id: 'rpark-1f-toilet-2', type: 'toilet', shape: 'point', x: 1246, y: 126, label: 'WC' },
      { id: 'rpark-1f-pantry-1', type: 'pantry', shape: 'point', x: 1036, y: 226, label: 'Khu vực Pantry' },
      { id: 'rpark-1f-pantry-2', type: 'pantry', shape: 'point', x: 1110, y: 386, label: 'Khu vực Pantry' },
      { id: 'rpark-1f-pantry-3', type: 'pantry', shape: 'point', x: 106, y: 586, label: 'Khu vực Pantry' },
      { id: 'rpark-1f-elevator-1', type: 'elevator', shape: 'point', x: 442, y: 276, label: 'Thang máy' },
      { id: 'rpark-1f-elevator-2', type: 'elevator', shape: 'point', x: 446, y: 388, label: 'Thang máy' },
      { id: 'rpark-1f-elevator-3', type: 'elevator', shape: 'point', x: 446, y: 452, label: 'Thang máy' },
      { id: 'rpark-1f-exit-1', type: 'exit', shape: 'point', x: 306, y: 276, label: 'Khu vực thang thoát hiểm' },
      { id: 'rpark-1f-exit-2', type: 'exit', shape: 'point', x: 306, y: 426, label: 'Khu vực thang thoát hiểm' },
      { id: 'rpark-1f-exit-3', type: 'exit', shape: 'point', x: 1284, y: 276, label: 'Khu vực thang thoát hiểm' },
      { id: 'rpark-1f-exit-4', type: 'exit', shape: 'point', x: 1284, y: 426, label: 'Khu vực thang thoát hiểm' },
    ],
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
  'Rivera Park__3F': buildFloorLayout(
    [
      'RPARK-3F-001',
      'RPARK-3F-002',
      'RPARK-3F-003',
      'RPARK-3F-004',
      'RPARK-3F-005',
      'RPARK-3F-006',
      'RPARK-3F-007',
      'RPARK-3F-008',
      'RPARK-3F-010',
    ],
    3,
    poisFor('rpark-3f')
  ),
  Mipec__8F: buildFloorLayout(['MIPEC-8F-001', 'MIPEC-8F-002'], 2, poisFor('mipec-8f')),
};

export function getFloorKey(location, floor) {
  return `${location}__${floor}`;
}

export function getFloorData(location, floor) {
  return officeMapData[getFloorKey(location, floor)] ?? null;
}
