import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { PhotoIcon, PlusCircleIcon } from '@heroicons/react/24/outline';
import { roomsApi, bookingsApi, wayfindingApi, roomShapesApi, floorBackgroundsApi, mapAnnotationsApi } from '../api';
import { getFloorData, getFloorKey, normalizeLocation, DEFAULT_LOCATION, DEFAULT_FLOOR, DEFAULT_FILTERS } from '../data/officeMapData';
import { isRoomOccupiedNow } from '../utils/roomStatus';
import { polygonCentroid, pointsToSvgString } from '../utils/svgGeometry';
import { useAuth } from '../contexts/AuthContext';
import { POI_META } from '../components/map/poiMeta';
import SearchBar from '../components/map/SearchBar';
import FilterPanel from '../components/map/FilterPanel';
import FloorSelector from '../components/map/FloorSelector';
import Legend from '../components/map/Legend';
import MapCanvas from '../components/map/MapCanvas';
import InfoPanel from '../components/map/InfoPanel';
import UploadBackgroundModal from '../components/map/UploadBackgroundModal';
import AnnotationToolbar from '../components/map/AnnotationToolbar';

function dayRangeISO() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export default function OfficeMapPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
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
  const [highlightedCode, setHighlightedCode] = useState(null);

  const [savedPathsByRoomId, setSavedPathsByRoomId] = useState({});
  const [savedShapesByRoomId, setSavedShapesByRoomId] = useState({});
  const [backgroundsByFloorKey, setBackgroundsByFloorKey] = useState({});
  const [activeDrawTool, setActiveDrawTool] = useState(null); // null | 'path' | 'shape' | 'annotation'
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [savingPath, setSavingPath] = useState(false);
  const [savingShape, setSavingShape] = useState(false);

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const [annotations, setAnnotations] = useState([]);
  const [annotationToolbarOpen, setAnnotationToolbarOpen] = useState(false);
  const [editingAnnotationId, setEditingAnnotationId] = useState(null);
  const [draftAnnotation, setDraftAnnotation] = useState({ type: 'elevator', color: POI_META.elevator.color, label: '' });
  const [savingAnnotation, setSavingAnnotation] = useState(false);

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

  const fetchSavedShapes = useCallback(() => {
    roomShapesApi
      .getAll()
      .then((res) => {
        const map = {};
        (res.data.data?.shapes || []).forEach((s) => { map[s.room_id] = s.points; });
        setSavedShapesByRoomId(map);
      })
      .catch(() => {});
  }, []);

  const fetchBackgrounds = useCallback(() => {
    floorBackgroundsApi
      .getAll()
      .then((res) => {
        const map = {};
        (res.data.data?.backgrounds || []).forEach((b) => {
          map[getFloorKey(normalizeLocation(b.location), b.floor)] = b;
        });
        setBackgroundsByFloorKey(map);
      })
      .catch(() => {});
  }, []);

  const fetchAnnotations = useCallback(() => {
    mapAnnotationsApi
      .getAll()
      .then((res) => setAnnotations(res.data.data?.annotations || []))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchSavedPaths(); }, [fetchSavedPaths]);
  useEffect(() => { fetchSavedShapes(); }, [fetchSavedShapes]);
  useEffect(() => { fetchBackgrounds(); }, [fetchBackgrounds]);
  useEffect(() => { fetchAnnotations(); }, [fetchAnnotations]);

  const roomsByCode = useMemo(() => {
    const map = {};
    liveRooms.forEach((r) => { map[r.code] = r; });
    return map;
  }, [liveRooms]);

  const roomsById = useMemo(() => {
    const map = {};
    liveRooms.forEach((r) => { map[r.id] = r; });
    return map;
  }, [liveRooms]);

  const floorKey = getFloorKey(location_, floor);

  // Dữ liệu tĩnh trong officeMapData.js — nền tảng ban đầu, sẽ bị ghi đè bởi
  // khung phòng (room_shapes) và ảnh nền (floor_backgrounds) admin đã lưu trong DB.
  const staticFloorData = useMemo(() => getFloorData(location_, floor), [location_, floor]);

  const floorData = useMemo(() => {
    if (!staticFloorData) return null;

    const roomsByCodeMap = {};
    staticFloorData.rooms.forEach((r) => { roomsByCodeMap[r.code] = r; });
    Object.entries(savedShapesByRoomId).forEach(([roomId, points]) => {
      const liveRoom = roomsById[roomId];
      if (!liveRoom) return;
      // chỉ áp dụng khung đã vẽ cho đúng phòng thuộc tầng đang xem
      if (normalizeLocation(liveRoom.location) !== location_ || liveRoom.floor !== floor) return;
      const svgPoints = pointsToSvgString(points);
      roomsByCodeMap[liveRoom.code] = { code: liveRoom.code, points: svgPoints, centroid: polygonCentroid(svgPoints) };
    });

    const bgOverride = backgroundsByFloorKey[floorKey];
    const background = bgOverride
      ? { src: bgOverride.image_url, width: bgOverride.width, height: bgOverride.height }
      : staticFloorData.background;
    const canvas = bgOverride ? { width: bgOverride.width, height: bgOverride.height } : staticFloorData.canvas;

    // Khu vực chung (thang máy, WC, pantry...) admin tự vẽ — luôn nối thêm vào
    // POI tĩnh của tầng, đánh dấu custom:true để MapCanvas biết luôn hiển thị
    // kể cả khi tầng đã có ảnh nền thật (POI tĩnh thì bị ẩn trong trường hợp đó).
    const customPois = annotations
      .filter((a) => normalizeLocation(a.location) === location_ && a.floor === floor)
      .map((a) => ({
        id: a.id,
        type: a.type,
        shape: a.shape,
        label: a.label || undefined,
        color: a.color || undefined,
        custom: true,
        ...(a.shape === 'point' ? { x: a.points[0].x, y: a.points[0].y } : { points: pointsToSvgString(a.points) }),
      }));

    return {
      ...staticFloorData,
      canvas,
      background,
      rooms: Object.values(roomsByCodeMap),
      pois: [...staticFloorData.pois, ...customPois],
    };
  }, [staticFloorData, savedShapesByRoomId, backgroundsByFloorKey, roomsById, location_, floor, floorKey, annotations]);

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
        setHighlightedCode(room.code);
        setTimeout(() => setHighlightedCode(null), 4000);
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
      } else if (e.key === 'Escape' && (panelOpen || annotationToolbarOpen)) {
        setPanelOpen(false);
        setAnnotationToolbarOpen(false);
        setEditingAnnotationId(null);
        setActiveDrawTool(null);
        setDrawingPoints([]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [panelOpen, annotationToolbarOpen]);

  const statusByCode = useMemo(() => {
    const map = {};
    floorRooms.forEach((r) => {
      const { occupied } = isRoomOccupiedNow(bookingsByRoomId[r.id] || [], now);
      map[r.id] = occupied ? 'occupied' : 'available';
    });
    return map;
  }, [floorRooms, bookingsByRoomId, now]);

  const exitDrawMode = () => {
    setActiveDrawTool(null);
    setDrawingPoints([]);
  };

  const handleFloorChange = ({ location, floor: nextFloor }) => {
    setLocation_(location);
    setFloor(nextFloor);
    setSearchParams({ location, floor: nextFloor }, { replace: true });
    setPanelOpen(false);
    setAnnotationToolbarOpen(false);
    setEditingAnnotationId(null);
    exitDrawMode();
  };

  const handleRoomClick = (code) => {
    setSelectedCode(code);
    setPanelOpen(true);
    setAnnotationToolbarOpen(false);
    setEditingAnnotationId(null);
    exitDrawMode();
  };

  const handleClosePanel = () => {
    setPanelOpen(false);
    exitDrawMode();
  };

  const handleStartDrawPath = () => {
    setDrawingPoints([]);
    setActiveDrawTool('path');
  };

  const handleStartDrawShape = () => {
    setDrawingPoints([]);
    setActiveDrawTool('shape');
  };

  const handleCanvasPoint = (point) => {
    setDrawingPoints((pts) => [...pts, point]);
  };

  const handleUndoPoint = () => {
    setDrawingPoints((pts) => pts.slice(0, -1));
  };

  const handleClearDraw = () => setDrawingPoints([]);

  const handleCancelDraw = () => exitDrawMode();

  const handleSavePath = () => {
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

  const handleSaveShape = () => {
    if (!selectedRoom || drawingPoints.length < 3) return;
    setSavingShape(true);
    roomShapesApi
      .save(selectedRoom.id, drawingPoints)
      .then(() => {
        setSavedShapesByRoomId((m) => ({ ...m, [selectedRoom.id]: drawingPoints }));
        exitDrawMode();
      })
      .catch(() => {})
      .finally(() => setSavingShape(false));
  };

  const handleDeleteShape = () => {
    if (!selectedRoom) return;
    setSavingShape(true);
    roomShapesApi
      .remove(selectedRoom.id)
      .then(() => {
        setSavedShapesByRoomId((m) => {
          const next = { ...m };
          delete next[selectedRoom.id];
          return next;
        });
      })
      .catch(() => {})
      .finally(() => setSavingShape(false));
  };

  const handleOpenUploadModal = () => {
    setUploadError('');
    setUploadModalOpen(true);
  };

  const handleUploadBackground = (file) => {
    setUploading(true);
    setUploadError('');
    floorBackgroundsApi
      .upload(location_, floor, file)
      .then(() => {
        fetchBackgrounds();
        setUploadModalOpen(false);
      })
      .catch((err) => setUploadError(err.response?.data?.error?.message || 'Tải ảnh lên thất bại'))
      .finally(() => setUploading(false));
  };

  const handleDeleteBackground = () => {
    setUploading(true);
    setUploadError('');
    floorBackgroundsApi
      .remove(location_, floor)
      .then(() => {
        fetchBackgrounds();
        setUploadModalOpen(false);
      })
      .catch((err) => setUploadError(err.response?.data?.error?.message || 'Xoá ảnh thất bại'))
      .finally(() => setUploading(false));
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
      setAnnotationToolbarOpen(false);
      setEditingAnnotationId(null);
      setFocusRequest({ domId: `room-${room.code}`, nonce: Date.now() });
    } else {
      setFocusRequest({ domId: `poi-${result.id}`, nonce: Date.now() });
    }
  };

  const handleOpenAnnotationToolbar = () => {
    setPanelOpen(false);
    exitDrawMode();
    setEditingAnnotationId(null);
    setDraftAnnotation({ type: 'elevator', color: POI_META.elevator.color, label: '' });
    setAnnotationToolbarOpen(true);
  };

  const handleSelectAnnotation = (poi) => {
    const raw = annotations.find((a) => a.id === poi.id);
    if (!raw) return;
    setPanelOpen(false);
    exitDrawMode();
    setEditingAnnotationId(raw.id);
    setDraftAnnotation({ type: raw.type, color: raw.color || POI_META[raw.type].color, label: raw.label || '' });
    setAnnotationToolbarOpen(true);
  };

  const handleChangeDraftAnnotation = (partial) => setDraftAnnotation((d) => ({ ...d, ...partial }));

  const handleStartDrawAnnotation = () => {
    setDrawingPoints([]);
    setActiveDrawTool('annotation');
  };

  const handleCancelAnnotationDraw = () => {
    setActiveDrawTool(null);
    setDrawingPoints([]);
  };

  const handleCloseAnnotationToolbar = () => {
    setAnnotationToolbarOpen(false);
    setEditingAnnotationId(null);
    exitDrawMode();
  };

  const handleSaveAnnotation = () => {
    if (drawingPoints.length !== 1 && drawingPoints.length < 3) return;
    const shape = drawingPoints.length === 1 ? 'point' : 'polygon';
    const payload = {
      location: location_,
      floor,
      type: draftAnnotation.type,
      shape,
      points: drawingPoints,
      color: draftAnnotation.color,
      label: draftAnnotation.label || null,
    };
    setSavingAnnotation(true);
    const request = editingAnnotationId
      ? mapAnnotationsApi.update(editingAnnotationId, payload)
      : mapAnnotationsApi.create(payload);
    request
      .then((res) => {
        const saved = res.data.data?.annotation;
        setAnnotations((prev) =>
          editingAnnotationId ? prev.map((a) => (a.id === saved.id ? saved : a)) : [...prev, saved]
        );
        handleCloseAnnotationToolbar();
      })
      .catch(() => {})
      .finally(() => setSavingAnnotation(false));
  };

  const handleSaveAnnotationMeta = () => {
    if (!editingAnnotationId) return;
    setSavingAnnotation(true);
    mapAnnotationsApi
      .update(editingAnnotationId, { type: draftAnnotation.type, color: draftAnnotation.color, label: draftAnnotation.label || null })
      .then((res) => {
        const saved = res.data.data?.annotation;
        setAnnotations((prev) => prev.map((a) => (a.id === saved.id ? saved : a)));
        handleCloseAnnotationToolbar();
      })
      .catch(() => {})
      .finally(() => setSavingAnnotation(false));
  };

  const handleDeleteAnnotation = () => {
    if (!editingAnnotationId) return;
    setSavingAnnotation(true);
    mapAnnotationsApi
      .remove(editingAnnotationId)
      .then(() => {
        setAnnotations((prev) => prev.filter((a) => a.id !== editingAnnotationId));
        handleCloseAnnotationToolbar();
      })
      .catch(() => {})
      .finally(() => setSavingAnnotation(false));
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
          <div className="flex items-center gap-2 flex-wrap">
            <FloorSelector location={location_} floor={floor} onChange={handleFloorChange} />
            {isAdmin && (
              <button
                type="button"
                onClick={handleOpenUploadModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:border-ghn-orange hover:text-ghn-orange transition-colors"
                title="Cập nhật sơ đồ tầng"
              >
                <PhotoIcon className="w-3.5 h-3.5" /> Sơ đồ tầng
              </button>
            )}
            {isAdmin && (
              <button
                type="button"
                onClick={handleOpenAnnotationToolbar}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:border-ghn-orange hover:text-ghn-orange transition-colors"
                title="Thêm khu vực chung (thang máy, WC, pantry...)"
              >
                <PlusCircleIcon className="w-3.5 h-3.5" /> Khu vực chung
              </button>
            )}
          </div>
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
            highlightedCode={highlightedCode}
            hoveredCode={hoveredCode}
            onRoomHover={setHoveredCode}
            onRoomClick={handleRoomClick}
            filters={filters}
            focusRequest={focusRequest}
            showDirection={panelOpen}
            savedPathsByRoomId={savedPathsByRoomId}
            activeDrawTool={activeDrawTool}
            drawingPoints={drawingPoints}
            onCanvasPoint={handleCanvasPoint}
            isAdmin={isAdmin}
            onAnnotationClick={handleSelectAnnotation}
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
            hasCustomShape={!!savedShapesByRoomId[selectedRoom.id]}
            activeDrawTool={activeDrawTool}
            drawingPoints={drawingPoints}
            onStartDrawPath={handleStartDrawPath}
            onStartDrawShape={handleStartDrawShape}
            onUndoPoint={handleUndoPoint}
            onClearDraw={handleClearDraw}
            onCancelDraw={handleCancelDraw}
            onSavePath={handleSavePath}
            onSaveShape={handleSaveShape}
            onDeleteShape={handleDeleteShape}
            savingPath={savingPath}
            savingShape={savingShape}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {annotationToolbarOpen && (
          <AnnotationToolbar
            isEditing={!!editingAnnotationId}
            draft={draftAnnotation}
            onChangeDraft={handleChangeDraftAnnotation}
            activeDrawTool={activeDrawTool}
            drawingPoints={drawingPoints}
            onStartDraw={handleStartDrawAnnotation}
            onUndoPoint={handleUndoPoint}
            onClearDraw={handleClearDraw}
            onCancelDraw={handleCancelAnnotationDraw}
            onSave={handleSaveAnnotation}
            onSaveMeta={handleSaveAnnotationMeta}
            onDelete={handleDeleteAnnotation}
            onClose={handleCloseAnnotationToolbar}
            saving={savingAnnotation}
          />
        )}
      </AnimatePresence>

      {uploadModalOpen && (
        <UploadBackgroundModal
          location={location_}
          floor={floor}
          hasBackground={!!backgroundsByFloorKey[floorKey]}
          uploading={uploading}
          error={uploadError}
          onClose={() => setUploadModalOpen(false)}
          onUpload={handleUploadBackground}
          onDelete={handleDeleteBackground}
        />
      )}
    </div>
  );
}
