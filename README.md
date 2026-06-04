# TileVision Pro ✦ Premium Tile Calculator & Layout Visualizer

TileVision Pro is a modern, high-fidelity web application engineered for homeowners, interior designers, architects, and tile retailers. It provides mathematically precise tile layout calculations (including edge cuts and wastage factor) alongside an interactive real-time visualizer in both **2D blueprint view** and **3D room rendering**.

---

## ✦ Core Features

1. **Precision Calculator**:
   - Accepts custom room coordinates and shapes (Rectangular, L-Shaped, U-Shaped, and Custom sketches).
   - Supports live unit conversions (Feet, Inches, Meters, Cm).
   - Calculates total floor area, full tiles required, cut tiles, 5% default wastage buffer (adjustable from 5% to 15%), required box count, and estimated material cost.

2. **Real-time 2D Canvas Blueprint**:
   - Simulates physical layout positions using real dimensions.
   - Distinguishes **Full tiles** (white/light grey) from **Cut edge tiles** (soft blue).
   - Tracks interactive mouse hovers showing tile indexes, grid coordinates, dimensions, and clipping statuses.
   - Supports zoom, pan, and dragging the pattern alignment origin.

3. **3D Specular Viewport**:
   - Renders floor layouts using Three.js with realistic lights, soft shadows, and orbital camera control (rotate, zoom, pan).
   - Supports glossy glaze reflections, matte ceramic, and polished marble textures.
   - Extrudes translucent 3D walls to convey spatial depth.

4. **Laying Patterns System**:
   - Supports **Straight**, **Brick Offset** (Running bond), **Diagonal 45°**, **Herringbone** (orthogonal interlocking), and **Chevron** (parallelograms in zig-zag).
   - Recalculates margins and shapes in real-time when switching patterns.

5. **AI Estimator & Comparison Tool**:
   - Renders side-by-side comparison tables across multiple tile dimensions (e.g. 300x300, 600x600, etc.).
   - AI assistant analyzes room dimensions to suggest optimal dimensions that minimize cuts and reduce wastage.

6. **Saved Projects (Express Backend)**:
   - Connects to a Node.js + Express backend server.
   - Saves projects persistently into a local JSON database file (SQLite style) to ensure immediate offline operation without database server installation.

7. **Export Capabilities**:
   - Download the current layout blueprint directly as a **PNG Image**.
   - Generate and export a professional **PDF Invoice/Estimation Report** containing customer contexts, materials summaries, and visual canvas layouts.

---

## ✦ Technical Stack

- **Frontend**: React (v19), Vite (v5), TypeScript, Tailwind CSS (v4), Three.js, jsPDF, Lucide Icons.
- **Backend**: Node.js, Express.
- **Persistence**: File-based JSON Database (`backend/database.json`).

---

## ✦ Quick Start

### 1. Installation

To install all dependencies across the root repository, the Express backend, and the Vite frontend in one step, run:

```bash
npm run install-all
```

*(Note: Package installations automatically pass `--legacy-peer-deps` to bypass React 19 warnings for peer-library version constraints).*

### 2. Running Locally

To run both the backend API server (port 5000) and the frontend Vite development server (port 5173) concurrently, execute:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. All API requests to `/api/*` are automatically proxied from the dev server to the Express server.

---

## ✦ Engineering Details: The Polygon Clipping Engine

To support irregular room geometries (L-shapes, U-shapes, or hand-drawn polygons) and complex angles (Diagonal, Herringbone, Chevron):
- The room is modeled as a closed 2D polygon $P_{room}$.
- A tile grid is generated over the room's bounding box. Each tile is represented as a polygon $P_{tile}$.
- We execute a robust implementation of the **Sutherland-Hodgman Polygon Clipping Algorithm** to compute the intersection $P_{intersect} = \text{clip}(P_{room}, P_{tile})$.
- Classification:
  - If $\text{Area}(P_{intersect}) \approx 0 \rightarrow$ Tile is outside the room, discarded.
  - If $\text{Area}(P_{intersect}) \ge 0.985 \times \text{Area}(P_{tile}) \rightarrow$ Tile is classified as **Full Tile**.
  - Else $\rightarrow$ Tile is classified as **Cut Tile**.
- For 3D rendering, the calculated tile layout is rendered onto an offscreen canvas. This canvas is compiled into a `THREE.CanvasTexture` and mapped to a specular `THREE.MeshStandardMaterial` for 3D floors, ensuring high-performance (60 FPS) rendering with photorealistic reflections.
