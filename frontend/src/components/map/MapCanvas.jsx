import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { AnimatePresence, motion } from 'framer-motion';
import {
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingOutIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import POIMarker from './POIMarker';
import MiniMap from './MiniMap';
import DirectionArrow from './DirectionArrow';
import { nearestPoiOfType, screenPointToSvg, pointsToSvgString } from '../../utils/svgGeometry';
import { findCorridorPath } from '../../utils/corridorPath';

function orthoSnap(prev, curr) {
  const dx = Math.abs(curr.x - prev.x);
  const dy = Math.abs(curr.y - prev.y);
  return dx >= dy ? { x: curr.x, y: prev.y } : { x: prev.x, y: curr.y };
}

export default function MapCanvas({
  floorKey,
  floorData,
  roomsByCode,
  statusByCode,
  selectedCode,
  focusRequest,
  showDirection,
  savedPathsByRoomId,
  activeDrawTool,
  drawingPoints,
  onCanvasPoint,
  onRectComplete,
  isAdmin,
  onAnnotationClick,
}) {
  const transformRef = useRef(null);
  const wrapperRef = useRef(null);
  const svgRef = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [dragState, setDragState] = useState(null); // { start: {x,y}, current: {x,y} }
  const [cursorSvgPos, setCursorSvgPos] = useState(null);

  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const directionPathRef = useRef(null);

  useEffect(() => {
    if (!focusRequest || !transformRef.current) return;
    const path = directionPathRef.current;
    if (path && path.length >= 2) {
      // Zoom to fit the full direction path bbox instead of just the room
      transformRef.current.zoomToElement('direction-path-focus', undefined, 600);
    } else {
      transformRef.current.zoomToElement(focusRequest.domId, 1.3, 600);
    }
  }, [focusRequest]);

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

  // Sync ref before effects fire so focusRequest effect reads the latest path
  useLayoutEffect(() => { directionPathRef.current = directionPath; }, [directionPath]);

  // Rect drag handlers (shape drawing mode)
  const handleMouseDown = (e) => {
    if (activeDrawTool !== 'shape' || !svgRef.current) return;
    e.stopPropagation();
    const point = screenPointToSvg(svgRef.current, e.clientX, e.clientY);
    setDragState({ start: point, current: point });
  };

  const handleMouseMove = (e) => {
    if (!svgRef.current) return;
    const point = screenPointToSvg(svgRef.current, e.clientX, e.clientY);
    if (dragState) setDragState((s) => s ? { ...s, current: point } : null);
    if (activeDrawTool === 'path') setCursorSvgPos(point);
  };

  const handleMouseUp = (e) => {
    if (!dragState || !svgRef.current) return;
    const point = screenPointToSvg(svgRef.current, e.clientX, e.clientY);
    const { start } = dragState;
    setDragState(null);

    const x1 = Math.min(start.x, point.x);
    const y1 = Math.min(start.y, point.y);
    const x2 = Math.max(start.x, point.x);
    const y2 = Math.max(start.y, point.y);

    if (x2 - x1 > 10 && y2 - y1 > 10) {
      onRectComplete?.([
        { x: x1, y: y1 },
        { x: x2, y: y1 },
        { x: x2, y: y2 },
        { x: x1, y: y2 },
      ]);
    }
  };

  // Click handler only for path mode
  const handleSvgClick = (e) => {
    if (activeDrawTool !== 'path' || !svgRef.current) return;
    const raw = screenPointToSvg(svgRef.current, e.clientX, e.clientY);
    const lastPt = drawingPoints?.length > 0 ? drawingPoints[drawingPoints.length - 1] : null;
    const point = lastPt ? orthoSnap(lastPt, raw) : raw;
    onCanvasPoint?.(point);
  };

  if (!floorData) {
    return <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Chưa có dữ liệu bản đồ cho tầng này</div>;
  }

  const { canvas, rooms, pois } = floorData;

  // Room geometry for the direction target (need centroid for focusRequest id)
  const directionTargetGeometry = showDirection && selectedCode
    ? rooms.find((r) => r.code === selectedCode)
    : null;

  return (
    <div ref={wrapperRef} className="relative flex-1 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
      <TransformWrapper
        key={floorKey}
        ref={transformRef}
        wrapperClass="w-full h-full"
        initialScale={1}
        initialPositionX={0}
        initialPositionY={0}
        minScale={0.4}
        maxScale={4}
        limitToBounds={false}
      >
        {(controls) => (
          <>
            {/* Orthogonal snap badge */}
            {activeDrawTool === 'path' && (
              <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-white/90 border border-ghn-orange/40 text-ghn-orange text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-sm pointer-events-none select-none">
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <path d="M2 14 L2 2 L14 2" />
                </svg>
                Vuông góc
              </div>
            )}

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
                onClick={handleSvgClick}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => setCursorSvgPos(null)}
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

                {/* Khung phòng: chỉ hiện khi đang xem chỉ dẫn đến phòng đó — đỏ nhạt + nhấp nháy */}
                {directionTargetGeometry && !activeDrawTool && (
                  <motion.polygon
                    key={selectedCode}
                    points={directionTargetGeometry.points}
                    fill="#FEE2E2"
                    stroke="#DC2626"
                    strokeWidth={3}
                    animate={{ fillOpacity: [0.7, 0.2, 0.7] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                    className="pointer-events-none"
                  />
                )}

                {/* Invisible hit areas for room clicks (không hiện khung nhưng vẫn clickable) */}
                {!activeDrawTool && rooms.map((r) => {
                  const room = roomsByCode[r.code];
                  if (!room) return null;
                  return (
                    <g key={r.code} id={`room-${r.code}`}>
                      <polygon
                        points={r.points}
                        fill="transparent"
                        stroke="none"
                        className="cursor-pointer"
                        onClick={() => {}}
                      />
                    </g>
                  );
                })}

                {pois
                  .filter((p) => p.custom || !floorData.background)
                  .map((p) => (
                    <g key={p.id} id={`poi-${p.id}`}>
                      <POIMarker
                        {...p}
                        onClick={p.custom && isAdmin && !activeDrawTool ? () => onAnnotationClick?.(p) : undefined}
                      />
                    </g>
                  ))}

                {/* Invisible rect spanning full direction path bbox — used by focusRequest to zoom-to-fit */}
                {!activeDrawTool && directionPath && directionPath.length >= 2 && (() => {
                  const pad = 80;
                  const xs = directionPath.map((p) => p.x);
                  const ys = directionPath.map((p) => p.y);
                  const x = Math.min(...xs) - pad;
                  const y = Math.min(...ys) - pad;
                  const w = Math.max(Math.max(...xs) - Math.min(...xs) + 2 * pad, 300);
                  const h = Math.max(Math.max(...ys) - Math.min(...ys) + 2 * pad, 300);
                  return (
                    <rect
                      id="direction-path-focus"
                      x={x} y={y} width={w} height={h}
                      fill="transparent" stroke="none"
                      className="pointer-events-none"
                    />
                  );
                })()}

                <AnimatePresence>
                  {!activeDrawTool && directionPath && <DirectionArrow key={selectedCode} points={directionPath} />}
                </AnimatePresence>

                {/* Drag preview: hình chữ nhật đang kéo (shape mode) */}
                {activeDrawTool === 'shape' && dragState && (
                  <rect
                    x={Math.min(dragState.start.x, dragState.current.x)}
                    y={Math.min(dragState.start.y, dragState.current.y)}
                    width={Math.abs(dragState.current.x - dragState.start.x)}
                    height={Math.abs(dragState.current.y - dragState.start.y)}
                    fill="#FF6C0A"
                    fillOpacity={0.15}
                    stroke="#FF6C0A"
                    strokeWidth={2}
                    strokeDasharray="6 5"
                    className="pointer-events-none"
                  />
                )}

                {/* Path drawing: click-by-click points */}
                {activeDrawTool === 'path' && drawingPoints?.length > 0 && (
                  <g className="pointer-events-none">
                    {drawingPoints.length > 1 && (
                      <polyline
                        points={pointsToSvgString(drawingPoints)}
                        fill="none"
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

                {/* Ghost preview: snapped position while hovering */}
                {activeDrawTool === 'path' && cursorSvgPos && drawingPoints?.length > 0 && (() => {
                  const last = drawingPoints[drawingPoints.length - 1];
                  const snapped = orthoSnap(last, cursorSvgPos);
                  const isHoriz = snapped.y === last.y;
                  return (
                    <g className="pointer-events-none">
                      <line
                        x1={last.x} y1={last.y}
                        x2={snapped.x} y2={snapped.y}
                        stroke="#FF6C0A"
                        strokeWidth={2}
                        strokeOpacity={0.45}
                        strokeDasharray="5 4"
                      />
                      {/* right-angle indicator */}
                      {(() => {
                        const size = 12;
                        const sx = isHoriz ? (snapped.x > last.x ? last.x + size : last.x - size) : last.x;
                        const sy = isHoriz ? last.y : (snapped.y > last.y ? last.y + size : last.y - size);
                        const cx = isHoriz ? sx : last.x + (snapped.x > last.x ? size : -size);
                        const cy = isHoriz ? last.y + (snapped.y > last.y ? size : -size) : sy;
                        return (
                          <path
                            d={`M ${sx} ${last.y} L ${cx} ${cy} L ${last.x} ${sy}`}
                            fill="none"
                            stroke="#FF6C0A"
                            strokeWidth={1.5}
                            strokeOpacity={0.5}
                          />
                        );
                      })()}
                      <circle cx={snapped.x} cy={snapped.y} r={5} fill="#FF6C0A" fillOpacity={0.4} stroke="white" strokeWidth={1.5} strokeOpacity={0.6} />
                    </g>
                  );
                })()}
              </svg>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}
