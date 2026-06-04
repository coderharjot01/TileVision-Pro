import React from 'react';
import { Sparkles, Layers, Info, CheckCircle2 } from 'lucide-react';
import { Point, Pattern, StartPosition, TileSize, Unit } from '../utils/types';
import { calculateLayout, convertFromMm } from '../utils/tileCalculations';

interface ComparisonProps {
  roomVertices: Point[];
  groutWidth: number;
  pattern: Pattern;
  startPosition: StartPosition;
  wastage: number;
  tilePrice: number;
  unit: Unit;
  activeTileW: number;
  activeTileH: number;
  tileUnit: Unit;
  pricingMode: 'tile' | 'packet';
  packetPrice: number;
  packetCoverage: number;
  onTileSelect: (w: number, h: number) => void;
}

const COMPARISON_SIZES: TileSize[] = [
  { width: 300, height: 300, label: '300 × 300 mm' },
  { width: 600, height: 600, label: '600 × 600 mm' },
  { width: 800, height: 800, label: '800 × 800 mm' },
  { width: 600, height: 1200, label: '600 × 1200 mm' }
];

export default function Comparison({
  roomVertices,
  groutWidth,
  pattern,
  startPosition,
  wastage,
  tilePrice,
  unit,
  activeTileW,
  activeTileH,
  tileUnit,
  pricingMode,
  packetPrice,
  packetCoverage,
  onTileSelect
}: ComparisonProps) {
  
  if (roomVertices.length < 3) return null;

  // Run layout engine for all sizes
  const comparisons = COMPARISON_SIZES.map((size) => {
    const result = calculateLayout(
      roomVertices,
      size.width,
      size.height,
      groutWidth,
      pattern,
      startPosition,
      wastage,
      tilePrice,
      unit,
      { x: 0, y: 0 },
      pricingMode,
      packetPrice,
      packetCoverage
    );

    const isActive = activeTileW === size.width && activeTileH === size.height;

    // Calculate edge waste ratio: fraction of cuts to total tiles
    const cutRatio = result.tilesRequired > 0 
      ? (result.cutTilesCount / result.tilesRequired) * 100 
      : 0;

    return {
      size,
      isActive,
      tiles: result.finalTilesNeededCount,
      boxes: result.boxesRequired,
      cost: result.estimatedCost,
      cutRatio: Math.round(cutRatio * 10) / 10,
      fullTiles: result.fullTilesCount,
      cutTiles: result.cutTilesCount
    };
  });

  // Find most optimal (lowest cutRatio)
  const sortedByOptimal = [...comparisons].sort((a, b) => a.cutRatio - b.cutRatio);
  const optimalSize = sortedByOptimal[0]?.size;

  // Format currency helper
  const formatCost = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="glass-panel-light rounded-3xl p-6 border border-white/60 shadow-xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-luxury-charcoal">Side-by-Side Size Comparison</h2>
        <p className="text-xs text-gray-500">Compare required quantities and costs for different tile sizes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {comparisons.map(({ size, isActive, tiles, boxes, cost, cutRatio, fullTiles, cutTiles }) => {
          const isOptimal = size.width === optimalSize.width && size.height === optimalSize.height;
          
          return (
            <div
              key={size.label}
              onClick={() => onTileSelect(size.width, size.height)}
              className={`p-5 rounded-2xl border text-left cursor-pointer transition-all duration-300 relative flex flex-col justify-between h-64 ${
                isActive
                  ? 'bg-luxury-charcoal text-white border-luxury-charcoal shadow-lg'
                  : 'bg-white border-gray-150 text-gray-700 hover:border-luxury-gold hover:shadow-md'
              }`}
            >
              {/* Badges top right */}
              <div className="absolute right-4 top-4 flex flex-col gap-1.5 items-end">
                {isActive && (
                  <span className="bg-luxury-gold text-luxury-charcoal px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Selected
                  </span>
                )}
                {isOptimal && (
                  <span className="bg-green-100 text-green-800 border border-green-200 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> Most Efficient
                  </span>
                )}
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Tile Size</h4>
                <div className="text-lg font-bold font-display mt-1">
                  {Math.round(convertFromMm(size.width, tileUnit) * 10) / 10} × {Math.round(convertFromMm(size.height, tileUnit) * 10) / 10} <span className="text-xs uppercase">{tileUnit}</span>
                </div>
                <p className={`text-[10px] mt-0.5 ${isActive ? 'text-gray-400' : 'text-gray-500'}`}>
                  Original: {size.width} × {size.height} mm
                </p>
              </div>

              {/* Data readouts */}
              <div className="border-t border-b border-gray-100 py-3 my-3 space-y-1.5 text-xs font-medium">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total tiles needed:</span>
                  <span className="font-semibold">{tiles} pcs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{pricingMode === 'packet' ? 'Packet count:' : 'Box count:'}</span>
                  <span>{boxes} {pricingMode === 'packet' ? 'packets' : 'boxes'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Clipped/Cut ratio:</span>
                  <span className={cutRatio > 35 ? 'text-amber-500 font-semibold' : 'text-green-500'}>{cutRatio}%</span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>Full: {fullTiles}</span>
                  <span>Clipped cuts: {cutTiles}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cost</span>
                <span className="text-lg font-bold text-luxury-gold">
                  {((pricingMode === 'tile' && tilePrice > 0) || (pricingMode === 'packet' && packetPrice > 0)) ? formatCost(cost) : '—'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 bg-gray-50 rounded-xl border border-gray-150 flex items-start gap-2.5 text-xs text-gray-500">
        <Info className="w-4 h-4 text-luxury-gold shrink-0 mt-0.5" />
        <span>
          <strong>Laying Suggestion:</strong> Predefined sizes are computed directly using your active grout spacing ({groutWidth}mm) and layout pattern ({pattern}). Selecting a size with a lower <strong>Clipped/Cut ratio</strong> minimizes fractional cuts at your walls and maximizes structural consistency.
        </span>
      </div>
    </div>
  );
}
