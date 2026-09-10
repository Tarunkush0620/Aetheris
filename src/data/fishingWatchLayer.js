import * as Cesium from 'cesium';

const FISHING_API_URL = '/api/fishing';

export default {
  id: 'fishing-watch',
  name: 'Global Fishing Watch',
  icon: '⚓',
  source: 'GFW / Dark Fleet',
  
  _viewer: null,
  _enabled: false,
  _points: null,
  _labels: null,
  _lastUpdate: null,
  
  init(viewer) {
    this._viewer = viewer;
    
    this._points = new Cesium.PointPrimitiveCollection();
    this._labels = new Cesium.LabelCollection();
    
    this._points.show = false;
    this._labels.show = false;
    
    viewer.scene.primitives.add(this._points);
    viewer.scene.primitives.add(this._labels);
  },
  
  isSupported() {
    return true;
  },
  
  async enable(viewer) {
    this._enabled = true;
    if (this._points) {
      this._points.show = true;
      this._labels.show = true;
    }
    await this._loadData();
  },
  
  disable() {
    this._enabled = false;
    if (this._points) {
      this._points.show = false;
      this._labels.show = false;
    }
  },
  
  async update() {
    // No-op for now
  },
  
  getStats() {
    return {
      count: this._points ? this._points.length : 0,
      lastUpdate: this._lastUpdate
    };
  },
  
  async _loadData() {
    if (this._points.length > 0) return; // already loaded
    
    try {
      const res = await fetch(FISHING_API_URL);
      if (!res.ok) throw new Error('Failed to fetch Global Fishing Watch data');
      const payload = await res.json();
      
      const vessels = payload.vessels || [];
      for (const vessel of vessels) {
        if (!vessel.coordinates || typeof vessel.coordinates.latitude !== 'number' || typeof vessel.coordinates.longitude !== 'number') continue;
        
        const position = Cesium.Cartesian3.fromDegrees(vessel.coordinates.longitude, vessel.coordinates.latitude, 0);
        
        // Dark Fleet (Spoofed/Disabled AIS) renders as pulsing red. Normal fishing vessels are light blue.
        const isDark = vessel.isDarkFleet;
        const color = isDark ? Cesium.Color.RED : Cesium.Color.CYAN;
        const labelText = isDark ? 'DARK FLEET' : `F/V [${vessel.flag}]`;
        
        this._points.add({
          position,
          color: color.withAlpha(isDark ? 0.9 : 0.6),
          pixelSize: isDark ? 8 : 4,
          outlineColor: isDark ? Cesium.Color.DARKRED : Cesium.Color.BLACK,
          outlineWidth: 1
        });
        
        if (isDark || Math.random() > 0.8) {
          this._labels.add({
            position,
            text: labelText,
            font: isDark ? 'bold 12px sans-serif' : '10px sans-serif',
            fillColor: isDark ? Cesium.Color.RED : Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            pixelOffset: new Cesium.Cartesian2(0, -10),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, isDark ? 8000000 : 3000000)
          });
        }
      }
      this._lastUpdate = Date.now();
    } catch (err) {
      console.warn('[FishingWatchLayer] Data load failed:', err);
    }
  }
};
