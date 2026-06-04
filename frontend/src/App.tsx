import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Eye, Calculator, Sparkles, FolderKanban, Columns, Layers } from 'lucide-react';
import Hero from './components/Hero';
import RoomEditor from './components/RoomEditor';
import CalculatorComponent from './components/Calculator';
import PatternSelector from './components/PatternSelector';
import Visualizer2D from './components/Visualizer2D';
import Visualizer3D from './components/Visualizer3D';
import Comparison from './components/Comparison';
import AIRecommender from './components/AIRecommender';
import MultiRoom from './components/MultiRoom';
import ProjectList from './components/ProjectList';
import FloatingPanel from './components/FloatingPanel';

import { Project, Room, Pattern, StartPosition, Unit, RoomShape, Point } from './utils/types';
import { calculateLayout, generateRoomVertices } from './utils/tileCalculations';
import { exportProjectPDF } from './utils/pdfExporter';

// Default initial state
const defaultRoom: Room = {
  id: 'room-1',
  name: 'Living Room',
  shape: 'rectangle',
  vertices: generateRoomVertices('rectangle', 14, 12, 'ft'),
  width: 14,
  height: 12,
  unit: 'ft',
  tilePrice: 160,
  pricingMode: 'tile',
  packetPrice: 1200,
  packetCoverage: 15,
  options: {}
};

const defaultProject: Project = {
  id: 'project-default',
  name: 'New Tiling Project',
  rooms: [defaultRoom],
  tileWidth: 600,
  tileHeight: 600,
  isCustomTile: false,
  wastage: 5,
  pattern: 'straight',
  groutWidth: 2,
  startPosition: 'center',
  tileUnit: 'mm',
  date: new Date().toISOString()
};

export default function App() {
  const [project, setProject] = useState<Project>(defaultProject);
  const [activeRoomId, setActiveRoomId] = useState<string>('room-1');
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [offsetDrag, setOffsetDrag] = useState<Point>({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState<'design' | 'compare' | 'projects'>('design');
  const [tileUnit, setTileUnit] = useState<Unit>('mm');

  const plannerRef = useRef<HTMLDivElement | null>(null);

  // Compute active room from list
  const activeRoom = useMemo(() => {
    return project.rooms.find((r: Room) => r.id === activeRoomId) || project.rooms[0];
  }, [project.rooms, activeRoomId]);

  // Compute calculation stats for active room
  const stats = useMemo(() => {
    return calculateLayout(
      activeRoom.vertices,
      project.tileWidth,
      project.tileHeight,
      project.groutWidth,
      project.pattern,
      project.startPosition,
      project.wastage,
      activeRoom.tilePrice,
      activeRoom.unit,
      offsetDrag,
      activeRoom.pricingMode || 'tile',
      activeRoom.packetPrice || 0,
      activeRoom.packetCoverage || 0
    );
  }, [activeRoom, project, offsetDrag]);

  // Reset visual layout offsets when pattern/placement changes
  useEffect(() => {
    setOffsetDrag({ x: 0, y: 0 });
  }, [project.pattern, project.startPosition, project.tileWidth, project.tileHeight]);

  // Handle active room property updates
  const updateActiveRoom = (updates: Partial<Room>) => {
    const updatedRooms = project.rooms.map((r: Room) => {
      if (r.id === activeRoomId) {
        return { ...r, ...updates };
      }
      return r;
    });
    setProject((prev: Project) => ({ ...prev, rooms: updatedRooms }));
  };

  // Callback to calculate stats for multi-room lists
  const calculateRoomStats = (room: Room) => {
    const roomStats = calculateLayout(
      room.vertices,
      project.tileWidth,
      project.tileHeight,
      project.groutWidth,
      project.pattern,
      project.startPosition,
      project.wastage,
      room.tilePrice,
      room.unit,
      { x: 0, y: 0 },
      room.pricingMode || 'tile',
      room.packetPrice || 0,
      room.packetCoverage || 0
    );
    return {
      area: roomStats.totalAreaDisplay,
      tiles: roomStats.finalTilesNeededCount,
      boxes: roomStats.boxesRequired,
      cost: roomStats.estimatedCost
    };
  };

  // Scroll to planner view
  const scrollToPlanner = () => {
    plannerRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load Demo Project layout
  const loadDemoProject = () => {
    // Generates a nice multi-room layout: Foyer L-shape and Bathroom Rectangular
    const foyerRoom: Room = {
      id: 'room-demo-1',
      name: 'Grand Foyer (Entrance)',
      shape: 'l-shape',
      width: 16,
      height: 14,
      unit: 'ft',
      tilePrice: 220,
      pricingMode: 'tile',
      packetPrice: 1500,
      packetCoverage: 12,
      vertices: generateRoomVertices('l-shape', 16, 14, 'ft', { w2: 8, h2: 7 }),
      options: { w2: 8, h2: 7 }
    };

    const bathRoom: Room = {
      id: 'room-demo-2',
      name: 'Master Bathroom',
      shape: 'rectangle',
      width: 10,
      height: 8,
      unit: 'ft',
      tilePrice: 180,
      pricingMode: 'tile',
      packetPrice: 1400,
      packetCoverage: 10,
      vertices: generateRoomVertices('rectangle', 10, 8, 'ft')
    };

    const demoProject: Project = {
      id: `demo-${Date.now()}`,
      name: 'TileVision Luxury Demo',
      rooms: [foyerRoom, bathRoom],
      tileWidth: 600,
      tileHeight: 1200, // Marble planks
      isCustomTile: false,
      wastage: 7,
      pattern: 'brick',
      groutWidth: 3,
      startPosition: 'center',
      tileUnit: 'mm',
      date: new Date().toISOString()
    };

    setProject(demoProject);
    setActiveRoomId('room-demo-1');
    setViewMode('2d');
    scrollToPlanner();
    triggerParticles();
  };

  // Reset project parameters to standard defaults
  const handleReset = () => {
    setProject(defaultProject);
    setActiveRoomId('room-1');
    setViewMode('2d');
    setOffsetDrag({ x: 0, y: 0 });
    triggerParticles();
  };

  // Export current layout canvas as PNG image
  const handleExportPNG = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `TileVisionPro_${activeRoom.name.replace(/\s+/g, '_')}_Layout.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Export PDF layout estimation
  const handleExportPDF = () => {
    const canvas = document.querySelector('canvas');
    exportProjectPDF({
      project,
      activeRoom,
      stats,
      canvasElement: canvas
    });
  };

  // Confetti Particle burst celebration
  const triggerParticles = () => {
    const particleContainer = document.createElement('div');
    particleContainer.className = 'fixed inset-0 pointer-events-none z-50 overflow-hidden';
    document.body.appendChild(particleContainer);

    for (let i = 0; i < 70; i++) {
      const p = document.createElement('div');
      p.className = 'absolute w-2 h-2 rounded';
      p.style.backgroundColor = i % 2 === 0 ? '#C5A880' : '#121212';
      p.style.left = `${Math.random() * 100}vw`;
      p.style.top = `-20px`;
      p.style.opacity = `${Math.random() * 0.7 + 0.3}`;
      p.style.transform = `rotate(${Math.random() * 360}deg)`;
      
      const fallDuration = Math.random() * 1.5 + 1.2;
      const swingRange = Math.random() * 40 - 20;

      p.style.transition = `transform ${fallDuration}s linear, top ${fallDuration}s linear, left ${fallDuration}s ease-out, opacity ${fallDuration}s ease`;
      particleContainer.appendChild(p);

      // Trigger animations
      requestAnimationFrame(() => {
        setTimeout(() => {
          p.style.top = '110vh';
          p.style.left = `calc(${p.style.left} + ${swingRange}px)`;
          p.style.transform = `rotate(${Math.random() * 1080}deg) scale(0.5)`;
          p.style.opacity = '0';
        }, 50);
      });
    }

    setTimeout(() => {
      document.body.removeChild(particleContainer);
    }, 3000);
  };

  const handleSaveFocus = () => {
    setActiveTab('projects');
    const el = document.getElementById('save-anchor');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-marble-gradient pb-28">
      {/* 1. Hero Landing Page */}
      <Hero onStartCalculating={scrollToPlanner} onLoadDemo={loadDemoProject} />

      {/* 2. Main Workspace Segment */}
      <main id="planner" ref={plannerRef} className="max-w-7xl mx-auto px-6 py-12 space-y-8 animate-fade-in scroll-mt-6">
        
        {/* Navigation Tabs Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/70 backdrop-blur border border-gray-150 p-3 rounded-3xl shadow-sm">
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('design')}
              className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'design'
                  ? 'bg-luxury-charcoal text-white shadow-md'
                  : 'text-gray-500 hover:text-luxury-charcoal hover:bg-gray-50'
              }`}
            >
              <Columns className="w-4 h-4" /> Layout Planner
            </button>
            
            <button
              onClick={() => setActiveTab('compare')}
              className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'compare'
                  ? 'bg-luxury-charcoal text-white shadow-md'
                  : 'text-gray-500 hover:text-luxury-charcoal hover:bg-gray-50'
              }`}
            >
              <Layers className="w-4 h-4" /> Compare Sizes
            </button>
            
            <button
              onClick={() => setActiveTab('projects')}
              className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'projects'
                  ? 'bg-luxury-charcoal text-white shadow-md'
                  : 'text-gray-500 hover:text-luxury-charcoal hover:bg-gray-50'
              }`}
            >
              <FolderKanban className="w-4 h-4" /> Projects persistence
            </button>
          </div>

          {/* Title tag */}
          <div className="text-right hidden md:block">
            <h3 className="text-sm font-bold text-luxury-charcoal uppercase tracking-wider font-display">
              {project.name}
            </h3>
            <p className="text-[10px] text-gray-500">
              Editing: {activeRoom.name}
            </p>
          </div>
        </div>

        {/* Tab Contents: Layout Planner (2D/3D Split view) */}
        {activeTab === 'design' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column controls sidebar */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Multi Room dashboard list */}
              <MultiRoom
                rooms={project.rooms}
                activeRoomId={activeRoomId}
                onActiveRoomChange={setActiveRoomId}
                onRoomsChange={(rooms) => setProject((prev: Project) => ({ ...prev, rooms }))}
                unit={activeRoom.unit}
                calculateRoomStats={calculateRoomStats}
              />

              {/* 1. Room blueprint and dimensions */}
              <RoomEditor
                shape={activeRoom.shape}
                width={activeRoom.width}
                height={activeRoom.height}
                unit={activeRoom.unit}
                vertices={activeRoom.vertices}
                options={activeRoom.options || {}}
                onUpdateActiveRoom={updateActiveRoom}
              />

              {/* 2. Grout width and pattern selectors */}
              <PatternSelector
                pattern={project.pattern}
                onPatternChange={(pattern) => setProject((prev: Project) => ({ ...prev, pattern }))}
                groutWidth={project.groutWidth}
                onGroutWidthChange={(groutWidth) => setProject((prev: Project) => ({ ...prev, groutWidth }))}
                startPosition={project.startPosition}
                onStartPositionChange={(startPosition) => setProject((prev: Project) => ({ ...prev, startPosition }))}
                tileUnit={tileUnit}
              />

              {/* 3. Tile specifications and quantities calculators */}
              <CalculatorComponent
                tileWidth={project.tileWidth}
                tileHeight={project.tileHeight}
                onTileWidthChange={(tileWidth) => setProject((prev: Project) => ({ ...prev, tileWidth }))}
                onTileHeightChange={(tileHeight) => setProject((prev: Project) => ({ ...prev, tileHeight }))}
                isCustomTile={project.isCustomTile}
                onIsCustomTileChange={(isCustomTile) => setProject((prev: Project) => ({ ...prev, isCustomTile }))}
                wastage={project.wastage}
                onWastageChange={(wastage) => setProject((prev: Project) => ({ ...prev, wastage }))}
                tilePrice={activeRoom.tilePrice}
                onTilePriceChange={(tilePrice) => updateActiveRoom({ tilePrice })}
                pricingMode={activeRoom.pricingMode || 'tile'}
                onPricingModeChange={(pricingMode) => updateActiveRoom({ pricingMode })}
                packetPrice={activeRoom.packetPrice || 0}
                onPacketPriceChange={(packetPrice) => updateActiveRoom({ packetPrice })}
                packetCoverage={activeRoom.packetCoverage || 0}
                onPacketCoverageChange={(packetCoverage) => updateActiveRoom({ packetCoverage })}
                unit={activeRoom.unit}
                tileUnit={tileUnit}
                onTileUnitChange={(u) => {
                  setTileUnit(u);
                  setProject((prev: Project) => ({ ...prev, tileUnit: u }));
                }}
                totalArea={stats.totalAreaDisplay}
                fullTiles={stats.fullTilesCount}
                cutTiles={stats.cutTilesCount}
                tilesRequired={stats.tilesRequired}
                wastageTiles={stats.wastageTilesCount}
                finalTilesNeeded={stats.finalTilesNeededCount}
                boxesRequired={stats.boxesRequired}
                estimatedCost={stats.estimatedCost}
              />

              {/* AI Assistant Recommender Panel */}
              <AIRecommender
                roomVertices={activeRoom.vertices}
                groutWidth={project.groutWidth}
                pattern={project.pattern}
                startPosition={project.startPosition}
                wastage={project.wastage}
                tilePrice={activeRoom.tilePrice}
                unit={activeRoom.unit}
                tileUnit={tileUnit}
                onSelectSize={(w, h) => setProject((prev: Project) => ({ ...prev, tileWidth: w, tileHeight: h }))}
              />

            </div>

            {/* Right Column Canvas Viewports (Sticky) */}
            <div className="lg:col-span-7 lg:sticky lg:top-6 space-y-6">
              
              <div className="glass-panel-light rounded-3xl p-6 border border-white/60 shadow-xl flex flex-col h-[560px]">
                
                {/* 2D/3D Mode Selector Header */}
                <div className="flex justify-between items-center border-b border-gray-150 pb-4 mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-luxury-charcoal">
                      {viewMode === '2d' ? '2D Architectural Blueprint' : '3D Immersive Floor Preview'}
                    </h2>
                    <p className="text-xs text-gray-500">
                      {viewMode === '2d' 
                        ? 'Check grout layout spacing and wall alignment cuts' 
                        : 'Rotate, orbit, zoom, and inspect polished glossy finishes'}
                    </p>
                  </div>

                  {/* Toggle controls */}
                  <div className="inline-flex bg-gray-100 p-0.5 rounded-full border border-gray-200 shadow-inner">
                    <button
                      onClick={() => setViewMode('2d')}
                      className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-1 ${
                        viewMode === '2d' 
                          ? 'bg-luxury-charcoal text-white shadow-sm'
                          : 'text-gray-500 hover:text-luxury-charcoal'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" /> 2D View
                    </button>
                    <button
                      onClick={() => setViewMode('3d')}
                      className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-1 ${
                        viewMode === '3d' 
                          ? 'bg-luxury-charcoal text-white shadow-sm'
                          : 'text-gray-500 hover:text-luxury-charcoal'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" /> 3D Room
                    </button>
                  </div>
                </div>

                {/* Viewport component */}
                <div className="flex-1 min-h-0">
                  {viewMode === '2d' ? (
                    <Visualizer2D
                      roomVertices={activeRoom.vertices}
                      tilesData={stats.tilesData}
                      tileWidth={project.tileWidth}
                      tileHeight={project.tileHeight}
                      unit={activeRoom.unit}
                      offsetDrag={offsetDrag}
                      onOffsetDragChange={setOffsetDrag}
                      groutWidth={project.groutWidth}
                    />
                  ) : (
                    <Visualizer3D
                      roomVertices={activeRoom.vertices}
                      tilesData={stats.tilesData}
                      tileWidth={project.tileWidth}
                      tileHeight={project.tileHeight}
                    />
                  )}
                </div>

              </div>

            </div>

          </div>
        )}

        {/* Tab Contents: Side by Side Comparisons */}
        {activeTab === 'compare' && (
          <div className="space-y-6">
            <Comparison
              roomVertices={activeRoom.vertices}
              groutWidth={project.groutWidth}
              pattern={project.pattern}
              startPosition={project.startPosition}
              wastage={project.wastage}
              tilePrice={activeRoom.tilePrice}
              unit={activeRoom.unit}
              activeTileW={project.tileWidth}
              activeTileH={project.tileHeight}
              tileUnit={tileUnit}
              pricingMode={activeRoom.pricingMode || 'tile'}
              packetPrice={activeRoom.packetPrice || 0}
              packetCoverage={activeRoom.packetCoverage || 0}
              onTileSelect={(w, h) => {
                setProject((prev: Project) => ({ ...prev, tileWidth: w, tileHeight: h }));
                setActiveTab('design');
                triggerParticles();
              }}
            />
          </div>
        )}

        {/* Tab Contents: Project Manager DB and Lists */}
        {activeTab === 'projects' && (
          <div id="save-anchor" className="max-w-2xl mx-auto space-y-6 scroll-mt-24">
            <ProjectList
              currentProject={project}
              onLoadProject={(loaded) => {
                setProject(loaded);
                if (loaded.tileUnit) {
                  setTileUnit(loaded.tileUnit);
                }
                if (loaded.rooms?.length > 0) {
                  setActiveRoomId(loaded.rooms[0].id);
                }
                setActiveTab('design');
                triggerParticles();
              }}
              onSaveTrigger={fetchProjectsTriggerDummy}
            />
          </div>
        )}

      </main>

      {/* Floating Action Overlay Bar */}
      <FloatingPanel
        onReset={handleReset}
        onExportPNG={handleExportPNG}
        onExportPDF={handleExportPDF}
        onSaveFocus={handleSaveFocus}
        onConfettiTrigger={triggerParticles}
      />
    </div>
  );
}

// Dummy handler to sync folder fetch triggers if needed
function fetchProjectsTriggerDummy() {}
