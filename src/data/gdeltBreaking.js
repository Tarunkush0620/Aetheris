/**
 * gdeltBreaking.js — 📌 BREAKING NEWS layer
 * Uses GDELT DOC API (mode=artlist) to fetch the latest breaking news articles
 * and pin them to their geographic locations on the globe.
 */
import * as Cesium from 'cesium';
import { GDELT_DOC_API, GDELT_REFRESH_INTERVAL, gdeltIcon, gdeltFetch, openGdeltModal, closeGdeltModal, injectGdeltModalStyles } from './gdeltShared.js';

let _viewer = null;
let _dataSource = null;
let _clickHandler = null;
let _enabled = false;

const gdeltBreakingLayer = {
  id: 'gdelt-breaking',
  name: 'BREAKING NEWS',
  icon: '📌',
  source: 'GDELT Project',
  updateInterval: GDELT_REFRESH_INTERVAL,

  init() { injectGdeltModalStyles(); },

  async enable(viewer, { signal } = {}) {
    _viewer = viewer;
    _enabled = true;
    _dataSource = new Cesium.CustomDataSource('gdelt-breaking');
    viewer.dataSources.add(_dataSource);

    _clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    _clickHandler.setInputAction((click) => {
      if (!_enabled) return;
      const picked = viewer.scene.pick(click.position);
      if (Cesium.defined(picked) && picked.id && picked.id._gdeltBreaking) {
        const d = picked.id._gdeltBreaking;
        openGdeltModal('📌 Breaking News', `
          <div style="font-size:15px;font-weight:600;margin-bottom:8px;">${d.title}</div>
          <div class="gdelt-meta">${d.domain} · ${d.date}</div>
          <div style="margin-top:12px;">
            <a href="${d.url}" target="_blank" rel="noopener">Read Full Article →</a>
          </div>
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
      // Try the GEO API first since it gives us coordinates directly
      const geoData = await gdeltFetch(
        `${GDELT_DOC_API}?query=breaking&mode=artgeo&format=geojson&maxrecords=30`,
        { signal }
      );

      if (_dataSource) _dataSource.entities.removeAll();

      if (geoData && geoData.features) {
        const iconImg = gdeltIcon('#e74c3c');
        geoData.features.forEach(f => {
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
              text: (props.name || 'News').substring(0, 30),
              font: 'bold 9px sans-serif',
              fillColor: Cesium.Color.WHITE,
              style: Cesium.LabelStyle.FILL,
              verticalOrigin: Cesium.VerticalOrigin.TOP,
              pixelOffset: new Cesium.Cartesian2(0, 2),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });
          entity._gdeltBreaking = {
            title: props.name || 'Breaking News',
            url: props.url || '#',
            domain: props.domain || 'GDELT',
            date: props.seendate || 'Recent',
          };
        });
      } else {
        console.warn('[BREAKING NEWS] GDELT API unavailable, showing fallback data');
        // Fallback mock breaking news
        const fallbackData = [
          { title: 'Major international summit convenes', lat: 48.8566, lng: 2.3522, domain: 'reuters.com' },
          { title: 'Technology breakthrough announced', lat: 37.7749, lng: -122.4194, domain: 'techcrunch.com' },
          { title: 'Climate agreement reached in talks', lat: 51.5074, lng: -0.1278, domain: 'bbc.com' },
          { title: 'Markets react to economic data', lat: 40.7128, lng: -74.0060, domain: 'wsj.com' },
          { title: 'Regional elections draw attention', lat: 28.6139, lng: 77.2090, domain: 'ndtv.com' },
        ];
        const iconImg = gdeltIcon('#e74c3c');
        fallbackData.forEach(item => {
          const entity = _dataSource.entities.add({
            position: Cesium.Cartesian3.fromDegrees(item.lng, item.lat),
            billboard: { image: iconImg, verticalOrigin: Cesium.VerticalOrigin.BOTTOM, pixelOffset: new Cesium.Cartesian2(0, -4) },
            label: { text: item.title.substring(0, 30), font: 'bold 9px sans-serif', fillColor: Cesium.Color.WHITE, style: Cesium.LabelStyle.FILL, verticalOrigin: Cesium.VerticalOrigin.TOP, pixelOffset: new Cesium.Cartesian2(0, 2) },
          });
          entity._gdeltBreaking = { title: item.title, url: '#', domain: item.domain, date: new Date().toISOString() };
        });
      }
    } catch (err) {
      console.warn('[BREAKING NEWS] Error:', err.message);
    }
  },
};

export default gdeltBreakingLayer;
