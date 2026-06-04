import React, { useState } from 'react';
import { Plus, Trash2, Home, Layers, Calculator, ListCollapse } from 'lucide-react';
import { Room, RoomShape, Unit, Point } from '../utils/types';
import { generateRoomVertices } from '../utils/tileCalculations';

interface MultiRoomProps {
  rooms: Room[];
  activeRoomId: string;
  onActiveRoomChange: (id: string) => void;
  onRoomsChange: (rooms: Room[]) => void;
  unit: Unit;
  calculateRoomStats: (room: Room) => {
    area: number;
    tiles: number;
    boxes: number;
    cost: number;
  };
}

export default function MultiRoom({
  rooms,
  activeRoomId,
  onActiveRoomChange,
  onRoomsChange,
  unit,
  calculateRoomStats
}: MultiRoomProps) {
  
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomShape, setNewRoomShape] = useState<RoomShape>('rectangle');

  // Add Room
  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    const defaultW = 12; // default feet/meters
    const defaultH = 10;
    const defaultVertices = generateRoomVertices(newRoomShape, defaultW, defaultH, unit);

    const newRoom: Room = {
      id: `room-${Date.now()}`,
      name: newRoomName.trim(),
      shape: newRoomShape,
      vertices: defaultVertices,
      width: defaultW,
      height: defaultH,
      unit: unit,
      tilePrice: 150 // default price
    };

    const updated = [...rooms, newRoom];
    onRoomsChange(updated);
    onActiveRoomChange(newRoom.id);
    setNewRoomName('');
  };

  // Remove Room
  const handleRemoveRoom = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent setting active
    if (rooms.length <= 1) return; // keep at least one

    const updated = rooms.filter(r => r.id !== id);
    onRoomsChange(updated);
    
    // If we removed the active room, set another one active
    if (activeRoomId === id) {
      onActiveRoomChange(updated[0].id);
    }
  };

  // Calculate aggregates
  const roomStats = rooms.map(room => ({
    id: room.id,
    ...calculateRoomStats(room)
  }));

  const grandTotalArea = roomStats.reduce((sum, s) => sum + s.area, 0);
  const grandTotalTiles = roomStats.reduce((sum, s) => sum + s.tiles, 0);
  const grandTotalBoxes = roomStats.reduce((sum, s) => sum + s.boxes, 0);
  const grandTotalCost = roomStats.reduce((sum, s) => sum + s.cost, 0);

  // Format currency
  const formatCost = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="glass-panel-light rounded-3xl p-6 border border-white/60 shadow-xl space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-luxury-charcoal">Multi-Room Management</h2>
        <p className="text-xs text-gray-500">Add multiple spaces to calculate overall project requirements</p>
      </div>

      {/* Add Room Form */}
      <form onSubmit={handleAddRoom} className="flex gap-2 bg-gray-55 p-1 rounded-2xl border border-gray-150">
        <input
          type="text"
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
          placeholder="Room Name (e.g. Master Bath)"
          className="flex-1 bg-white border border-gray-100 rounded-xl px-4 py-2.5 outline-none font-semibold text-xs text-luxury-charcoal focus:border-luxury-gold transition"
        />
        
        <select
          value={newRoomShape}
          onChange={(e) => setNewRoomShape(e.target.value as RoomShape)}
          className="bg-white border border-gray-100 rounded-xl px-3 py-2.5 outline-none font-bold text-xs text-gray-600 focus:border-luxury-gold cursor-pointer"
        >
          <option value="rectangle">Rectangle</option>
          <option value="l-shape">L-Shape</option>
          <option value="u-shape">U-Shape</option>
          <option value="custom">Custom Draw</option>
        </select>

        <button
          type="submit"
          className="px-4 py-2.5 bg-luxury-charcoal hover:bg-luxury-gold text-white hover:text-luxury-charcoal rounded-xl transition duration-300 font-bold text-xs cursor-pointer flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </form>

      {/* List of rooms */}
      <div className="space-y-2">
        {rooms.map((room) => {
          const stats = roomStats.find(s => s.id === room.id);
          const isActive = activeRoomId === room.id;
          
          return (
            <div
              key={room.id}
              onClick={() => onActiveRoomChange(room.id)}
              className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-300 flex justify-between items-center ${
                isActive
                  ? 'bg-luxury-charcoal text-white border-luxury-charcoal shadow-md scale-[1.01]'
                  : 'bg-white border-gray-150 text-gray-700 hover:border-luxury-gold hover:bg-gray-50/50'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className={`p-2.5 rounded-xl ${isActive ? 'bg-white/10' : 'bg-gray-50 border border-gray-100'}`}>
                  <Home className={`w-4 h-4 ${isActive ? 'text-luxury-gold' : 'text-gray-500'}`} />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">{room.name}</h4>
                  <p className={`text-[10px] mt-0.5 ${isActive ? 'text-gray-400' : 'text-gray-500'}`}>
                    Shape: {room.shape.charAt(0).toUpperCase() + room.shape.slice(1)} • {room.width}×{room.height} {room.unit}
                  </p>
                </div>
              </div>

              {/* Stats & Delete */}
              <div className="flex items-center gap-4 text-right">
                <div className="text-xs">
                  <div className="font-semibold text-luxury-gold">
                    {stats ? `${stats.tiles} pcs` : '—'}
                  </div>
                  <div className={`text-[9px] ${isActive ? 'text-gray-400' : 'text-gray-400'}`}>
                    {stats ? `${stats.area.toFixed(1)} ${room.unit}² • ${formatCost(stats.cost)}` : '—'}
                  </div>
                </div>
                
                {rooms.length > 1 && (
                  <button
                    onClick={(e) => handleRemoveRoom(room.id, e)}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition cursor-pointer"
                    title="Remove Room"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Aggregate invoice card */}
      <div className="p-5 bg-luxury-charcoal text-white rounded-3xl border border-white/10 relative overflow-hidden flex flex-col justify-between shadow-xl">
        <div className="absolute right-0 top-0 bottom-0 w-36 bg-luxury-gold/5 blur-2xl rounded-full" />
        
        <h4 className="text-[10px] font-bold text-luxury-gold uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" /> Project Consolidated Totals ({rooms.length} Rooms)
        </h4>

        <div className="grid grid-cols-2 gap-4 border-b border-white/10 pb-4 mb-4 text-xs font-medium text-gray-300">
          <div>
            <div className="text-gray-500 text-[9px] uppercase tracking-wider">Total Combined Area</div>
            <div className="text-lg font-bold text-white mt-0.5">
              {grandTotalArea.toFixed(1)} <span className="text-xs text-gray-400 font-semibold">{unit}²</span>
            </div>
          </div>
          <div>
            <div className="text-gray-500 text-[9px] uppercase tracking-wider">Total Purchase Tiles</div>
            <div className="text-lg font-bold text-white mt-0.5">
              {grandTotalTiles} <span className="text-xs text-gray-400 font-semibold">pcs</span>
            </div>
          </div>
          <div>
            <div className="text-gray-500 text-[9px] uppercase tracking-wider">Total Combined Boxes</div>
            <div className="text-lg font-bold text-white mt-0.5">
              {grandTotalBoxes} <span className="text-xs text-gray-400 font-semibold">boxes</span>
            </div>
          </div>
          <div>
            <div className="text-gray-500 text-[9px] uppercase tracking-wider">Total Material Budget</div>
            <div className="text-lg font-bold text-luxury-gold mt-0.5">
              {formatCost(grandTotalCost)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-gray-400">
          <Calculator className="w-3.5 h-3.5 text-luxury-gold" />
          <span>Click any room card above to view and edit its layout pattern details on the central visualizer canvas.</span>
        </div>
      </div>

    </div>
  );
}
