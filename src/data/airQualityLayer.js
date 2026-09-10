import * as Cesium from 'cesium';

const OPENAQ_API_URL = '/api/openaq';

function getAqiColor(pm25) {
  if (pm25 <= 12.0) return Cesium.Color.fromCssColorString('#00e400').withAlpha(0.8); // Good
  if (pm25 <= 35.4) return Cesium.Color.fromCssColorString('#ffff00').withAlpha(0.8); // Moderate
  if (pm25 <= 55.4) return Cesium.Color.fromCssColorString('#ff7e00').withAlpha(0.8); // Unhealthy for Sensitive Groups
  if (pm25 <= 150.4) return Cesium.Color.fromCssColorString('#ff0000').withAlpha(0.8); // Unhealthy
  if (pm25 <= 250.4) return Cesium.Color.fromCssColorString('#8f3f97').withAlpha(0.8); // Very Unhealthy
  return Cesium.Color.fromCssColorString('#7e0023').withAlpha(0.8); // Hazardous
}

export default {
  id: 'layer-openaq',
  name: 'Air Quality (OpenAQ)',
  icon: '☁️',
  source: 'OpenAQ',
  
  _viewer: null,
  _enabled: false,
  _points: null,
  _labels: null,
  _lastUpdate: null,
  
  async init(viewer, { signal }) {
    this._viewer = viewer;
    if (!this._points) {
      this._points = viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());
      this._labels = viewer.scene.primitives.add(new Cesium.LabelCollection());
      this._points.show = false;
      this._labels.show = false;
    }
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
      const res = await fetch(OPENAQ_API_URL);
      if (!res.ok) throw new Error('Failed to fetch OpenAQ data');
      const payload = await res.json();
      
      const locations = payload.results || [];
      for (const loc of locations) {
        if (!loc.coordinates || typeof loc.coordinates.latitude !== 'number' || typeof loc.coordinates.longitude !== 'number') continue;
        
        let pm25 = null;
        let paramName = 'N/A';
        
        if (Array.isArray(loc.parameters)) {
          const pm25Param = loc.parameters.find(p => p.parameter === 'pm25' || p.parameter === 'pm10');
          if (pm25Param) {
            pm25 = pm25Param.lastValue;
            paramName = pm25Param.parameter.toUpperCase();
          } else if (loc.parameters.length > 0) {
            pm25 = loc.parameters[0].lastValue;
            paramName = loc.parameters[0].parameter.toUpperCase();
          }
        }
        
        if (pm25 === null) continue;
        
        const position = Cesium.Cartesian3.fromDegrees(loc.coordinates.longitude, loc.coordinates.latitude, 5000);
        const color = getAqiColor(pm25);
        
        this._points.add({
          position,
          color,
          pixelSize: 12,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 1
        });
        
        this._labels.add({
          position,
          text: `${Math.round(pm25)} ${paramName}`,
          font: '14px sans-serif',
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -10),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3000000)
        });
      }
      this._lastUpdate = Date.now();
    } catch (err) {
      console.warn('[AirQualityLayer] Data load failed:', err);
    }
  }
};
