import { Point } from './types';

/**
 * Calculates the area of a polygon using the Shoelace formula
 */
export function polygonArea(vertices: Point[]): number {
  const n = vertices.length;
  if (n < 3) return 0;
  
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return Math.abs(area) / 2;
}

/**
 * Returns the bounding box of a polygon
 */
export function getBoundingBox(vertices: Point[]) {
  if (vertices.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }
  let minX = vertices[0].x;
  let maxX = vertices[0].x;
  let minY = vertices[0].y;
  let maxY = vertices[0].y;
  
  for (let i = 1; i < vertices.length; i++) {
    const p = vertices[i];
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY };
}

/**
 * Checks if a point is inside a polygon using the ray-casting algorithm
 */
export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  const n = polygon.length;
  let inside = false;
  
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    
    const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / (yj - yi + 1e-10) + xi);
    if (intersect) inside = !inside;
  }
  
  return inside;
}

/**
 * Sutherland-Hodgman polygon clipping
 * Clips subjectPoly against convex clipperPoly.
 * Returns the vertices of the clipped polygon representing their intersection.
 */
export function intersectPolygons(subjectPoly: Point[], clipperPoly: Point[]): Point[] {
  if (subjectPoly.length < 3 || clipperPoly.length < 3) return [];

  let outputList = [...subjectPoly];
  
  // For each edge of the clipper polygon
  const len = clipperPoly.length;
  for (let i = 0; i < len; i++) {
    const clipEdgeStart = clipperPoly[i];
    const clipEdgeEnd = clipperPoly[(i + 1) % len];
    
    const inputList = outputList;
    outputList = [];
    
    if (inputList.length === 0) break;
    
    let s = inputList[inputList.length - 1];
    
    for (let j = 0; j < inputList.length; j++) {
      const p = inputList[j];
      
      if (isInsideClipEdge(p, clipEdgeStart, clipEdgeEnd)) {
        if (!isInsideClipEdge(s, clipEdgeStart, clipEdgeEnd)) {
          const intersectionPoint = getIntersection(s, p, clipEdgeStart, clipEdgeEnd);
          if (intersectionPoint) outputList.push(intersectionPoint);
        }
        outputList.push(p);
      } else if (isInsideClipEdge(s, clipEdgeStart, clipEdgeEnd)) {
        const intersectionPoint = getIntersection(s, p, clipEdgeStart, clipEdgeEnd);
        if (intersectionPoint) outputList.push(intersectionPoint);
      }
      s = p;
    }
  }
  
  return cleanDuplicateVertices(outputList);
}

// Helper to determine if a point is to the left of the clip edge (inside the half-plane)
function isInsideClipEdge(p: Point, edgeStart: Point, edgeEnd: Point): boolean {
  // Cross product (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
  // Positive cross product means point is on the left side of the directed edge.
  // We assume vertices are ordered counter-clockwise (or clockwise, but consistently).
  // Standard implementation:
  return (edgeEnd.x - edgeStart.x) * (p.y - edgeStart.y) - (edgeEnd.y - edgeStart.y) * (p.x - edgeStart.x) >= -1e-6;
}

// Helper to find the intersection of two line segments
function getIntersection(s: Point, p: Point, c1: Point, c2: Point): Point | null {
  const dc12 = { x: c1.x - c2.x, y: c1.y - c2.y };
  const dsp = { x: s.x - p.x, y: s.y - p.y };
  
  const denominator = dc12.x * dsp.y - dc12.y * dsp.x;
  
  if (Math.abs(denominator) < 1e-10) {
    return null; // Parallel lines
  }
  
  const c = c1.x * c2.y - c1.y * c2.x;
  const d = s.x * p.y - s.y * p.x;
  
  const nx = c * dsp.x - dc12.x * d;
  const ny = c * dsp.y - dc12.y * d;
  
  return {
    x: nx / denominator,
    y: ny / denominator
  };
}

// Clean consecutive or closed duplicate vertices
function cleanDuplicateVertices(vertices: Point[]): Point[] {
  if (vertices.length < 3) return [];
  const result: Point[] = [];
  
  for (let i = 0; i < vertices.length; i++) {
    const p1 = vertices[i];
    const p2 = vertices[(i + 1) % vertices.length];
    
    // Check distance between consecutive vertices
    const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
    if (dist > 1e-3) {
      result.push(p1);
    }
  }
  
  return result.length >= 3 ? result : [];
}

/**
 * Scales, translates, or rotates a set of vertices
 */
export function transformVertices(vertices: Point[], dx: number, dy: number, angleRad: number = 0): Point[] {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  
  return vertices.map(p => {
    // Rotate around origin, then translate
    const rx = p.x * cos - p.y * sin;
    const ry = p.x * sin + p.y * cos;
    return {
      x: rx + dx,
      y: ry + dy
    };
  });
}
