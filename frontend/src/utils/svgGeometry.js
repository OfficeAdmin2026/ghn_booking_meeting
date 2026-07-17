/** Tâm của 1 polygon SVG (trung bình toạ độ các đỉnh) — dùng cho POI dạng vùng. */
export function polygonCentroid(pointsStr) {
  const pts = pointsStr.trim().split(/\s+/).map((p) => p.split(',').map(Number));
  const x = pts.reduce((sum, p) => sum + p[0], 0) / pts.length;
  const y = pts.reduce((sum, p) => sum + p[1], 0) / pts.length;
  return { x, y };
}

/** Toạ độ tâm của 1 POI bất kể là dạng điểm (x,y) hay vùng (points). */
export function poiCenter(poi) {
  return poi.shape === 'polygon' ? polygonCentroid(poi.points) : { x: poi.x, y: poi.y };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** POI gần nhất theo `type` so với 1 điểm đích, hoặc null nếu tầng không có loại đó. */
export function nearestPoiOfType(pois, type, target) {
  if (!target) return null;
  const candidates = pois.filter((p) => p.type === type);
  if (!candidates.length) return null;
  let best = null;
  let bestDist = Infinity;
  for (const p of candidates) {
    const center = poiCenter(p);
    const d = distance(center, target);
    if (d < bestDist) {
      bestDist = d;
      best = center;
    }
  }
  return best;
}
