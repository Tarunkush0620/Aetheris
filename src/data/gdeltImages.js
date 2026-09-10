/**
 * gdeltImages.js — 🖼️ NEWS IMAGERY layer
 * Uses GDELT GEO API to surface news events with thumbnail-like markers.
 * Click to see the headline and navigate to the source article.
 */
import * as Cesium from 'cesium';
import { GDELT_GEO_API, GDELT_REFRESH_INTERVAL, gdeltIcon, gdeltFetch, openGdeltModal, closeGdeltModal, injectGdeltModalStyles } from './gdeltShared.js';

let _viewer = null;
let _dataSource = null;
let _clickHandler = null;
let _enabled = false;

const gdeltImagesLayer = {
  id: 'gdelt-images',
  name: 'NEWS IMAGERY',
  icon: '🖼️',
  source: 'GDELT Project',
  updateInterval: GDELT_REFRESH_INTERVAL,

  init() { injectGdeltModalStyles(); },

  async enable(viewer, { signal } = {}) {
    _viewer = viewer;
    _enabled = true;
    _dataSource = new Cesium.CustomDataSource('gdelt-images');
    viewer.dataSources.add(_dataSource);

    _clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    _clickHandler.setInputAction((click) => {
      if (!_enabled) return;
      const picked = viewer.scene.pick(click.position);
      if (Cesium.defined(picked) && picked.id && picked.id._gdeltImage) {
        const d = picked.id._gdeltImage;
        openGdeltModal('🖼️ News Image', `
          ${d.imageUrl ? `<img class="gdelt-img-thumb" src="${d.imageUrl}" alt="News image" onerror="this.style.display='none'"/>` : ''}
          <div style="font-size:15px;font-weight:600;margin-bottom:8px;">${d.name}</div>
          <div class="gdelt-meta">${d.domain}</div>
          ${d.url ? `<div style="margin-top:8px;"><a href="${d.url}" target="_blank" rel="noopener">View Source →</a></div>` : ''}
        `);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    await this.fetchAndRender(signal);
  },

  async update(viewer, { signal } = {}) {
    if (_enabled) await this.fetchAndRender(signal);
  },

  disable() {
    _enabled = false;
    if (_clickHandler) { _clickHandler.destroy(); _clickHandler = null; }
    if (_viewer && _dataSource) { _viewer.dataSources.remove(_dataSource); _dataSource = null; }
    closeGdeltModal();
  },

  destroy() {},
  setParams() {},

  async fetchAndRender(signal) {
    try {
      const data = await gdeltFetch(
        `${GDELT_GEO_API}?query=world&format=geojson`,
        { signal }
      );

      if (_dataSource) _dataSource.entities.removeAll();

      if (data && data.features) {
        const iconImg = gdeltIcon('#e056fd');
        // Only take first 25 to avoid clutter
        const features = data.features.slice(0, 25);
        features.forEach(f => {
          if (!f.geometry || !f.geometry.coordinates) return;
          const [lng, lat] = f.geometry.coordinates;
          const props = f.properties || {};

          const entity = _dataSource.entities.add({
            position: Cesium.Cartesian3.fromDegrees(lng, lat),
            billboard: {
              image: iconImg,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(0, -4),
            },
            label: {
              text: '🖼️',
              font: '11px sans-serif',
              verticalOrigin: Cesium.VerticalOrigin.TOP,
              pixelOffset: new Cesium.Cartesian2(0, 2),
            },
          });
          entity._gdeltImage = {
            name: props.name || 'News Event',
            url: props.url || '',
            domain: props.domain || 'GDELT',
            imageUrl: props.shareimage || props.socialimage || '',
          };
        });
      } else {
        // Fallback
        const fallback = [
          { name: 'Satellite imagery reveals changes', lat: 34.05, lng: -118.24, domain: 'nasa.gov' },
          { name: 'Historic architecture documented', lat: 41.90, lng: 12.50, domain: 'reuters.com' },
          { name: 'Wildlife migration captured', lat: -2.50, lng: 34.00, domain: 'natgeo.com' },
          { name: 'Urban development tracked', lat: 31.23, lng: 121.47, domain: 'bbc.com' },
        ];
        const iconImg = gdeltIcon('#e056fd');
        fallback.forEach(item => {
          const entity = _dataSource.entities.add({
            position: Cesium.Cartesian3.fromDegrees(item.lng, item.lat),
            billboard: { image: iconImg, verticalOrigin: Cesium.VerticalOrigin.BOTTOM, pixelOffset: new Cesium.Cartesian2(0, -4) },
            label: { text: '🖼️', font: '11px sans-serif', verticalOrigin: Cesium.VerticalOrigin.TOP, pixelOffset: new Cesium.Cartesian2(0, 2) },
          });
          entity._gdeltImage = { name: item.name, url: '#', domain: item.domain, imageUrl: '' };
        });
      }
    } catch (err) {
      console.warn('[NEWS IMAGERY] Error:', err.message);
    }
  },
};

export default gdeltImagesLayer;
