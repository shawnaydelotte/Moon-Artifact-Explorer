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
  
  showWater: false,
  showHelium: false,
  showTitanium: false,
  showKreep: false,
  showMinerals: false,
  resourceOpacity: 0.7,
  
  filterSoviet: true,
  filterUS: true,
  filterOther: true,
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
  
  // Lighting
  const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(500, 300, 500);
  scene.add(directionalLight);
  
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
    opacity: 0.15
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
  
  // Solid terrain mesh
  const solidMaterial = new THREE.MeshLambertMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.9
  });
  terrainMesh = new THREE.Mesh(geometry, solidMaterial);
  moonGroup.add(terrainMesh);
  
  // Wireframe overlay
  const wireMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ff66,
    wireframe: true,
    transparent: true,
    opacity: 0.2
  });
  wireframeMesh = new THREE.Mesh(geometry.clone(), wireMaterial);
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
  
  for (const artifact of ARTIFACTS) {
    const color = STATUS_COLORS[artifact.status.toLowerCase()] || 0x888888;
    const material = new THREE.MeshBasicMaterial({ color: color });
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
    
    // Create label (as sprite)
    const label = createTextSprite(artifact.name.length > 16 ? artifact.name.slice(0, 14) + '…' : artifact.name);
    label.position.copy(pos);
    label.position.y += 12;
    moonGroup.add(label);
    artifactLabels.push(label);
  }
}

function createTextSprite(text) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 256;
  canvas.height = 64;
  
  context.font = '24px monospace';
  context.fillStyle = 'rgba(255, 255, 255, 0.9)';
  context.textAlign = 'center';
  context.fillText(text, 128, 40);
  
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(50, 12.5, 1);
  
  return sprite;
}

function createResources() {
  for (const resource of RESOURCES) {
    const color = RESOURCE_COLORS[resource.type] || 0xffffff;
    
    // Create ring geometry for resource area
    const radiusDeg = resource.radius / 111 / Math.max(0.1, Math.cos(resource.lat * Math.PI / 180));
    const points = [];
    
    for (let i = 0; i <= 32; i++) {
      const angle = (i / 32) * Math.PI * 2;
      const dlat = radiusDeg * Math.sin(angle);
      const dlon = radiusDeg * Math.cos(angle);
      const elev = window.elevationData ? getElevationAt(resource.lat + dlat, resource.lon + dlon, window.elevationData) : 0;
      const pos = latLonToVector3(resource.lat + dlat, resource.lon + dlon, MOON_RADIUS + elev * 2 + 2);
      points.push(pos);
    }
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: resource.concentration * 0.7
    });
    const ring = new THREE.Line(geometry, material);
    ring.userData = resource;
    ring.visible = false;
    
    moonGroup.add(ring);
    resourceMeshes.push(ring);
  }
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
    
    // Check filters
    let showByOrigin = false;
    if ((data.operator.includes('Soviet') || data.operator.includes('Russia')) && state.filterSoviet) showByOrigin = true;
    if (data.operator.includes('United States') && state.filterUS) showByOrigin = true;
    if (!data.operator.includes('Soviet') && !data.operator.includes('Russia') && 
        !data.operator.includes('United States') && state.filterOther) showByOrigin = true;
    
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
  for (const mesh of resourceMeshes) {
    const type = mesh.userData.type;
    let visible = false;
    
    if (type === 'water' && state.showWater) visible = true;
    if (type === 'helium' && state.showHelium) visible = true;
    if (type === 'titanium' && state.showTitanium) visible = true;
    if (type === 'kreep' && state.showKreep) visible = true;
    if (type === 'minerals' && state.showMinerals) visible = true;
    
    mesh.visible = visible;
    mesh.material.opacity = mesh.userData.concentration * state.resourceOpacity;
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
    hoveredArtifact = null;
    tooltip.style.display = 'none';
    document.body.style.cursor = 'default';
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
  
  // Filters
  document.getElementById('filterSoviet').addEventListener('change', (e) => {
    state.filterSoviet = e.target.checked;
    updateArtifactVisibility();
  });
  document.getElementById('filterUS').addEventListener('change', (e) => {
    state.filterUS = e.target.checked;
    updateArtifactVisibility();
  });
  document.getElementById('filterOther').addEventListener('change', (e) => {
    state.filterOther = e.target.checked;
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
}

// ============================================================
// ANIMATION LOOP
// ============================================================
function animate() {
  requestAnimationFrame(animate);
  controls.update();
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
