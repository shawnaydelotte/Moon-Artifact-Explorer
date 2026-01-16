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
  showCraters: false,
  showMaria: false,
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

  showHelp: false,

  // Visual settings
  visualSettings: {
    starfieldEnabled: true,
    starSize: 2.5,
    starOpacity: 1.0,
    starCount: 8000,
    ambientIntensity: 0.4,
    sunIntensity: 1.8,
    fillIntensity: 0.3,
    pointIntensity: 0.5,
    textureEnabled: true,
    surfaceRoughness: 0.95,
    baseBrightness: 204,
    elevationIntensity: 1.0,
    toneMappingEnabled: true,
    toneExposure: 1.2,
    pixelRatio: 2.0
  }
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

// Lighting references for dynamic control
let ambientLight, sunLight, fillLight, pointLight;
let starfield, starfieldMaterial;
let terrainMaterial;

function init() {
  console.log('🚀 Moon Explorer - Init started');
  console.log('🕒 Build timestamp:', new Date().toISOString());

  // Validate dependencies
  if (!THREE) {
    throw new Error('Three.js library failed to load. Please check your internet connection.');
  }
  if (!ARTIFACTS || !CRATERS || !MARIA || !RESOURCES) {
    throw new Error('Data files failed to load. Please ensure data.js is accessible.');
  }

  // Scene with photorealistic space background
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  console.log('🌙 Initializing Moon Explorer with photorealistic rendering...');

  // Create realistic starfield
  createStarfield();

  // Camera
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 10000);
  camera.position.set(0, 100, 500);

  // Renderer with enhanced settings for photorealism
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    precision: 'highp'
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2x for performance

  // Enhanced rendering properties
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = false; // Disabled for performance
  renderer.physicallyCorrectLights = true;
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
  
  // Photorealistic lighting setup - simulating Sun illumination in space
  // Ambient light for overall scene brightness
  ambientLight = new THREE.AmbientLight(0x444444, state.visualSettings.ambientIntensity);
  scene.add(ambientLight);

  // Main sun light - harsh, bright, directional (simulating the Sun)
  sunLight = new THREE.DirectionalLight(0xffffff, state.visualSettings.sunIntensity);
  sunLight.position.set(500, 200, 300);
  sunLight.castShadow = false; // Disabled for performance
  scene.add(sunLight);

  // Fill light from opposite side for better visibility
  fillLight = new THREE.DirectionalLight(0xaaaaff, state.visualSettings.fillIntensity);
  fillLight.position.set(-400, -100, -300);
  scene.add(fillLight);

  // Add point light for enhanced depth perception
  pointLight = new THREE.PointLight(0xffffff, state.visualSettings.pointIntensity, 2500);
  pointLight.position.set(400, 300, 400);
  scene.add(pointLight);
  
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
function createStarfield() {
  // Create realistic starfield with varying star sizes and brightness
  const starGeometry = new THREE.BufferGeometry();
  const starCount = 8000;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);

  for (let i = 0; i < starCount; i++) {
    // Random position on a large sphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    const radius = 3000;

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);

    // Vary star colors (white, blue-white, yellow-white)
    const colorVariation = Math.random();
    if (colorVariation > 0.95) {
      // Blue giants (rare)
      colors[i * 3] = 0.7 + Math.random() * 0.3;
      colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
      colors[i * 3 + 2] = 1.0;
    } else if (colorVariation > 0.7) {
      // Yellow-white stars
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.95 + Math.random() * 0.05;
      colors[i * 3 + 2] = 0.8 + Math.random() * 0.2;
    } else {
      // White stars (most common)
      const brightness = 0.85 + Math.random() * 0.15;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness;
    }

    // Vary star sizes (most small, few large/bright)
    sizes[i] = Math.random() < 0.95 ? Math.random() * 1.5 : Math.random() * 3 + 1;
  }

  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  starfieldMaterial = new THREE.PointsMaterial({
    size: state.visualSettings.starSize,
    vertexColors: true,
    transparent: true,
    opacity: state.visualSettings.starOpacity,
    sizeAttenuation: false,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  starfield = new THREE.Points(starGeometry, starfieldMaterial);
  starfield.visible = state.visualSettings.starfieldEnabled;
  scene.add(starfield);
  console.log('✓ Starfield created with', starCount, 'stars');
}

function createGrid() {
  const geometry = new THREE.SphereGeometry(MOON_RADIUS, 36, 18);
  const material = new THREE.MeshBasicMaterial({
    color: 0x00dd44, // Darker green for better contrast
    wireframe: true,
    transparent: true,
    opacity: 0.25, // Increased opacity for better visibility
    depthTest: true,
    depthWrite: false
  });
  gridMesh = new THREE.Mesh(geometry, material);
  moonGroup.add(gridMesh);
}

function createTerrain() {
  // Generate elevation data
  const elevationData = generateElevation();

  // Create terrain geometry with higher resolution for photorealism
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

    // Color based on elevation - more realistic lunar colors
    const color = getElevationColor(elev);
    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  // Load high-resolution NASA lunar textures for photorealism
  const textureLoader = new THREE.TextureLoader();

  // Using CDN-hosted NASA textures (reliable public access)
  const moonTexture = textureLoader.load(
    'https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/planets/moon_1024.jpg',
    (texture) => {
      console.log('✓ Moon texture loaded successfully');
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    },
    undefined,
    (error) => {
      console.warn('⚠ Could not load moon texture, using vertex colors:', error);
    }
  );

  // Photorealistic material with PBR (Physically Based Rendering)
  terrainMaterial = new THREE.MeshStandardMaterial({
    // Use real textures if loaded, fall back to vertex colors
    map: state.visualSettings.textureEnabled ? moonTexture : null,

    // Fallback vertex colors for elevation-based coloring
    vertexColors: true,

    // Lunar regolith material properties
    roughness: state.visualSettings.surfaceRoughness,
    metalness: 0.0,       // No metallic properties

    // Realistic lunar surface appearance
    color: new THREE.Color(
      state.visualSettings.baseBrightness / 255,
      state.visualSettings.baseBrightness / 255,
      state.visualSettings.baseBrightness / 255
    ),

    // No transparency for solid surface
    transparent: false,

    // Smooth shading for realistic appearance
    flatShading: false,

    // Physical accuracy
    envMapIntensity: 0.0, // No environment reflections in space
  });

  terrainMesh = new THREE.Mesh(geometry, terrainMaterial);
  moonGroup.add(terrainMesh);
  console.log('✓ Terrain mesh created with photorealistic PBR material');

  // Wireframe overlay with subtle styling (optional, can be toggled)
  const wireMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ff66,
    wireframe: true,
    transparent: true,
    opacity: 0.04,  // Even more subtle for photorealism
    depthTest: true,
    depthWrite: false
  });
  wireframeMesh = new THREE.Mesh(geometry.clone(), wireMaterial);
  wireframeMesh.scale.set(1.002, 1.002, 1.002); // Slightly larger to prevent z-fighting
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

  // Photorealistic lunar surface colors based on Apollo samples and LRO data
  // Mare (basalt) - dark gray/blue-gray (low elevations)
  // Highlands (anorthosite) - light gray/tan (high elevations)
  // Colors brightened for better visibility with photorealistic lighting

  if (elevKm < -6) return new THREE.Color(0x4a4a48); // Very deep maria - darkest basalt
  if (elevKm < -4) return new THREE.Color(0x5a5a58); // Deep maria - dark basalt
  if (elevKm < -2) return new THREE.Color(0x6a6a68); // Maria - typical basalt
  if (elevKm < 0) return new THREE.Color(0x7a7a78);  // Low maria/transition
  if (elevKm < 2) return new THREE.Color(0x8d8d8a);  // Highlands transition
  if (elevKm < 4) return new THREE.Color(0xa0a09a);  // Typical highlands - anorthosite
  if (elevKm < 6) return new THREE.Color(0xb5b5aa);  // High highlands
  return new THREE.Color(0xc8c8be);                   // Peaks - brightest regolith
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

    // Resource label with smart positioning to prevent overlap
    const label = createResourceLabel(resource);
    label.position.copy(centerPos);

    // Add extra vertical spacing for overlapping polar resources
    let labelOffset = 15;
    if (resource.type === 'water' && Math.abs(resource.lat) > 80) {
      // For polar water deposits, stagger labels based on longitude
      const lonOffset = (resource.lon + 180) % 360;
      labelOffset = 15 + (lonOffset / 360) * 30; // Vary from 15 to 45 units
    } else if (resource.subtype) {
      // Resources with subtypes need more space
      labelOffset = 20;
    }

    label.position.y += labelOffset;
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

  // Create crater and maria markers
  createFeatureMarkers();
}

function createFeatureMarkers() {
  // Create clickable markers for craters
  for (const crater of CRATERS) {
    const elev = window.elevationData ? getElevationAt(crater.lat, crater.lon, window.elevationData) : 0;
    const pos = latLonToVector3(crater.lat, crater.lon, MOON_RADIUS + elev * 2 + 5);

    const markerGeometry = new THREE.SphereGeometry(4, 16, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: 0xff8844,
      transparent: true,
      opacity: 0.8
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.copy(pos);
    marker.userData = { ...crater, featureType: 'crater' };
    marker.visible = false; // Hidden by default, will show with toggle

    moonGroup.add(marker);
    resourceMeshes.push({ marker, data: crater, featureType: 'crater' });
  }

  // Create clickable markers for maria
  for (const mare of MARIA) {
    const elev = window.elevationData ? getElevationAt(mare.lat, mare.lon, window.elevationData) : 0;
    const pos = latLonToVector3(mare.lat, mare.lon, MOON_RADIUS + elev * 2 + 5);

    const markerGeometry = new THREE.SphereGeometry(4, 16, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.8
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.copy(pos);
    marker.userData = { ...mare, featureType: 'mare' };
    marker.visible = false; // Hidden by default, will show with toggle

    moonGroup.add(marker);
    resourceMeshes.push({ marker, data: mare, featureType: 'mare' });
  }
}

// Create label for resource deposits
function createResourceLabel(resource) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  // Larger canvas for resources with subtype
  const hasSubtype = resource.subtype !== undefined;
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
    const featureType = resourceGroup.featureType;
    let visible = false;

    if (featureType === 'crater') {
      visible = state.showCraters;
      resourceGroup.marker.visible = visible;
    } else if (featureType === 'mare') {
      visible = state.showMaria;
      resourceGroup.marker.visible = visible;
    } else {
      // Resource deposits
      const type = resourceGroup.data.type;
      if (type === 'water' && state.showWater) visible = true;
      if (type === 'helium' && state.showHelium) visible = true;
      if (type === 'titanium' && state.showTitanium) visible = true;
      if (type === 'kreep' && state.showKreep) visible = true;
      if (type === 'minerals' && state.showMinerals) visible = true;

      // Update visibility for all parts
      if (resourceGroup.outer) resourceGroup.outer.visible = visible;
      if (resourceGroup.inner) resourceGroup.inner.visible = visible;
      resourceGroup.marker.visible = visible;
      if (resourceGroup.label) resourceGroup.label.visible = visible;

      // Update opacity based on concentration and global resource opacity
      if (visible && resourceGroup.data.concentration) {
        const opacity = resourceGroup.data.concentration * state.resourceOpacity;
        if (resourceGroup.outer) resourceGroup.outer.material.opacity = opacity * 0.9;
        if (resourceGroup.inner) resourceGroup.inner.material.opacity = opacity * 0.5;
        resourceGroup.marker.material.opacity = opacity * 0.9;
      }
    }
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
      ${artifact.mass ? `<div class="detail">Mass: ${artifact.mass}</div>` : ''}
      <div class="coords">${artifact.lat.toFixed(2)}° lat, ${artifact.lon.toFixed(2)}° lon</div>
      <div class="detail">Elevation: ${elevKm > 0 ? '+' : ''}${elevKm} km</div>
      ${artifact.description ? `<div class="description">${artifact.description}</div>` : ''}
      ${artifact.link ? `<div class="detail" style="margin-top: 6px;"><a href="${artifact.link}" target="_blank" style="color: #00ff99; text-decoration: underline;">Learn more →</a></div>` : ''}
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
        ${resource.link ? `<div class="detail" style="margin-top: 6px;"><a href="${resource.link}" target="_blank" style="color: #00ff99; text-decoration: underline;">Learn more →</a></div>` : ''}
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
  if (event.target.closest('#hud') || event.target.closest('.details-panel')) {
    return;
  }

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // Check for artifact clicks
  const markers = artifactMarkers.filter(m => m.marker.visible).map(m => m.marker);
  const intersects = raycaster.intersectObjects(markers);

  if (intersects.length > 0) {
    const artifact = intersects[0].object.userData;
    openMissionPanel(artifact);
    return;
  }

  // Check for resource/crater/mare clicks
  const featureMarkers = resourceMeshes
    .filter(r => r.marker.visible)
    .map(r => r.marker);
  const featureIntersects = raycaster.intersectObjects(featureMarkers);

  if (featureIntersects.length > 0) {
    const feature = featureIntersects[0].object.userData;
    const featureType = feature.featureType || 'resource';
    openFeaturePanel(feature, featureType);
    return;
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
  document.getElementById('panelMass').textContent = artifact.mass || 'Unknown';
  document.getElementById('panelCoords').textContent = `${artifact.lat.toFixed(3)}° ${artifact.lat >= 0 ? 'N' : 'S'}, ${Math.abs(artifact.lon).toFixed(3)}° ${artifact.lon >= 0 ? 'E' : 'W'}`;
  document.getElementById('panelElevation').textContent = `${elevKm > 0 ? '+' : ''}${elevKm} km`;

  const description = artifact.description || 'No additional information available for this mission.';
  document.getElementById('panelDescription').textContent = description;

  // Update learn more link
  const learnMoreBtn = document.getElementById('panelLearnMore');
  if (artifact.link) {
    learnMoreBtn.href = artifact.link;
    learnMoreBtn.style.display = 'block';
  } else {
    learnMoreBtn.style.display = 'none';
  }

  // Show panel
  panel.classList.remove('hidden');

  // Store current artifact for button actions
  panel.dataset.artifactName = artifact.name;
}

function closeMissionPanel() {
  document.getElementById('missionPanel').classList.add('hidden');
  clearTrajectory();
}

function openFeaturePanel(feature, type) {
  const panel = document.getElementById('featurePanel');

  // Populate panel based on feature type
  document.getElementById('featurePanelTitle').textContent = feature.name;

  // Set type badge
  const typeBadge = document.getElementById('featurePanelType');
  if (type === 'resource') {
    typeBadge.textContent = feature.type.toUpperCase() + ' DEPOSIT';
    typeBadge.style.background = 'rgba(0, 255, 255, 0.2)';
    typeBadge.style.color = '#00ffff';
    typeBadge.style.borderColor = '#00ffff';
  } else if (type === 'crater') {
    typeBadge.textContent = 'CRATER';
    typeBadge.style.background = 'rgba(255, 136, 68, 0.2)';
    typeBadge.style.color = '#ff8844';
    typeBadge.style.borderColor = '#ff8844';
  } else if (type === 'mare') {
    typeBadge.textContent = 'MARE / BASIN';
    typeBadge.style.background = 'rgba(68, 136, 255, 0.2)';
    typeBadge.style.color = '#4488ff';
    typeBadge.style.borderColor = '#4488ff';
  }

  // Populate stats
  const statsContainer = document.getElementById('featurePanelStats');
  statsContainer.innerHTML = '';

  // Location (all features)
  const locationItem = document.createElement('div');
  locationItem.className = 'stat-item';
  locationItem.innerHTML = `
    <span class="stat-label">Location:</span>
    <span class="stat-value">${feature.lat.toFixed(3)}° ${feature.lat >= 0 ? 'N' : 'S'}, ${Math.abs(feature.lon).toFixed(3)}° ${feature.lon >= 0 ? 'E' : 'W'}</span>
  `;
  statsContainer.appendChild(locationItem);

  if (type === 'resource') {
    // Add resource-specific stats
    if (feature.subtype) {
      const subtypeItem = document.createElement('div');
      subtypeItem.className = 'stat-item';
      subtypeItem.innerHTML = `
        <span class="stat-label">Subtype:</span>
        <span class="stat-value">${feature.subtype}</span>
      `;
      statsContainer.appendChild(subtypeItem);
    }

    const radiusItem = document.createElement('div');
    radiusItem.className = 'stat-item';
    radiusItem.innerHTML = `
      <span class="stat-label">Radius:</span>
      <span class="stat-value">~${feature.radius} km</span>
    `;
    statsContainer.appendChild(radiusItem);

    const concentrationItem = document.createElement('div');
    concentrationItem.className = 'stat-item';
    concentrationItem.innerHTML = `
      <span class="stat-label">Concentration:</span>
      <span class="stat-value">${(feature.concentration * 100).toFixed(0)}%</span>
    `;
    statsContainer.appendChild(concentrationItem);
  } else if (type === 'crater' || type === 'mare') {
    // Add size for craters and maria
    const sizeItem = document.createElement('div');
    sizeItem.className = 'stat-item';
    sizeItem.innerHTML = `
      <span class="stat-label">Diameter:</span>
      <span class="stat-value">${feature.size} km</span>
    `;
    statsContainer.appendChild(sizeItem);
  }

  // Set description
  const description = feature.description || 'No additional information available for this feature.';
  document.getElementById('featurePanelDescription').textContent = description;

  // Update learn more link
  const learnMoreBtn = document.getElementById('featurePanelLearnMore');
  if (feature.link) {
    learnMoreBtn.href = feature.link;
    learnMoreBtn.style.display = 'block';
  } else {
    learnMoreBtn.style.display = 'none';
  }

  // Show panel
  panel.classList.remove('hidden');

  // Store current feature for button actions
  panel.dataset.featureLat = feature.lat;
  panel.dataset.featureLon = feature.lon;
}

function closeFeaturePanel() {
  document.getElementById('featurePanel').classList.add('hidden');
}

// ============================================================
// PANEL DRAG AND RESIZE
// ============================================================
function makePanelDraggable(panelId) {
  const panel = document.getElementById(panelId);
  const header = panel.querySelector('.panel-header');
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;

  header.addEventListener('mousedown', (e) => {
    // Don't drag if clicking on close button
    if (e.target.closest('.panel-close-btn')) {
      return;
    }

    isDragging = true;
    initialX = e.clientX - panel.offsetLeft;
    initialY = e.clientY - panel.offsetTop;

    panel.style.transition = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;

      // Keep panel within viewport
      const maxX = window.innerWidth - panel.offsetWidth;
      const maxY = window.innerHeight - panel.offsetHeight;

      currentX = Math.max(0, Math.min(currentX, maxX));
      currentY = Math.max(0, Math.min(currentY, maxY));

      panel.style.left = currentX + 'px';
      panel.style.top = currentY + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    }
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
    }
  });
}

function makePanelResizable(panelId) {
  const panel = document.getElementById(panelId);
  const resizeHandle = panel.querySelector('.resize-handle');
  let isResizing = false;
  let startX, startY, startWidth, startHeight;

  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = parseInt(getComputedStyle(panel).width, 10);
    startHeight = parseInt(getComputedStyle(panel).height, 10);

    e.preventDefault();
    e.stopPropagation();
  });

  document.addEventListener('mousemove', (e) => {
    if (isResizing) {
      const width = startWidth + (e.clientX - startX);
      const height = startHeight + (e.clientY - startY);

      // Apply min/max constraints
      const minWidth = 300;
      const maxWidth = window.innerWidth * 0.9;
      const minHeight = 200;
      const maxHeight = window.innerHeight * 0.9;

      panel.style.width = Math.max(minWidth, Math.min(width, maxWidth)) + 'px';
      panel.style.height = Math.max(minHeight, Math.min(height, maxHeight)) + 'px';
      panel.style.maxWidth = 'none';
      panel.style.maxHeight = 'none';
    }
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
    }
  });
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
  
  // Features
  if (key === 'c') {
    state.showCraters = !state.showCraters;
    document.getElementById('toggleCraters').checked = state.showCraters;
    updateResourceVisibility();
  }
  if (key === 'b') {
    state.showMaria = !state.showMaria;
    document.getElementById('toggleMaria').checked = state.showMaria;
    updateResourceVisibility();
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
  
  // Visual Settings
  if (key === 'q') {
    const modal = document.getElementById('visualSettingsModal');
    const isHidden = modal.classList.contains('hidden');
    if (isHidden) {
      modal.classList.remove('hidden');
      updateVisualSettingsUI();
    } else {
      modal.classList.add('hidden');
    }
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

  // Feature toggles
  document.getElementById('toggleCraters').addEventListener('change', (e) => {
    state.showCraters = e.target.checked;
    updateResourceVisibility();
  });
  document.getElementById('toggleMaria').addEventListener('change', (e) => {
    state.showMaria = e.target.checked;
    updateResourceVisibility();
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

  // Feature panel buttons
  document.getElementById('featurePanelClose').addEventListener('click', closeFeaturePanel);
  document.getElementById('featurePanelFocus').addEventListener('click', () => {
    const panel = document.getElementById('featurePanel');
    const lat = parseFloat(panel.dataset.featureLat);
    const lon = parseFloat(panel.dataset.featureLon);
    focusOnCoords(lat, lon);
  });

  // Make panels draggable and resizable
  makePanelDraggable('missionPanel');
  makePanelDraggable('featurePanel');
  makePanelResizable('missionPanel');
  makePanelResizable('featurePanel');

  // Visual Settings Modal
  bindVisualSettingsUI();
}

function bindVisualSettingsUI() {
  const modal = document.getElementById('visualSettingsModal');
  const openButton = document.getElementById('openVisualSettings');

  console.log('🎛️ Binding visual settings UI...');
  console.log('Modal element:', modal);
  console.log('Open button element:', openButton);

  if (!modal) {
    console.error('❌ Visual Settings Modal not found!');
    return;
  }

  if (!openButton) {
    console.error('❌ Visual Settings Button not found!');
    return;
  }

  // Open/Close
  openButton.addEventListener('click', () => {
    console.log('🎛️ Visual settings button clicked!');
    modal.classList.remove('hidden');
    updateVisualSettingsUI();
  });

  document.getElementById('closeVisualSettings').addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  // Click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });

  // Starfield controls
  document.getElementById('toggleStarfield').addEventListener('change', (e) => {
    state.visualSettings.starfieldEnabled = e.target.checked;
  });

  document.getElementById('starSize').addEventListener('input', (e) => {
    state.visualSettings.starSize = parseFloat(e.target.value);
    document.getElementById('starSizeValue').textContent = e.target.value;
  });

  document.getElementById('starOpacity').addEventListener('input', (e) => {
    state.visualSettings.starOpacity = parseFloat(e.target.value);
    document.getElementById('starOpacityValue').textContent = Math.round(e.target.value * 100) + '%';
  });

  document.getElementById('starCount').addEventListener('input', (e) => {
    state.visualSettings.starCount = parseInt(e.target.value);
    document.getElementById('starCountValue').textContent = e.target.value;
  });

  // Lighting controls
  document.getElementById('ambientIntensity').addEventListener('input', (e) => {
    state.visualSettings.ambientIntensity = parseFloat(e.target.value);
    document.getElementById('ambientIntensityValue').textContent = e.target.value;
  });

  document.getElementById('sunIntensity').addEventListener('input', (e) => {
    state.visualSettings.sunIntensity = parseFloat(e.target.value);
    document.getElementById('sunIntensityValue').textContent = e.target.value;
  });

  document.getElementById('fillIntensity').addEventListener('input', (e) => {
    state.visualSettings.fillIntensity = parseFloat(e.target.value);
    document.getElementById('fillIntensityValue').textContent = e.target.value;
  });

  document.getElementById('pointIntensity').addEventListener('input', (e) => {
    state.visualSettings.pointIntensity = parseFloat(e.target.value);
    document.getElementById('pointIntensityValue').textContent = e.target.value;
  });

  // Surface controls
  document.getElementById('toggleTexture').addEventListener('change', (e) => {
    state.visualSettings.textureEnabled = e.target.checked;
  });

  document.getElementById('surfaceRoughness').addEventListener('input', (e) => {
    state.visualSettings.surfaceRoughness = parseFloat(e.target.value);
    document.getElementById('surfaceRoughnessValue').textContent = e.target.value;
  });

  document.getElementById('baseBrightness').addEventListener('input', (e) => {
    state.visualSettings.baseBrightness = parseInt(e.target.value);
    document.getElementById('baseBrightnessValue').textContent = e.target.value;
  });

  document.getElementById('elevationIntensity').addEventListener('input', (e) => {
    state.visualSettings.elevationIntensity = parseFloat(e.target.value);
    document.getElementById('elevationIntensityValue').textContent = e.target.value;
  });

  // Renderer controls
  document.getElementById('toggleToneMapping').addEventListener('change', (e) => {
    state.visualSettings.toneMappingEnabled = e.target.checked;
  });

  document.getElementById('toneExposure').addEventListener('input', (e) => {
    state.visualSettings.toneExposure = parseFloat(e.target.value);
    document.getElementById('toneExposureValue').textContent = e.target.value;
  });

  document.getElementById('pixelRatio').addEventListener('input', (e) => {
    state.visualSettings.pixelRatio = parseFloat(e.target.value);
    document.getElementById('pixelRatioValue').textContent = e.target.value;
  });

  // Preset buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      applyVisualPreset(preset);
      updateVisualSettingsUI();
    });
  });

  // Apply button
  document.getElementById('applyVisualSettings').addEventListener('click', () => {
    applyVisualSettings();
    modal.classList.add('hidden');
  });

  // Reset button
  document.getElementById('resetVisualSettings').addEventListener('click', () => {
    applyVisualPreset('default');
    updateVisualSettingsUI();
  });
}

function updateVisualSettingsUI() {
  // Update all UI elements to match current state
  const vs = state.visualSettings;

  document.getElementById('toggleStarfield').checked = vs.starfieldEnabled;
  document.getElementById('starSize').value = vs.starSize;
  document.getElementById('starSizeValue').textContent = vs.starSize;
  document.getElementById('starOpacity').value = vs.starOpacity;
  document.getElementById('starOpacityValue').textContent = Math.round(vs.starOpacity * 100) + '%';
  document.getElementById('starCount').value = vs.starCount;
  document.getElementById('starCountValue').textContent = vs.starCount;

  document.getElementById('ambientIntensity').value = vs.ambientIntensity;
  document.getElementById('ambientIntensityValue').textContent = vs.ambientIntensity;
  document.getElementById('sunIntensity').value = vs.sunIntensity;
  document.getElementById('sunIntensityValue').textContent = vs.sunIntensity;
  document.getElementById('fillIntensity').value = vs.fillIntensity;
  document.getElementById('fillIntensityValue').textContent = vs.fillIntensity;
  document.getElementById('pointIntensity').value = vs.pointIntensity;
  document.getElementById('pointIntensityValue').textContent = vs.pointIntensity;

  document.getElementById('toggleTexture').checked = vs.textureEnabled;
  document.getElementById('surfaceRoughness').value = vs.surfaceRoughness;
  document.getElementById('surfaceRoughnessValue').textContent = vs.surfaceRoughness;
  document.getElementById('baseBrightness').value = vs.baseBrightness;
  document.getElementById('baseBrightnessValue').textContent = vs.baseBrightness;
  document.getElementById('elevationIntensity').value = vs.elevationIntensity;
  document.getElementById('elevationIntensityValue').textContent = vs.elevationIntensity;

  document.getElementById('toggleToneMapping').checked = vs.toneMappingEnabled;
  document.getElementById('toneExposure').value = vs.toneExposure;
  document.getElementById('toneExposureValue').textContent = vs.toneExposure;
  document.getElementById('pixelRatio').value = vs.pixelRatio;
  document.getElementById('pixelRatioValue').textContent = vs.pixelRatio;
}

function applyVisualPreset(preset) {
  const vs = state.visualSettings;

  if (preset === 'realistic') {
    // Photorealistic preset
    vs.starfieldEnabled = true;
    vs.starSize = 1.5;
    vs.starOpacity = 0.8;
    vs.starCount = 12000;
    vs.ambientIntensity = 0.15;
    vs.sunIntensity = 2.5;
    vs.fillIntensity = 0.1;
    vs.pointIntensity = 0.2;
    vs.textureEnabled = true;
    vs.surfaceRoughness = 0.98;
    vs.baseBrightness = 180;
    vs.elevationIntensity = 1.2;
    vs.toneMappingEnabled = true;
    vs.toneExposure = 1.5;
    vs.pixelRatio = 2.0;
  } else if (preset === 'bright') {
    // Bright, clear viewing preset
    vs.starfieldEnabled = true;
    vs.starSize = 2.0;
    vs.starOpacity = 0.6;
    vs.starCount = 5000;
    vs.ambientIntensity = 0.6;
    vs.sunIntensity = 2.0;
    vs.fillIntensity = 0.5;
    vs.pointIntensity = 0.8;
    vs.textureEnabled = true;
    vs.surfaceRoughness = 0.9;
    vs.baseBrightness = 230;
    vs.elevationIntensity = 0.8;
    vs.toneMappingEnabled = true;
    vs.toneExposure = 1.0;
    vs.pixelRatio = 2.0;
  } else if (preset === 'space') {
    // Deep space, dramatic preset
    vs.starfieldEnabled = true;
    vs.starSize = 3.0;
    vs.starOpacity = 1.0;
    vs.starCount = 15000;
    vs.ambientIntensity = 0.05;
    vs.sunIntensity = 3.0;
    vs.fillIntensity = 0.05;
    vs.pointIntensity = 0.1;
    vs.textureEnabled = true;
    vs.surfaceRoughness = 0.95;
    vs.baseBrightness = 150;
    vs.elevationIntensity = 1.5;
    vs.toneMappingEnabled = true;
    vs.toneExposure = 1.8;
    vs.pixelRatio = 2.0;
  } else {
    // Default preset
    vs.starfieldEnabled = true;
    vs.starSize = 2.5;
    vs.starOpacity = 1.0;
    vs.starCount = 8000;
    vs.ambientIntensity = 0.4;
    vs.sunIntensity = 1.8;
    vs.fillIntensity = 0.3;
    vs.pointIntensity = 0.5;
    vs.textureEnabled = true;
    vs.surfaceRoughness = 0.95;
    vs.baseBrightness = 204;
    vs.elevationIntensity = 1.0;
    vs.toneMappingEnabled = true;
    vs.toneExposure = 1.2;
    vs.pixelRatio = 2.0;
  }
}

function applyVisualSettings() {
  const vs = state.visualSettings;

  // Apply starfield settings
  if (starfield && starfieldMaterial) {
    starfield.visible = vs.starfieldEnabled;
    starfieldMaterial.size = vs.starSize;
    starfieldMaterial.opacity = vs.starOpacity;
    starfieldMaterial.needsUpdate = true;

    // If star count changed, recreate starfield
    const currentStarCount = starfield.geometry.attributes.position.count;
    if (currentStarCount !== vs.starCount) {
      scene.remove(starfield);
      createStarfield();
    }
  }

  // Apply lighting settings
  if (ambientLight) ambientLight.intensity = vs.ambientIntensity;
  if (sunLight) sunLight.intensity = vs.sunIntensity;
  if (fillLight) fillLight.intensity = vs.fillIntensity;
  if (pointLight) pointLight.intensity = vs.pointIntensity;

  // Apply surface settings
  if (terrainMaterial) {
    terrainMaterial.roughness = vs.surfaceRoughness;
    terrainMaterial.color.setRGB(
      vs.baseBrightness / 255,
      vs.baseBrightness / 255,
      vs.baseBrightness / 255
    );

    // Toggle texture
    if (vs.textureEnabled && !terrainMaterial.map) {
      // Reload texture
      const textureLoader = new THREE.TextureLoader();
      terrainMaterial.map = textureLoader.load(
        'https://cdn.jsdelivr.net/gh/mrdoob/three.js@dev/examples/textures/planets/moon_1024.jpg',
        (texture) => {
          texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
          terrainMaterial.needsUpdate = true;
        }
      );
    } else if (!vs.textureEnabled) {
      terrainMaterial.map = null;
    }

    terrainMaterial.needsUpdate = true;
  }

  // Apply renderer settings
  if (renderer) {
    renderer.toneMapping = vs.toneMappingEnabled ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
    renderer.toneMappingExposure = vs.toneExposure;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, vs.pixelRatio));
  }

  console.log('✓ Visual settings applied');
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
