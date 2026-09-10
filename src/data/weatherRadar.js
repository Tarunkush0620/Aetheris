import * as Cesium from 'cesium';

let _viewer = null;
let _enabled = false;
let _imageryLayer = null;
let _lastUpdate = null;
let _loading = false;
let _error = null;
let _lastPath = null;

const weatherRadarLayer = {
  id: 'weather-radar',
  name: 'Weather Radar',
  icon: '⛈️',
  source: 'RainViewer',
  updateInterval: 300000, // Update every 5 minutes

  async init(viewer) {
    _viewer = viewer;
  },

  async enable() {
    if (_enabled) return;
    _enabled = true;
    _loading = true;
    _error = null;
    await this.update();
  },

  async disable() {
    if (!_enabled) return;
    _enabled = false;
    if (_imageryLayer) {
      _viewer.imageryLayers.remove(_imageryLayer);
      _imageryLayer = null;
    }
  },

  async update() {
    if (!_enabled) return;
    _loading = true;
    try {
      const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
      if (!response.ok) throw new Error(`RainViewer HTTP ${response.status}`);
      const data = await response.json();
      
      const latest = data.radar.past[data.radar.past.length - 1];
      if (!latest || latest.path === _lastPath) {
        _loading = false;
        return;
      }
      
      const newProvider = new Cesium.UrlTemplateImageryProvider({
        url: `${data.host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`,
        credit: 'RainViewer'
      });
      
      const newLayer = new Cesium.ImageryLayer(newProvider, { alpha: 0.5 });
      _viewer.imageryLayers.add(newLayer);
      
      if (_imageryLayer) {
        _viewer.imageryLayers.remove(_imageryLayer);
      }
      
      _imageryLayer = newLayer;
      _lastPath = latest.path;
      _lastUpdate = Date.now();
      _error = null;
    } catch (err) {
      console.error('[WeatherRadar] Failed to load:', err);
      _error = err.message || String(err);
    } finally {
      _loading = false;
    }
  },

  async destroy() {
    this.disable();
    _viewer = null;
  },

  getStats() {
    return {
      count: _imageryLayer ? 1 : 0,
      lastUpdate: _lastUpdate,
      loading: _loading,
      error: _error
    };
  }
};

export default weatherRadarLayer;
