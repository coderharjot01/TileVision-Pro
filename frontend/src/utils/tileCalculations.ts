import { Point, Unit, Pattern, StartPosition, RoomShape, Room, RenderedTile, CalculationResult } from './types';
import { polygonArea, getBoundingBox, intersectPolygons, transformVertices, isPointInPolygon } from './geometry';

// Unit conversion helpers
export function convertToMm(val: number, unit: Unit): number {
  if (!val || isNaN(val)) return 0;
  switch (unit) {
    case 'ft': return val * 304.8;
    case 'in': return val * 25.4;
    case 'm': return val * 1000;
    case 'cm': return val * 10;
    case 'mm': return val;
    default: return val;
  }
}

export function convertFromMm(val: number, unit: Unit): number {
  if (!val || isNaN(val)) return 0;
  switch (unit) {
    case 'ft': return val / 304.8;
    case 'in': return val / 25.4;
    case 'm': return val / 1000;
    case 'cm': return val / 10;
    case 'mm': return val;
    default: return val;
  }
}

/**
 * Generates room vertices in mm based on shape and dimensions
 */
export function generateRoomVertices(
  shape: RoomShape,
  width: number,
  height: number,
  unit: Unit,
  options?: { w2?: number; h2?: number; w3?: number; h3?: number }
): Point[] {
  const w = convertToMm(width, unit);
  const h = convertToMm(height, unit);
  
  if (w <= 0 || h <= 0) return [];
  
  switch (shape) {
    case 'rectangle':
      return [
        { x: 0, y: 0 },
        { x: w, y: 0 },
        { x: w, y: h },
        { x: 0, y: h }
      ];
      
    case 'l-shape': {
      // Options w2 and h2 represent the inner notch cut-out dimensions in unit
      const w2 = convertToMm(options?.w2 || width * 0.5, unit);
      const h2 = convertToMm(options?.h2 || height * 0.5, unit);
      // L shape formed by:
      // Starting from (0,0), go to (w, 0), then down to (w, h - h2), left to (w - w2, h - h2),
      // down to (w - w2, h), left to (0, h), then up to (0,0).
      const cutX = Math.max(10, w - w2);
      const cutY = Math.max(10, h - h2);
      return [
        { x: 0, y: 0 },
        { x: w, y: 0 },
        { x: w, y: cutY },
        { x: cutX, y: cutY },
        { x: cutX, y: h },
        { x: 0, y: h }
      ];
    }
      
    case 'u-shape': {
      // U-shape is a rectangle with a notch cut out of the top or bottom
      // Let's do a top cut out
      const w2 = convertToMm(options?.w2 || width * 0.4, unit); // center cutout width
      const h2 = convertToMm(options?.h2 || height * 0.5, unit); // cutout depth
      
      const leftWidth = (w - w2) / 2;
      const rightStart = leftWidth + w2;
      
      return [
        { x: 0, y: 0 },
        { x: leftWidth, y: 0 },
        { x: leftWidth, y: h2 },
        { x: rightStart, y: h2 },
        { x: rightStart, y: 0 },
        { x: w, y: 0 },
        { x: w, y: h },
        { x: 0, y: h }
      ];
    }
      
    case 'custom':
      // Return rectangle as default, let RoomEditor override vertices directly
      return [
        { x: 0, y: 0 },
        { x: w, y: 0 },
        { x: w, y: h },
        { x: 0, y: h }
      ];
  }
}

/**
 * Calculates default box coverage and count
 */
export function calculateBoxes(totalTiles: number, tileWidthMm: number, tileHeightMm: number, tilesPerBox: number = 10): number {
  if (totalTiles <= 0) return 0;
  return Math.ceil(totalTiles / tilesPerBox);
}

/**
 * Calculates the perimeter of a 2D polygon defined by vertices
 */
export function calculatePolygonPerimeter(vertices: Point[]): number {
  let perimeter = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const p1 = vertices[i];
    const p2 = vertices[(i + 1) % n];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }
  return perimeter;
}

/**
 * Main calculation and layout engine.
 * Generates tiles, intersects them with the room, and aggregates statistics.
 */
export function calculateLayout(
  roomVertices: Point[],
  tileWidth: number, // in mm
  tileHeight: number, // in mm
  groutWidth: number, // in mm
  pattern: Pattern,
  startPosition: StartPosition,
  wastagePercent: number,
  tilePrice: number, // price per tile
  unit: Unit,
  offsetDrag: Point = { x: 0, y: 0 }, // support visual offset adjustment
  pricingMode: 'tile' | 'packet' = 'tile',
  packetPrice: number = 0,
  packetCoverage: number = 0,
  skirtingEnabled: boolean = false,
  skirtingHeight: number = 100 // in mm
): CalculationResult {
  if (roomVertices.length < 3 || tileWidth <= 0 || tileHeight <= 0) {
    return {
      totalAreaMm2: 0,
      totalAreaDisplay: 0,
      fullTilesCount: 0,
      cutTilesCount: 0,
      tilesRequired: 0,
      wastageTilesCount: 0,
      finalTilesNeededCount: 0,
      boxesRequired: 0,
      estimatedCost: 0,
      tilesData: []
    };
  }

  // Calculate room area using shoelace formula
  const totalAreaMm2 = polygonArea(roomVertices);
  
  // Convert area to display unit squared
  // e.g. for 'ft', we convert mm2 to ft2: areaMm2 / (304.8 * 304.8)
  const factor = convertToMm(1, unit);
  const totalAreaDisplay = totalAreaMm2 / (factor * factor);

  // Find room bounding box
  const { minX, maxX, minY, maxY } = getBoundingBox(roomVertices);
  const roomW = maxX - minX;
  const roomH = maxY - minY;

  // Determine grid alignment origin based on startPosition
  let originX = minX;
  let originY = minY;

  switch (startPosition) {
    case 'center':
      originX = minX + roomW / 2;
      originY = minY + roomH / 2;
      break;
    case 'corner':
      originX = minX;
      originY = minY;
      break;
    case 'left':
      originX = minX;
      originY = minY + roomH / 2;
      break;
    case 'right':
      originX = maxX;
      originY = minY + roomH / 2;
      break;
  }

  // Apply drag offset if any
  originX += offsetDrag.x;
  originY += offsetDrag.y;

  const tilesData: RenderedTile[] = [];
  const nominalTileArea = tileWidth * tileHeight;

  // Generate tile polygons depending on pattern
  // To cover the entire room, we tile a bounding box larger than the room
  // We use a large grid range. Rotated patterns require wider coverage.
  const maxDim = Math.max(roomW, roomH, tileWidth, tileHeight) * 2;
  const colStep = tileWidth + groutWidth;
  const rowStep = tileHeight + groutWidth;

  const colsNeeded = Math.ceil(maxDim / colStep) + 6;
  const rowsNeeded = Math.ceil(maxDim / rowStep) + 6;

  let tileIdCounter = 0;

  for (let r = -rowsNeeded; r <= rowsNeeded; r++) {
    for (let c = -colsNeeded; c <= colsNeeded; c++) {
      let tileVertices: Point[] = [];
      let angle = 0;

      if (pattern === 'straight') {
        let x = originX + c * colStep;
        let y = originY + r * rowStep;
        
        // Offset straight so it's centered if startPosition is center
        if (startPosition === 'center') {
          x -= tileWidth / 2;
          y -= tileHeight / 2;
        } else if (startPosition === 'right') {
          x -= tileWidth;
          y -= tileHeight / 2;
        } else if (startPosition === 'left') {
          y -= tileHeight / 2;
        }

        tileVertices = [
          { x, y },
          { x: x + tileWidth, y },
          { x: x + tileWidth, y: y + tileHeight },
          { x, y: y + tileHeight }
        ];
      } 
      
      else if (pattern === 'brick') {
        // Alternate rows are shifted by 50% of the tile width
        const shiftX = (r % 2 === 0) ? 0 : tileWidth / 2;
        let x = originX + c * colStep + shiftX;
        let y = originY + r * rowStep;

        if (startPosition === 'center') {
          x -= tileWidth / 2;
          y -= tileHeight / 2;
        } else if (startPosition === 'right') {
          x -= tileWidth;
          y -= tileHeight / 2;
        } else if (startPosition === 'left') {
          y -= tileHeight / 2;
        }

        tileVertices = [
          { x, y },
          { x: x + tileWidth, y },
          { x: x + tileWidth, y: y + tileHeight },
          { x, y: y + tileHeight }
        ];
      } 
      
      else if (pattern === 'diagonal') {
        angle = Math.PI / 4; // 45 degrees
        
        // Generate relative grid tile
        let rx = c * (tileWidth + groutWidth);
        let ry = r * (tileHeight + groutWidth);
        
        if (startPosition === 'center') {
          rx -= tileWidth / 2;
          ry -= tileHeight / 2;
        }

        const localVertices = [
          { x: rx, y: ry },
          { x: rx + tileWidth, y: ry },
          { x: rx + tileWidth, y: ry + tileHeight },
          { x: rx, y: ry + tileHeight }
        ];

        // Rotate local vertices by 45 degrees around local (0, 0)
        // and translate to origin
        tileVertices = transformVertices(localVertices, originX, originY, angle);
      } 
      
      else if (pattern === 'herringbone') {
        // Herringbone is generated in interlocking vertical and horizontal blocks.
        // Let's create two tiles for each grid cell coordinate:
        // A vertical tile, and a horizontal tile locking it.
        // To make it look stunning, we rotate the grid by 45 degrees.
        // Let's define the two tiles relative to (0,0) first, then rotate them.
        
        // A standard Herringbone cell size:
        // Tile 1 (vertical): x: [0, W], y: [0, L]
        // Tile 2 (horizontal): x: [W, W + L], y: [L - W, L]
        // Grid spacing vector:
        // Cell width = L + W, Cell height = L + W (with interlocking, shifts occur)
        // Let's place they lock cleanly.
        
        // More robust: Herringbone as alternating columns of 45-degree slanted tiles
        // Let's generate:
        // Tile 1: Angle = 45 degrees
        // Tile 2: Angle = -45 degrees
        
        const cellW = tileLengthRatioHerringbone(tileWidth, tileHeight);
        const L = Math.max(tileWidth, tileHeight);
        const W = Math.min(tileWidth, tileHeight);
        
        // Generate Herringbone lattice:
        // Each lattice point contains one tile of W x L
        // In Herringbone, columns alternate angle (e.g. c is column index, r is row index)
        // Let's generate orthogonal herringbone, then rotate by 45 degrees.
        // Lattice equations:
        // Let's generate a vertical tile:
        // Bottom-left at: x_base = c * (W + L), y_base = r * W
        // If column c is even, we place a vertical tile, if odd we place a horizontal one.
        // To keep it simple and visually perfect:
        // We generate tiles of size W x L.
        // Let's do a standard rectangular grid rotated 45 degrees:
        // Tile A (vertical): [c * W, r * (L + W)] -> rotate 45
        // Let's define a clean interlock.
        
        // Standard Herringbone generator:
        const unit = L + Grout(groutWidth);
        const xOffset = c * (L + W + groutWidth * 2);
        const yOffset = r * (L + W + groutWidth * 2);
        
        // We will generate two interlocking tiles per (c, r) cell:
        // Tile 1 (Slanted right 45deg):
        const t1_local = [
          { x: 0, y: 0 },
          { x: W, y: 0 },
          { x: W, y: L },
          { x: 0, y: L }
        ];
        
        // Tile 2 (Slanted left -45deg, locking against Tile 1):
        // Positioned at (W, L - W) relative to Tile 1, rotated by 90 degrees (which becomes -45deg after 45deg rotation)
        const t2_local = [
          { x: W, y: L - W },
          { x: W + L, y: L - W },
          { x: W + L, y: L },
          { x: W, y: L }
        ];

        // Apply grid offsets to the local structures
        const t1_grid = t1_local.map(p => ({ x: p.x + xOffset, y: p.y + yOffset }));
        const t2_grid = t2_local.map(p => ({ x: p.x + xOffset, y: p.y + yOffset }));

        // Center Herringbone pattern
        let dx = originX;
        let dy = originY;
        if (startPosition === 'center') {
          dx -= (L + W) / 2;
          dy -= (L + W) / 2;
        }

        // Rotate everything by 45 degrees around the origin
        const tile1 = transformVertices(t1_grid, dx, dy, Math.PI / 4);
        const tile2 = transformVertices(t2_grid, dx, dy, Math.PI / 4);

        // Process Tile 1
        processTile(tile1, W, L, c, r, Math.PI / 4, `t1-${tileIdCounter++}`);
        // Process Tile 2
        processTile(tile2, L, W, c, r, -Math.PI / 4, `t2-${tileIdCounter++}`);
        continue;
      } 
      
      else if (pattern === 'chevron') {
        // Chevron pattern uses parallelograms
        // A Chevron tile is a parallelogram with ends slanted at 45 degrees.
        // Let's model a parallelogram:
        // Width (W) is width of plank, Length (L) is length of plank.
        const L = Math.max(tileWidth, tileHeight);
        const W = Math.min(tileWidth, tileHeight);
        
        // Height of a Chevron row is L * sin(45) = L * 0.7071
        // Width of a column is W / sin(45) = W * 1.4142
        const slantAngle = Math.PI / 4; // 45 degrees
        const rowH = L * Math.sin(slantAngle) + groutWidth;
        const colW = W / Math.sin(slantAngle) + groutWidth;
        
        // Row position
        const y = originY + r * rowH;
        // Shift column alignment
        const dx = r * L * Math.cos(slantAngle); 
        const x = originX + c * colW + dx;
        
        // If row is even, slant is right-up:
        // Vertices relative to (x, y):
        // A Chevron tile goes from left edge to right edge
        // A row contains Chevron tiles next to each other.
        // Let's build the parallelogram corners.
        // Even rows: slant right. Odd rows: slant left.
        const isEven = Math.abs(r) % 2 === 0;
        
        if (isEven) {
          tileVertices = [
            { x: x, y: y },
            { x: x + colW - groutWidth, y: y },
            { x: x + colW - groutWidth + L * Math.cos(slantAngle), y: y + rowH - groutWidth },
            { x: x + L * Math.cos(slantAngle), y: y + rowH - groutWidth }
          ];
          angle = slantAngle;
        } else {
          // Odd rows slant the opposite direction to form the chevron lock
          tileVertices = [
            { x: x + L * Math.cos(slantAngle), y: y },
            { x: x + colW - groutWidth + L * Math.cos(slantAngle), y: y },
            { x: x + colW - groutWidth, y: y + rowH - groutWidth },
            { x: x, y: y + rowH - groutWidth }
          ];
          angle = -slantAngle;
        }
      }

      processTile(tileVertices, tileWidth, tileHeight, c, r, angle, `tile-${tileIdCounter++}`);
    }
  }

  function processTile(
    tileVertices: Point[],
    w: number,
    h: number,
    c: number,
    r: number,
    angle: number,
    id: string
  ) {
    if (tileVertices.length < 3) return;
    
    // First verify if tile overlaps the room's bounding box to optimize performance
    const tileBox = getBoundingBox(tileVertices);
    const roomBox = getBoundingBox(roomVertices);
    
    if (tileBox.maxX < roomBox.minX || tileBox.minX > roomBox.maxX ||
        tileBox.maxY < roomBox.minY || tileBox.minY > roomBox.maxY) {
      return; // No overlap with bounding box, discard
    }

    // Intersect the tile polygon with the room polygon
    const clippedVertices = intersectPolygons(roomVertices, tileVertices);
    
    if (clippedVertices.length >= 3) {
      const clippedArea = polygonArea(clippedVertices);
      const originalArea = polygonArea(tileVertices);
      
      // If clipped area is close to zero, discard
      if (clippedArea < 100) return; // less than 1cm2
      
      // Determine if it is a full tile or cut tile
      // Since tiles have grout spacing, let's allow a small tolerance (e.g. 98% area)
      const ratio = clippedArea / originalArea;
      const status = ratio > 0.985 ? 'full' : 'cut';
      
      tilesData.push({
        id,
        vertices: clippedVertices, // Draw the actual clipped tile inside the room boundary!
        status,
        area: clippedArea,
        originalArea,
        gridIndex: { r, c },
        angle
      });
    }
  }

  // Count tiles
  const fullTilesCount = tilesData.filter(t => t.status === 'full').length;
  const cutTilesCount = tilesData.filter(t => t.status === 'cut').length;
  
  // Tiles Required = Sum of full tiles + sum of cut tiles.
  // Each cut tile represents a full tile purchased.
  const tilesRequired = fullTilesCount + cutTilesCount;
  
  // Calculate wastage count
  const wastageTilesCount = Math.ceil(tilesRequired * (wastagePercent / 100));
  
  // Calculate skirting if active
  let skirtingTilesCount = 0;
  let skirtingLengthDisplay = 0;
  if (skirtingEnabled && skirtingHeight && skirtingHeight > 0) {
    const perimeterMm = calculatePolygonPerimeter(roomVertices);
    skirtingLengthDisplay = convertFromMm(perimeterMm, unit);
    
    // Number of skirting pieces that can be cut out of a single floor tile's height
    // Assuming length of skirting piece is equal to tileWidth
    const piecesPerTile = Math.max(1, Math.floor(tileHeight / skirtingHeight));
    
    // Total skirting pieces needed to cover the perimeter
    const totalPiecesRequired = Math.ceil(perimeterMm / tileWidth);
    
    // Total tiles required for skirting
    skirtingTilesCount = Math.ceil(totalPiecesRequired / piecesPerTile);
  }

  // Final tiles needed
  const finalTilesNeededCount = tilesRequired + wastageTilesCount + skirtingTilesCount;
  
  let boxesRequired = 0;
  let estimatedCost = 0;

  if (pricingMode === 'packet' && packetCoverage && packetCoverage > 0) {
    // Area-based box/packet calculation:
    // number of packets = ceiling of (total area in display unit + wastage) / coverage per packet
    const totalAreaWithWastage = totalAreaDisplay * (1 + wastagePercent / 100);
    boxesRequired = Math.ceil(totalAreaWithWastage / packetCoverage);
    estimatedCost = boxesRequired * packetPrice;
  } else {
    // Standard tile-count-based box/packet calculation and per-tile pricing
    const areaPerTileSqFt = (tileWidth * tileHeight) / (304.8 * 304.8);
    const tilesPerBox = Math.max(1, Math.round(15 / areaPerTileSqFt)); // Target ~15 sq ft per box
    boxesRequired = calculateBoxes(finalTilesNeededCount, tileWidth, tileHeight, tilesPerBox);
    estimatedCost = finalTilesNeededCount * tilePrice;
  }

  return {
    totalAreaMm2,
    totalAreaDisplay: Math.round(totalAreaDisplay * 100) / 100,
    fullTilesCount,
    cutTilesCount,
    tilesRequired,
    wastageTilesCount,
    skirtingTilesCount,
    skirtingLengthDisplay: Math.round(skirtingLengthDisplay * 100) / 100,
    finalTilesNeededCount,
    boxesRequired,
    estimatedCost: Math.round(estimatedCost),
    tilesData
  };
}

// Herringbone ratio helpers
function tileLengthRatioHerringbone(w: number, h: number): number {
  return Math.max(w, h);
}
function Grout(g: number) {
  return g;
}
