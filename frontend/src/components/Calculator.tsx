import React, { useState, useEffect } from 'react';
import { HelpCircle, Layers, Box, IndianRupee, Grid3X3, Trash2 } from 'lucide-react';
import { TileSize, Unit } from '../utils/types';
import { convertToMm, convertFromMm } from '../utils/tileCalculations';

// Predefined tile sizes in mm
const PREDEFINED_SIZES: TileSize[] = [
  { width: 300, height: 300, label: '300 × 300 mm (Standard)' },
  { width: 600, height: 600, label: '600 × 600 mm (Medium)' },
  { width: 800, height: 800, label: '800 × 800 mm (Large)' },
  { width: 600, height: 1200, label: '600 × 1200 mm (Plank)' },
  { width: 1000, height: 1000, label: '1000 × 1000 mm (XL Slab)' }
];

// Count-up helper component for premium animated feel
function CountUp({ value, duration = 600, formatter = (v: number) => Math.round(v).toString() }: { 
  value: number; 
  duration?: number; 
  formatter?: (v: number) => string 
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const startValue = displayValue;
    const endValue = value;
    
    if (startValue === endValue) return;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out quad
      const easedProgress = progress * (2 - progress);
      const current = startValue + easedProgress * (endValue - startValue);
      
      setDisplayValue(current);
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    
    window.requestAnimationFrame(step);
  }, [value]);

  return <>{formatter(displayValue)}</>;
}

interface CalculatorProps {
  tileWidth: number;
  tileHeight: number;
  onTileWidthChange: (w: number) => void;
  onTileHeightChange: (h: number) => void;
  isCustomTile: boolean;
  onIsCustomTileChange: (c: boolean) => void;
  wastage: number;
  onWastageChange: (w: number) => void;
  tilePrice: number;
  onTilePriceChange: (p: number) => void;
  pricingMode: 'tile' | 'packet';
  onPricingModeChange: (mode: 'tile' | 'packet') => void;
  packetPrice: number;
  onPacketPriceChange: (price: number) => void;
  packetCoverage: number;
  onPacketCoverageChange: (coverage: number) => void;
  unit: Unit;
  tileUnit: Unit;
  onTileUnitChange: (u: Unit) => void;
  totalArea: number;
  fullTiles: number;
  cutTiles: number;
  tilesRequired: number;
  wastageTiles: number;
  finalTilesNeeded: number;
  boxesRequired: number;
  estimatedCost: number;
}

export default function Calculator({
  tileWidth,
  tileHeight,
  onTileWidthChange,
  onTileHeightChange,
  isCustomTile,
  onIsCustomTileChange,
  wastage,
  onWastageChange,
  tilePrice,
  onTilePriceChange,
  pricingMode = 'tile',
  onPricingModeChange,
  packetPrice = 0,
  onPacketPriceChange,
  packetCoverage = 0,
  onPacketCoverageChange,
  unit,
  tileUnit,
  onTileUnitChange,
  totalArea,
  fullTiles,
  cutTiles,
  tilesRequired,
  wastageTiles,
  finalTilesNeeded,
  boxesRequired,
  estimatedCost
}: CalculatorProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const selectPredefinedSize = (size: TileSize) => {
    onIsCustomTileChange(false);
    onTileWidthChange(size.width);
    onTileHeightChange(size.height);
  };

  const selectCustomOption = () => {
    onIsCustomTileChange(true);
  };

  // Convert mm dimensions to display values
  const displayCustomWidth = Math.round(convertFromMm(tileWidth, tileUnit) * 100) / 100;
  const displayCustomHeight = Math.round(convertFromMm(tileHeight, tileUnit) * 100) / 100;

  // Format currency
  const currencyFormatter = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="space-y-6">
      
      {/* 2. Tile Selection */}
      <div className="glass-panel-light rounded-3xl p-6 border border-white/60 shadow-xl space-y-4">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-xl font-semibold text-luxury-charcoal">2. Tile Dimensions</h2>
            <p className="text-xs text-gray-500">Choose size or enter custom dimensions</p>
          </div>

          {/* Tile Unit Selector */}
          <div className="inline-flex bg-gray-100 p-0.5 rounded-full border border-gray-200">
            {(['mm', 'cm', 'in', 'ft'] as Unit[]).map((u) => (
              <button
                key={u}
                onClick={() => onTileUnitChange(u)}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                  tileUnit === u 
                    ? 'bg-luxury-charcoal text-white shadow-sm'
                    : 'text-gray-500 hover:text-luxury-charcoal'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        {/* Predefined Sizes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {PREDEFINED_SIZES.map((size) => {
            const isSelected = !isCustomTile && tileWidth === size.width && tileHeight === size.height;
            const wDisp = Math.round(convertFromMm(size.width, tileUnit) * 10) / 10;
            const hDisp = Math.round(convertFromMm(size.height, tileUnit) * 10) / 10;
            
            return (
              <button
                key={size.label}
                onClick={() => selectPredefinedSize(size)}
                className={`text-left p-3 rounded-xl border text-xs font-semibold transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? 'bg-luxury-charcoal border-luxury-charcoal text-white shadow'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-luxury-gold'
                }`}
              >
                <div>{size.label.split('(')[0]}</div>
                <div className={`text-[10px] mt-1 ${isSelected ? 'text-luxury-gold' : 'text-gray-400'}`}>
                  {wDisp} × {hDisp} {tileUnit}
                </div>
              </button>
            );
          })}
          
          <button
            onClick={selectCustomOption}
            className={`text-left p-3 rounded-xl border text-xs font-semibold transition-all duration-300 cursor-pointer ${
              isCustomTile
                ? 'bg-luxury-charcoal border-luxury-charcoal text-white shadow'
                : 'bg-white border-gray-200 text-gray-600 hover:border-luxury-gold'
            }`}
          >
            <div>Custom Tile Dimensions</div>
            <div className={`text-[10px] mt-1 ${isCustomTile ? 'text-luxury-gold' : 'text-gray-400'}`}>
              Input Custom Size
            </div>
          </button>
        </div>

        {/* Custom Inputs */}
        {isCustomTile && (
          <div className="grid grid-cols-2 gap-4 pt-2 animate-fade-in">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Tile Width ({tileUnit})
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={displayCustomWidth || ''}
                onChange={(e) => {
                  const valMm = convertToMm(parseFloat(e.target.value) || 0, tileUnit);
                  onTileWidthChange(valMm);
                }}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-luxury-gold outline-none font-semibold text-xs transition duration-300"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Tile Height ({tileUnit})
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={displayCustomHeight || ''}
                onChange={(e) => {
                  const valMm = convertToMm(parseFloat(e.target.value) || 0, tileUnit);
                  onTileHeightChange(valMm);
                }}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-luxury-gold outline-none font-semibold text-xs transition duration-300"
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. Cost & Wastage Setup */}
      <div className="glass-panel-light rounded-3xl p-6 border border-white/60 shadow-xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Wastage */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600">3. Wastage Settings</h3>
              <div className="relative inline-block">
                <button
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  className="text-gray-400 hover:text-luxury-charcoal focus:outline-none"
                  type="button"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
                {showTooltip && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 bg-luxury-charcoal text-white text-[10px] p-2 rounded-lg shadow-lg border border-white/10 z-50 text-center font-normal leading-relaxed">
                    Wastage accounts for cutting, breakage, and installation adjustments.
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              {[5, 7, 10, 12, 15].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => onWastageChange(w)}
                  className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    wastage === w
                      ? 'bg-luxury-gold/20 border-luxury-gold text-luxury-gold'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                  }`}
                >
                  {w}%
                </button>
              ))}
            </div>
          </div>

          {/* Pricing Mode Toggle */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600">4. Pricing Mode</h3>
            <div className="inline-flex w-full bg-gray-100 p-0.5 rounded-xl border border-gray-200 shadow-inner">
              <button
                type="button"
                onClick={() => onPricingModeChange('tile')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 cursor-pointer ${
                  pricingMode === 'tile'
                    ? 'bg-luxury-charcoal text-white shadow-sm'
                    : 'text-gray-500 hover:text-luxury-charcoal'
                }`}
              >
                Per Tile
              </button>
              <button
                type="button"
                onClick={() => onPricingModeChange('packet')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 cursor-pointer ${
                  pricingMode === 'packet'
                    ? 'bg-luxury-charcoal text-white shadow-sm'
                    : 'text-gray-500 hover:text-luxury-charcoal'
                }`}
              >
                Per Packet
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic inputs based on Pricing Mode */}
        <div className="border-t border-gray-150/50 pt-4">
          {pricingMode === 'tile' ? (
            <div className="space-y-2 animate-fade-in">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Price per Individual Tile
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={tilePrice || ''}
                  onChange={(e) => onTilePriceChange(parseFloat(e.target.value) || 0)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-luxury-gold outline-none font-semibold text-xs transition duration-300"
                  placeholder="0.00"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <IndianRupee className="w-3.5 h-3.5" />
                </div>
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold uppercase">Per Tile</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Price per Packet (Box)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={packetPrice || ''}
                    onChange={(e) => onPacketPriceChange(parseFloat(e.target.value) || 0)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-luxury-gold outline-none font-semibold text-xs transition duration-300"
                    placeholder="0.00"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <IndianRupee className="w-3.5 h-3.5" />
                  </div>
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold uppercase">Per Box</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Coverage Area per Packet
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={packetCoverage || ''}
                    onChange={(e) => onPacketCoverageChange(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-luxury-gold outline-none font-semibold text-xs transition duration-300"
                    placeholder={`e.g. 15`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold uppercase">
                    sq {unit}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Results Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        
        {/* Total Area */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total Area</div>
          <div className="text-2xl md:text-3xl font-light text-luxury-charcoal mt-2">
            <CountUp value={totalArea} formatter={(v) => v.toFixed(1)} />
            <span className="text-xs font-semibold text-gray-400 ml-1 uppercase">{unit}²</span>
          </div>
          <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-1">
            <Grid3X3 className="w-3.5 h-3.5 text-luxury-gold" /> Calculated Shape
          </div>
        </div>

        {/* Full Tiles */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Full Tiles</div>
          <div className="text-2xl md:text-3xl font-light text-luxury-charcoal mt-2">
            <CountUp value={fullTiles} />
            <span className="text-xs font-semibold text-gray-400 ml-1">pcs</span>
          </div>
          <div className="text-[10px] text-green-600 flex items-center gap-1 mt-1">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Standard Laying
          </div>
        </div>

        {/* Cut Tiles */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Cut Tiles</div>
          <div className="text-2xl md:text-3xl font-light text-luxury-charcoal mt-2">
            <CountUp value={cutTiles} />
            <span className="text-xs font-semibold text-gray-400 ml-1">pcs</span>
          </div>
          <div className="text-[10px] text-blue-500 flex items-center gap-1 mt-1">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" /> Edge/Corner adjustments
          </div>
        </div>

        {/* Wastage Tiles */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Wastage ({wastage}%)</div>
          <div className="text-2xl md:text-3xl font-light text-luxury-charcoal mt-2">
            <CountUp value={wastageTiles} />
            <span className="text-xs font-semibold text-gray-400 ml-1">pcs</span>
          </div>
          <div className="text-[10px] text-amber-500 flex items-center gap-1 mt-1">
            <Layers className="w-3.5 h-3.5 text-amber-500" /> Cutting reserves
          </div>
        </div>

        {/* Final Tiles Needed */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total to Buy</div>
          <div className="text-2xl md:text-3xl font-semibold text-luxury-gold mt-2">
            <CountUp value={finalTilesNeeded} />
            <span className="text-xs font-semibold text-gray-400 ml-1">pcs</span>
          </div>
          <div className="text-[10px] text-luxury-charcoal flex items-center gap-1 mt-1">
            <Layers className="w-3.5 h-3.5 text-luxury-gold" /> Total Order size
          </div>
        </div>

        {/* Boxes Required */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between h-28">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            {pricingMode === 'packet' ? 'Packets Needed' : 'Boxes Needed'}
          </div>
          <div className="text-2xl md:text-3xl font-light text-luxury-charcoal mt-2">
            <CountUp value={boxesRequired} />
            <span className="text-xs font-semibold text-gray-400 ml-1">
              {pricingMode === 'packet' ? 'packets' : 'boxes'}
            </span>
          </div>
          <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-1">
            <Box className="w-3.5 h-3.5 text-luxury-gold" /> 
            {pricingMode === 'packet' ? 'Packet coverage area' : 'Boxed coverage'}
          </div>
        </div>

      </div>

      {/* Estimated Cost Panel */}
      {((pricingMode === 'tile' && tilePrice > 0) || (pricingMode === 'packet' && packetPrice > 0)) && (
        <div className="bg-luxury-charcoal text-white rounded-3xl p-5 border border-white/10 shadow-lg flex justify-between items-center relative overflow-hidden animate-fade-in">
          {/* subtle gold accent background */}
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-luxury-gold/5 blur-xl rounded-full" />
          
          <div className="space-y-1 z-10">
            <div className="text-[10px] font-bold text-luxury-gold uppercase tracking-widest">Estimated Material Cost</div>
            <div className="text-xs text-gray-400">
              {pricingMode === 'tile' 
                ? `Calculated as Total Tiles (${finalTilesNeeded}) × Price (${currencyFormatter(tilePrice)})`
                : `Calculated as Total Packets (${boxesRequired}) × Price (${currencyFormatter(packetPrice)})`
              }
            </div>
          </div>
          <div className="text-3xl font-bold font-display text-luxury-gold z-10">
            <CountUp value={estimatedCost} formatter={currencyFormatter} />
          </div>
        </div>
      )}

    </div>
  );
}
