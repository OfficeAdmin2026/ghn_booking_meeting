import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { roomsApi, bookingsApi, wayfindingApi } from '../api';
import { getFloorData, getFloorKey, normalizeLocation, DEFAULT_LOCATION, DEFAULT_FLOOR, DEFAULT_FILTERS } from '../data/officeMapData';
import { isRoomOccupiedNow } from '../utils/roomStatus';
import SearchBar from '../components/map/SearchBar';
import FilterPanel from '../components/map/FilterPanel';
import FloorSelector from '../components/map/FloorSelector';
import Legend from '../components/map/Legend';
import MapCanvas from '../components/map/MapCanvas';
import InfoPanel from '../components/map/InfoPanel';

function dayRangeISO() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export default function OfficeMapPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchInputRef = useRef(null);

  const [location_, setLocation_] = useState(normalizeLocation(searchParams.get('location')) || DEFAULT_LOCATION);
  const [floor, setFloor] = useState(searchParams.get('floor') || DEFAULT_FLOOR);

  const [liveRooms, setLiveRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [bookingsByRoomId, setBookingsByRoomId] = useState({});
  const [now, setNow] = useState(() => new Date());

  const [selectedCode, setSelectedCode] = useState(null);
  const [hoveredCode, setHoveredCode] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [focusRequest, setFocusRequest] = useState(null);
  const [toast, setToast] = useState(null);

  const [savedPathsByRoomId, setSavedPathsByRoomId] = useState({});
  const [drawMode, setDrawMode] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [savingPath, setSavingPath] = useState(false);

  const pendingDeepLink = useRef({
    roomId: searchParams.get('roomId'),
    highlight: searchParams.get('highlight') === '1',
  });

  // Fetch phòng 1 lần
  useEffect(() => {
    roomsApi
      .getAll()
      .then((res) => setLiveRooms(res.data.data?.rooms || []))
      .catch(() => setLiveRooms([]))
      .finally(() => setRoomsLoading(false));
  }, []);

  const fetchSavedPaths = useCallback(() => {
    wayfindingApi
      .getAll()
      .then((res) => {
        const map = {};
        (res.data.data?.paths || []).forEach((p) => { map[p.room_id] = p.points; });
        setSavedPathsByRoomId(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { fetchSavedPaths(); }, [fetchSavedPaths]);

  const roomsByCode = useMemo(() => {
    const map = {};
    liveRooms.forEach((r) => { map[r.code] = r; });
    return map;
  }, [liveRooms]);

  const floorKey = getFloorKey(location_, floor);
  const floorData = useMemo(() => getFloorData(location_, floor), [location_, floor]);
  const floorRooms = useMemo(
    () => liveRooms.filter((r) => normalizeLocation(r.location) === location_ && r.floor === floor),
    [liveRooms, location_, floor]
  );

  const fetchFloorBookings = useCallback(() => {
    if (floorRooms.length === 0) { setBookingsByRoomId({}); return; }
    const { start, end } = dayRangeISO();
    Promise.all(
      floorRooms.map((r) =>
        bookingsApi
          .getRoomBookings(r.id, start, end)
          .then((res) => [r.id, res.data.data?.bookings || []])
          .catch(() => [r.id, []])
      )
    ).then((entries) => setBookingsByRoomId(Object.fromEntries(entries)));
  }, [floorRooms]);

  useEffect(() => { fetchFloorBookings(); }, [fetchFloorBookings]);

  // Làm mới khi quay lại tab (bắt các booking được tạo ở nơi khác)
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') fetchFloorBookings(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchFloorBookings]);

  // Tick 30s để tính lại trạng thái trống/họp theo giờ hiện tại (không fetch lại mạng)
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  // Xử lý deep-link ?roomId=&highlight=1 sau khi có dữ liệu phòng
  useEffect(() => {
    const pending = pendingDeepLink.current;
    if (!pending.roomId || liveRooms.length === 0) return;
    const room = liveRooms.find((r) => r.id === pending.roomId);
    if (room) {
      setSelectedCode(room.code);
      setPanelOpen(true);
      if (pending.highlight) {
        setFocusRequest({ domId: `room-${room.code}`, nonce: Date.now() });
        setToast(room);
        setTimeout(() => setToast(null), 4000);
      }
    }
    pendingDeepLink.current = { roomId: null, highlight: false };
  }, [liveRooms]);

  // Ctrl/Cmd+F focus ô tìm kiếm, Esc đóng InfoPanel
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape' && panelOpen) {
        setPanelOpen(false);
        setDrawMode(false);
        setDrawingPoints([]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [panelOpen]);

  const statusByCode = useMemo(() => {
    const map = {};
    floorRooms.forEach((r) => {
      const { occupied } = isRoomOccupiedNow(bookingsByRoomId[r.id] || [], now);
      map[r.id] = occupied ? 'occupied' : 'available';
    });
    return map;
  }, [floorRooms, bookingsByRoomId, now]);

  const exitDrawMode = () => {
    setDrawMode(false);
    setDrawingPoints([]);
  };

  const handleFloorChange = ({ location, floor: nextFloor }) => {
    setLocation_(location);
    setFloor(nextFloor);
    setSearchParams({ location, floor: nextFloor }, { replace: true });
    setPanelOpen(false);
    exitDrawMode();
  };

  const handleRoomClick = (code) => {
    setSelectedCode(code);
    setPanelOpen(true);
    exitDrawMode();
  };

  const handleClosePanel = () => {
    setPanelOpen(false);
    exitDrawMode();
  };

  const handleStartDraw = () => {
    setDrawingPoints([]);
    setDrawMode(true);
  };

  const handleCanvasPoint = (point) => {
    setDrawingPoints((pts) => [...pts, point]);
  };

  const handleUndoPoint = () => {
    setDrawingPoints((pts) => pts.slice(0, -1));
  };

  const handleClearDraw = () => setDrawingPoints([]);

  const handleCancelDraw = () => exitDrawMode();

  const handleSaveDraw = () => {
    if (!selectedRoom || drawingPoints.length < 2) return;
    setSavingPath(true);
    wayfindingApi
      .save(selectedRoom.id, drawingPoints)
      .then(() => {
        setSavedPathsByRoomId((m) => ({ ...m, [selectedRoom.id]: drawingPoints }));
        exitDrawMode();
      })
      .catch(() => {})
      .finally(() => setSavingPath(false));
  };

  const handleSearchSelect = (result) => {
    if (result.kind === 'room') {
      const room = result.room;
      const roomLocation = normalizeLocation(room.location);
      if (roomLocation !== location_ || room.floor !== floor) {
        setLocation_(roomLocation);
        setFloor(room.floor);
        setSearchParams({ location: roomLocation, floor: room.floor }, { replace: true });
      }
      setSelectedCode(room.code);
      setPanelOpen(true);
      setFocusRequest({ domId: `room-${room.code}`, nonce: Date.now() });
    } else {
      setFocusRequest({ domId: `poi-${result.id}`, nonce: Date.now() });
    }
  };

  const handleBook = (room) => {
    navigate('/', { state: { room } });
  };

  const selectedRoom = selectedCode ? roomsByCode[selectedCode] : null;
  const bookingsToday = selectedRoom ? bookingsByRoomId[selectedRoom.id] || [] : [];
  const occupiedInfo = isRoomOccupiedNow(bookingsToday, now);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 px-4 sm:px-6 py-3 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Bản đồ văn phòng</h1>
            <p className="text-xs text-gray-500">Xem vị trí phòng họp, phòng ban và tiện ích trong toà nhà</p>
          </div>
          <SearchBar
            rooms={liveRooms}
            pois={floorData?.background ? [] : floorData?.pois || []}
            onSelect={handleSearchSelect}
            inputRef={searchInputRef}
          />
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <FloorSelector location={location_} floor={floor} onChange={handleFloorChange} />
          <FilterPanel filters={filters} onChange={setFilters} hasBackground={!!floorData?.background} />
        </div>
      </div>

      {/* Map area */}
      <div className="relative flex-1 flex p-4 gap-3 overflow-hidden">
        {roomsLoading ? (
          <div className="flex-1 rounded-xl border border-gray-200 bg-gray-50 animate-pulse" />
        ) : (
          <MapCanvas
            floorKey={floorKey}
            floorData={floorData}
            roomsByCode={roomsByCode}
            statusByCode={statusByCode}
            selectedCode={selectedCode}
            highlightedCode={toast ? selectedCode : null}
            hoveredCode={hoveredCode}
            onRoomHover={setHoveredCode}
            onRoomClick={handleRoomClick}
            filters={filters}
            focusRequest={focusRequest}
            showDirection={panelOpen}
            savedPathsByRoomId={savedPathsByRoomId}
            drawMode={drawMode}
            drawingPoints={drawingPoints}
            onCanvasPoint={handleCanvasPoint}
          />
        )}
        <Legend hasBackground={!!floorData?.background} />
      </div>

      <AnimatePresence>
        {panelOpen && selectedRoom && (
          <InfoPanel
            room={selectedRoom}
            bookingsToday={bookingsToday}
            occupiedInfo={occupiedInfo}
            onClose={handleClosePanel}
            onBook={handleBook}
            hasCustomPath={!!savedPathsByRoomId[selectedRoom.id]}
            drawMode={drawMode}
            drawingPoints={drawingPoints}
            onStartDraw={handleStartDraw}
            onUndoPoint={handleUndoPoint}
            onClearDraw={handleClearDraw}
            onCancelDraw={handleCancelDraw}
            onSaveDraw={handleSaveDraw}
            saving={savingPath}
          />
        )}
      </AnimatePresence>

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-white border border-green-200 shadow-lg rounded-xl px-5 py-3 flex items-center gap-3">
          <CheckCircleIcon className="w-6 h-6 text-green-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gray-800">Đặt phòng thành công</p>
            <p className="text-xs text-gray-500">Bạn đã đặt: {toast.name} · Tầng {toast.floor}</p>
          </div>
        </div>
      )}
    </div>
  );
}
