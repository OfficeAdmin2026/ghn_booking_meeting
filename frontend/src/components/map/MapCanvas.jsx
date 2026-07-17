import { useEffect, useRef, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import {
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingOutIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import Room from './Room';
import POIMarker from './POIMarker';
import MiniMap from './MiniMap';

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
}) {
  const transformRef = useRef(null);
  const wrapperRef = useRef(null);
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
              <svg viewBox={`0 0 ${canvas.width} ${canvas.height}`} className="w-full h-full" style={{ minWidth: canvas.width, minHeight: canvas.height }}>
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
                          onClick={onRoomClick}
                          hideLabel={!!floorData.background}
                        />
                      </g>
                    );
                  })}

                {pois.filter((p) => filters[p.type]).map((p) => (
                  <g key={p.id} id={`poi-${p.id}`}>
                    <POIMarker {...p} />
                  </g>
                ))}
              </svg>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}
