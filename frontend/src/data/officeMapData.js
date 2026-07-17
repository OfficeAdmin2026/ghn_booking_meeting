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
  // Rivera Park / 1F: bố cục theo "sơ đồ tầng-1.pdf" (tỉ lệ tương đối, không
  // phải bản vẽ CAD chính xác) — chỉ vẽ 4 phòng họp thật đang có trong hệ
  // thống đặt phòng (Thành Thái, Hưng Yên, Our Roads, Your Loads) + các tiện
  // ích chung (WC, Pantry, thang máy, lối thoát hiểm). Các phòng họp khác và
  // khu làm việc theo team trong sơ đồ gốc không đưa vào theo yêu cầu.
  'Rivera Park__1F': {
    canvas: { width: 1000, height: 600 },
    rooms: [
      { code: 'RPARK-1F-004', points: '330,260 430,260 430,330 330,330', centroid: { x: 380, y: 295 } }, // Your Loads
      { code: 'RPARK-1F-003', points: '330,330 430,330 430,400 330,400', centroid: { x: 380, y: 365 } }, // Our Roads
      { code: 'RPARK-1F-001', points: '600,260 740,260 740,330 600,330', centroid: { x: 670, y: 295 } }, // Thành Thái
      { code: 'RPARK-1F-002', points: '600,330 740,330 740,430 600,430', centroid: { x: 670, y: 380 } }, // Hưng Yên (phòng lớn, 40 người)
    ],
    pois: [
      { id: 'rpark-1f-toilet-1', type: 'toilet', shape: 'point', x: 172, y: 60, label: 'WC' },
      { id: 'rpark-1f-toilet-2', type: 'toilet', shape: 'point', x: 783, y: 90, label: 'WC' },
      { id: 'rpark-1f-pantry-1', type: 'pantry', shape: 'polygon', points: '618,154 678,154 678,204 618,204', label: 'Khu vực Pantry' },
      { id: 'rpark-1f-pantry-2', type: 'pantry', shape: 'polygon', points: '765,335 825,335 825,385 765,385', label: 'Khu vực Pantry' },
      { id: 'rpark-1f-pantry-3', type: 'pantry', shape: 'polygon', points: '20,455 100,455 100,515 20,515', label: 'Khu vực Pantry' },
      { id: 'rpark-1f-elevator-1', type: 'elevator', shape: 'point', x: 273, y: 208, label: 'Thang máy' },
      { id: 'rpark-1f-elevator-2', type: 'elevator', shape: 'point', x: 273, y: 311, label: 'Thang máy' },
      { id: 'rpark-1f-elevator-3', type: 'elevator', shape: 'point', x: 273, y: 356, label: 'Thang máy' },
      { id: 'rpark-1f-exit-1', type: 'exit', shape: 'point', x: 186, y: 208, label: 'Khu vực thang thoát hiểm' },
      { id: 'rpark-1f-exit-2', type: 'exit', shape: 'point', x: 186, y: 311, label: 'Khu vực thang thoát hiểm' },
      { id: 'rpark-1f-exit-3', type: 'exit', shape: 'point', x: 810, y: 208, label: 'Khu vực thang thoát hiểm' },
      { id: 'rpark-1f-exit-4', type: 'exit', shape: 'point', x: 875, y: 420, label: 'Khu vực thang thoát hiểm' },
    ],
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
