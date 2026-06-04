import React, { useRef, useEffect, useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Move, MousePointer, Info } from 'lucide-react';
import { Point, RenderedTile, Unit } from '../utils/types';
import { isPointInPolygon, getBoundingBox } from '../utils/geometry';

interface Visualizer2DProps {
  roomVertices: Point[];
  tilesData: RenderedTile[];
  tileWidth: number; // mm
  tileHeight: number; // mm
  unit: Unit;
  offsetDrag: Point;
  onOffsetDragChange: (offset: Point) => void;
  groutWidth: number; // mm
}

export default function Visualizer2D({
  roomVertices,
  tilesData,
  tileWidth,
  tileHeight,
  unit,
  offsetDrag,
  onOffsetDragChange,
  groutWidth
}: Visualizer2DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Viewport transforms (Zoom & Pan)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isDraggingOrigin, setIsDraggingOrigin] = useState(false);
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
  
  // Interaction Modes: 'inspect' (default, hovers show tile info) or 'drag-origin' (drags the pattern start point)
  const [interactionMode, setInteractionMode] = useState<'inspect' | 'drag'>('inspect');
  const [hoveredTile, setHoveredTile] = useState<RenderedTile | null>(null);
  const [tooltipPos, setTooltipPos] = useState<Point>({ x: 0, y: 0 });

  // Reset View to fit room boundary inside the canvas
  const resetView = () => {
    const canvas = canvasRef.current;
    if (!canvas || roomVertices.length === 0) return;

    const { minX, maxX, minY, maxY } = getBoundingBox(roomVertices);
    const roomW = maxX - minX;
    const roomH = maxY - minY;

    const padding = 40;
    const scaleX = (canvas.clientWidth - padding * 2) / roomW;
    const scaleY = (canvas.clientHeight - padding * 2) / roomH;
    const initialZoom = Math.min(scaleX, scaleY);

    setZoom(initialZoom);
    // Center pan
    const centerX = (canvas.clientWidth - roomW * initialZoom) / 2 - minX * initialZoom;
    const centerY = (canvas.clientHeight - roomH * initialZoom) / 2 - minY * initialZoom;
    setPan({ x: centerX, y: centerY });
    setHoveredTile(null);
  };

  // Trigger reset view once on load
  useEffect(() => {
    resetView();
  }, [roomVertices]);

  // Main Canvas Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI retina screens
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    // Apply viewport scale & translate
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // 1. Draw grid background under layout (room floor plate)
    if (roomVertices.length >= 3) {
      ctx.beginPath();
      ctx.moveTo(roomVertices[0].x, roomVertices[0].y);
      for (let i = 1; i < roomVertices.length; i++) {
        ctx.lineTo(roomVertices[i].x, roomVertices[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = '#E5E5E5'; // Grout color as background under tiles
      ctx.fill();
    }

    // 2. Draw each tile
    tilesData.forEach((tile) => {
      if (tile.vertices.length < 3) return;

      ctx.beginPath();
      ctx.moveTo(tile.vertices[0].x, tile.vertices[0].y);
      for (let i = 1; i < tile.vertices.length; i++) {
        ctx.lineTo(tile.vertices[i].x, tile.vertices[i].y);
      }
      ctx.closePath();

      // Set tile color
      const isHovered = hoveredTile?.id === tile.id;
      
      if (tile.status === 'full') {
        ctx.fillStyle = isHovered ? '#F0E5D3' : '#F8F9FA'; // gold-tint on hover
      } else {
        ctx.fillStyle = isHovered ? '#D5E6F7' : '#EAF2F8'; // cut tile light blue tint
      }

      ctx.fill();
      
      // Tile borders (simulating grout spacing)
      ctx.strokeStyle = '#CCCCCC';
      ctx.lineWidth = Math.max(0.5, 2);
      ctx.stroke();

      // Hover overlay indicator outline
      if (isHovered) {
        ctx.strokeStyle = '#C5A880';
        ctx.lineWidth = Math.max(1, 2.5);
        ctx.stroke();
      }
    });

    // 3. Draw Room Perimeter Wall outline
    if (roomVertices.length >= 3) {
      ctx.beginPath();
      ctx.moveTo(roomVertices[0].x, roomVertices[0].y);
      for (let i = 1; i < roomVertices.length; i++) {
        ctx.lineTo(roomVertices[i].x, roomVertices[i].y);
      }
      ctx.closePath();
      ctx.strokeStyle = '#121212';
      ctx.lineWidth = Math.max(1, 4 / zoom);
      ctx.stroke();
    }

    // 4. Draw starting origin marker (if in drag mode, show helper cross)
    if (interactionMode === 'drag') {
      const originX = offsetDrag.x;
      const originY = offsetDrag.y;
      ctx.beginPath();
      ctx.arc(originX, originY, 8 / zoom, 0, Math.PI * 2);
      ctx.fillStyle = '#C5A880';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2 / zoom;
      ctx.stroke();

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(originX - 25 / zoom, originY);
      ctx.lineTo(originX + 25 / zoom, originY);
      ctx.moveTo(originX, originY - 25 / zoom);
      ctx.lineTo(originX, originY + 25 / zoom);
      ctx.strokeStyle = '#C5A880';
      ctx.lineWidth = 1.5 / zoom;
      ctx.stroke();
    }

    ctx.restore();
  }, [roomVertices, tilesData, zoom, pan, hoveredTile, interactionMode, offsetDrag]);

  // Transform raw client coordinates back to room coordinates
  const clientToRoomCoords = (clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    return {
      x: (x - pan.x) / zoom,
      y: (y - pan.y) / zoom
    };
  };

  // Mouse Down
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = clientToRoomCoords(e.clientX, e.clientY);
    setDragStart({ x: e.clientX, y: e.clientY });

    if (interactionMode === 'drag') {
      // Check if clicked close to the origin marker
      const dist = Math.hypot(coords.x - offsetDrag.x, coords.y - offsetDrag.y);
      if (dist < 30 / zoom) {
        setIsDraggingOrigin(true);
      } else {
        setIsPanning(true);
      }
    } else {
      setIsPanning(true);
    }
  };

  // Mouse Move
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    if (isPanning) {
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
      setHoveredTile(null);
    } else if (isDraggingOrigin) {
      // Dragging origin
      const coords = clientToRoomCoords(e.clientX, e.clientY);
      // Snap to nearest 10mm
      onOffsetDragChange({
        x: Math.round(coords.x / 10) * 10,
        y: Math.round(coords.y / 10) * 10
      });
      setHoveredTile(null);
    } else {
      // Inspect hover tile
      const coords = clientToRoomCoords(e.clientX, e.clientY);
      const found = tilesData.find(tile => isPointInPolygon(coords, tile.vertices));
      
      if (found) {
        setHoveredTile(found);
        
        // Tooltip position (client clientX, clientY relative to canvas element container)
        const rect = canvas.getBoundingClientRect();
        setTooltipPos({
          x: e.clientX - rect.left + 15,
          y: e.clientY - rect.top - 80
        });
      } else {
        setHoveredTile(null);
      }
    }
  };

  // Mouse Up
  const handleMouseUp = () => {
    setIsPanning(false);
    setIsDraggingOrigin(false);
  };

  // Zoom helpers
  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.25, 20));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.25, 0.05));

  const formatArea = (sqMm: number) => {
    const factor = unit === 'ft' ? 304.8 : 10;
    const displayArea = sqMm / (factor * factor);
    return `${displayArea.toFixed(2)} ${unit}²`;
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      
      {/* 2D Toolbar */}
      <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setInteractionMode('inspect')}
            className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-300 cursor-pointer ${
              interactionMode === 'inspect'
                ? 'bg-luxury-charcoal text-white shadow'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <MousePointer className="w-3.5 h-3.5" /> Inspect Tile
          </button>
          
          <button
            onClick={() => setInteractionMode('drag')}
            className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-300 cursor-pointer ${
              interactionMode === 'drag'
                ? 'bg-luxury-charcoal text-white shadow'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Move className="w-3.5 h-3.5" /> Adjust Start Point
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-luxury-charcoal border border-gray-150 transition cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-luxury-charcoal border border-gray-150 transition cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={resetView}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-luxury-charcoal border border-gray-150 transition cursor-pointer"
            title="Reset View"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport container */}
      <div className="flex-1 bg-white rounded-3xl overflow-hidden border border-gray-150 relative min-h-[380px] shadow-inner select-none">
        
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full h-full block cursor-grab active:cursor-grabbing"
        />

        {/* Map Legend */}
        <div className="absolute left-4 bottom-4 bg-white/90 backdrop-blur border border-gray-100 p-3 rounded-2xl shadow-sm text-[10px] space-y-1.5 font-semibold text-gray-500">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 bg-gray-100 border border-gray-300 rounded" />
            <span>Full Tiles (Light Grey)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 bg-blue-100 border border-blue-300 rounded" />
            <span>Cut Tiles (Soft Blue)</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Info className="w-3 h-3 text-luxury-gold" />
            <span>Click & Drag to pan workspace</span>
          </div>
        </div>

        {/* Hover Tile Inspector Tooltip */}
        {hoveredTile && interactionMode === 'inspect' && (
          <div
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
            className="absolute bg-luxury-charcoal text-white text-[11px] p-3.5 rounded-xl border border-white/10 shadow-xl pointer-events-none flex flex-col space-y-1 z-30 font-medium w-48 backdrop-blur"
          >
            <div className="flex justify-between border-b border-white/10 pb-1 mb-1">
              <span className="font-semibold text-luxury-gold font-display">
                Tile ID: {hoveredTile.id.split('-').pop() || hoveredTile.id}
              </span>
              <span className="text-[9px] uppercase tracking-wider bg-white/10 px-1 py-0.2 rounded font-bold">
                {hoveredTile.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Layout Grid:</span>
              <span>R: {hoveredTile.gridIndex.r}, C: {hoveredTile.gridIndex.c}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Nominal Size:</span>
              <span>{tileWidth} × {tileHeight} mm</span>
            </div>
            <div className="flex justify-between border-t border-white/5 pt-1 mt-1 font-semibold">
              <span className="text-gray-400">Coverage:</span>
              <span>{formatArea(hoveredTile.area)}</span>
            </div>
          </div>
        )}

        {/* Start Point adjust helper label */}
        {interactionMode === 'drag' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-luxury-gold/90 text-luxury-charcoal font-semibold text-xs px-4 py-2 rounded-full shadow border border-luxury-gold/50 backdrop-blur">
            ✦ Drag the central gold cursor to adjust alignment ✦
          </div>
        )}
      </div>

    </div>
  );
}
