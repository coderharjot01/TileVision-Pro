export type Unit = 'ft' | 'in' | 'm' | 'cm' | 'mm';

export type Pattern = 'straight' | 'brick' | 'herringbone' | 'diagonal' | 'chevron';

export type StartPosition = 'center' | 'corner' | 'left' | 'right';

export type RoomShape = 'rectangle' | 'l-shape' | 'u-shape' | 'custom';

export interface Point {
  x: number;
  y: number;
}

export interface TileSize {
  width: number; // in mm
  height: number; // in mm
  label: string;
}

export interface RenderedTile {
  id: string;
  vertices: Point[]; // in mm relative to Room origin or absolute in mm
  status: 'full' | 'cut' | 'waste';
  area: number; // in mm^2
  originalArea: number; // in mm^2
  gridIndex: { r: number; c: number };
  angle: number; // in radians
}

export interface Room {
  id: string;
  name: string;
  shape: RoomShape;
  vertices: Point[]; // vertices in mm (origin at top-left bounding box edge or similar)
  width: number; // in input unit
  height: number; // in input unit
  unit: Unit;
  tilePrice: number; // price per tile
  pricingMode?: 'tile' | 'packet';
  packetPrice?: number;
  packetCoverage?: number;
  skirtingEnabled?: boolean;
  skirtingHeight?: number; // in mm
  options?: { w2?: number; h2?: number; w3?: number; h3?: number };
}

export interface Project {
  id: string;
  name: string;
  rooms: Room[];
  tileWidth: number; // in mm
  tileHeight: number; // in mm
  isCustomTile: boolean;
  wastage: number; // e.g. 5, 7, 10, 12, 15
  pattern: Pattern;
  groutWidth: number; // in mm
  startPosition: StartPosition;
  tileUnit?: Unit;
  date: string;
}

export interface CalculationResult {
  totalAreaMm2: number;
  totalAreaDisplay: number; // in selected unit^2
  fullTilesCount: number;
  cutTilesCount: number;
  tilesRequired: number; // sum of full tiles and fractional equivalents of cuts
  wastageTilesCount: number;
  skirtingTilesCount?: number;
  skirtingLengthDisplay?: number;
  finalTilesNeededCount: number; // tilesRequired + wastage
  boxesRequired: number;
  estimatedCost: number;
  tilesData: RenderedTile[];
}
