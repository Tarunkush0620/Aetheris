import * as Cesium from 'cesium';
import { fetchSatNogs } from './spaceShared.js';
import { registerPickOwner, unregisterPickOwner } from './pickRegistry.js';

let _viewer = null;
let _pointCollection = null;
let _catalog = new Map();
let _lastError = null;
let _clickHandler = null;
let _tooltip = null;

const POINT_STYLE_ONLINE = {
  pixelSize: 6,
  color: Cesium.Color.fromCssColorString('#00ffcc').withAlpha(0.9),
  outlineColor: Cesium.Color.fromCssColorString('#0a0f1a'),
  outlineWidth: 1,
};

const POINT_STYLE_OFFLINE = {
  pixelSize: 4,
  color: Cesium.Color.fromCssColorString('#888888').withAlpha(0.6),
  outlineColor: Cesium.Color.fromCssColorString('#0a0f1a'),
  outlineWidth: 1,
};

function _ensureTooltip() {
  if (_tooltip) return;
  _tooltip = document.createElement('div');
  _tooltip.id = 'satnogs-stations-tooltip';
  Object.assign(_tooltip.style, {
    position: 'fixed',
    display: 'none',
    background: 'rgba(10, 15, 26, 0.95)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(0, 255, 204, 0.4)',
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
       <span style="color:#00ffcc">${m.value}</span>
     </div>`
  ).join('');
  _tooltip.innerHTML = `
    <div style="color:#00ffcc;font-weight:700;font-size:13px;margin-bottom:2px">${info.title}</div>
    <div style="color:rgba(255,255,255,0.5);font-size:10px;margin-bottom:8px">${info.subtitle}</div>
    ${metaHtml}
  `;
  _tooltip.style.display = 'block';
  _tooltip.style.left = `${Math.min(x + 16, window.innerWidth - 340)}px`;
  _tooltip.style.top = `${Math.min(y + 16, window.innerHeight - 200)}px`;
  setTimeout(() => { if (_tooltip) _tooltip.style.display = 'none'; }, 5000);
}

export default {
  id: 'satnogs-stations',
  name: 'GROUND STATIONS',
  icon: '📡',
  source: 'SatNOGS',

  init(viewer) {
    _viewer = viewer;
  },

  getState() {
    return {
      title: 'GROUND STATIONS',
      icon: 'cell_tower',
      details: _catalog.size > 0 
        ? `${_catalog.size.toLocaleString()} STATIONS` 
        : (_lastError ? _lastError : 'WAITING'),
      accent: 'var(--green)',
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
    if (_clickHandler) {
      _clickHandler.destroy();
      _clickHandler = null;
    }
    if (_tooltip) {
      _tooltip.style.display = 'none';
    }
    _catalog.clear();
    unregisterPickOwner('satnogs-stations');
  },

  async enable(viewer, { signal = null } = {}) {
    // Setup is done in update
    return true;
  },

  async update(viewer, { signal = null } = {}) {
    _lastError = null;
    try {
      // SatNOGS Network API - Ground Stations
      const data = await fetchSatNogs('network', 'stations', { signal });
      if (!data || data.length === 0) throw new Error('Empty stations catalog');

      if (_pointCollection) {
        viewer.scene.primitives.remove(_pointCollection);
      }
      _catalog.clear();

      _pointCollection = new Cesium.PointPrimitiveCollection();
      viewer.scene.primitives.add(_pointCollection);

      for (const station of data) {
        if (station.lat === null || station.lng === null) continue;
        
        const isOnline = station.status === 'Online';
        const style = isOnline ? POINT_STYLE_ONLINE : POINT_STYLE_OFFLINE;
        const position = Cesium.Cartesian3.fromDegrees(station.lng, station.lat, station.alt || 0);

        const point = _pointCollection.add({
          position,
          ...style,
          id: { layer: 'satnogs-stations', id: station.id, name: station.name }
        });

        _catalog.set(station.id, { station, point });
      }

      // Click handler for info tooltips
      if (!_clickHandler) {
        _clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        _clickHandler.setInputAction((click) => {
          const picked = viewer.scene.pick(click.position);
          if (!picked) return;
          const primId = picked.primitive?.id;
          if (!primId || primId.layer !== 'satnogs-stations') return;
          const entry = _catalog.get(primId.id);
          if (!entry) return;
          const s = entry.station;
          _showTooltip(click.position.x, click.position.y, {
            title: s.name || `Station ${s.id}`,
            subtitle: `SatNOGS Ground Station · ${s.status || 'Unknown'}`,
            meta: [
              { label: 'LOCATION', value: `${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}` },
              { label: 'ALTITUDE', value: `${s.alt || 0} m` },
              { label: 'ANTENNAS', value: Array.isArray(s.antennas) ? s.antennas.map(a => a.type || a.band).join(', ') : 'Unknown' },
              { label: 'OBSERVATIONS', value: `${s.observations || s.observation_count || 0}` },
              { label: 'STATUS', value: s.status || 'Unknown' }
            ]
          });
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
      }

      // Pick ownership predicate — receives a string id from resolvePickId
      registerPickOwner('satnogs-stations', (pickedId) => {
        if (typeof pickedId === 'string' && pickedId.startsWith('satnogs-stations:')) return true;
        // Also match numeric station IDs resolved by the .id property
        const num = parseInt(pickedId, 10);
        if (!isNaN(num) && _catalog.has(num)) return true;
        return false;
      });

    } catch (e) {
      if (e.name !== 'AbortError') {
        _lastError = 'UNAVAILABLE';
        console.warn('[SatNogsLayer] update failed', e);
      }
    }
  }
};
