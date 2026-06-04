import React from 'react';
import { AlignCenter, AlignLeft, Grid, Compass, RefreshCw } from 'lucide-react';
import { Pattern, StartPosition, Unit } from '../utils/types';
import { convertToMm, convertFromMm } from '../utils/tileCalculations';

interface PatternSelectorProps {
  pattern: Pattern;
  onPatternChange: (p: Pattern) => void;
  groutWidth: number;
  onGroutWidthChange: (g: number) => void;
  startPosition: StartPosition;
  onStartPositionChange: (s: StartPosition) => void;
  tileUnit: Unit;
}

export default function PatternSelector({
  pattern,
  onPatternChange,
  groutWidth,
  onGroutWidthChange,
  startPosition,
  onStartPositionChange,
  tileUnit
}: PatternSelectorProps) {
  
  // List of patterns with SVG mock icons for a premium feel
  const PATTERNS_LIST = [
    {
      id: 'straight' as Pattern,
      name: 'Straight Grid',
      desc: 'Standard clean look, aligned walls',
      icon: (
        <svg viewBox="0 0 40 40" className="w-10 h-10 stroke-current text-luxury-gold fill-none stroke-2">
          <rect x="5" y="5" width="14" height="14" />
          <rect x="21" y="5" width="14" height="14" />
          <rect x="5" y="21" width="14" height="14" />
          <rect x="21" y="21" width="14" height="14" />
        </svg>
      )
    },
    {
      id: 'brick' as Pattern,
      name: 'Brick / Bond',
      desc: 'Alternating running bond offset',
      icon: (
        <svg viewBox="0 0 40 40" className="w-10 h-10 stroke-current text-luxury-gold fill-none stroke-2">
          <rect x="2" y="5" width="17" height="14" />
          <rect x="21" y="5" width="17" height="14" />
          <rect x="10" y="21" width="19" height="14" />
          <rect x="2" y="21" width="6" height="14" />
          <rect x="31" y="21" width="7" height="14" />
        </svg>
      )
    },
    {
      id: 'diagonal' as Pattern,
      name: 'Diagonal 45°',
      desc: 'Classic rotated layout, expands space',
      icon: (
        <svg viewBox="0 0 40 40" className="w-10 h-10 stroke-current text-luxury-gold fill-none stroke-2 transform rotate-45 scale-75">
          <rect x="5" y="5" width="14" height="14" />
          <rect x="21" y="5" width="14" height="14" />
          <rect x="5" y="21" width="14" height="14" />
          <rect x="21" y="21" width="14" height="14" />
        </svg>
      )
    },
    {
      id: 'herringbone' as Pattern,
      name: 'Herringbone',
      desc: 'Elegant interlocking angles',
      icon: (
        <svg viewBox="0 0 40 40" className="w-10 h-10 stroke-current text-luxury-gold fill-none stroke-2">
          <path d="M5 25 l8 -8 v10 l-8 8" />
          <path d="M13 17 l8 8 h-10 l-8 -8" />
          <path d="M13 17 l8 -8 v10 l-8 8" />
          <path d="M21 9 l8 8 h-10 l-8 -8" />
          <path d="M21 9 l8 -8 v10 l-8 8" />
        </svg>
      )
    },
    {
      id: 'chevron' as Pattern,
      name: 'Chevron',
      desc: 'Premium matching diagonal joints',
      icon: (
        <svg viewBox="0 0 40 40" className="w-10 h-10 stroke-current text-luxury-gold fill-none stroke-2">
          <path d="M5 15 l10 -7 l10 7" />
          <path d="M5 25 l10 -7 l10 7" />
          <path d="M5 35 l10 -7 l10 7" />
        </svg>
      )
    }
  ];

  // Convert mm groutWidth to display value
  const displayGrout = Math.round(convertFromMm(groutWidth, tileUnit) * 100) / 100;

  return (
    <div className="glass-panel-light rounded-3xl p-6 border border-white/60 shadow-xl space-y-6">
      
      {/* Grout spacing setting */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 className="text-xl font-semibold text-luxury-charcoal">3. Grout Joint width</h2>
            <p className="text-xs text-gray-500">Configure space between tiles</p>
          </div>
          <span className="text-sm font-bold text-luxury-gold font-display">
            {displayGrout} <span className="uppercase">{tileUnit}</span>
          </span>
        </div>
        
        {/* Preset joints */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[1, 2, 3, 5].map((g) => {
            const displayPreset = Math.round(convertFromMm(g, tileUnit) * 100) / 100;
            const isActive = Math.abs(groutWidth - g) < 0.05;
            return (
              <button
                key={g}
                onClick={() => onGroutWidthChange(g)}
                className={`py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-luxury-charcoal border-luxury-charcoal text-white shadow-sm'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                }`}
              >
                {displayPreset} {tileUnit}
              </button>
            );
          })}
        </div>
        
        {/* Custom joint number input */}
        <div className="relative">
          <input
            type="number"
            min="0"
            step="0.01"
            value={displayGrout || ''}
            onChange={(e) => {
              const valMm = convertToMm(parseFloat(e.target.value) || 0, tileUnit);
              onGroutWidthChange(Math.max(0, valMm));
            }}
            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:border-luxury-gold outline-none font-semibold text-xs transition duration-300 pr-12"
            placeholder={`Custom Joint width (${tileUnit})`}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold uppercase">{tileUnit}</span>
        </div>
      </div>

      {/* Start position focal alignment */}
      <div>
        <div className="mb-3">
          <h2 className="text-xl font-semibold text-luxury-charcoal">4. Tile Placement Origin</h2>
          <p className="text-xs text-gray-500">Decide starting focal wall or corner alignment</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onStartPositionChange('center')}
            className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              startPosition === 'center'
                ? 'bg-luxury-charcoal border-luxury-charcoal text-white shadow-sm'
                : 'bg-white border-gray-200 text-gray-600 hover:border-luxury-gold'
            }`}
          >
            <AlignCenter className="w-4 h-4 text-luxury-gold" /> Center Room
          </button>
          <button
            onClick={() => onStartPositionChange('corner')}
            className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              startPosition === 'corner'
                ? 'bg-luxury-charcoal border-luxury-charcoal text-white shadow-sm'
                : 'bg-white border-gray-200 text-gray-600 hover:border-luxury-gold'
            }`}
          >
            <Grid className="w-4 h-4 text-luxury-gold" /> Top-Left Corner
          </button>
          <button
            onClick={() => onStartPositionChange('left')}
            className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              startPosition === 'left'
                ? 'bg-luxury-charcoal border-luxury-charcoal text-white shadow-sm'
                : 'bg-white border-gray-200 text-gray-600 hover:border-luxury-gold'
            }`}
          >
            <AlignLeft className="w-4 h-4 text-luxury-gold" /> Left Wall Center
          </button>
          <button
            onClick={() => onStartPositionChange('right')}
            className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              startPosition === 'right'
                ? 'bg-luxury-charcoal border-luxury-charcoal text-white shadow-sm'
                : 'bg-white border-gray-200 text-gray-600 hover:border-luxury-gold'
            }`}
          >
            <AlignLeft className="w-4 h-4 rotate-180 text-luxury-gold" /> Right Wall Center
          </button>
        </div>
      </div>

      {/* Pattern Selector Cards */}
      <div className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold text-luxury-charcoal">5. Pattern Layouts</h2>
          <p className="text-xs text-gray-500">Pick a structural layout aesthetic</p>
        </div>

        <div className="space-y-2">
          {PATTERNS_LIST.map((pat) => {
            const isSelected = pattern === pat.id;
            return (
              <button
                key={pat.id}
                onClick={() => onPatternChange(pat.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? 'bg-luxury-charcoal border-luxury-charcoal text-white shadow-lg'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-luxury-gold'
                }`}
              >
                <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-white/10' : 'bg-gray-50 border border-gray-100'}`}>
                  {pat.icon}
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">{pat.name}</h4>
                  <p className={`text-[10px] mt-0.5 ${isSelected ? 'text-gray-400' : 'text-gray-400'}`}>
                    {pat.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
