import {
  BuildingOfficeIcon,
  BeakerIcon,
  UserIcon,
  PrinterIcon,
  ArrowsUpDownIcon,
  ArrowLeftOnRectangleIcon,
} from '@heroicons/react/24/outline';

/**
 * Metadata dùng chung cho mọi loại điểm/khu vực không phải phòng họp
 * (department/pantry/toilet/printer/elevator/exit). Tách khỏi POIMarker.jsx
 * (component) để không vi phạm rule react-refresh/only-export-components.
 */
export const POI_META = {
  department: { Icon: BuildingOfficeIcon, color: '#1B5FAF', label: 'Phòng ban' },
  pantry: { Icon: BeakerIcon, color: '#F59E0B', label: 'Pantry' },
  toilet: { Icon: UserIcon, color: '#64748B', label: 'Toilet' },
  printer: { Icon: PrinterIcon, color: '#8B5CF6', label: 'Máy in' },
  elevator: { Icon: ArrowsUpDownIcon, color: '#0EA5E9', label: 'Thang máy' },
  exit: { Icon: ArrowLeftOnRectangleIcon, color: '#DC2626', label: 'Lối thoát hiểm' },
};
