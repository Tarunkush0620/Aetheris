/**
 * gdeltHeatmap.js — 🗞️ NEWS HEATMAP layer
 * Uses GDELT GEO API to show where the world's news attention is focused.
 * Dense clusters of articles = brighter glow on the globe.
 */
import * as Cesium from 'cesium';
import { GDELT_GEO_API, GDELT_REFRESH_INTERVAL, gdeltFetch, injectGdeltModalStyles } from './gdeltShared.js';

function heatIcon(intensity) {
  // intensity 0-1 controls opacity and size
  const alpha = 0.2 + intensity * 0.6;
  const svg = `<svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="11" fill="#f39c12" opacity="${alpha * 0.4}"/>
    <circle cx="12" cy="12" r="7" fill="#f39c12" opacity="${alpha * 0.7}"/>
    <circle cx="12" cy="12" r="3" fill="#f39c12" opacity="${alpha}"/>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

let _viewer = null;
let _dataSource = null;
let _enabled = false;

const gdeltHeatmapLayer = {
  id: 'gdelt-heatmap',
  name: 'NEWS HEATMAP',
  icon: '🗞️',
  source: 'GDELT Project',
  updateInterval: GDELT_REFRESH_INTERVAL,

  init() { injectGdeltModalStyles(); },

  async enable(viewer, { signal } = {}) {
    _viewer = viewer;
    _enabled = true;
    _dataSource = new Cesium.CustomDataSource('gdelt-heatmap');
    viewer.dataSources.add(_dataSource);
    await this.fetchAndRender(signal);
  },

  async update(viewer, { signal } = {}) {
    if (_enabled) await this.fetchAndRender(signal);
  },

  disable() {
    _enabled = false;
    if (_viewer && _dataSource) { _viewer.dataSources.remove(_dataSource); _dataSource = null; }
  },

  destroy() {},
  setParams() {},

  async fetchAndRender(signal) {
    try {
      const data = await gdeltFetch(
        `${GDELT_GEO_API}?query=news&format=geojson`,
        { signal }
      );

      if (_dataSource) _dataSource.entities.removeAll();

      if (data && data.features) {
        // Count events per ~5-degree grid cell to compute density
        const grid = {};
        data.features.forEach(f => {
          if (!f.geometry || !f.geometry.coordinates) return;
          const [lng, lat] = f.geometry.coordinates;
          const key = `${Math.round(lat / 5) * 5},${Math.round(lng / 5) * 5}`;
          if (!grid[key]) grid[key] = { lat: Math.round(lat / 5) * 5, lng: Math.round(lng / 5) * 5, count: 0 };
          grid[key].count++;
        });

        const maxCount = Math.max(...Object.values(grid).map(g => g.count), 1);

        Object.values(grid).forEach(cell => {
          const intensity = cell.count / maxCount;
          _dataSource.entities.add({
            position: Cesium.Cartesian3.fromDegrees(cell.lng, cell.lat),
            billboard: {
              image: heatIcon(intensity),
              verticalOrigin: Cesium.VerticalOrigin.CENTER,
              scale: 1 + intensity * 2,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });
        });
      } else {
        // Fallback heatmap
        const hotspots = [
          { lat: 40, lng: -75, count: 0.9 }, { lat: 51, lng: 0, count: 0.85 },
          { lat: 35, lng: 140, count: 0.7 }, { lat: 20, lng: 78, count: 0.8 },
          { lat: -34, lng: 151, count: 0.5 }, { lat: 48, lng: 2, count: 0.75 },
          { lat: 55, lng: 37, count: 0.6 }, { lat: -23, lng: -46, count: 0.55 },
          { lat: 25, lng: 55, count: 0.65 }, { lat: 1, lng: 104, count: 0.45 },
        ];
        hotspots.forEach(h => {
          _dataSource.entities.add({
            position: Cesium.Cartesian3.fromDegrees(h.lng, h.lat),
            billboard: {
              image: heatIcon(h.count),
              verticalOrigin: Cesium.VerticalOrigin.CENTER,
              scale: 1 + h.count * 2,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });
        });
      }
    } catch (err) {
      console.warn('[NEWS HEATMAP] Error:', err.message);
    }
  },
};

export default gdeltHeatmapLayer;
