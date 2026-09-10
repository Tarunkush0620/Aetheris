import * as Cesium from 'cesium';

let viewerRef = null;
let isDrawing = false;
let startCartographic = null;
let reconHandler = null;
let previewEntity = null;

export function initAiRecon(viewer) {
  viewerRef = viewer;
  
  // Add a UI button for Area Recon
  const topNav = document.getElementById('top-center-actions');
  if (topNav) {
    const reconBtn = document.createElement('button');
    reconBtn.id = 'ai-recon-btn';
    reconBtn.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">view_in_ar</span>';
    reconBtn.title = 'AI Area Recon (Draw Box)';
    
    reconBtn.addEventListener('click', () => {
      toggleReconMode();
    });
    
    topNav.insertBefore(reconBtn, topNav.firstChild);
  }
}

function toggleReconMode() {
  if (isDrawing) {
    cancelRecon();
    return;
  }
  
  isDrawing = true;
  const btn = document.getElementById('ai-recon-btn');
  if (btn) {
    btn.style.color = '#0ff';
    btn.style.boxShadow = '0 0 10px #0ff';
  }
  
  showToast('RECON MODE: Click two points on the map to define the scan area.');
  
  reconHandler = new Cesium.ScreenSpaceEventHandler(viewerRef.scene.canvas);
  
  // First click: set start point
  reconHandler.setInputAction((click) => {
    const cartesian = pickGlobe(click.position);
    if (!cartesian) return;
    
    if (!startCartographic) {
      // First click — mark the start corner
      startCartographic = Cesium.Cartographic.fromCartesian(cartesian);
      showToast('Start point set. Click a second point to define the area.');
    } else {
      // Second click — we have both corners, finalize
      const endCartographic = Cesium.Cartographic.fromCartesian(cartesian);
      finalizeRecon(startCartographic, endCartographic);
    }
    
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

function finalizeRecon(startCarto, endCarto) {
  // Build the rectangle from the two corner points
  const west = Math.min(startCarto.longitude, endCarto.longitude);
  const east = Math.max(startCarto.longitude, endCarto.longitude);
  const south = Math.min(startCarto.latitude, endCarto.latitude);
  const north = Math.max(startCarto.latitude, endCarto.latitude);
  
  // Ensure non-zero area (minimum ~100m)
  const minSpan = 0.001; // ~111m
  const rect = new Cesium.Rectangle(
    west,
    south,
    Math.max(east, west + minSpan),
    Math.max(north, south + minSpan)
  );
  
  // Add a visual rectangle entity to show the selected area
  const boundingEntity = viewerRef.entities.add({
    rectangle: {
      coordinates: rect,
      material: Cesium.Color.CYAN.withAlpha(0.15),
      outline: true,
      outlineColor: Cesium.Color.CYAN,
      height: 0
    }
  });
  
  const minLon = Cesium.Math.toDegrees(rect.west);
  const maxLon = Cesium.Math.toDegrees(rect.east);
  const minLat = Cesium.Math.toDegrees(rect.south);
  const maxLat = Cesium.Math.toDegrees(rect.north);
  
  // Reset drawing state
  resetDrawingState();
  
  // Fire off the reconstruction request
  sendReconRequest(minLat, maxLat, minLon, maxLon, boundingEntity);
}

function resetDrawingState() {
  startCartographic = null;
  if (reconHandler) {
    reconHandler.destroy();
    reconHandler = null;
  }
  isDrawing = false;
  const btn = document.getElementById('ai-recon-btn');
  if (btn) {
    btn.style.color = '';
    btn.style.boxShadow = '';
  }
}

function cancelRecon() {
  resetDrawingState();
  if (previewEntity) {
    viewerRef.entities.remove(previewEntity);
    previewEntity = null;
  }
}

function pickGlobe(position) {
  const ray = viewerRef.camera.getPickRay(position);
  if (!ray) return null;
  return viewerRef.scene.globe.pick(ray, viewerRef.scene);
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = msg;
    toast.classList.add('visible');
  }
}

async function sendReconRequest(minLat, maxLat, minLon, maxLon, boundingEntity) {
  try {
    showToast('Initiating AI 3D Reconstruction...');
    
    const res = await fetch('http://localhost:8000/api/reconstruct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        min_lat: minLat,
        max_lat: maxLat,
        min_lon: minLon,
        max_lon: maxLon,
        resolution: 0.5
      })
    });
    
    const data = await res.json();
    const taskId = data.task_id;
    
    pollTaskStatus(taskId, boundingEntity);
    
  } catch (err) {
    console.error('Failed to initiate recon:', err);
    showToast('Error: Could not connect to reconstruction backend on port 8000.');
    setTimeout(() => {
      const toast = document.getElementById('toast');
      if (toast) toast.classList.remove('visible');
    }, 5000);
  }
}

async function pollTaskStatus(taskId, boundingEntity) {
  const interval = setInterval(async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/status/${taskId}`);
      const data = await res.json();
      
      showToast(`Recon Engine: ${data.message} (${data.progress}%)`);
      
      if (data.status === 'complete') {
        clearInterval(interval);
        
        // Remove the bounding box outline
        if (boundingEntity) {
          viewerRef.entities.remove(boundingEntity);
        }
        
        // Load the generated 3D tileset!
        loadGeneratedTileset(data.tileset_url);
        
        showToast('3D Mesh injected into scene.');
        setTimeout(() => {
          const toast = document.getElementById('toast');
          if (toast) toast.classList.remove('visible');
        }, 3000);
      }
      
    } catch (err) {
      console.error('Polling error:', err);
      clearInterval(interval);
    }
  }, 1500);
}

async function loadGeneratedTileset(url) {
  try {
    const tileset = await Cesium.Cesium3DTileset.fromUrl(url);
    viewerRef.scene.primitives.add(tileset);
    viewerRef.flyTo(tileset);
  } catch (err) {
    console.error('Failed to load generated tileset:', err);
  }
}
