import React, { useEffect, useRef, useState } from 'react';
import { Play, Calculator, Eye } from 'lucide-react';
import { Pattern } from '../utils/types';
import { generateRoomVertices, calculateLayout } from '../utils/tileCalculations';

interface HeroProps {
  onStartCalculating: () => void;
  onLoadDemo: () => void;
}

export default function Hero({ onStartCalculating, onLoadDemo }: HeroProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentPattern, setCurrentPattern] = useState<Pattern>('straight');
  const [hoveredTile, setHoveredTile] = useState<{ id: string; w: number; h: number } | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Cycle patterns in the hero visual
  useEffect(() => {
    const patterns: Pattern[] = ['straight', 'brick', 'diagonal', 'herringbone', 'chevron'];
    let idx = 0;
    
    const interval = setInterval(() => {
      idx = (idx + 1) % patterns.length;
      setCurrentPattern(patterns[idx]);
    }, 4500);
    
    return () => clearInterval(interval);
  }, []);

  // Render the snapping tiles on the hero preview canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Fit canvas to DPI
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    
    // Demo layout calculations
    const roomW = 4000; // 4m in mm
    const roomH = 3000; // 3m in mm
    const roomVertices = generateRoomVertices('rectangle', 4000, 3000, 'cm', {}); // 400x300cm
    
    // Match tile dimensions based on pattern
    let tileW = 600;
    let tileH = 600;
    if (currentPattern === 'herringbone') {
      tileW = 200;
      tileH = 800;
    } else if (currentPattern === 'chevron') {
      tileW = 200;
      tileH = 800;
    }
    
    const layout = calculateLayout(
      roomVertices,
      tileW,
      tileH,
      12, // 12mm grout
      currentPattern,
      'center',
      5,
      150,
      'cm'
    );

    // Animation progress
    let animProgress = 0;
    const animSpeed = 0.025;
    
    // Sort tiles by distance from center for a clean ripple snap-in effect
    const centerPoint = { x: roomW / 2, y: roomH / 2 };
    const sortedTiles = [...layout.tilesData].sort((a, b) => {
      // Find averages of vertices
      const ax = a.vertices.reduce((sum, p) => sum + p.x, 0) / a.vertices.length;
      const ay = a.vertices.reduce((sum, p) => sum + p.y, 0) / a.vertices.length;
      const bx = b.vertices.reduce((sum, p) => sum + p.x, 0) / b.vertices.length;
      const by = b.vertices.reduce((sum, p) => sum + p.y, 0) / b.vertices.length;
      
      const distA = Math.hypot(ax - centerPoint.x, ay - centerPoint.y);
      const distB = Math.hypot(bx - centerPoint.x, by - centerPoint.y);
      return distA - distB;
    });

    // Fit room coordinate space into canvas coordinate space
    const padding = 30;
    const scaleX = (width - padding * 2) / roomW;
    const scaleY = (height - padding * 2) / roomH;
    const scale = Math.min(scaleX, scaleY);
    
    const offsetX = (width - roomW * scale) / 2;
    const offsetY = (height - roomH * scale) / 2;

    const renderLoop = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Draw background floor board
      ctx.fillStyle = '#EBE9E4';
      ctx.shadowColor = 'rgba(0,0,0,0.02)';
      ctx.shadowBlur = 10;
      ctx.fillRect(offsetX, offsetY, roomW * scale, roomH * scale);
      ctx.shadowColor = 'transparent';
      
      animProgress = Math.min(1, animProgress + animSpeed);
      
      // Draw each tile
      sortedTiles.forEach((tile, index) => {
        // Stagger tiles
        const tileDelay = index / sortedTiles.length;
        if (animProgress < tileDelay * 0.4) return; // not ready to show
        
        // Local animation fraction for this tile
        const t = Math.min(1, (animProgress - tileDelay * 0.4) / (1 - tileDelay * 0.4) * 3);
        const elasticT = easeOutBack(t);
        
        ctx.beginPath();
        // Translate vertices
        const pts = tile.vertices.map(p => ({
          x: offsetX + p.x * scale,
          y: offsetY + p.y * scale
        }));
        
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.closePath();
        
        // Stylings
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = Math.max(1, 10 * scale);
        
        // Color based on status
        let fillColor = '#FFFFFF';
        if (tile.status === 'full') {
          fillColor = '#ECEAE6';
        } else if (tile.status === 'cut') {
          fillColor = '#D5E6F7'; // Soft blue
        }
        
        // Save state for scaling effect
        ctx.save();
        
        if (t < 1) {
          // Calculate center of this tile
          const cx = pts.reduce((sum, p) => sum + p.x, 0) / pts.length;
          const cy = pts.reduce((sum, p) => sum + p.y, 0) / pts.length;
          ctx.translate(cx, cy);
          ctx.scale(elasticT, elasticT);
          ctx.translate(-cx, -cy);
          ctx.globalAlpha = t;
        }
        
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.stroke();
        
        // Draw wood/marble fine veins on full tiles
        if (tile.status === 'full') {
          ctx.strokeStyle = 'rgba(0,0,0,0.03)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pts[0].x + (pts[2].x - pts[0].x) * 0.2, pts[0].y + (pts[2].y - pts[0].y) * 0.2);
          ctx.bezierCurveTo(
            pts[0].x + (pts[2].x - pts[0].x) * 0.4, pts[0].y + (pts[2].y - pts[0].y) * 0.3,
            pts[0].x + (pts[2].x - pts[0].x) * 0.6, pts[0].y + (pts[2].y - pts[0].y) * 0.8,
            pts[2].x - (pts[2].x - pts[0].x) * 0.1, pts[2].y - (pts[2].y - pts[0].y) * 0.1
          );
          ctx.stroke();
        }
        
        ctx.restore();
      });

      // Draw room perimeter frame
      ctx.strokeStyle = '#121212';
      ctx.lineWidth = 3;
      ctx.strokeRect(offsetX, offsetY, roomW * scale, roomH * scale);

      if (animProgress < 1) {
        animationFrameRef.current = requestAnimationFrame(renderLoop);
      }
    };
    
    renderLoop();
    
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [currentPattern]);

  // Easing function for elastic spring effect
  function easeOutBack(x: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }

  // Handle canvas mouse hover to demonstrate tile identification
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Mock identification of tile under cursor in center preview area
    if (x > rect.width * 0.15 && x < rect.width * 0.85 && y > rect.height * 0.15 && y < rect.height * 0.85) {
      setHoveredTile({
        id: `Tile #${Math.round(x + y) % 99 + 101}`,
        w: currentPattern === 'herringbone' ? 200 : 600,
        h: currentPattern === 'herringbone' ? 800 : 600
      });
    } else {
      setHoveredTile(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredTile(null);
  };

  return (
    <section className="relative overflow-hidden bg-marble-gradient py-20 lg:py-28 border-b border-gray-200">
      {/* Background radial highlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-luxury-gold/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
        {/* Left copy column */}
        <div className="lg:col-span-6 space-y-8 text-center lg:text-left z-10 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-luxury-gold/10 border border-luxury-gold/20 text-luxury-gold rounded-full text-xs uppercase tracking-widest font-semibold font-display">
            <Eye className="w-3.5 h-3.5" /> Introducing TileVision Pro
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tight leading-none text-luxury-charcoal">
            Calculate Tiles Instantly & <br className="hidden md:inline" />
            <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-luxury-charcoal via-luxury-gold to-luxury-charcoal">
              Visualize Before You Buy
            </span>
          </h1>
          
          <p className="text-gray-600 text-base md:text-lg max-w-xl mx-auto lg:mx-0 font-light leading-relaxed">
            Accurate tile calculations with automatic wastage, cost estimation, and real-time placement visualization. Reduce cutting errors and choose the perfect pattern.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
            <button
              onClick={onStartCalculating}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-luxury-charcoal hover:bg-luxury-gold hover:text-luxury-charcoal text-white rounded-full font-medium transition-all duration-300 shadow-xl shadow-luxury-charcoal/10 tracking-wide cursor-pointer"
            >
              <Calculator className="w-5 h-5" /> Start Calculating
            </button>
            <button
              onClick={onLoadDemo}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/80 border border-gray-300 text-luxury-charcoal hover:bg-gray-50 rounded-full font-medium transition-all duration-300 backdrop-blur-sm cursor-pointer"
            >
              <Play className="w-4 h-4 fill-luxury-charcoal" /> View Demo
            </button>
          </div>

          {/* Quick Stats list */}
          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-gray-200 max-w-md mx-auto lg:mx-0">
            <div>
              <div className="text-2xl font-semibold font-display text-luxury-charcoal">100%</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">Layout Accuracy</div>
            </div>
            <div>
              <div className="text-2xl font-semibold font-display text-luxury-charcoal">5+</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">Laying Patterns</div>
            </div>
            <div>
              <div className="text-2xl font-semibold font-display text-luxury-charcoal">2D/3D</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">Interactive Visuals</div>
            </div>
          </div>
        </div>
        
        {/* Right canvas preview column */}
        <div className="lg:col-span-6 relative z-10 w-full flex justify-center items-center">
          <div className="w-full max-w-[500px] h-[360px] md:h-[420px] rounded-3xl p-4 glass-panel-light shadow-2xl relative border border-white/50 animate-slide-up flex flex-col justify-between">
            
            {/* Header info bar */}
            <div className="flex justify-between items-center mb-2 px-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-semibold tracking-wider uppercase text-gray-500 font-display">
                  Live Preview: {currentPattern.charAt(0).toUpperCase() + currentPattern.slice(1)}
                </span>
              </div>
              <div className="px-2.5 py-0.5 rounded-md bg-luxury-gold/15 text-luxury-gold text-[10px] uppercase font-bold tracking-wider font-display">
                TileVision Engine v1.0
              </div>
            </div>
            
            {/* Canvas wrapper */}
            <div className="flex-1 bg-white rounded-2xl overflow-hidden border border-gray-100 relative group">
              <canvas
                ref={canvasRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="w-full h-full cursor-crosshair block"
              />
              
              {/* Floating interactive tooltip inside canvas area */}
              {hoveredTile && (
                <div className="absolute pointer-events-none bg-luxury-charcoal text-white text-[11px] px-3 py-2 rounded-lg shadow-lg border border-white/10 -translate-x-1/2 -translate-y-full left-1/2 top-1/2 z-20 backdrop-blur-md flex flex-col space-y-0.5">
                  <span className="font-semibold text-luxury-gold font-display">{hoveredTile.id}</span>
                  <span>Size: {hoveredTile.w} × {hoveredTile.h} mm</span>
                  <span className="text-[10px] text-green-400">Status: Snapped & Calibrated</span>
                </div>
              )}
            </div>

            {/* Pattern switching indicator bottom row */}
            <div className="flex justify-center items-center gap-1.5 mt-3">
              {(['straight', 'brick', 'diagonal', 'herringbone', 'chevron'] as Pattern[]).map((pat) => (
                <button
                  key={pat}
                  onClick={() => setCurrentPattern(pat)}
                  className={`px-3 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                    currentPattern === pat 
                      ? 'bg-luxury-charcoal text-white shadow'
                      : 'bg-white/50 text-gray-500 hover:bg-white hover:text-luxury-charcoal'
                  }`}
                >
                  {pat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
