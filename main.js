import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ARTIFACTS, CRATERS, MARIA, RESOURCES, STATUS_COLORS, RESOURCE_COLORS } from './data.js';

// ============================================================
// CONFIGURATION
// ============================================================
const MOON_RADIUS = 200;
const MOON_RADIUS_KM = 1737.4;
const SEGMENTS = 64;

// ============================================================
// APPLICATION STATE
// ============================================================
const state = {
  showGrid: true,
  showLabels: true,
  showTerrain: true,
  showPoles: true,
  terrainMode: 2, // 0=wire, 1=solid, 2=hybrid
  showArtifacts: true,

  showWater: false,
  showHelium: false,
  showTitanium: false,
  showKreep: false,
  showMinerals: false,
  resourceOpacity: 0.7,

  filterUS: true,
  filterSovietUnion: true,
  filterRussia: true,
  filterChina: true,
  filterIndia: true,
  filterJapan: true,
  filterIsrael: true,
  filterEurope: true,
  searchQuery: '',

  showHelp: false
};

// ============================================================
// THREE.JS SETUP
// ============================================================
let scene, camera, renderer, controls;
let moonGroup, gridMesh, terrainMesh, wireframeMesh;
let artifactMarkers = [];
let artifactLabels = [];
let resourceMeshes = [];
let northPole, southPole;
let raycaster, mouse;
let hoveredArtifact = null;
let trajectoryGroup = null;
let earthMarker = null;

function init() {
  // Validate dependencies
  if (!THREE) {
    throw new Error('Three.js library failed to load. Please check your internet connection.');
  }
  if (!ARTIFACTS || !CRATERS || !MARIA || !RESOURCES) {
    throw new Error('Data files failed to load. Please ensure data.js is accessible.');
  }

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Camera
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 10000);
  camera.position.set(0, 100, 500);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  const container = document.getElementById('container');
  if (!container) {
    throw new Error('Container element not found. Please check index.html.');
  }
  container.appendChild(renderer.domElement);
  
  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 250;
  controls.maxDistance = 1500;
  controls.rotateSpeed = 0.5;
  
  // Raycaster for hover detection
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  
  // Enhanced lighting for better terrain appearance
  const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
  scene.add(ambientLight);

  // Main sun light
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
  directionalLight.position.set(500, 300, 500);
  scene.add(directionalLight);

  // Subtle fill light from opposite side
  const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
  fillLight.position.set(-400, 200, -400);
  scene.add(fillLight);

  // Hemisphere light for realistic sky/ground ambient
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
  scene.add(hemiLight);
  
  // Moon group (holds all moon-related objects)
  moonGroup = new THREE.Group();
  scene.add(moonGroup);
  
  // Create moon components
  createGrid();
  createTerrain();
  createPoles();
  createArtifacts();
  createResources();
  
  // Event listeners
  window.addEventListener('resize', onWindowResize);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('click', onMouseClick);
  window.addEventListener('keydown', onKeyDown);
  
  // UI bindings
  bindUI();
  
  // Update artifact count
  updateArtifactCount();
  
  // Hide loading screen
  setTimeout(() => {
    document.getElementById('loading').classList.add('hidden');
  }, 500);
  
  // Start animation loop
  animate();
}

// ============================================================
// CREATE MOON COMPONENTS
// ============================================================
function createGrid() {
  const geometry = new THREE.SphereGeometry(MOON_RADIUS, 36, 18);
  const material = new THREE.MeshBasicMaterial({
    color: 0x00ff66,
    wireframe: true,
    transparent: true,
    opacity: 0.05 // Much more subtle
  });
  gridMesh = new THREE.Mesh(geometry, material);
  moonGroup.add(gridMesh);
}

function createTerrain() {
  // Generate elevation data
  const elevationData = generateElevation();
  
  // Create terrain geometry
  const geometry = new THREE.SphereGeometry(MOON_RADIUS, SEGMENTS, SEGMENTS / 2);
  const positions = geometry.attributes.position;
  const colors = [];
  
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    
    // Convert to lat/lon
    const r = Math.sqrt(x * x + y * y + z * z);
    const lat = Math.asin(y / r) * (180 / Math.PI);
    const lon = Math.atan2(x, z) * (180 / Math.PI);
    
    // Get elevation
    const elev = getElevationAt(lat, lon, elevationData);
    const newR = MOON_RADIUS + elev * 2;
    
    // Scale position
    const scale = newR / r;
    positions.setXYZ(i, x * scale, y * scale, z * scale);
    
    // Color based on elevation
    const color = getElevationColor(elev);
    colors.push(color.r, color.g, color.b);
  }
  
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  
  // Solid terrain mesh with enhanced material
  const solidMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    roughness: 0.9,
    metalness: 0.1,
    flatShading: false,
    emissive: 0x111111,
    emissiveIntensity: 0.1
  });
  terrainMesh = new THREE.Mesh(geometry, solidMaterial);
  moonGroup.add(terrainMesh);

  // Wireframe overlay with subtle styling
  const wireMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ff66,
    wireframe: true,
    transparent: true,
    opacity: 0.08 // Much more subtle
  });
  wireframeMesh = new THREE.Mesh(geometry.clone(), wireMaterial);
  wireframeMesh.scale.set(1.001, 1.001, 1.001); // Slightly larger to prevent z-fighting
  moonGroup.add(wireframeMesh);
  
  // Store elevation data globally
  window.elevationData = elevationData;
}

function generateElevation() {
  const res = 72;
  const data = [];
  
  for (let i = 0; i < res; i++) {
    data[i] = [];
    for (let j = 0; j < res * 2; j++) {
      const lat = (i / (res - 1)) * 180 - 90;
      const lon = (j / (res * 2 - 1)) * 360 - 180;
      
      let elev = 2.0; // Base highlands
      
      // Far side highlands
      if (Math.abs(lon) > 90) {
        elev += 2.5 + simplex2D(lat * 0.02, lon * 0.02) * 1.5;
      }
      
      // Polar regions
      if (Math.abs(lat) > 60) {
        elev += ((Math.abs(lat) - 60) / 30) * 2.5;
      }
      
      // Maria depressions
      for (const mare of MARIA) {
        const d = haversine(lat, lon, mare.lat, mare.lon);
        const mareR = (mare.size / 2) / 57.3;
        if (d < mareR) {
          const factor = 1 - d / mareR;
          elev -= 4.0 * factor * factor;
        }
      }
      
      // Crater influence
      for (const crater of CRATERS) {
        const d = haversine(lat, lon, crater.lat, crater.lon);
        const craterR = (crater.size / 2) / 111;
        
        if (d < craterR * 2) {
          // Rim
          if (d > craterR * 0.7 && d < craterR * 1.3) {
            const rimFactor = Math.exp(-Math.pow((d - craterR) / (craterR * 0.3), 2));
            elev += crater.size * 0.02 / 1000 * rimFactor;
          }
          // Floor
          else if (d < craterR * 0.7) {
            const depthFactor = 1 - d / (craterR * 0.7);
            elev -= crater.size * 0.1 / 1000 * depthFactor;
          }
        }
      }
      
      // Noise
      elev += (simplex2D(lat * 0.05, lon * 0.05) - 0.5) * 0.5;
      
      data[i][j] = Math.max(-8, Math.min(10, elev)) * (MOON_RADIUS / MOON_RADIUS_KM);
    }
  }
  
  return data;
}

function getElevationAt(lat, lon, data) {
  if (!data) return 0;
  
  const res = data.length;
  while (lon < -180) lon += 360;
  while (lon > 180) lon -= 360;
  
  const fi = ((lat + 90) / 180) * (res - 1);
  const fj = ((lon + 180) / 360) * (res * 2 - 1);
  
  const i0 = Math.max(0, Math.min(res - 1, Math.floor(fi)));
  const j0 = Math.max(0, Math.min(res * 2 - 1, Math.floor(fj)));
  const i1 = Math.min(res - 1, i0 + 1);
  const j1 = Math.min(res * 2 - 1, j0 + 1);
  
  const fx = fi - i0;
  const fy = fj - j0;
  
  const e00 = data[i0][j0];
  const e10 = data[i1][j0];
  const e01 = data[i0][j1];
  const e11 = data[i1][j1];
  
  return (1 - fx) * (1 - fy) * e00 + fx * (1 - fy) * e10 + (1 - fx) * fy * e01 + fx * fy * e11;
}

function getElevationColor(elev) {
  const elevKm = elev / (MOON_RADIUS / MOON_RADIUS_KM);
  
  if (elevKm < -6) return new THREE.Color(0x1e2840);
  if (elevKm < -4) return new THREE.Color(0x323c50);
  if (elevKm < -2) return new THREE.Color(0x46505f);
  if (elevKm < 0) return new THREE.Color(0x5a5f69);
  if (elevKm < 2) return new THREE.Color(0x73787d);
  if (elevKm < 4) return new THREE.Color(0x878782);
  if (elevKm < 6) return new THREE.Color(0x918c82);
  return new THREE.Color(0xa59f91);
}

function createPoles() {
  // North pole
  const northGeo = new THREE.CylinderGeometry(0, 3, 40, 8);
  const northMat = new THREE.MeshBasicMaterial({ color: 0x00c8ff });
  northPole = new THREE.Mesh(northGeo, northMat);
  northPole.position.set(0, MOON_RADIUS + 25, 0);
  moonGroup.add(northPole);
  
  // North pole line
  const northLineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, MOON_RADIUS, 0),
    new THREE.Vector3(0, MOON_RADIUS + 50, 0)
  ]);
  const northLine = new THREE.Line(northLineGeo, new THREE.LineBasicMaterial({ color: 0x00c8ff, transparent: true, opacity: 0.5 }));
  moonGroup.add(northLine);
  
  // South pole
  const southGeo = new THREE.CylinderGeometry(3, 0, 40, 8);
  const southMat = new THREE.MeshBasicMaterial({ color: 0xff6464 });
  southPole = new THREE.Mesh(southGeo, southMat);
  southPole.position.set(0, -MOON_RADIUS - 25, 0);
  moonGroup.add(southPole);
  
  // South pole line
  const southLineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, -MOON_RADIUS, 0),
    new THREE.Vector3(0, -MOON_RADIUS - 50, 0)
  ]);
  const southLine = new THREE.Line(southLineGeo, new THREE.LineBasicMaterial({ color: 0xff6464, transparent: true, opacity: 0.5 }));
  moonGroup.add(southLine);
}

function createArtifacts() {
  const markerGeometry = new THREE.BoxGeometry(6, 6, 6);
  const labelPositions = []; // Track label positions to avoid collisions

  for (const artifact of ARTIFACTS) {
    const color = STATUS_COLORS[artifact.status.toLowerCase()] || 0x888888;
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.3,
      roughness: 0.5,
      metalness: 0.5
    });
    const marker = new THREE.Mesh(markerGeometry, material);

    // Position
    const elev = window.elevationData ? getElevationAt(artifact.lat, artifact.lon, window.elevationData) : 0;
    const pos = latLonToVector3(artifact.lat, artifact.lon, MOON_RADIUS + elev * 2 + 12);
    marker.position.copy(pos);

    // Store artifact data
    marker.userData = artifact;

    // Add line to surface
    const surfacePos = latLonToVector3(artifact.lat, artifact.lon, MOON_RADIUS + elev * 2);
    const lineGeo = new THREE.BufferGeometry().setFromPoints([surfacePos, pos]);
    const lineMat = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.5 });
    const line = new THREE.Line(lineGeo, lineMat);

    moonGroup.add(marker);
    moonGroup.add(line);

    artifactMarkers.push({ marker, line, data: artifact });

    // Create label with smart positioning to avoid collisions
    const label = createTextSprite(artifact.name.length > 16 ? artifact.name.slice(0, 14) + '…' : artifact.name);

    // Find non-colliding position for label
    const labelPos = findLabelPosition(pos, labelPositions);
    label.position.copy(labelPos);
    labelPositions.push(labelPos);

    moonGroup.add(label);
    artifactLabels.push(label);
  }
}

// Find a position for label that doesn't collide with others
function findLabelPosition(basePos, existingPositions) {
  const offsets = [
    { x: 0, y: 12, z: 0 },     // Above (default)
    { x: 15, y: 8, z: 0 },     // Upper right
    { x: -15, y: 8, z: 0 },    // Upper left
    { x: 0, y: 20, z: 0 },     // Higher above
    { x: 20, y: 12, z: 0 },    // Far right
    { x: -20, y: 12, z: 0 },   // Far left
    { x: 0, y: 28, z: 0 },     // Even higher
    { x: 15, y: 20, z: 0 }     // High right
  ];

  const minDistance = 30; // Minimum distance between labels

  for (const offset of offsets) {
    const testPos = new THREE.Vector3(
      basePos.x + offset.x,
      basePos.y + offset.y,
      basePos.z + offset.z
    );

    // Check if this position is far enough from all existing labels
    let isClear = true;
    for (const existing of existingPositions) {
      if (testPos.distanceTo(existing) < minDistance) {
        isClear = false;
        break;
      }
    }

    if (isClear) {
      return testPos;
    }
  }

  // If all positions are taken, use default with random offset
  return new THREE.Vector3(
    basePos.x + (Math.random() - 0.5) * 40,
    basePos.y + 12 + Math.random() * 20,
    basePos.z + (Math.random() - 0.5) * 40
  );
}

function createTextSprite(text) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 256;
  canvas.height = 64;

  // Add background with slight padding
  context.fillStyle = 'rgba(0, 0, 0, 0.6)';
  context.roundRect(8, 12, 240, 40, 4);
  context.fill();

  // Add border
  context.strokeStyle = 'rgba(0, 255, 102, 0.5)';
  context.lineWidth = 1;
  context.roundRect(8, 12, 240, 40, 4);
  context.stroke();

  // Draw text with shadow for better readability
  context.font = 'bold 20px monospace';
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  // Text shadow
  context.fillStyle = 'rgba(0, 0, 0, 0.8)';
  context.fillText(text, 129, 33);

  // Main text
  context.fillStyle = 'rgba(255, 255, 255, 1.0)';
  context.fillText(text, 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false, // Render on top
    depthWrite: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(50, 12.5, 1);
  sprite.renderOrder = 999; // Ensure labels render on top

  return sprite;
}

function createResources() {
  for (const resource of RESOURCES) {
    const color = RESOURCE_COLORS[resource.type] || 0xffffff;

    // Create ring geometry for resource area (outer boundary)
    const radiusDeg = resource.radius / 111 / Math.max(0.1, Math.cos(resource.lat * Math.PI / 180));
    const outerPoints = [];
    const innerPoints = [];

    // Create double ring for filled effect
    for (let i = 0; i <= 64; i++) { // More segments for smoother circles
      const angle = (i / 64) * Math.PI * 2;
      const dlat = radiusDeg * Math.sin(angle);
      const dlon = radiusDeg * Math.cos(angle);
      const elev = window.elevationData ? getElevationAt(resource.lat + dlat, resource.lon + dlon, window.elevationData) : 0;
      const pos = latLonToVector3(resource.lat + dlat, resource.lon + dlon, MOON_RADIUS + elev * 2 + 3);
      outerPoints.push(pos);

      // Inner ring at 70% radius
      const innerLat = radiusDeg * 0.7 * Math.sin(angle);
      const innerLon = radiusDeg * 0.7 * Math.cos(angle);
      const innerElev = window.elevationData ? getElevationAt(resource.lat + innerLat, resource.lon + innerLon, window.elevationData) : 0;
      const innerPos = latLonToVector3(resource.lat + innerLat, resource.lon + innerLon, MOON_RADIUS + innerElev * 2 + 3);
      innerPoints.push(innerPos);
    }

    // Outer ring (brighter)
    const outerGeometry = new THREE.BufferGeometry().setFromPoints(outerPoints);
    const outerMaterial = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: resource.concentration * 0.9,
      linewidth: 2
    });
    const outerRing = new THREE.Line(outerGeometry, outerMaterial);
    outerRing.userData = resource;
    outerRing.visible = false;

    // Inner ring (subtle)
    const innerGeometry = new THREE.BufferGeometry().setFromPoints(innerPoints);
    const innerMaterial = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: resource.concentration * 0.5,
      linewidth: 1
    });
    const innerRing = new THREE.Line(innerGeometry, innerMaterial);
    innerRing.userData = resource;
    innerRing.visible = false;

    // Center marker (glowing dot)
    const centerElev = window.elevationData ? getElevationAt(resource.lat, resource.lon, window.elevationData) : 0;
    const centerPos = latLonToVector3(resource.lat, resource.lon, MOON_RADIUS + centerElev * 2 + 5);
    const markerGeometry = new THREE.SphereGeometry(3, 8, 8);
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.9
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.copy(centerPos);
    marker.userData = resource;
    marker.visible = false;

    // Resource label
    const label = createResourceLabel(resource);
    label.position.copy(centerPos);
    label.position.y += 15;
    label.visible = false;

    moonGroup.add(outerRing);
    moonGroup.add(innerRing);
    moonGroup.add(marker);
    moonGroup.add(label);

    // Store all parts together
    resourceMeshes.push({
      outer: outerRing,
      inner: innerRing,
      marker: marker,
      label: label,
      data: resource
    });
  }
}

// Create label for resource deposits
function createResourceLabel(resource) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  // Larger canvas for minerals with subtype
  const hasSubtype = resource.type === 'minerals' && resource.subtype;
  canvas.width = 300;
  canvas.height = hasSubtype ? 100 : 80;

  const color = RESOURCE_COLORS[resource.type] || 0xffffff;
  const colorStr = `rgb(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255})`;

  // Background
  context.fillStyle = 'rgba(0, 0, 0, 0.8)';
  context.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 4);
  context.fill();

  // Border with resource color
  context.strokeStyle = colorStr;
  context.lineWidth = 2;
  context.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 4);
  context.stroke();

  const centerX = canvas.width / 2;
  let yOffset = 28;

  // Resource type
  context.font = 'bold 18px monospace';
  context.textAlign = 'center';
  context.fillStyle = colorStr;
  context.fillText(resource.type.toUpperCase(), centerX, yOffset);

  // Subtype for minerals
  if (hasSubtype) {
    yOffset += 18;
    context.font = '13px monospace';
    context.fillStyle = '#aaa';
    context.fillText(resource.subtype, centerX, yOffset);
  }

  // Concentration bar
  yOffset += 18;
  const barWidth = canvas.width - 56;
  const barX = 28;

  context.fillStyle = 'rgba(255, 255, 255, 0.2)';
  context.fillRect(barX, yOffset - 8, barWidth, 8);

  context.fillStyle = colorStr;
  context.fillRect(barX, yOffset - 8, barWidth * resource.concentration, 8);

  // Concentration text
  yOffset += 10;
  context.font = '11px monospace';
  context.fillStyle = '#fff';
  context.fillText(`${(resource.concentration * 100).toFixed(0)}% concentration`, centerX, yOffset);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false
  });
  const sprite = new THREE.Sprite(material);

  // Adjust scale based on canvas size
  const scale = hasSubtype ? 75 : 60;
  sprite.scale.set(scale, (canvas.height / canvas.width) * scale, 1);
  sprite.renderOrder = 998;

  return sprite;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  
  return new THREE.Vector3(x, y, z);
}

function haversine(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 180 / Math.PI;
}

// Simple 2D noise function
function simplex2D(x, y) {
  // Basic hash-based noise
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

// ============================================================
// UPDATE FUNCTIONS
// ============================================================
function updateVisibility() {
  // Grid
  if (gridMesh) gridMesh.visible = state.showGrid;
  
  // Terrain
  if (terrainMesh) {
    terrainMesh.visible = state.showTerrain && (state.terrainMode === 1 || state.terrainMode === 2);
  }
  if (wireframeMesh) {
    wireframeMesh.visible = state.showTerrain && (state.terrainMode === 0 || state.terrainMode === 2);
  }
  
  // Poles
  if (northPole) northPole.visible = state.showPoles;
  if (southPole) southPole.visible = state.showPoles;
  
  // Labels
  for (const label of artifactLabels) {
    label.visible = state.showLabels;
  }
  
  // Artifacts
  updateArtifactVisibility();
  
  // Resources
  updateResourceVisibility();
  
  // Terrain mode text
  const modeText = ['Wireframe', 'Solid', 'Hybrid'][state.terrainMode];
  document.getElementById('terrainMode').textContent = modeText;
}

function updateArtifactVisibility() {
  const query = state.searchQuery.toLowerCase();
  let visibleCount = 0;

  for (let i = 0; i < artifactMarkers.length; i++) {
    const { marker, line, data } = artifactMarkers[i];
    const label = artifactLabels[i];

    // Check if artifacts are globally enabled
    if (!state.showArtifacts) {
      marker.visible = false;
      line.visible = false;
      if (label) label.visible = false;
      continue;
    }

    // Check filters - match each country individually
    let showByOrigin = false;
    if (data.operator === 'Soviet Union' && state.filterSovietUnion) showByOrigin = true;
    if (data.operator === 'Russia' && state.filterRussia) showByOrigin = true;
    if (data.operator === 'United States' && state.filterUS) showByOrigin = true;
    if (data.operator === 'China' && state.filterChina) showByOrigin = true;
    if (data.operator === 'India' && state.filterIndia) showByOrigin = true;
    if (data.operator === 'Japan' && state.filterJapan) showByOrigin = true;
    if (data.operator === 'Israel' && state.filterIsrael) showByOrigin = true;
    if (data.operator === 'Europe' && state.filterEurope) showByOrigin = true;

    // Check search
    const matchesSearch = query === '' ||
                          data.name.toLowerCase().includes(query) ||
                          String(data.year).includes(query);

    const visible = showByOrigin && matchesSearch;
    marker.visible = visible;
    line.visible = visible;
    if (label) label.visible = visible && state.showLabels;

    if (visible) visibleCount++;
  }

  document.getElementById('artifactCount').textContent = `Showing ${visibleCount} of ${ARTIFACTS.length} artifacts`;
}

function updateResourceVisibility() {
  for (const resourceGroup of resourceMeshes) {
    const type = resourceGroup.data.type;
    let visible = false;

    if (type === 'water' && state.showWater) visible = true;
    if (type === 'helium' && state.showHelium) visible = true;
    if (type === 'titanium' && state.showTitanium) visible = true;
    if (type === 'kreep' && state.showKreep) visible = true;
    if (type === 'minerals' && state.showMinerals) visible = true;

    // Update visibility for all parts
    resourceGroup.outer.visible = visible;
    resourceGroup.inner.visible = visible;
    resourceGroup.marker.visible = visible;
    resourceGroup.label.visible = visible;

    // Update opacity based on concentration and global resource opacity
    const opacity = resourceGroup.data.concentration * state.resourceOpacity;
    resourceGroup.outer.material.opacity = opacity * 0.9;
    resourceGroup.inner.material.opacity = opacity * 0.5;
    resourceGroup.marker.material.opacity = opacity * 0.9;
  }
}

function updateArtifactCount() {
  updateArtifactVisibility();
}

// ============================================================
// EVENT HANDLERS
// ============================================================
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Raycast for hover
  raycaster.setFromCamera(mouse, camera);

  const markers = artifactMarkers.filter(m => m.marker.visible).map(m => m.marker);
  const intersects = raycaster.intersectObjects(markers);

  const tooltip = document.getElementById('tooltip');

  if (intersects.length > 0) {
    const artifact = intersects[0].object.userData;
    hoveredArtifact = artifact;

    // Update tooltip
    const elev = window.elevationData ? getElevationAt(artifact.lat, artifact.lon, window.elevationData) : 0;
    const elevKm = (elev / (MOON_RADIUS / MOON_RADIUS_KM)).toFixed(1);

    tooltip.innerHTML = `
      <div class="name">${artifact.name}</div>
      <div class="detail">Year: ${artifact.year}</div>
      <div class="detail">Operator: ${artifact.operator}</div>
      <div class="detail">Type: ${artifact.type} | Status: ${artifact.status}</div>
      <div class="coords">${artifact.lat.toFixed(2)}° lat, ${artifact.lon.toFixed(2)}° lon</div>
      <div class="detail">Elevation: ${elevKm > 0 ? '+' : ''}${elevKm} km</div>
      ${artifact.description ? `<div class="description">${artifact.description}</div>` : ''}
    `;

    tooltip.style.display = 'block';
    tooltip.style.left = event.clientX + 15 + 'px';
    tooltip.style.top = event.clientY + 15 + 'px';

    // Keep tooltip on screen
    const rect = tooltip.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      tooltip.style.left = event.clientX - rect.width - 15 + 'px';
    }
    if (rect.bottom > window.innerHeight) {
      tooltip.style.top = event.clientY - rect.height - 15 + 'px';
    }

    document.body.style.cursor = 'pointer';
  } else {
    // Check for resource hover
    const resourceMarkers = resourceMeshes
      .filter(r => r.marker.visible)
      .map(r => r.marker);
    const resourceIntersects = raycaster.intersectObjects(resourceMarkers);

    if (resourceIntersects.length > 0) {
      const resource = resourceIntersects[0].object.userData;

      tooltip.innerHTML = `
        <div class="name">${resource.name}</div>
        <div class="detail">Type: ${resource.type.toUpperCase()}</div>
        ${resource.subtype ? `<div class="detail">Subtype: ${resource.subtype}</div>` : ''}
        <div class="coords">${resource.lat.toFixed(2)}° lat, ${resource.lon.toFixed(2)}° lon</div>
        <div class="detail">Radius: ~${resource.radius} km</div>
        <div class="detail">Concentration: ${(resource.concentration * 100).toFixed(0)}%</div>
        ${resource.description ? `<div class="description">${resource.description}</div>` : ''}
      `;

      tooltip.style.display = 'block';
      tooltip.style.left = event.clientX + 15 + 'px';
      tooltip.style.top = event.clientY + 15 + 'px';

      const rect = tooltip.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        tooltip.style.left = event.clientX - rect.width - 15 + 'px';
      }
      if (rect.bottom > window.innerHeight) {
        tooltip.style.top = event.clientY - rect.height - 15 + 'px';
      }

      document.body.style.cursor = 'pointer';
    } else {
      hoveredArtifact = null;
      tooltip.style.display = 'none';
      document.body.style.cursor = 'default';
    }
  }
}

function onMouseClick(event) {
  // Skip if clicking on UI elements
  if (event.target.closest('#hud') || event.target.closest('#missionPanel')) {
    return;
  }

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const markers = artifactMarkers.filter(m => m.marker.visible).map(m => m.marker);
  const intersects = raycaster.intersectObjects(markers);

  if (intersects.length > 0) {
    const artifact = intersects[0].object.userData;
    openMissionPanel(artifact);
  }
}

function openMissionPanel(artifact) {
  const panel = document.getElementById('missionPanel');
  const elev = window.elevationData ? getElevationAt(artifact.lat, artifact.lon, window.elevationData) : 0;
  const elevKm = (elev / (MOON_RADIUS / MOON_RADIUS_KM)).toFixed(1);

  // Populate panel
  document.getElementById('panelTitle').textContent = artifact.name;
  document.getElementById('panelOperator').textContent = artifact.operator;
  document.getElementById('panelYear').textContent = artifact.year;
  document.getElementById('panelType').textContent = artifact.type;
  document.getElementById('panelStatus').textContent = artifact.status;
  document.getElementById('panelCoords').textContent = `${artifact.lat.toFixed(3)}° ${artifact.lat >= 0 ? 'N' : 'S'}, ${Math.abs(artifact.lon).toFixed(3)}° ${artifact.lon >= 0 ? 'E' : 'W'}`;
  document.getElementById('panelElevation').textContent = `${elevKm > 0 ? '+' : ''}${elevKm} km`;

  const description = artifact.description || 'No additional information available for this mission.';
  document.getElementById('panelDescription').textContent = description;

  // Show panel
  panel.classList.remove('hidden');

  // Store current artifact for button actions
  panel.dataset.artifactName = artifact.name;
}

function closeMissionPanel() {
  document.getElementById('missionPanel').classList.add('hidden');
  clearTrajectory();
}

// ============================================================
// TRAJECTORY VISUALIZATION
// ============================================================
function showTrajectory(artifact) {
  // Clear any existing trajectory
  clearTrajectory();

  // Create trajectory group
  trajectoryGroup = new THREE.Group();
  scene.add(trajectoryGroup);

  // Earth reference point (positioned far from moon to show origin)
  const earthDistance = MOON_RADIUS * 3;
  const earthPosition = new THREE.Vector3(earthDistance, 0, 0);

  // Create Earth marker (small blue sphere)
  const earthGeometry = new THREE.SphereGeometry(15, 16, 16);
  const earthMaterial = new THREE.MeshStandardMaterial({
    color: 0x4488ff,
    emissive: 0x2266ff,
    emissiveIntensity: 0.5,
    roughness: 0.7,
    metalness: 0.2
  });
  earthMarker = new THREE.Mesh(earthGeometry, earthMaterial);
  earthMarker.position.copy(earthPosition);
  trajectoryGroup.add(earthMarker);

  // Add Earth label
  const earthLabel = createTextSprite('EARTH');
  earthLabel.position.set(earthPosition.x, earthPosition.y + 25, earthPosition.z);
  trajectoryGroup.add(earthLabel);

  // Calculate landing position
  const elev = window.elevationData ? getElevationAt(artifact.lat, artifact.lon, window.elevationData) : 0;
  const landingPos = latLonToVector3(artifact.lat, artifact.lon, MOON_RADIUS + elev * 2);

  // Determine trajectory style based on mission type and status
  const status = artifact.status.toLowerCase();
  const type = artifact.type.toLowerCase();
  const isOrbiter = type.includes('orbit');
  const isCurrentlyOrbiting = status === 'orbiting';

  // Arc color based on mission status
  let arcColor;
  if (status === 'landed') {
    arcColor = 0x66ff66;
  } else if (status === 'crashed') {
    arcColor = 0xffee55;
  } else if (status === 'impactor') {
    arcColor = 0xff3366;
  } else if (status === 'orbiting') {
    arcColor = 0x00ffff;
  } else {
    arcColor = 0xffffff;
  }

  // Create curved trajectory path
  const curvePoints = [];
  const segments = 100;

  if (isCurrentlyOrbiting) {
    // For currently orbiting missions, show elliptical orbit only
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const orbitRadius = MOON_RADIUS + 80;
      const x = Math.cos(angle) * orbitRadius;
      const y = Math.sin(angle) * orbitRadius * 0.7; // Slight ellipse
      const z = Math.sin(angle * 2) * 20; // Add some 3D variation
      curvePoints.push(new THREE.Vector3(x, y, z));
    }
  } else if (isOrbiter) {
    // For orbiters that landed/crashed: show arrival from Earth, orbit, then descent
    const orbitSegments = 35;
    const approachSegments = 25;
    const descentSegments = 40;

    // Calculate the landing site's angular position
    const landingPhi = (90 - artifact.lat) * (Math.PI / 180);
    const landingTheta = (artifact.lon + 180) * (Math.PI / 180);

    // Part 1: Approach from Earth to orbit insertion point (opposite side of landing)
    // Insert into orbit on the opposite side of the Moon from landing site
    const insertionAngle = landingTheta + Math.PI; // Opposite side
    const orbitRadius = MOON_RADIUS + 80;
    const orbitInsertionPoint = new THREE.Vector3(
      -Math.sin(landingPhi) * Math.cos(insertionAngle) * orbitRadius,
      Math.cos(landingPhi) * orbitRadius,
      Math.sin(landingPhi) * Math.sin(insertionAngle) * orbitRadius
    );

    const approachControlHeight = MOON_RADIUS * 2;
    const approachControl = new THREE.Vector3(
      (earthPosition.x + orbitInsertionPoint.x) / 2,
      approachControlHeight,
      (earthPosition.z + orbitInsertionPoint.z) / 2
    );

    for (let i = 0; i <= approachSegments; i++) {
      const t = i / approachSegments;
      const x = Math.pow(1 - t, 2) * earthPosition.x +
                2 * (1 - t) * t * approachControl.x +
                Math.pow(t, 2) * orbitInsertionPoint.x;
      const y = Math.pow(1 - t, 2) * earthPosition.y +
                2 * (1 - t) * t * approachControl.y +
                Math.pow(t, 2) * orbitInsertionPoint.y;
      const z = Math.pow(1 - t, 2) * earthPosition.z +
                2 * (1 - t) * t * approachControl.z +
                Math.pow(t, 2) * orbitInsertionPoint.z;
      curvePoints.push(new THREE.Vector3(x, y, z));
    }

    // Part 2: Orbital phase - orbit from insertion point towards landing site
    // Calculate starting angle and ending angle
    const startAngle = Math.atan2(orbitInsertionPoint.z, orbitInsertionPoint.x);
    const endAngle = landingTheta - Math.PI / 2; // End 90 degrees before landing site for descent
    let angleSpan = endAngle - startAngle;

    // Normalize angle span to be positive and less than 2π
    while (angleSpan < 0) angleSpan += Math.PI * 2;
    while (angleSpan > Math.PI * 2) angleSpan -= Math.PI * 2;

    // Use the shorter arc if it's more than π
    if (angleSpan > Math.PI) {
      angleSpan = angleSpan - Math.PI * 2;
    }

    for (let i = 0; i <= orbitSegments; i++) {
      const t = i / orbitSegments;
      const angle = startAngle + angleSpan * t;

      // Calculate position in orbit at this angle
      const orbitPhi = landingPhi + (Math.PI / 2 - landingPhi) * (1 - t); // Gradually match landing latitude
      const x = -Math.sin(orbitPhi) * Math.cos(angle) * orbitRadius;
      const y = Math.cos(orbitPhi) * orbitRadius;
      const z = Math.sin(orbitPhi) * Math.sin(angle) * orbitRadius;

      curvePoints.push(new THREE.Vector3(x, y, z));
    }

    // Part 3: Descent from orbit to landing/crash site
    const lastOrbitPoint = curvePoints[curvePoints.length - 1];

    // Create a controlled descent that stays above surface
    // Use a parabolic arc that goes out and then comes back down
    for (let i = 1; i <= descentSegments; i++) {
      const t = i / descentSegments;

      // Linear interpolation for base position
      const baseX = lastOrbitPoint.x + (landingPos.x - lastOrbitPoint.x) * t;
      const baseY = lastOrbitPoint.y + (landingPos.y - lastOrbitPoint.y) * t;
      const baseZ = lastOrbitPoint.z + (landingPos.z - lastOrbitPoint.z) * t;

      // Add outward bulge to prevent surface intersection (parabolic)
      // Maximum bulge at t=0.5, zero at t=0 and t=1
      const bulgeFactor = 4 * t * (1 - t); // Peaks at 0.5
      const bulgeAmount = 30; // Additional altitude during descent

      const descentPoint = new THREE.Vector3(baseX, baseY, baseZ);
      const direction = descentPoint.clone().normalize();
      descentPoint.add(direction.multiplyScalar(bulgeFactor * bulgeAmount));

      // Final safety check: ensure we're above surface
      const distanceFromCenter = descentPoint.length();
      const surfaceElev = window.elevationData ?
        getElevationAt(
          Math.asin(descentPoint.y / distanceFromCenter) * (180 / Math.PI),
          Math.atan2(descentPoint.x, descentPoint.z) * (180 / Math.PI),
          window.elevationData
        ) * 2 : 0;
      const minRadius = MOON_RADIUS + surfaceElev + 3;

      if (distanceFromCenter < minRadius) {
        descentPoint.normalize().multiplyScalar(minRadius);
      }

      curvePoints.push(descentPoint);
    }
  } else {
    // For direct landing/impact missions, show arc from Earth to Moon
    const controlHeight = MOON_RADIUS * 2; // Height of arc
    const controlPoint = new THREE.Vector3(
      (earthPosition.x + landingPos.x) / 2,
      controlHeight,
      (earthPosition.z + landingPos.z) / 2
    );

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      // Quadratic Bézier curve formula
      const x = Math.pow(1 - t, 2) * earthPosition.x +
                2 * (1 - t) * t * controlPoint.x +
                Math.pow(t, 2) * landingPos.x;
      const y = Math.pow(1 - t, 2) * earthPosition.y +
                2 * (1 - t) * t * controlPoint.y +
                Math.pow(t, 2) * landingPos.y;
      const z = Math.pow(1 - t, 2) * earthPosition.z +
                2 * (1 - t) * t * controlPoint.z +
                Math.pow(t, 2) * landingPos.z;
      curvePoints.push(new THREE.Vector3(x, y, z));
    }
  }

  // Create trajectory line
  const trajectoryGeometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
  const trajectoryMaterial = new THREE.LineBasicMaterial({
    color: arcColor,
    transparent: true,
    opacity: 0.8,
    linewidth: 2
  });
  const trajectoryLine = new THREE.Line(trajectoryGeometry, trajectoryMaterial);
  trajectoryGroup.add(trajectoryLine);

  // Create animated spacecraft marker
  const spacecraftGeometry = new THREE.ConeGeometry(4, 10, 4);
  const spacecraftMaterial = new THREE.MeshStandardMaterial({
    color: arcColor,
    emissive: arcColor,
    emissiveIntensity: 0.6,
    roughness: 0.3,
    metalness: 0.8
  });
  const spacecraft = new THREE.Mesh(spacecraftGeometry, spacecraftMaterial);
  trajectoryGroup.add(spacecraft);

  // Add glow effect to spacecraft
  const glowGeometry = new THREE.SphereGeometry(6, 8, 8);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: arcColor,
    transparent: true,
    opacity: 0.3
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  spacecraft.add(glow);

  // Animate spacecraft along trajectory
  let animationProgress = 0;
  const animationSpeed = 0.003;

  function animateSpacecraft() {
    if (!trajectoryGroup || !spacecraft) return;

    animationProgress += animationSpeed;
    if (animationProgress > 1) animationProgress = 0;

    const pointIndex = Math.floor(animationProgress * (curvePoints.length - 1));
    const currentPoint = curvePoints[pointIndex];
    const nextPoint = curvePoints[Math.min(pointIndex + 1, curvePoints.length - 1)];

    spacecraft.position.copy(currentPoint);

    // Orient spacecraft along trajectory
    const direction = new THREE.Vector3().subVectors(nextPoint, currentPoint).normalize();
    spacecraft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

    // Pulse glow effect
    glow.scale.setScalar(1 + Math.sin(Date.now() * 0.005) * 0.2);
  }

  // Store animation function for cleanup
  trajectoryGroup.userData.animate = animateSpacecraft;

  // Add trajectory info panel update
  console.log(`Trajectory displayed for ${artifact.name} (${artifact.type} - ${artifact.status})`);

  // Focus camera on trajectory
  if (!isCurrentlyOrbiting) {
    const midPoint = curvePoints[Math.floor(curvePoints.length / 2)];
    const focusPos = new THREE.Vector3(
      midPoint.x + 200,
      midPoint.y + 200,
      midPoint.z + 200
    );

    const start = camera.position.clone();
    const end = focusPos;
    const duration = 1500;
    const startTime = Date.now();

    function animateCamera() {
      const elapsed = Date.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = t * (2 - t);

      camera.position.lerpVectors(start, end, eased);
      camera.lookAt(0, 0, 0);

      if (t < 1) {
        requestAnimationFrame(animateCamera);
      }
    }

    animateCamera();
  }
}

function clearTrajectory() {
  if (trajectoryGroup) {
    scene.remove(trajectoryGroup);
    trajectoryGroup = null;
  }
  if (earthMarker) {
    earthMarker = null;
  }
}

function onKeyDown(event) {
  // Check if search is focused
  if (document.activeElement === document.getElementById('searchBox')) {
    if (event.key === 'Escape') {
      document.getElementById('searchBox').blur();
      state.searchQuery = '';
      document.getElementById('searchBox').value = '';
      updateArtifactVisibility();
    }
    return;
  }
  
  const key = event.key.toLowerCase();
  
  // View toggles
  if (key === 'g') {
    state.showGrid = !state.showGrid;
    document.getElementById('toggleGrid').checked = state.showGrid;
    updateVisibility();
  }
  if (key === 'l') {
    state.showLabels = !state.showLabels;
    document.getElementById('toggleLabels').checked = state.showLabels;
    updateVisibility();
  }
  if (key === 't') {
    state.showTerrain = !state.showTerrain;
    document.getElementById('toggleTerrain').checked = state.showTerrain;
    updateVisibility();
  }
  if (key === 'p') {
    state.showPoles = !state.showPoles;
    document.getElementById('togglePoles').checked = state.showPoles;
    updateVisibility();
  }
  if (key === 'm') {
    state.showArtifacts = !state.showArtifacts;
    document.getElementById('toggleArtifacts').checked = state.showArtifacts;
    updateArtifactVisibility();
  }
  if (key === 'v') {
    state.terrainMode = (state.terrainMode + 1) % 3;
    updateVisibility();
  }
  
  // Resources
  if (key === 'w') {
    state.showWater = !state.showWater;
    document.getElementById('toggleWater').checked = state.showWater;
    updateResourceVisibility();
  }
  if (key === 'i') {
    state.showHelium = !state.showHelium;
    document.getElementById('toggleHelium').checked = state.showHelium;
    updateResourceVisibility();
  }
  if (key === 'n') {
    state.showTitanium = !state.showTitanium;
    document.getElementById('toggleTitanium').checked = state.showTitanium;
    updateResourceVisibility();
  }
  if (key === 'k') {
    state.showKreep = !state.showKreep;
    document.getElementById('toggleKreep').checked = state.showKreep;
    updateResourceVisibility();
  }
  if (key === 'x') {
    state.showMinerals = !state.showMinerals;
    document.getElementById('toggleMinerals').checked = state.showMinerals;
    updateResourceVisibility();
  }
  if (key === 'a') {
    const anyOn = state.showWater || state.showHelium || state.showTitanium || state.showKreep || state.showMinerals;
    state.showWater = state.showHelium = state.showTitanium = state.showKreep = state.showMinerals = !anyOn;
    document.getElementById('toggleWater').checked = state.showWater;
    document.getElementById('toggleHelium').checked = state.showHelium;
    document.getElementById('toggleTitanium').checked = state.showTitanium;
    document.getElementById('toggleKreep').checked = state.showKreep;
    document.getElementById('toggleMinerals').checked = state.showMinerals;
    updateResourceVisibility();
  }
  if (key === '+' || key === '=') {
    state.resourceOpacity = Math.min(1, state.resourceOpacity + 0.1);
    updateResourceVisibility();
  }
  if (key === '-' || key === '_') {
    state.resourceOpacity = Math.max(0.2, state.resourceOpacity - 0.1);
    updateResourceVisibility();
  }
  
  // Navigation
  if (key === 'r') {
    controls.reset();
    camera.position.set(0, 100, 500);
  }
  if (key === 's' || key === '3') {
    focusOnArtifact('Surveyor 3');
  }
  if (key === '/' || key === 'f') {
    document.getElementById('searchBox').focus();
    event.preventDefault();
  }
  
  // Help
  if (key === 'd') {
    state.showHelp = !state.showHelp;
    document.getElementById('helpModal').classList.toggle('hidden', !state.showHelp);
  }
  
  // Number keys for quick focus
  if (key >= '1' && key <= '9') {
    const visibleArtifacts = artifactMarkers.filter(m => m.marker.visible);
    const index = parseInt(key) - 1;
    if (index < visibleArtifacts.length) {
      const artifact = visibleArtifacts[index].data;
      focusOnCoords(artifact.lat, artifact.lon);
    }
  }
}

function focusOnArtifact(name) {
  const artifact = ARTIFACTS.find(a => a.name.includes(name));
  if (artifact) {
    focusOnCoords(artifact.lat, artifact.lon);
  }
}

function focusOnCoords(lat, lon) {
  const pos = latLonToVector3(lat, lon, MOON_RADIUS + 300);
  
  // Animate camera
  const start = camera.position.clone();
  const end = pos;
  const duration = 1000;
  const startTime = Date.now();
  
  function animateCamera() {
    const elapsed = Date.now() - startTime;
    const t = Math.min(1, elapsed / duration);
    const eased = t * (2 - t); // Ease out quad
    
    camera.position.lerpVectors(start, end, eased);
    camera.lookAt(0, 0, 0);
    
    if (t < 1) {
      requestAnimationFrame(animateCamera);
    }
  }
  
  animateCamera();
}

// ============================================================
// UI BINDINGS
// ============================================================
function bindUI() {
  // View toggles
  document.getElementById('toggleGrid').addEventListener('change', (e) => {
    state.showGrid = e.target.checked;
    updateVisibility();
  });
  document.getElementById('toggleLabels').addEventListener('change', (e) => {
    state.showLabels = e.target.checked;
    updateVisibility();
  });
  document.getElementById('toggleTerrain').addEventListener('change', (e) => {
    state.showTerrain = e.target.checked;
    updateVisibility();
  });
  document.getElementById('togglePoles').addEventListener('change', (e) => {
    state.showPoles = e.target.checked;
    updateVisibility();
  });
  document.getElementById('toggleArtifacts').addEventListener('change', (e) => {
    state.showArtifacts = e.target.checked;
    updateArtifactVisibility();
  });

  // Resource toggles
  document.getElementById('toggleWater').addEventListener('change', (e) => {
    state.showWater = e.target.checked;
    updateResourceVisibility();
  });
  document.getElementById('toggleHelium').addEventListener('change', (e) => {
    state.showHelium = e.target.checked;
    updateResourceVisibility();
  });
  document.getElementById('toggleTitanium').addEventListener('change', (e) => {
    state.showTitanium = e.target.checked;
    updateResourceVisibility();
  });
  document.getElementById('toggleKreep').addEventListener('change', (e) => {
    state.showKreep = e.target.checked;
    updateResourceVisibility();
  });
  document.getElementById('toggleMinerals').addEventListener('change', (e) => {
    state.showMinerals = e.target.checked;
    updateResourceVisibility();
  });
  
  // Filters - individual country checkboxes
  document.getElementById('filterSovietUnion').addEventListener('change', (e) => {
    state.filterSovietUnion = e.target.checked;
    updateArtifactVisibility();
  });
  document.getElementById('filterRussia').addEventListener('change', (e) => {
    state.filterRussia = e.target.checked;
    updateArtifactVisibility();
  });
  document.getElementById('filterUS').addEventListener('change', (e) => {
    state.filterUS = e.target.checked;
    updateArtifactVisibility();
  });
  document.getElementById('filterChina').addEventListener('change', (e) => {
    state.filterChina = e.target.checked;
    updateArtifactVisibility();
  });
  document.getElementById('filterIndia').addEventListener('change', (e) => {
    state.filterIndia = e.target.checked;
    updateArtifactVisibility();
  });
  document.getElementById('filterJapan').addEventListener('change', (e) => {
    state.filterJapan = e.target.checked;
    updateArtifactVisibility();
  });
  document.getElementById('filterIsrael').addEventListener('change', (e) => {
    state.filterIsrael = e.target.checked;
    updateArtifactVisibility();
  });
  document.getElementById('filterEurope').addEventListener('change', (e) => {
    state.filterEurope = e.target.checked;
    updateArtifactVisibility();
  });
  
  // Search
  document.getElementById('searchBox').addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    updateArtifactVisibility();
  });
  document.getElementById('searchBox').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      // Focus on first matching artifact
      const query = state.searchQuery.toLowerCase();
      const match = ARTIFACTS.find(a =>
        a.name.toLowerCase().includes(query) || String(a.year).includes(query)
      );
      if (match) {
        focusOnCoords(match.lat, match.lon);
      }
    }
  });

  // Mission panel buttons
  document.getElementById('panelClose').addEventListener('click', closeMissionPanel);
  document.getElementById('panelFocus').addEventListener('click', () => {
    const artifactName = document.getElementById('missionPanel').dataset.artifactName;
    focusOnArtifact(artifactName);
  });
  document.getElementById('panelTrajectory').addEventListener('click', () => {
    const artifactName = document.getElementById('missionPanel').dataset.artifactName;
    const artifact = ARTIFACTS.find(a => a.name === artifactName);
    if (artifact) {
      showTrajectory(artifact);
    }
  });
}

// ============================================================
// ANIMATION LOOP
// ============================================================
function animate() {
  requestAnimationFrame(animate);
  controls.update();

  // Animate trajectory spacecraft if active
  if (trajectoryGroup && trajectoryGroup.userData.animate) {
    trajectoryGroup.userData.animate();
  }

  renderer.render(scene, camera);
}

// ============================================================
// START APPLICATION
// ============================================================
try {
  init();
  // Hide loading screen after initialization
  setTimeout(() => {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
  }, 500);
} catch (error) {
  console.error('Failed to initialize Moon Explorer:', error);
  const loading = document.getElementById('loading');
  if (loading) {
    loading.innerHTML = `
      <div style="color: #ff3366; text-align: center; padding: 20px;">
        <h2>Initialization Error</h2>
        <p>Failed to load the Moon Explorer visualization.</p>
        <p style="font-size: 0.9em; margin-top: 10px;">Error: ${error.message}</p>
        <p style="font-size: 0.8em; margin-top: 20px;">Please check the browser console for details.</p>
      </div>
    `;
  }
}
