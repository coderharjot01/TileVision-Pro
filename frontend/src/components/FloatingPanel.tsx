import React from 'react';
import { RotateCcw, Download, FileDown, Save, Wand2 } from 'lucide-react';

interface FloatingPanelProps {
  onReset: () => void;
  onExportPNG: () => void;
  onExportPDF: () => void;
  onSaveFocus: () => void;
  onConfettiTrigger: () => void;
}

export default function FloatingPanel({
  onReset,
  onExportPNG,
  onExportPDF,
  onSaveFocus,
  onConfettiTrigger
}: FloatingPanelProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-lg w-[calc(100%-2rem)] animate-slide-up">
      <div className="glass-panel text-white rounded-full px-5 py-3.5 border border-white/10 shadow-2xl flex justify-between items-center gap-2 md:gap-4">
        
        {/* Reset */}
        <button
          onClick={onReset}
          className="flex flex-col items-center gap-1 text-[9px] uppercase tracking-wider text-gray-400 hover:text-white transition group cursor-pointer"
          title="Reset layout parameters"
        >
          <div className="p-2 bg-white/5 group-hover:bg-white/15 rounded-full transition duration-300">
            <RotateCcw className="w-4 h-4 text-white" />
          </div>
          <span>Reset</span>
        </button>

        {/* Separator */}
        <div className="w-[1px] h-6 bg-white/10" />

        {/* Calculate / Magic trigger */}
        <button
          onClick={onConfettiTrigger}
          className="flex flex-col items-center gap-1 text-[9px] uppercase tracking-wider text-luxury-gold hover:text-white transition group cursor-pointer"
          title="Celebrate Layout calculations Success"
        >
          <div className="p-2 bg-luxury-gold/15 group-hover:bg-luxury-gold/30 rounded-full transition duration-300">
            <Wand2 className="w-4 h-4 text-luxury-gold" />
          </div>
          <span>Calibrate</span>
        </button>

        {/* Export PNG */}
        <button
          onClick={onExportPNG}
          className="flex flex-col items-center gap-1 text-[9px] uppercase tracking-wider text-gray-400 hover:text-white transition group cursor-pointer"
          title="Export 2D Layout as PNG Image"
        >
          <div className="p-2 bg-white/5 group-hover:bg-white/15 rounded-full transition duration-300">
            <Download className="w-4 h-4 text-white" />
          </div>
          <span>Export Image</span>
        </button>

        {/* Export PDF */}
        <button
          onClick={onExportPDF}
          className="flex flex-col items-center gap-1 text-[9px] uppercase tracking-wider text-gray-400 hover:text-white transition group cursor-pointer"
          title="Export complete inventory report PDF"
        >
          <div className="p-2 bg-white/5 group-hover:bg-white/15 rounded-full transition duration-300">
            <FileDown className="w-4 h-4 text-white" />
          </div>
          <span>Export PDF</span>
        </button>

        {/* Separator */}
        <div className="w-[1px] h-6 bg-white/10" />

        {/* Save project focus */}
        <button
          onClick={onSaveFocus}
          className="flex flex-col items-center gap-1 text-[9px] uppercase tracking-wider text-luxury-gold hover:text-white transition group cursor-pointer"
          title="Save this project layout to list"
        >
          <div className="p-2 bg-luxury-gold/15 group-hover:bg-luxury-gold/30 rounded-full transition duration-300">
            <Save className="w-4 h-4 text-luxury-gold" />
          </div>
          <span>Save Design</span>
        </button>

      </div>
    </div>
  );
}
