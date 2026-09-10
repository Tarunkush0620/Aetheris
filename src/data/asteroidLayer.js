import * as Cesium from 'cesium';

const NEO_API_URL = '/api/neo';

export default {
  id: 'layer-asteroids',
  name: 'Asteroids (NEO)',
  icon: '☄️',
  source: 'NASA JPL',
  
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
    try {
      const res = await fetch(NEO_API_URL);
      if (!res.ok) throw new Error(`NEO API failed: ${res.status}`);
      const data = await res.json();
      
      const neos = data.near_earth_objects;
      if (!neos) return;
      
      let count = 0;
      for (const dateKey of Object.keys(neos)) {
        for (const neo of neos[dateKey]) {
           const approachData = neo.close_approach_data[0];
           if (!approachData) continue;
           
           const distanceKm = parseFloat(approachData.miss_distance?.kilometers) || 500000;
           const isHazardous = neo.is_potentially_hazardous_asteroid;
           const maxDia = neo.estimated_diameter?.meters?.estimated_diameter_max || 100;
           
           // Clamp altitude for visual purposes: 500,000m to 100,000,000m
           const altMeters = Math.min(Math.max(distanceKm * 10, 500000), 100000000); 
           
           // Generate a pseudo-random orbital position based on ID so it's deterministic
           const seed = parseInt(neo.id, 10) || Math.random() * 1000;
           const lat = ((seed * 9301 + 49297) % 233280) / 233280 * 180 - 90;
           const lon = ((seed * 3921 + 29312) % 233280) / 233280 * 360 - 180;
           
           const position = Cesium.Cartesian3.fromDegrees(lon, lat, altMeters);
           
           this._points.add({
             position,
             pixelSize: Math.max(8, Math.min(25, maxDia / 30)),
             color: isHazardous ? Cesium.Color.RED : Cesium.Color.GRAY,
             outlineColor: Cesium.Color.BLACK,
             outlineWidth: 2,
             disableDepthTestDistance: Number.POSITIVE_INFINITY
           });
           
           this._labels.add({
             position,
             text: `${neo.name}\n${Math.round(distanceKm).toLocaleString()} km`,
             font: '14px sans-serif',
             fillColor: Cesium.Color.WHITE,
             outlineColor: Cesium.Color.BLACK,
             outlineWidth: 2,
             style: Cesium.LabelStyle.FILL_AND_OUTLINE,
             pixelOffset: new Cesium.Cartesian2(0, 20),
             horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
             verticalOrigin: Cesium.VerticalOrigin.TOP,
             distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, Number.MAX_VALUE),
             disableDepthTestDistance: Number.POSITIVE_INFINITY
           });
           count++;
        }
      }
      this._lastUpdate = Date.now();
      console.log(`Loaded ${count} near earth objects.`);
    } catch(err) {
      console.error('[asteroidLayer] failed to load NEO data:', err);
    }
  }
};
