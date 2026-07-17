/**
 * Tìm đường đi theo hành lang (không cắt xuyên tường) từ 1 điểm tới 1 điểm
 * khác, dựa trên đồ thị waypoint hành lang của từng tầng (`floorData.corridorGraph`).
 * Nếu tầng chưa khai báo corridorGraph, trả về đường thẳng như cũ (fallback).
 */

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function nearestNodeId(nodes, point) {
  let best = null;
  let bestDist = Infinity;
  for (const id of Object.keys(nodes)) {
    const d = dist(nodes[id], point);
    if (d < bestDist) {
      bestDist = d;
      best = id;
    }
  }
  return best;
}

/** Dijkstra trên đồ thị nhỏ (vài node) — đủ nhanh, không cần thư viện ngoài. */
function shortestNodePath(nodes, edges, startId, endId) {
  const adjacency = {};
  Object.keys(nodes).forEach((id) => { adjacency[id] = []; });
  edges.forEach(([a, b]) => {
    const d = dist(nodes[a], nodes[b]);
    adjacency[a].push({ id: b, d });
    adjacency[b].push({ id: a, d });
  });

  const distances = {};
  const prev = {};
  Object.keys(nodes).forEach((id) => { distances[id] = Infinity; });
  distances[startId] = 0;
  const unvisited = new Set(Object.keys(nodes));

  while (unvisited.size) {
    let current = null;
    let currentDist = Infinity;
    for (const id of unvisited) {
      if (distances[id] < currentDist) {
        currentDist = distances[id];
        current = id;
      }
    }
    if (current === null || current === endId) break;
    unvisited.delete(current);
    for (const { id: neighbor, d } of adjacency[current]) {
      const alt = distances[current] + d;
      if (alt < distances[neighbor]) {
        distances[neighbor] = alt;
        prev[neighbor] = current;
      }
    }
  }

  if (!(endId in prev) && startId !== endId) return null;
  const path = [];
  let cur = endId;
  while (cur !== undefined) {
    path.unshift(cur);
    cur = prev[cur];
  }
  return path[0] === startId ? path : null;
}

/** Trả về mảng điểm {x,y} nối `from` -> `to` đi theo hành lang của tầng. */
export function findCorridorPath(corridorGraph, from, to) {
  if (!corridorGraph || !from || !to) return [from, to].filter(Boolean);

  const { nodes, edges } = corridorGraph;
  const startNode = nearestNodeId(nodes, from);
  const endNode = nearestNodeId(nodes, to);
  if (!startNode || !endNode) return [from, to];

  const nodePath = shortestNodePath(nodes, edges, startNode, endNode);
  if (!nodePath) return [from, to];

  return [from, ...nodePath.map((id) => nodes[id]), to];
}
