import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RotateCw, Sparkles, Sliders } from 'lucide-react';
import { Point, RenderedTile } from '../utils/types';
import { getBoundingBox } from '../utils/geometry';

interface Visualizer3DProps {
  roomVertices: Point[];
  tilesData: RenderedTile[];
  tileWidth: number; // mm
  tileHeight: number; // mm
}

type FinishType = 'marble' | 'matte' | 'glossy';

export default function Visualizer3D({
  roomVertices,
  tilesData,
  tileWidth,
  tileHeight
}: Visualizer3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [finish, setFinish] = useState<FinishType>('marble');
  const [showWalls, setShowWalls] = useState(true);
  
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const floorMeshRef = useRef<THREE.Mesh | null>(null);
  const wallsMeshRef = useRef<THREE.Mesh | null>(null);
  
  useEffect(() => {
    if (!containerRef.current || roomVertices.length < 3) return;
    const container = containerRef.current;
    
    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#F3F4F6');
    sceneRef.current = scene;
    
    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    
    // Find room center in mm to align camera targets
    const { minX, maxX, minY, maxY } = getBoundingBox(roomVertices);
    const roomCenterX = (minX + maxX) / 2;
    const roomCenterY = (minY + maxY) / 2;
    const maxDim = Math.max(maxX - minX, maxY - minY);
    
    // Position camera looking down from an angle
    // In our coordinate space: room is drawn on X-Y plane (Z=0)
    // In Three.js standard space, we will map X-Y coordinates to X-Z (floor plane)
    // Z will be floor depth, Y will be wall height.
    camera.position.set(roomCenterX, maxDim * 1.5, roomCenterY + maxDim * 1.2);
    
    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Clear previous canvases
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // don't go below floor
    controls.minDistance = maxDim * 0.3;
    controls.maxDistance = maxDim * 4;
    controls.target.set(roomCenterX, 0, roomCenterY);
    
    // 5. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);
    
    // Specular light for shiny reflections on tiles
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight.position.set(roomCenterX - maxDim, maxDim * 2, roomCenterY - maxDim);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = maxDim * 5;
    dirLight.shadow.bias = -0.0005;
    
    const d = maxDim * 1.5;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    
    scene.add(dirLight);
    
    // Extra soft point light for realistic interior look
    const pointLight = new THREE.PointLight(0xfefae0, 0.3, maxDim * 3);
    pointLight.position.set(roomCenterX, maxDim * 0.8, roomCenterY);
    scene.add(pointLight);

    // 6. Generate Offscreen Texture for tile pattern mapping
    const textureCanvas = document.createElement('canvas');
    const texWidth = 2048;
    const texHeight = 2048;
    textureCanvas.width = texWidth;
    textureCanvas.height = texHeight;
    const texCtx = textureCanvas.getContext('2d')!;

    // Background Grout color
    texCtx.fillStyle = '#CCCCCC'; // Grout line color
    texCtx.fillRect(0, 0, texWidth, texHeight);

    // Map room coordinates [minX, maxX] x [minY, maxY] to texture coordinates [0, texWidth] x [0, texHeight]
    const mapToTex = (p: Point): Point => {
      const rx = (p.x - minX) / (maxX - minX);
      const ry = (p.y - minY) / (maxY - minY);
      return {
        x: rx * texWidth,
        y: ry * texHeight
      };
    };

    // Draw tiles on offscreen canvas
    tilesData.forEach((tile) => {
      if (tile.vertices.length < 3) return;
      
      texCtx.beginPath();
      const first = mapToTex(tile.vertices[0]);
      texCtx.moveTo(first.x, first.y);
      for (let i = 1; i < tile.vertices.length; i++) {
        const pt = mapToTex(tile.vertices[i]);
        texCtx.lineTo(pt.x, pt.y);
      }
      texCtx.closePath();

      // Style
      if (finish === 'marble') {
        // Tile background
        texCtx.fillStyle = tile.status === 'full' ? '#F6F5F2' : '#EAF2F8';
        texCtx.fill();
        
        // Draw elegant marble veins
        if (tile.status === 'full') {
          texCtx.save();
          texCtx.clip();
          texCtx.strokeStyle = 'rgba(0,0,0,0.035)';
          texCtx.lineWidth = 2.5;
          texCtx.beginPath();
          
          const p1 = mapToTex(tile.vertices[0]);
          const p3 = mapToTex(tile.vertices[2] || tile.vertices[0]);
          
          texCtx.moveTo(p1.x + (p3.x - p1.x) * 0.1, p1.y + (p3.y - p1.y) * 0.1);
          texCtx.bezierCurveTo(
            p1.x + (p3.x - p1.x) * 0.4, p1.y + (p3.y - p1.y) * 0.2,
            p1.x + (p3.x - p1.x) * 0.6, p1.y + (p3.y - p1.y) * 0.85,
            p3.x - (p3.x - p1.x) * 0.15, p3.y - (p3.y - p1.y) * 0.15
          );
          texCtx.stroke();
          texCtx.restore();
        }
      } else {
        texCtx.fillStyle = tile.status === 'full' ? '#F9FAF9' : '#D5E6F7';
        texCtx.fill();
      }
      
      // Fine tile border
      texCtx.strokeStyle = '#FFFFFF';
      texCtx.lineWidth = 3;
      texCtx.stroke();
    });

    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    // 7. Create 3D Floor Mesh
    // Draw 2D shape using room vertices (X-Y mapped to Three.js X-Z)
    const floorShape = new THREE.Shape();
    floorShape.moveTo(roomVertices[0].x, roomVertices[0].y);
    for (let i = 1; i < roomVertices.length; i++) {
      floorShape.lineTo(roomVertices[i].x, roomVertices[i].y);
    }
    floorShape.closePath();

    const floorGeometry = new THREE.ShapeGeometry(floorShape);
    
    // Texture mapping coordinates uv calibration
    // Map bounding box coordinates from [minX, maxX] to [0, 1]
    const pos = floorGeometry.attributes.position;
    const uvs = [];
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const py = pos.getY(i);
      const u = (px - minX) / (maxX - minX);
      const v = (py - minY) / (maxY - minY);
      uvs.push(u, v);
    }
    floorGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

    // Floor Material adjustments based on Finish Selection
    let materialOptions: THREE.MeshStandardMaterialParameters = {
      map: texture,
      roughness: 0.15,
      metalness: 0.05
    };

    if (finish === 'marble') {
      materialOptions.roughness = 0.08;
      materialOptions.metalness = 0.1;
    } else if (finish === 'glossy') {
      materialOptions.roughness = 0.04;
      materialOptions.metalness = 0.08;
    } else { // matte
      materialOptions.roughness = 0.65;
      materialOptions.metalness = 0.0;
    }

    const floorMaterial = new THREE.MeshStandardMaterial(materialOptions);
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    
    // Rotate floor mesh to lie horizontally on X-Z plane
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);
    floorMeshRef.current = floorMesh;

    // 8. Create 3D Walls (Extrusion of the room perimeter boundary)
    if (showWalls) {
      const wallThickness = 120; // 12cm wall depth
      const wallHeight = 2800; // 2.8m wall height in mm

      // Extrude settings
      const extrudeSettings = {
        depth: wallHeight,
        bevelEnabled: false
      };

      // Create a shape representing the wall block (outer shape minus inner shape)
      const outerWallShape = new THREE.Shape();
      // Generates an offset path to draw thickness. To keep it clean and performant,
      // we can extrude the path as a simple line mesh or thin solid frame.
      // Extrude wall frame:
      const wallGeometry = new THREE.ExtrudeGeometry(floorShape, extrudeSettings);
      
      const wallMaterial = new THREE.MeshStandardMaterial({
        color: '#ECECE7',
        transparent: true,
        opacity: 0.35, // transparent so the user can easily see inside!
        side: THREE.DoubleSide
      });
      
      const wallsMesh = new THREE.Mesh(wallGeometry, wallMaterial);
      wallsMesh.rotation.x = -Math.PI / 2;
      wallsMesh.position.y = wallHeight; // translate so it goes upwards
      wallsMesh.castShadow = true;
      wallsMesh.receiveShadow = true;
      scene.add(wallsMesh);
      wallsMeshRef.current = wallsMesh;
    }

    // 9. Coordinate grid axis layout base board
    const gridHelper = new THREE.GridHelper(maxDim * 5, 50, '#E5E7EB', '#E5E7EB');
    gridHelper.position.y = -1; // place slightly below floor
    scene.add(gridHelper);

    // 10. Animation render loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 11. Handle Resize
    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [roomVertices, tilesData, finish, showWalls]);

  return (
    <div className="flex flex-col h-full space-y-4">
      
      {/* 3D ToolBar */}
      <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-gray-100 shadow-sm z-20">
        
        {/* Material Selection Finish */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-luxury-gold" /> Texture:
          </span>
          <div className="inline-flex bg-gray-100 p-0.5 rounded-lg">
            {(['marble', 'matte', 'glossy'] as FinishType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFinish(f)}
                className={`px-3 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                  finish === f
                    ? 'bg-luxury-charcoal text-white shadow-sm'
                    : 'text-gray-500 hover:text-luxury-charcoal'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Walls switch */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5" /> Walls:
          </label>
          <button
            onClick={() => setShowWalls(prev => !prev)}
            className={`px-3.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase border transition cursor-pointer ${
              showWalls
                ? 'bg-luxury-gold/20 border-luxury-gold text-luxury-gold'
                : 'bg-white border-gray-200 text-gray-500'
            }`}
          >
            {showWalls ? 'Show' : 'Hide'}
          </button>
        </div>
      </div>

      {/* 3D Render Canvas container */}
      <div className="flex-1 bg-gray-100 rounded-3xl overflow-hidden relative border border-gray-150 min-h-[380px] shadow-inner">
        <div ref={containerRef} className="w-full h-full block" />
        
        {/* Helper instructions */}
        <div className="absolute right-4 bottom-4 bg-black/75 text-white/90 border border-white/10 p-3 rounded-2xl shadow text-[10px] space-y-1 font-medium pointer-events-none z-10 backdrop-blur">
          <div className="flex items-center gap-2 text-luxury-gold">
            <RotateCw className="w-3.5 h-3.5 animate-spin-slow" />
            <span>Interactive 3D Previewer</span>
          </div>
          <div>Left Click + Drag: Rotate Camera</div>
          <div>Scroll Wheel: Zoom in / out</div>
          <div>Right Click + Drag: Pan Room</div>
        </div>
      </div>

    </div>
  );
}
