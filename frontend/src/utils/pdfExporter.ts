import { jsPDF } from 'jspdf';
import { Project, Room, CalculationResult } from './types';
import { convertFromMm } from './tileCalculations';

interface PDFExportData {
  project: Project;
  activeRoom: Room;
  stats: CalculationResult;
  canvasElement: HTMLCanvasElement | null;
}

export function exportProjectPDF({ project, activeRoom, stats, canvasElement }: PDFExportData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Color Palette (Luxury theme matching styling)
  const primaryColor = [18, 18, 18]; // Charcoal (#121212)
  const accentColor = [197, 168, 128]; // Muted Gold (#C5A880)
  const grayColor = [120, 120, 120];

  // Helper: horizontal divider line
  const drawDivider = (y: number) => {
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.5);
    doc.line(15, y, pageWidth - 15, y);
  };

  // 1. Header (Premium styling)
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('TileVision Pro', 15, 18);
  
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.text('PROFESSIONAL TILE LAYOUT & QUANTITY PLAN', 15, 25);

  doc.setFontSize(8);
  doc.setTextColor(160, 160, 160);
  const dateStr = new Date(project.date || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  doc.text(`Generated: ${dateStr}`, pageWidth - 65, 18);
  doc.text(`Project ID: ${project.id.slice(0, 8)}`, pageWidth - 65, 24);

  // 2. Project & Room Info
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFontSize(14);
  doc.setFont('Helvetica', 'bold');
  doc.text('Project Blueprint Details', 15, 52);

  doc.setFontSize(9);
  doc.setFont('Helvetica', 'normal');
  
  // Left Column Info
  doc.text('Project Name:', 15, 62);
  doc.setFont('Helvetica', 'bold');
  doc.text(project.name, 45, 62);
  doc.setFont('Helvetica', 'normal');

  doc.text('Active Room:', 15, 68);
  doc.setFont('Helvetica', 'bold');
  doc.text(activeRoom.name, 45, 68);
  doc.setFont('Helvetica', 'normal');

  doc.text('Room Geometry:', 15, 74);
  doc.text(`${activeRoom.shape.toUpperCase()} (${activeRoom.width} × ${activeRoom.height} ${activeRoom.unit})`, 45, 74);

  const tileUnit = project.tileUnit || 'mm';

  if (activeRoom.skirtingEnabled) {
    doc.text('Skirting Height:', 15, 80);
    const displaySkirtingH = Math.round(convertFromMm(activeRoom.skirtingHeight || 100, tileUnit) * 100) / 100;
    doc.text(`${displaySkirtingH} ${tileUnit} (${activeRoom.skirtingHeight || 100} mm)`, 45, 80);
  }

  // Right Column Info
  const displayTileW = Math.round(convertFromMm(project.tileWidth, tileUnit) * 100) / 100;
  const displayTileH = Math.round(convertFromMm(project.tileHeight, tileUnit) * 100) / 100;
  const displayGrout = Math.round(convertFromMm(project.groutWidth, tileUnit) * 100) / 100;

  doc.text('Tile Dimensions:', 105, 62);
  doc.setFont('Helvetica', 'bold');
  doc.text(`${displayTileW} × ${displayTileH} ${tileUnit} (${project.tileWidth} × ${project.tileHeight} mm)`, 138, 62);
  doc.setFont('Helvetica', 'normal');

  doc.text('Laying Pattern:', 105, 68);
  doc.text(project.pattern.toUpperCase(), 138, 68);

  doc.text('Grout Joint Width:', 105, 74);
  doc.text(`${displayGrout} ${tileUnit} (${project.groutWidth} mm)`, 138, 74);

  doc.text('Allocated Wastage:', 105, 80);
  doc.text(`${project.wastage}%`, 138, 80);

  drawDivider(86);

  // 3. Materials Inventory (Table styling)
  doc.setFontSize(14);
  doc.setFont('Helvetica', 'bold');
  doc.text('Calculated Material Requirements', 15, 96);

  // Table grid headers
  doc.setFillColor(248, 249, 250);
  doc.rect(15, 103, pageWidth - 30, 8, 'F');
  doc.setFontSize(8);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text('LINE ITEM DESCRIPTION', 18, 108);
  doc.text('CALCULATED QUANTITY', pageWidth - 60, 108);

  // Table rows
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  
  let currentY = 116;
  const isPacket = activeRoom.pricingMode === 'packet';
  const items = [
    { name: 'Total Calculated Room Floor Area', val: `${stats.totalAreaDisplay.toFixed(2)} sq ${activeRoom.unit}` },
    { name: 'Full (Uncut) Tiles Positioned', val: `${stats.fullTilesCount} pcs` },
    { name: 'Partial Cut Edge Tiles Needed', val: `${stats.cutTilesCount} pcs` },
    { name: `Calculated Installation Wastage (${project.wastage}%)`, val: `${stats.wastageTilesCount} pcs` }
  ];

  if (activeRoom.skirtingEnabled) {
    items.push({ name: `Skirting Perimeter Length`, val: `${(stats.skirtingLengthDisplay || 0).toFixed(2)} ${activeRoom.unit}` });
    items.push({ name: `Tiles Required for Skirting (Cut from floor tiles)`, val: `${stats.skirtingTilesCount || 0} pcs` });
  }

  items.push({ name: 'Total Purchase Tile Count (Floor + Wastage + Skirting)', val: `${stats.finalTilesNeededCount} pcs` });
  items.push({ name: isPacket ? 'Estimated Packets (Packet coverage based)' : 'Estimated Boxes (Box coverage based)', val: `${stats.boxesRequired} ${isPacket ? 'packets' : 'boxes'}` });

  const rowHeight = activeRoom.skirtingEnabled ? 6.5 : 8;

  items.forEach((item, index) => {
    // Bold the final total row
    if (index === items.length - 2) {
      doc.setFont('Helvetica', 'bold');
    } else {
      doc.setFont('Helvetica', 'normal');
    }
    doc.text(item.name, 18, currentY);
    doc.text(item.val, pageWidth - 60, currentY);
    doc.setDrawColor(245, 245, 245);
    doc.line(15, currentY + 2.5, pageWidth - 15, currentY + 2.5);
    currentY += rowHeight;
  });

  // Estimated Cost banner
  const hasCost = (isPacket && activeRoom.packetPrice && activeRoom.packetPrice > 0) ||
                  (!isPacket && activeRoom.tilePrice > 0);
  if (hasCost) {
    const formattedCost = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(stats.estimatedCost);

    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(15, currentY + 1, pageWidth - 30, 11, 'F');
    
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text('ESTIMATED MATERIAL BUDGET (INR):', 20, currentY + 8);
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(formattedCost, pageWidth - 60, currentY + 8);
    currentY += 18;
  } else {
    currentY += 8;
  }

  // 4. Layout Canvas Image Embed (Blueprint)
  if (canvasElement) {
    try {
      const imgData = canvasElement.toDataURL('image/png');
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('Interactive Visual Layout Blueprint', 15, currentY);
      
      const boxW = pageWidth - 30; // 180mm
      const boxH = activeRoom.skirtingEnabled ? 65 : 75; // Adjust height if skirting table row takes space
      
      // Draw background panel for blueprint
      doc.setFillColor(249, 250, 249);
      doc.setDrawColor(200, 200, 200);
      doc.rect(15, currentY + 3, boxW, boxH, 'FD');
      
      // Embed image inside boundary
      doc.addImage(imgData, 'PNG', 16, currentY + 4, boxW - 2, boxH - 2);
    } catch (e) {
      console.error('Error drawing image onto PDF: ', e);
    }
  }

  // 5. Footer Page Tag
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text('Thank you for choosing TileVision Pro. Please cross-verify parameters before purchase.', 15, pageHeight - 10);
  doc.text('Page 1 of 1', pageWidth - 30, pageHeight - 10);

  // Trigger Save/Download
  doc.save(`TileVisionPro_${activeRoom.name.replace(/\s+/g, '_')}_Plan.pdf`);
}
