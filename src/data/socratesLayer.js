import { fetchSocratesConjunctions } from './spaceShared.js';

let _container = null;
let _lastError = null;
let _data = [];

function createUi() {
  if (_container) return;
  _container = document.createElement('div');
  _container.id = 'socrates-conjunctions-panel';
  Object.assign(_container.style, {
    position: 'absolute',
    left: '36px',
    top: '400px', // Below the layer stack
    width: '380px',
    maxHeight: '400px',
    overflowY: 'auto',
    background: 'var(--glass-bg, rgba(12, 12, 20, 0.9))',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 68, 68, 0.3)',
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
    _container.innerHTML = `<div style="color: var(--text-dim);">No conjunctions found or data unavailable.</div>`;
    return;
  }

  const html = _data.slice(0, 15).map(c => `
    <div style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; margin-bottom: 12px;">
      <div style="color: #ff4444; font-weight: 700; font-size: 13px; margin-bottom: 4px;">
        ⚠️ CLOSE APPROACH
      </div>
      <div style="font-size: 11px; color: var(--text-dim); margin-bottom: 8px;">
        EPOCH: ${c.tca_time || c.EPOCH || 'Unknown'}
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 12px;">
        <span style="color: #4fd8ff;">${c.sat1_name || c.OBJECT_A || 'Object A'}</span>
        <span style="color: var(--text-dim);">vs</span>
        <span style="color: #ffaa00;">${c.sat2_name || c.OBJECT_B || 'Object B'}</span>
      </div>
      <div style="margin-top: 8px; font-size: 12px; display: flex; gap: 16px;">
        <div><span style="color: var(--text-dim);">MISS:</span> ${c.min_rng || c.MISS_DISTANCE || '?'} km</div>
        <div><span style="color: var(--text-dim);">PROB:</span> ${c.prob || 'N/A'}</div>
      </div>
    </div>
  `).join('');

  _container.innerHTML = `
    <div style="font-weight: 700; font-size: 14px; letter-spacing: 1px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 8px; margin-bottom: 12px;">
      SOCRATES CONJUNCTION RISKS
    </div>
    ${html}
  `;
}

export default {
  id: 'celestrak-socrates',
  name: 'SOCRATES CONJUNCTIONS',
  icon: '💥',
  source: 'CelesTrak',

  init(viewer) {
    try { createUi(); } catch (e) { console.warn('[SocratesLayer] createUi failed:', e); }
  },

  getState() {
    return {
      title: 'SOCRATES',
      icon: 'warning',
      details: _data.length > 0 
        ? `${_data.length.toLocaleString()} HIGH-RISK` 
        : (_lastError ? _lastError : 'WAITING'),
      accent: 'var(--orange)',
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
      const data = await fetchSocratesConjunctions({ signal });
      // SOCRATES can return an array or an object depending on the endpoint wrapper
      _data = Array.isArray(data) ? data : (data.conjunctions || []);
      
      if (_data.length === 0) {
        _lastError = 'NO DATA';
      }
      renderData();
    } catch (e) {
      if (e.name !== 'AbortError') {
        _lastError = 'UNAVAILABLE';
        _data = [];
        renderData();
        console.warn('[SocratesLayer] update failed', e);
      }
    }
  }
};
