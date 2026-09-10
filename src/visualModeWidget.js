import * as Cesium from 'cesium';

export function initVisualModeWidget(viewer, mapStackController) {
  const widget = document.getElementById('visual-mode-widget');
  if (!widget) return;

  const btn3d = document.getElementById('vm-btn-3d');
  const btn2d = document.getElementById('vm-btn-2d');
  const btnMap = document.getElementById('vm-btn-map');
  const btnSat = document.getElementById('vm-btn-sat');

  // Ensure mapStackController initially sets the correct state
  if (mapStackController) {
    const activeStackId = mapStackController.getActiveId();
    if (activeStackId === 'osm') {
      btnMap.classList.add('active');
      btnSat.classList.remove('active');
    } else {
      btnSat.classList.add('active');
      btnMap.classList.remove('active');
    }
    
    // Subscribe to map stack changes to keep the UI in sync
    const originalEmitChange = mapStackController._emitChange;
    mapStackController._emitChange = function(status) {
      if (originalEmitChange) originalEmitChange.call(this, status);
      
      const currentStackId = this.getActiveId();
      if (currentStackId === 'osm') {
        btnMap.classList.add('active');
        btnSat.classList.remove('active');
      } else {
        btnSat.classList.add('active');
        btnMap.classList.remove('active');
      }
    };
  }

  // --- View Mode Toggles (3D / 2D) ---
  btn3d.addEventListener('click', () => {
    if (btn3d.classList.contains('active')) return;
    
    btn3d.classList.add('active');
    btn2d.classList.remove('active');
    
    // Transition to 3D
    viewer.scene.morphTo3D(1.5);
  });

  btn2d.addEventListener('click', () => {
    if (btn2d.classList.contains('active')) return;
    
    btn2d.classList.add('active');
    btn3d.classList.remove('active');
    
    // Transition to 2D
    viewer.scene.morphTo2D(1.5);
    
    // If SAT is active, but we're moving to 2D, Google 3D Tiles won't work. 
    // mapStackController can handle it, or we just rely on Bing Aerial fallback
    if (btnSat.classList.contains('active') && mapStackController.getActiveId() === 'photoreal') {
      // Force switch to bing-aerial if we are entering 2D and currently using Google 3D Tiles
      if (mapStackController.isStackAvailable('bing-aerial')) {
        mapStackController.setStack('bing-aerial');
      } else {
        // Fallback to OSM map if no Bing Aerial available for 2D mode
        mapStackController.setStack('osm');
      }
    }
  });

  // --- Imagery Toggles (MAP / SAT) ---
  btnMap.addEventListener('click', () => {
    if (btnMap.classList.contains('active')) return;
    
    btnMap.classList.add('active');
    btnSat.classList.remove('active');
    
    if (mapStackController) {
      mapStackController.setStack('osm');
    }
  });

  btnSat.addEventListener('click', () => {
    if (btnSat.classList.contains('active')) return;
    
    btnSat.classList.add('active');
    btnMap.classList.remove('active');
    
    if (mapStackController) {
      // Determine what satellite provider to use
      const is3D = btn3d.classList.contains('active');
      
      if (is3D && mapStackController.isStackAvailable('photoreal')) {
        mapStackController.setStack('photoreal');
      } else if (mapStackController.isStackAvailable('bing-aerial')) {
        mapStackController.setStack('bing-aerial');
      } else if (mapStackController.isStackAvailable('photoreal')) {
         // If we are in 2D but only have photoreal, switch to 3D and use photoreal
         btn3d.click();
         mapStackController.setStack('photoreal');
      }
    }
  });
}
