import * as Cesium from 'cesium';

// We use NASA GIBS (Global Imagery Browse Services) via public WMTS
// since it requires no authentication for these base layers.
// We are pulling the VIIRS "Black Marble" (Earth at Night) layer.

export default {
  id: 'earthdata-night',
  name: 'Earth at Night (NASA)',
  icon: '🌍',
  source: 'NASA Earthdata',
  
  _viewer: null,
  _enabled: false,
  _imageryLayer: null,
  _lastUpdate: null,
  
  init(viewer) {
    this._viewer = viewer;
  },
  
  isSupported() {
    return true;
  },
  
  async enable(viewer) {
    this._enabled = true;
    
    if (!this._imageryLayer) {
      const provider = new Cesium.WebMapTileServiceImageryProvider({
        url: 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/VIIRS_Black_Marble/default/2016-01-01/250m/{TileMatrix}/{TileRow}/{TileCol}.png',
        layer: 'VIIRS_Black_Marble',
        style: 'default',
        format: 'image/png',
        tileMatrixSetID: '250m',
        maximumLevel: 8,
        credit: 'NASA Global Imagery Browse Services for EOSDIS'
      });
      
      this._imageryLayer = viewer.imageryLayers.addImageryProvider(provider);
      // Make it slightly transparent so it blends with the Google 3D Tiles beneath it
      this._imageryLayer.alpha = 0.85; 
    }
    this._imageryLayer.show = true;
    this._lastUpdate = Date.now();
  },
  
  disable() {
    this._enabled = false;
    if (this._imageryLayer) {
      this._imageryLayer.show = false;
    }
  },
  
  async update() {
    // No-op for static WMTS layers
  },
  
  getStats() {
    return {
      lastUpdate: this._lastUpdate
    };
  }
};
