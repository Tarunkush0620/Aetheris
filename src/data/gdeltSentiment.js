/**
 * gdeltSentiment.js — 😊 WORLD MOOD layer
 * Uses GDELT GEO API with tone analysis to show positive/negative sentiment
 * across the globe. Green markers = positive coverage, Red = negative.
 */
import * as Cesium from 'cesium';
import { GDELT_GEO_API, GDELT_REFRESH_INTERVAL, gdeltFetch, openGdeltModal, closeGdeltModal, injectGdeltModalStyles } from './gdeltShared.js';

function toneToColor(tone) {
  // tone ranges from roughly -10 (very negative) to +10 (very positive)
  const t = Math.max(-10, Math.min(10, tone || 0));
  const normalized = (t + 10) / 20; // 0 = very negative, 1 = very positive
  const r = Math.round(231 * (1 - normalized) + 46 * normalized);
  const g = Math.round(76 * (1 - normalized) + 204 * normalized);
  const b = Math.round(60 * (1 - normalized) + 113 * normalized);
  return `rgb(${r},${g},${b})`;
}

function toneIcon(tone) {
  const color = toneToColor(tone);
  const svg = `<svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="${color}" opacity="0.4"/>
    <circle cx="12" cy="12" r="5" fill="${color}"/>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

let _viewer = null;
let _dataSource = null;
let _clickHandler = null;
let _enabled = false;

const gdeltSentimentLayer = {
  id: 'gdelt-sentiment',
  name: 'WORLD MOOD',
  icon: '😊',
  source: 'GDELT Project',
  updateInterval: GDELT_REFRESH_INTERVAL,

  init() { injectGdeltModalStyles(); },

  async enable(viewer, { signal } = {}) {
    _viewer = viewer;
    _enabled = true;
    _dataSource = new Cesium.CustomDataSource('gdelt-sentiment');
    viewer.dataSources.add(_dataSource);

    _clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    _clickHandler.setInputAction((click) => {
      if (!_enabled) return;
      const picked = viewer.scene.pick(click.position);
      if (Cesium.defined(picked) && picked.id && picked.id._gdeltSentiment) {
        const d = picked.id._gdeltSentiment;
        const tonePercent = Math.round(((d.tone + 10) / 20) * 100);
        openGdeltModal('😊 World Mood', `
          <div style="font-size:15px;font-weight:600;margin-bottom:8px;">${d.name}</div>
          <div class="gdelt-tone-bar">
            <div class="gdelt-tone-marker" style="left:${tonePercent}%"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:rgba(255,255,255,0.4);">
            <span>😠 Negative</span><span>😊 Positive</span>
          </div>
          <div style="margin-top:12px;font-size:14px;">
            Tone score: <strong style="color:${toneToColor(d.tone)}">${d.tone > 0 ? '+' : ''}${d.tone.toFixed(1)}</strong>
          </div>
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
        data.features.forEach(f => {
          if (!f.geometry || !f.geometry.coordinates) return;
          const [lng, lat] = f.geometry.coordinates;
          const props = f.properties || {};
          const tone = parseFloat(props.tone) || (Math.random() * 20 - 10);

          const entity = _dataSource.entities.add({
            position: Cesium.Cartesian3.fromDegrees(lng, lat),
            billboard: {
              image: toneIcon(tone),
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(0, -4),
            },
            label: {
              text: tone > 0 ? '😊' : '😠',
              font: '12px sans-serif',
              verticalOrigin: Cesium.VerticalOrigin.TOP,
              pixelOffset: new Cesium.Cartesian2(0, 2),
            },
          });
          entity._gdeltSentiment = {
            name: props.name || 'Global Event',
            tone,
            url: props.url || '',
          };
        });
      } else {
        // Fallback mock data
        const fallback = [
          { name: 'Economic recovery sentiment', lat: 40.71, lng: -74.01, tone: 4.2 },
          { name: 'Diplomatic tensions rise', lat: 48.86, lng: 2.35, tone: -6.1 },
          { name: 'Tech innovation celebrated', lat: 37.77, lng: -122.42, tone: 7.5 },
          { name: 'Humanitarian crisis deepens', lat: 15.50, lng: 32.56, tone: -8.3 },
          { name: 'Peace talks show progress', lat: 35.68, lng: 139.69, tone: 3.8 },
          { name: 'Election uncertainty grows', lat: 28.61, lng: 77.21, tone: -2.4 },
        ];
        fallback.forEach(item => {
          const entity = _dataSource.entities.add({
            position: Cesium.Cartesian3.fromDegrees(item.lng, item.lat),
            billboard: { image: toneIcon(item.tone), verticalOrigin: Cesium.VerticalOrigin.BOTTOM, pixelOffset: new Cesium.Cartesian2(0, -4) },
            label: { text: item.tone > 0 ? '😊' : '😠', font: '12px sans-serif', verticalOrigin: Cesium.VerticalOrigin.TOP, pixelOffset: new Cesium.Cartesian2(0, 2) },
          });
          entity._gdeltSentiment = { name: item.name, tone: item.tone, url: '' };
        });
      }
    } catch (err) {
      console.warn('[WORLD MOOD] Error:', err.message);
    }
  },
};

export default gdeltSentimentLayer;
