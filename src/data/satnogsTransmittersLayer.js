import { fetchSatNogs } from './spaceShared.js';

let _container = null;
let _lastError = null;
let _data = [];

function createUi() {
  if (_container) return;
  _container = document.createElement('div');
  _container.id = 'satnogs-transmitters-panel';
  Object.assign(_container.style, {
    position: 'absolute',
    left: '36px',
    top: '300px', // Below the layer stack
    width: '380px',
    maxHeight: '400px',
    overflowY: 'auto',
    background: 'var(--glass-bg, rgba(12, 12, 20, 0.9))',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(0, 255, 204, 0.3)',
    borderRadius: '8px',
    color: '#fff',
    fontFamily: 'var(--font-mono)',
    padding: '16px',
    zIndex: '100',
    display: 'none',
    boxShadow: '0 4px 24px rgba(0,0,0,0.5)'
  });

  (document.getElementById('cesiumContainer') || document.body).appendChild(_container);
}

function renderData() {
  if (!_container) return;
  if (_data.length === 0) {
    _container.innerHTML = `<div style="color: var(--text-dim);">No active transmitters found or data unavailable.</div>`;
    return;
  }

  const html = _data.slice(0, 15).map(t => `
    <div style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; margin-bottom: 12px;">
      <div style="color: #00ffcc; font-weight: 700; font-size: 13px; margin-bottom: 4px;">
        📡 TRANSMITTER: ${t.description || 'Unknown'}
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 12px;">
        <span style="color: #4fd8ff;">Uplink: ${t.uplink_low || 'N/A'} MHz</span>
        <span style="color: #ffaa00;">Downlink: ${t.downlink_low || 'N/A'} MHz</span>
      </div>
      <div style="margin-top: 8px; font-size: 12px; display: flex; gap: 16px;">
        <div><span style="color: var(--text-dim);">MODE:</span> ${t.mode || '?'}</div>
        <div><span style="color: var(--text-dim);">TYPE:</span> ${t.type || '?'}</div>
        <div><span style="color: var(--text-dim);">BAUD:</span> ${t.baud || 'N/A'}</div>
      </div>
    </div>
  `).join('');

  _container.innerHTML = `
    <div style="font-weight: 700; font-size: 14px; letter-spacing: 1px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 8px; margin-bottom: 12px;">
      SATNOGS TRANSMITTERS
    </div>
    ${html}
  `;
}

export default {
  id: 'satnogs-transmitters',
  name: 'TRANSMITTERS',
  icon: '📻',
  source: 'SatNOGS',

  init(viewer) {
    try { createUi(); } catch (e) { console.warn('[TransmittersLayer] createUi failed:', e); }
  },

  getState() {
    return {
      title: 'SatNOGS TRANSMITTERS',
      icon: 'rss_feed',
      details: _data.length > 0 
        ? `${_data.length} ACTIVE` 
        : (_lastError ? _lastError : 'WAITING'),
      accent: 'var(--teal)',
      isOffline: _lastError !== null
    };
  },

  getStats() {
    return { count: _data.length };
  },

  disable() {
    if (_container) {
      _container.style.display = 'none';
    }
  },

  async enable(viewer, { signal = null } = {}) {
    // Setup is done in update
    return true;
  },

  async update(viewer, { signal = null } = {}) {
    _lastError = null;
    if (_container) _container.style.display = 'block';
    
    try {
      // SatNOGS DB API - Transmitters (using ?alive=true)
      const data = await fetchSatNogs('db', 'transmitters/?alive=true', { signal });
      _data = Array.isArray(data) ? data : [];
      
      if (_data.length === 0) {
        _lastError = 'NO DATA';
      }
      renderData();
    } catch (e) {
      if (e.name !== 'AbortError') {
        _lastError = 'UNAVAILABLE';
        _data = [];
        renderData();
        console.warn('[SatNogsTransmittersLayer] update failed', e);
      }
    }
  }
};
