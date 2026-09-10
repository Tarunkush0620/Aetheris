import * as Cesium from 'cesium';
import { twoline2satrec, propagate, gstime, eciToGeodetic, degreesLong, degreesLat } from 'satellite.js';
import { fetchSpaceTrackGp, ommJsonToTleLines } from './spaceShared.js';
import { registerPickOwner, unregisterPickOwner } from './pickRegistry.js';
import { holdContinuousRender } from '../renderGovernor.js';

let _viewer = null;
let _pointCollection = null;
let _catalog = new Map();
let _preRenderListener = null;
let _lastError = null;
let _clickHandler = null;
let _tooltip = null;

const POINT_STYLE = {
  pixelSize: 4,
  color: Cesium.Color.fromCssColorString('#4fd8ff').withAlpha(0.8),
  outlineColor: Cesium.Color.fromCssColorString('#0a0f1a'),
  outlineWidth: 1,
};

function _ensureTooltip() {
  if (_tooltip) return;
  _tooltip = document.createElement('div');
  _tooltip.id = 'space-track-tooltip';
  Object.assign(_tooltip.style, {
    position: 'fixed',
    display: 'none',
    background: 'rgba(10, 15, 26, 0.95)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(79, 216, 255, 0.4)',
    borderRadius: '6px',
    padding: '12px 16px',
    color: '#fff',
    fontFamily: 'var(--font-mono, monospace)',
    fontSize: '11px',
    zIndex: '9999',
    pointerEvents: 'none',
    maxWidth: '320px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
    letterSpacing: '0.5px',
  });
  document.body.appendChild(_tooltip);
}

function _showTooltip(x, y, info) {
  _ensureTooltip();
  const metaHtml = (info.meta || []).map(m =>
    `<div style="display:flex;justify-content:space-between;gap:16px;margin-top:4px;">
       <span style="color:rgba(255,255,255,0.5)">${m.label}</span>
       <span style="color:#4fd8ff">${m.value}</span>
     </div>`
  ).join('');
  _tooltip.innerHTML = `
    <div style="color:#4fd8ff;font-weight:700;font-size:13px;margin-bottom:2px">${info.title}</div>
    <div style="color:rgba(255,255,255,0.5);font-size:10px;margin-bottom:8px">${info.subtitle}</div>
    ${metaHtml}
  `;
  _tooltip.style.display = 'block';
  _tooltip.style.left = `${Math.min(x + 16, window.innerWidth - 340)}px`;
  _tooltip.style.top = `${Math.min(y + 16, window.innerHeight - 200)}px`;
  setTimeout(() => { if (_tooltip) _tooltip.style.display = 'none'; }, 5000);
}

export default {
  id: 'space-track',
  name: 'SPACE-TRACK',
  icon: '🛰️',
  source: 'US Space Command',

  init(viewer) {
    _viewer = viewer;
  },

  getState() {
    return {
      title: 'SPACE-TRACK',
      icon: 'public',
      details: _catalog.size > 0 
        ? `${_catalog.size.toLocaleString()} OBJECTS` 
        : (_lastError ? _lastError : 'WAITING'),
      accent: 'var(--blue)',
      isOffline: _lastError !== null
    };
  },

  getStats() {
    return { count: _catalog.size };
  },

  disable() {
    if (_pointCollection) {
      _viewer.scene.primitives.remove(_pointCollection);
      _pointCollection = null;
    }
    if (_preRenderListener) {
      _preRenderListener();
      _preRenderListener = null;
    }
    if (_clickHandler) {
      _clickHandler.destroy();
      _clickHandler = null;
    }
    if (_tooltip) {
      _tooltip.style.display = 'none';
    }
    _catalog.clear();
    unregisterPickOwner('space-track');
  },

  async enable(viewer, { signal = null } = {}) {
    // Setup is done in update
    return true;
  },

  async update(viewer, { signal = null } = {}) {
    _lastError = null;
    try {
      const data = await fetchSpaceTrackGp('class/gp/decay_date/null-val/orderby/NORAD_CAT_ID/limit/3000/format/json', { signal });
      if (!data || data.length === 0) throw new Error('Empty catalog');

      if (_pointCollection) {
        viewer.scene.primitives.remove(_pointCollection);
      }
      _catalog.clear();

      _pointCollection = new Cesium.PointPrimitiveCollection();
      viewer.scene.primitives.add(_pointCollection);

      for (const omm of data) {
        const lines = ommJsonToTleLines(omm);
        if (!lines) continue;
        const noradId = parseInt(omm.NORAD_CAT_ID, 10);
        try {
          const satrec = twoline2satrec(lines[0], lines[1]);
          const point = _pointCollection.add({
            position: Cesium.Cartesian3.ZERO,
            ...POINT_STYLE,
            show: false,
            id: { layer: 'space-track', noradId, name: omm.OBJECT_NAME }
          });
          _catalog.set(noradId, { omm, satrec, point });
        } catch (e) {
          // ignore propagation init errors
        }
      }

      if (!_preRenderListener) {
        _preRenderListener = viewer.scene.preRender.addEventListener(() => {
          const now = viewer.clock.currentTime;
          const jsDate = Cesium.JulianDate.toDate(now);
          const gmst = gstime(jsDate);
          
          let updated = false;
          for (const [id, sat] of _catalog) {
            const positionAndVelocity = propagate(sat.satrec, jsDate);
            const p = positionAndVelocity.position;
            if (p && typeof p === 'object') {
              const geodetic = eciToGeodetic(p, gmst);
              const lon = degreesLong(geodetic.longitude);
              const lat = degreesLat(geodetic.latitude);
              const alt = geodetic.height * 1000;
              sat.point.position = Cesium.Cartesian3.fromDegrees(lon, lat, alt);
              sat.point.show = true;
              updated = true;
            } else {
              sat.point.show = false;
            }
          }
          if (updated) holdContinuousRender();
        });
      }

      // Click handler for info tooltips
      if (!_clickHandler) {
        _clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        _clickHandler.setInputAction((click) => {
          const picked = viewer.scene.pick(click.position);
          if (!picked) return;
          const primId = picked.primitive?.id;
          if (!primId || primId.layer !== 'space-track') return;
          const sat = _catalog.get(primId.noradId);
          if (!sat) return;
          _showTooltip(click.position.x, click.position.y, {
            title: sat.omm.OBJECT_NAME,
            subtitle: `NORAD ${primId.noradId} · SPACE-TRACK`,
            meta: [
              { label: 'CLASSIFICATION', value: sat.omm.CLASSIFICATION_TYPE || 'UNCLASSIFIED' },
              { label: 'COUNTRY', value: sat.omm.COUNTRY_CODE || 'UNKNOWN' },
              { label: 'APOGEE / PERIGEE', value: `${sat.omm.APOAPSIS || '?'}km / ${sat.omm.PERIAPSIS || '?'}km` },
              { label: 'PERIOD', value: `${sat.omm.PERIOD || '?'} min` }
            ]
          });
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
      }

      // Pick ownership for conflict resolution with other layers
      registerPickOwner('space-track', (pickedId) => {
        if (typeof pickedId === 'string' && pickedId.startsWith('space-track:')) return true;
        return false;
      });

    } catch (e) {
      if (e.name !== 'AbortError') {
        _lastError = 'UNAVAILABLE';
        console.warn('[SpaceTrackLayer] update failed', e);
      }
    }
  }
};
