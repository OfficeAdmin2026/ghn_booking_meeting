import { useEffect, useMemo, useRef, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { AnimatePresence } from 'framer-motion';
import {
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingOutIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import Room from './Room';
import POIMarker from './POIMarker';
import MiniMap from './MiniMap';
import DirectionArrow from './DirectionArrow';
import { nearestPoiOfType, screenPointToSvg, pointsToSvgString } from '../../utils/svgGeometry';
import { findCorridorPath } from '../../utils/corridorPath';

const ZOOM_STORAGE_PREFIX = 'ghn_office_map_zoom__';

function readSavedTransform(floorKey) {
  try {
    const raw = sessionStorage.getItem(ZOOM_STORAGE_PREFIX + floorKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveTransform(floorKey, ref) {
  if (!ref) return;
  try {
    sessionStorage.setItem(
      ZOOM_STORAGE_PREFIX + floorKey,
      JSON.stringify({ scale: ref.state.scale, positionX: ref.state.positionX, positionY: ref.state.positionY })
    );
  } catch {
    // sessionStorage not available (private mode etc.) — silently skip, zoom just won't persist
  }
}

export default function MapCanvas({
  floorKey,
  floorData,
  roomsByCode,
  statusByCode,
  selectedCode,
  highlightedCode,
  hoveredCode,
  onRoomHover,
  onRoomClick,
  filters,
  focusRequest,
  showDirection,
  savedPathsByRoomId,
  activeDrawTool,
  drawingPoints,
  onCanvasPoint,
  isAdmin,
  onAnnotationClick,
}) {
  const transformRef = useRef(null);
  const wrapperRef = useRef(null);
  const svgRef = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    if (!focusRequest || !transformRef.current) return;
    transformRef.current.zoomToElement(focusRequest.domId, 1.3, 600);
  }, [focusRequest]);

  // Mũi tên chỉ đường: ưu tiên đường admin đã vẽ tay và lưu (chính xác nhất);
  // nếu phòng chưa có, fallback về đường tự tính qua corridorGraph của tầng.
  const directionPath = useMemo(() => {
    if (!floorData || !showDirection || !selectedCode) return null;
    const room = roomsByCode[selectedCode];
    const geometry = floorData.rooms.find((r) => r.code === selectedCode);
    if (!geometry) return null;

    const saved = room && savedPathsByRoomId?.[room.id];
    if (saved) return saved;

    const from = nearestPoiOfType(floorData.pois, 'elevator', geometry.centroid);
    if (!from) return null;
    return findCorridorPath(floorData.corridorGraph, from, geometry.centroid);
  }, [floorData, showDirection, selectedCode, roomsByCode, savedPathsByRoomId]);

  const handleSvgClick = (e) => {
    if (!activeDrawTool || !svgRef.current) return;
    const point = screenPointToSvg(svgRef.current, e.clientX, e.clientY);
    onCanvasPoint?.(point);
  };

  if (!floorData) {
    return <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Chưa có dữ liệu bản đồ cho tầng này</div>;
  }

  const { canvas, rooms, pois } = floorData;
  const saved = readSavedTransform(floorKey);

  return (
    <div ref={wrapperRef} className="relative flex-1 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
      <TransformWrapper
        key={floorKey}
        ref={transformRef}
        initialScale={saved?.scale ?? 1}
        initialPositionX={saved?.positionX ?? 0}
        initialPositionY={saved?.positionY ?? 0}
        minScale={0.4}
        maxScale={4}
        limitToBounds={false}
        onZoomStop={(ref) => saveTransform(floorKey, ref.instance)}
        onPanningStop={(ref) => saveTransform(floorKey, ref.instance)}
        onPinchStop={(ref) => saveTransform(floorKey, ref.instance)}
      >
        {(controls) => (
          <>
            {/* Toolbar */}
            <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => controls.zoomIn()}
                className="bg-white shadow-sm border border-gray-200 rounded-lg p-2 hover:bg-gray-50 transition-colors"
                title="Phóng to"
              >
                <MagnifyingGlassPlusIcon className="w-4 h-4 text-gray-600" />
              </button>
              <button
                type="button"
                onClick={() => controls.zoomOut()}
                className="bg-white shadow-sm border border-gray-200 rounded-lg p-2 hover:bg-gray-50 transition-colors"
                title="Thu nhỏ"
              >
                <MagnifyingGlassMinusIcon className="w-4 h-4 text-gray-600" />
              </button>
              <button
                type="button"
                onClick={() => controls.resetTransform()}
                className="bg-white shadow-sm border border-gray-200 rounded-lg p-2 hover:bg-gray-50 transition-colors"
                title="Đặt lại góc nhìn"
              >
                <ArrowPathIcon className="w-4 h-4 text-gray-600" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!document.fullscreenElement) wrapperRef.current?.requestFullscreen?.();
                  else document.exitFullscreen?.();
                }}
                className="bg-white shadow-sm border border-gray-200 rounded-lg p-2 hover:bg-gray-50 transition-colors"
                title={fullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
              >
                <ArrowsPointingOutIcon className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <MiniMap floorData={floorData} roomsByCode={roomsByCode} statusByCode={statusByCode} />

            <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${canvas.width} ${canvas.height}`}
                className={`w-full h-full ${activeDrawTool ? 'cursor-crosshair' : ''}`}
                style={{ minWidth: canvas.width, minHeight: canvas.height }}
                onClick={handleSvgClick}
              >
                <defs>
                  <marker id="direction-arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                    <path d="M0,0 L8,4 L0,8 Z" fill="#1B5FAF" />
                  </marker>
                </defs>

                {floorData.background && (
                  <image
                    href={floorData.background.src}
                    x={0}
                    y={0}
                    width={canvas.width}
                    height={canvas.height}
                    preserveAspectRatio="xMidYMid meet"
                  />
                )}

                {filters.room &&
                  rooms.map((r) => {
                    const room = roomsByCode[r.code];
                    if (!room) return null;
                    // Đang vẽ lại khung của chính phòng này — ẩn khung cũ để nhìn rõ ảnh nền bên dưới mà đồ theo
                    if (activeDrawTool === 'shape' && selectedCode === r.code) return null;
                    return (
                      <g key={r.code} id={`room-${r.code}`}>
                        <Room
                          code={r.code}
                          points={r.points}
                          centroid={r.centroid}
                          label={room.name}
                          status={statusByCode[room.id] || 'available'}
                          selected={selectedCode === r.code}
                          highlighted={highlightedCode === r.code}
                          hovered={hoveredCode === r.code}
                          onHover={onRoomHover}
                          onClick={activeDrawTool ? undefined : onRoomClick}
                          hideLabel={!!floorData.background}
                        />
                      </g>
                    );
                  })}

                {/* Tầng đã có ảnh sơ đồ thật thì icon/note POI tĩnh đã có sẵn trong ảnh, không vẽ chồng nữa —
                    riêng khu vực chung do admin tự vẽ (custom) luôn hiển thị vì đó chính là mục đích tính năng này */}
                {pois
                  .filter((p) => filters[p.type] && (p.custom || !floorData.background))
                  .map((p) => (
                    <g key={p.id} id={`poi-${p.id}`}>
                      <POIMarker
                        {...p}
                        onClick={p.custom && isAdmin && !activeDrawTool ? () => onAnnotationClick?.(p) : undefined}
                      />
                    </g>
                  ))}

                <AnimatePresence>
                  {!activeDrawTool && directionPath && <DirectionArrow key={selectedCode} points={directionPath} />}
                </AnimatePresence>

                {activeDrawTool && drawingPoints?.length > 0 && (
                  <g className="pointer-events-none">
                    {drawingPoints.length > 1 && (
                      <polyline
                        points={pointsToSvgString(
                          (activeDrawTool === 'shape' || activeDrawTool === 'annotation') && drawingPoints.length >= 3
                            ? [...drawingPoints, drawingPoints[0]]
                            : drawingPoints
                        )}
                        fill={activeDrawTool === 'shape' || activeDrawTool === 'annotation' ? '#FF6C0A' : 'none'}
                        fillOpacity={activeDrawTool === 'shape' || activeDrawTool === 'annotation' ? 0.15 : 0}
                        stroke="#FF6C0A"
                        strokeWidth={3}
                        strokeDasharray="6 5"
                      />
                    )}
                    {drawingPoints.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r={5} fill="#FF6C0A" stroke="white" strokeWidth={1.5} />
                    ))}
                  </g>
                )}
              </svg>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}
