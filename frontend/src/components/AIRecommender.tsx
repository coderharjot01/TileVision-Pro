import React from 'react';
import { Bot, Sparkles, Check, TrendingDown, LayoutGrid } from 'lucide-react';
import { Point, Pattern, StartPosition, Unit } from '../utils/types';
import { calculateLayout, convertFromMm } from '../utils/tileCalculations';

interface AIRecommenderProps {
  roomVertices: Point[];
  groutWidth: number;
  pattern: Pattern;
  startPosition: StartPosition;
  wastage: number;
  tilePrice: number;
  unit: Unit;
  tileUnit: Unit;
  onSelectSize: (w: number, h: number) => void;
}

interface TileRecommendation {
  width: number;
  height: number;
  label: string;
  wastePercent: number;
  cutCount: number;
  totalTiles: number;
}

export default function AIRecommender({
  roomVertices,
  groutWidth,
  pattern,
  startPosition,
  wastage,
  tilePrice,
  unit,
  tileUnit,
  onSelectSize
}: AIRecommenderProps) {
  if (roomVertices.length < 3) return null;

  // Evaluate candidate tile sizes
  const candidates = [
    { width: 300, height: 300, label: '300x300mm Standard' },
    { width: 600, height: 600, label: '600x600mm Medium' },
    { width: 800, height: 800, label: '800x800mm Large' },
    { width: 600, height: 1200, label: '600x1200mm Plank' }
  ];

  const results: TileRecommendation[] = candidates.map(c => {
    const layout = calculateLayout(
      roomVertices,
      c.width,
      c.height,
      groutWidth,
      pattern,
      startPosition,
      wastage,
      tilePrice,
      unit
    );

    // Calculate percentage of cut tiles relative to total tiles
    const cutCount = layout.cutTilesCount;
    const totalTiles = layout.tilesRequired;
    const cutRatio = totalTiles > 0 ? (cutCount / totalTiles) * 100 : 0;

    return {
      width: c.width,
      height: c.height,
      label: c.label,
      wastePercent: Math.round(cutRatio * 10) / 10,
      cutCount,
      totalTiles
    };
  });

  // Find the size with the minimum cut waste ratio
  const sorted = [...results].sort((a, b) => a.wastePercent - b.wastePercent);
  const best = sorted[0];

  const bestWDisp = Math.round(convertFromMm(best.width, tileUnit) * 10) / 10;
  const bestHDisp = Math.round(convertFromMm(best.height, tileUnit) * 10) / 10;
  const bestSizeLabel = `${bestWDisp}×${bestHDisp} ${tileUnit}`;

  // Analyze room size (area in sq ft)
  const layoutForArea = calculateLayout(roomVertices, 600, 600, groutWidth, pattern, startPosition, wastage, tilePrice, unit);
  const roomAreaSqFt = layoutForArea.totalAreaMm2 / (304.8 * 304.8);

  // Generate recommendation text
  let recommendationReason = '';
  let designTip = '';

  if (roomAreaSqFt > 150) {
    recommendationReason = `With a spacious room of ${Math.round(roomAreaSqFt)} sq ft, larger tiles are highly recommended. The ${bestSizeLabel} size is optimal because it minimizes visible grout joints, giving a luxurious, seamless marble slab appearance.`;
    designTip = 'XL slabs create an expansive monolithic field. Laying them in a brick or diagonal pattern will draw the eye outward, enhancing visual scale.';
  } else if (roomAreaSqFt < 60) {
    recommendationReason = `For a cozy space of ${Math.round(roomAreaSqFt)} sq ft, standard smaller tile sizes work best. The ${bestSizeLabel} size fits the physical scale of the floor, preventing massive tile waste near walls and complex cutouts.`;
    designTip = 'Straight grid alignments or herringbone patterns fit smaller bathroom/kitchen areas nicely without overwhelming the visual layout.';
  } else {
    recommendationReason = `For a medium room of ${Math.round(roomAreaSqFt)} sq ft, the ${bestSizeLabel} tiles offer the perfect balance. It yields a clean layout, minimizing cut waste to just ${best.wastePercent}%, ensuring a seamless fit with minimal cuts.`;
    designTip = 'Try a 50% brick running bond offset or chevron layout. It provides a modern architecture aesthetic with reasonable installation labor.';
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-luxury-charcoal to-luxury-dark text-white rounded-3xl p-6 border border-white/10 shadow-2xl space-y-6">
      
      {/* Background soft gold blur */}
      <div className="absolute right-0 top-0 w-36 h-36 bg-luxury-gold/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <div className="p-2.5 bg-luxury-gold/15 border border-luxury-gold/30 rounded-xl text-luxury-gold animate-pulse-slow">
          <Bot className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold uppercase tracking-widest text-luxury-gold font-display">AI Layout Recommendation</h3>
            <span className="bg-white/10 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider text-gray-300">Smart Engine</span>
          </div>
          <p className="text-[10px] text-gray-400">Algorithmic analysis for minimal cutting waste</p>
        </div>
      </div>

      {/* AI Recommendation Callout */}
      <div className="space-y-3">
        <div className="text-base font-light leading-relaxed text-gray-200">
          "For this room size, <span className="text-luxury-gold font-semibold">{bestSizeLabel}</span> tiles minimize edge cuts and reduce layout wastage ratio to only <span className="text-luxury-gold font-semibold">{best.wastePercent}%</span>."
        </div>
        <p className="text-xs text-gray-400 font-light leading-relaxed">
          {recommendationReason}
        </p>
      </div>

      {/* Dynamic breakdown chart */}
      <div className="space-y-3 pt-2">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1">
          <TrendingDown className="w-3.5 h-3.5 text-luxury-gold" /> Cut Tile Ratio Comparison
        </h4>
        
        <div className="space-y-2.5">
          {results.map((res) => {
            const isBest = res.width === best.width && res.height === best.height;
            const wDisp = Math.round(convertFromMm(res.width, tileUnit) * 10) / 10;
            const hDisp = Math.round(convertFromMm(res.height, tileUnit) * 10) / 10;
            return (
              <div key={res.label} className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-semibold">
                  <span className={isBest ? 'text-luxury-gold' : 'text-gray-300'}>
                    {wDisp}×{hDisp} {tileUnit} {isBest && ' (Best)'}
                  </span>
                  <span>{res.wastePercent}% cuts</span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${Math.max(3, res.wastePercent)}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      isBest ? 'bg-luxury-gold' : 'bg-white/20'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Design Tip */}
      <div className="p-3.5 bg-white/5 rounded-2xl border border-white/5 space-y-1">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-luxury-gold flex items-center gap-1">
          <LayoutGrid className="w-3.5 h-3.5" /> Luxury Interior Design Tip
        </h4>
        <p className="text-[10px] text-gray-400 font-light leading-relaxed">
          {designTip}
        </p>
      </div>

      {/* Apply Button */}
      <button
        onClick={() => onSelectSize(best.width, best.height)}
        className="w-full py-3 bg-luxury-gold hover:bg-luxury-gold-hover text-luxury-charcoal font-semibold rounded-xl text-xs uppercase tracking-wider transition duration-300 shadow shadow-luxury-gold/15 cursor-pointer flex items-center justify-center gap-1"
      >
        <Check className="w-4 h-4" /> Apply Recommended Size
      </button>

    </div>
  );
}
