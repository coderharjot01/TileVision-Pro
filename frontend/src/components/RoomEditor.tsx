import React, { useState, useEffect, useRef } from 'react';
import { Square, Layout, ArrowRightLeft, PenTool, RotateCcw, AlertCircle } from 'lucide-react';
import { RoomShape, Unit, Point, Room } from '../utils/types';
import { generateRoomVertices, convertToMm, convertFromMm } from '../utils/tileCalculations';
import { polygonArea } from '../utils/geometry';

interface RoomEditorProps {
  shape: RoomShape;
  width: number;
  height: number;
  unit: Unit;
  vertices: Point[];
  options: { w2?: number; h2?: number; w3?: number; h3?: number };
  onUpdateActiveRoom: (updates: Partial<Room>) => void;
}

export default function RoomEditor({
  shape,
  width,
  height,
  unit,
  vertices,
  options,
  onUpdateActiveRoom
}: RoomEditorProps) {
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [customPoints, setCustomPoints] = useState<Point[]>([]);
  const [isDrawClosed, setIsDrawClosed] = useState(false);
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [drawError, setDrawError] = useState<string | null>(null);
  
  const gridSize = 20; // grid spacing in pixels for snapping

  // Regenerate vertices when presets or units change
  useEffect(() => {
    if (shape !== 'custom') {
      const generated = generateRoomVertices(shape, width, height, unit, options);
      // Only update if vertices have actually changed to prevent infinite loops
      const hasChanged = !vertices || vertices.length !== generated.length ||
        vertices.some((v, i) => v.x !== generated[i].x || v.y !== generated[i].y);
      
      if (hasChanged) {
        onUpdateActiveRoom({ vertices: generated });
      }
      setIsDrawClosed(true);
    }
  }, [shape, width, height, unit, options, vertices, onUpdateActiveRoom]);

  // Handle unit conversions
  const handleUnitToggle = (newUnit: Unit) => {
    if (newUnit === unit) return;
    
    // Convert base dimensions
    const wMm = convertToMm(width, unit);
    const hMm = convertToMm(height, unit);
    
    const newWidth = Math.round(convertFromMm(wMm, newUnit) * 100) / 100;
    const newHeight = Math.round(convertFromMm(hMm, newUnit) * 100) / 100;
    
    // Convert secondary options
    const newOpts = { ...options };
    if (options.w2) {
      const w2Mm = convertToMm(options.w2, unit);
      newOpts.w2 = Math.round(convertFromMm(w2Mm, newUnit) * 100) / 100;
    }
    if (options.h2) {
      const h2Mm = convertToMm(options.h2, unit);
      newOpts.h2 = Math.round(convertFromMm(h2Mm, newUnit) * 100) / 100;
    }
    
    onUpdateActiveRoom({
      width: newWidth,
      height: newHeight,
      unit: newUnit,
      options: newOpts
    });
  };

  // Switch to custom drawing mode
  const handleSelectCustom = () => {
    onUpdateActiveRoom({ shape: 'custom', vertices: [] });
    setCustomPoints([]);
    setIsDrawClosed(false);
    setDrawError(null);
  };

  // Drawing Canvas logic for Custom Room
  useEffect(() => {
    if (shape !== 'custom' || !drawCanvasRef.current) return;
    const canvas = drawCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset DPI
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Draw Grid
    ctx.strokeStyle = '#F0EFEA';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw Points and Lines
    if (customPoints.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = '#C5A880';
      ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(197, 168, 128, 0.2)';
      
      ctx.moveTo(customPoints[0].x, customPoints[0].y);
      for (let i = 1; i < customPoints.length; i++) {
        ctx.lineTo(customPoints[i].x, customPoints[i].y);
      }
      
      if (isDrawClosed) {
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        // Draw path up to current mouse position
        if (mousePos) {
          ctx.lineTo(mousePos.x, mousePos.y);
        }
        ctx.stroke();
      }

      // Draw handles/dots
      customPoints.forEach((pt, idx) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, idx === 0 && !isDrawClosed ? 7 : 5, 0, Math.PI * 2);
        ctx.fillStyle = idx === 0 && !isDrawClosed ? '#457B9D' : '#121212'; // highlight start vertex
        ctx.fill();
        
        // Draw measurement labels along lines
        if (idx > 0) {
          const prev = customPoints[idx - 1];
          drawDistanceLabel(ctx, prev, pt);
        }
      });
      
      // Draw distance from last point to mouse
      if (!isDrawClosed && mousePos && customPoints.length > 0) {
        const last = customPoints[customPoints.length - 1];
        drawDistanceLabel(ctx, last, mousePos);
      }
      
      // Draw distance from start point to mouse if close to closure
      if (!isDrawClosed && mousePos && customPoints.length > 2) {
        const start = customPoints[0];
        const dist = Math.hypot(mousePos.x - start.x, mousePos.y - start.y);
        if (dist < 15) {
          ctx.beginPath();
          ctx.arc(start.x, start.y, 12, 0, Math.PI * 2);
          ctx.strokeStyle = '#457B9D';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    }
  }, [customPoints, isDrawClosed, mousePos, shape]);

  // Draw distance text along canvas lines
  const drawDistanceLabel = (ctx: CanvasRenderingContext2D, p1: Point, p2: Point) => {
    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    
    // Scale pixel distance to selected unit
    // Let's assume 100 pixels = 2 meters or 6 feet
    const scaleFactor = unit === 'ft' ? 12 : 4; // feet or meters representation
    const pixelDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const convertedDist = Math.round((pixelDist / 100) * scaleFactor * 10) / 10;
    
    ctx.save();
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#121212';
    
    // Draw background label badge
    const text = `${convertedDist} ${unit}`;
    const textWidth = ctx.measureText(text).width;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(mx - textWidth / 2 - 3, my - 7, textWidth + 6, 14);
    
    ctx.fillStyle = '#457B9D';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, mx, my);
    ctx.restore();
  };

  // Handle canvas click to place a custom point
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (shape !== 'custom' || isDrawClosed) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    let rawX = e.clientX - rect.left;
    let rawY = e.clientY - rect.top;

    // Grid snapping (snaps to nearest 20px)
    let x = Math.round(rawX / gridSize) * gridSize;
    let y = Math.round(rawY / gridSize) * gridSize;

    // Check for closing click (near first point)
    if (customPoints.length >= 3) {
      const start = customPoints[0];
      const distance = Math.hypot(x - start.x, y - start.y);
      if (distance < 15) {
        setIsDrawClosed(true);
        finalizeCustomRoom();
        return;
      }
    }

    // Add point if unique
    if (customPoints.length === 0 || 
        Math.hypot(x - customPoints[customPoints.length - 1].x, y - customPoints[customPoints.length - 1].y) > 5) {
      setCustomPoints([...customPoints, { x, y }]);
      setDrawError(null);
    }
  };

  // Mouse move updates guidelines
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (shape !== 'custom' || isDrawClosed) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    let rawX = e.clientX - rect.left;
    let rawY = e.clientY - rect.top;
    
    // Snap pos
    let x = Math.round(rawX / gridSize) * gridSize;
    let y = Math.round(rawY / gridSize) * gridSize;
    
    // Orthogonal drawing helper (hold Shift / default helper to align with last point)
    if (customPoints.length > 0) {
      const last = customPoints[customPoints.length - 1];
      const dx = Math.abs(x - last.x);
      const dy = Math.abs(y - last.y);
      
      // If close to horizontal or vertical line, lock it
      if (dx < 20) {
        x = last.x; // Lock vertical
      } else if (dy < 20) {
        y = last.y; // Lock horizontal
      }
    }
    
    setMousePos({ x, y });
  };

  // Convert canvas pixel coordinates to real-world mm relative to room top-left boundary
  const finalizeCustomRoom = () => {
    if (customPoints.length < 3) return;
    
    // Find bounding box in pixels
    let minX = customPoints[0].x;
    let maxX = customPoints[0].x;
    let minY = customPoints[0].y;
    let maxY = customPoints[0].y;
    
    customPoints.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    const pxW = maxX - minX;
    const pxH = maxY - minY;
    
    // Establish real-world width and height:
    // Say 100 pixels = 2 meters or 6 feet.
    const scaleFactor = unit === 'ft' ? 12 : 4; // default base size
    const realWidth = Math.round((pxW / 100) * scaleFactor * 100) / 100;
    const realHeight = Math.round((pxH / 100) * scaleFactor * 100) / 100;

    const realWidthMm = convertToMm(realWidth, unit);
    const realHeightMm = convertToMm(realHeight, unit);
    const convertedVertices = customPoints.map(p => ({
      x: pxW > 0 ? ((p.x - minX) / pxW) * realWidthMm : 0,
      y: pxH > 0 ? ((p.y - minY) / pxH) * realHeightMm : 0
    }));

    onUpdateActiveRoom({
      width: realWidth,
      height: realHeight,
      vertices: convertedVertices
    });
  };

  // Reset drawing
  const handleResetDraw = () => {
    setCustomPoints([]);
    setIsDrawClosed(false);
    onUpdateActiveRoom({ vertices: [] });
    setDrawError(null);
  };

  return (
    <div className="glass-panel-light rounded-3xl p-6 border border-white/60 shadow-xl space-y-6">
      
      {/* Header with Title and Unit selector */}
      <div className="flex justify-between items-center border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-semibold text-luxury-charcoal">1. Room Dimensions</h2>
          <p className="text-xs text-gray-500">Configure space and shapes</p>
        </div>
        
        {/* Unit Selector */}
        <div className="inline-flex bg-gray-100 p-0.5 rounded-full border border-gray-200">
          {(['ft', 'in', 'm', 'cm'] as Unit[]).map((u) => (
            <button
              key={u}
              onClick={() => handleUnitToggle(u)}
              className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                unit === u 
                  ? 'bg-luxury-charcoal text-white shadow-sm'
                  : 'text-gray-500 hover:text-luxury-charcoal'
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* Shape presets selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onUpdateActiveRoom({ shape: 'rectangle' })}
          className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border text-sm font-medium transition-all duration-300 cursor-pointer ${
            shape === 'rectangle'
              ? 'bg-luxury-charcoal/5 border-luxury-charcoal text-luxury-charcoal font-semibold'
              : 'bg-white border-gray-200 text-gray-600 hover:border-luxury-gold'
          }`}
        >
          <Square className="w-4 h-4" /> Rectangle
        </button>
        <button
          onClick={() => onUpdateActiveRoom({ shape: 'l-shape' })}
          className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border text-sm font-medium transition-all duration-300 cursor-pointer ${
            shape === 'l-shape'
              ? 'bg-luxury-charcoal/5 border-luxury-charcoal text-luxury-charcoal font-semibold'
              : 'bg-white border-gray-200 text-gray-600 hover:border-luxury-gold'
          }`}
        >
          <Layout className="w-4 h-4 rotate-180" /> L-Shape
        </button>
        <button
          onClick={() => onUpdateActiveRoom({ shape: 'u-shape' })}
          className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border text-sm font-medium transition-all duration-300 cursor-pointer ${
            shape === 'u-shape'
              ? 'bg-luxury-charcoal/5 border-luxury-charcoal text-luxury-charcoal font-semibold'
              : 'bg-white border-gray-200 text-gray-600 hover:border-luxury-gold'
          }`}
        >
          <Layout className="w-4 h-4 -rotate-90" /> U-Shape
        </button>
        <button
          onClick={handleSelectCustom}
          className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border text-sm font-medium transition-all duration-300 cursor-pointer ${
            shape === 'custom'
              ? 'bg-luxury-charcoal/5 border-luxury-charcoal text-luxury-charcoal font-semibold'
              : 'bg-white border-gray-200 text-gray-600 hover:border-luxury-gold'
          }`}
        >
          <PenTool className="w-4 h-4" /> Custom Draw
        </button>
      </div>

      {/* Inputs block */}
      {shape !== 'custom' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
              Length (L)
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="0.1"
                value={width}
                onChange={(e) => onUpdateActiveRoom({ width: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-luxury-gold outline-none font-medium text-luxury-charcoal transition duration-300 pr-12"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-semibold">{unit}</span>
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
              Width (W)
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="0.1"
                value={height}
                onChange={(e) => onUpdateActiveRoom({ height: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-luxury-gold outline-none font-medium text-luxury-charcoal transition duration-300 pr-12"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-semibold">{unit}</span>
            </div>
          </div>

          {/* Conditional Cutout Inputs for L-Shape */}
          {shape === 'l-shape' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Cutout Length (L2)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={options.w2 ?? Math.round(width * 0.5 * 10) / 10}
                    onChange={(e) => onUpdateActiveRoom({ options: { ...options, w2: parseFloat(e.target.value) || 0 } })}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-luxury-gold outline-none font-medium text-luxury-charcoal transition pr-12"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-semibold">{unit}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Cutout Width (W2)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={options.h2 ?? Math.round(height * 0.5 * 10) / 10}
                    onChange={(e) => onUpdateActiveRoom({ options: { ...options, h2: parseFloat(e.target.value) || 0 } })}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-luxury-gold outline-none font-medium text-luxury-charcoal transition pr-12"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-semibold">{unit}</span>
                </div>
              </div>
            </>
          )}

          {/* Conditional Cutout Inputs for U-Shape */}
          {shape === 'u-shape' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Notch Width (W2)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={options.w2 ?? Math.round(width * 0.4 * 10) / 10}
                    onChange={(e) => onUpdateActiveRoom({ options: { ...options, w2: parseFloat(e.target.value) || 0 } })}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-luxury-gold outline-none font-medium text-luxury-charcoal transition pr-12"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-semibold">{unit}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Notch Depth (H2)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={options.h2 ?? Math.round(height * 0.5 * 10) / 10}
                    onChange={(e) => onUpdateActiveRoom({ options: { ...options, h2: parseFloat(e.target.value) || 0 } })}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-luxury-gold outline-none font-medium text-luxury-charcoal transition pr-12"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-semibold">{unit}</span>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        /* Custom Drawer Viewport */
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-luxury-gold" />
              Click inside the box to draw the walls. Return to start dot to close.
            </span>
            <button
              onClick={handleResetDraw}
              className="flex items-center gap-1 text-red-500 hover:text-red-700 cursor-pointer font-medium"
            >
              <RotateCcw className="w-3 h-3" /> Clear Sketch
            </button>
          </div>
          
          <div className="w-full h-[280px] bg-white border border-gray-200 rounded-2xl relative overflow-hidden">
            <canvas
              ref={drawCanvasRef}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              className="w-full h-full cursor-crosshair block"
            />
            {isDrawClosed && (
              <div className="absolute inset-0 bg-green-500/5 pointer-events-none flex items-center justify-center border border-green-500/30">
                <span className="bg-white/95 text-green-700 border border-green-200 text-xs font-semibold px-4 py-2 rounded-full shadow-lg backdrop-blur">
                  ✓ Sketch Complete & Calibrated
                </span>
              </div>
            )}
            {!isDrawClosed && customPoints.length === 0 && (
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-center items-center text-gray-400 space-y-1">
                <PenTool className="w-6 h-6 stroke-1 animate-pulse" />
                <span className="text-xs">Draw custom room shape here</span>
              </div>
            )}
          </div>
          
          {/* Readout of custom dimensions */}
          {isDrawClosed && vertices.length > 0 && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center text-sm font-medium">
              <span className="text-gray-600">Calculated Blueprint Area:</span>
              <span className="text-luxury-charcoal font-semibold">
                {Math.round(polygonArea(vertices) / (convertToMm(1, unit) * convertToMm(1, unit)) * 10) / 10} {unit}²
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
