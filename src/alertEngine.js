import { getFlightData } from './data/flights.js';
import * as Cesium from 'cesium';

let _interval = null;
let _alerts = new Map(); // icao24 -> alert info
let _container = null;
let _viewer = null;

export function initAlertEngine(viewer) {
  _viewer = viewer;
  
  // Create UI Container
  _container = document.createElement('div');
  _container.id = 'ai-alert-engine';
  _container.style.position = 'fixed';
  _container.style.top = '80px';
  _container.style.right = '20px';
  _container.style.width = '300px';
  _container.style.maxHeight = '400px';
  _container.style.overflowY = 'auto';
  _container.style.zIndex = '9999';
  _container.style.pointerEvents = 'none';
  _container.style.display = 'flex';
  _container.style.flexDirection = 'column';
  _container.style.gap = '8px';
  document.body.appendChild(_container);

  if (_interval) clearInterval(_interval);
  _interval = setInterval(scanAlerts, 5000);
}

function scanAlerts() {
  const flightData = getFlightData();
  if (!flightData) return;

  const activeIcaos = new Set();
  let changed = false;

  for (const [icao24, info] of flightData.entries()) {
    // 7700 = General Emergency, 7600 = Radio Failure, 7500 = Hijack
    if (info.squawk === '7700' || info.squawk === '7600' || info.squawk === '7500') {
      activeIcaos.add(icao24);
      if (!_alerts.has(icao24)) {
        changed = true;
        const type = info.squawk === '7700' ? 'EMERGENCY' : info.squawk === '7600' ? 'RADIO FAIL' : 'HIJACK';
        _alerts.set(icao24, {
          id: icao24,
          type,
          callsign: info.callsign || icao24,
          squawk: info.squawk,
          lat: info.rawLat,
          lon: info.rawLon,
          alt: info.renderAltitudeM || 0,
        });
      }
    }
  }

  // Remove old alerts that are no longer squawking
  for (const icao24 of _alerts.keys()) {
    if (!activeIcaos.has(icao24)) {
      _alerts.delete(icao24);
      changed = true;
    }
  }

  if (changed) {
    renderAlerts();
  }
}

function renderAlerts() {
  _container.innerHTML = '';
  
  for (const alert of _alerts.values()) {
    const el = document.createElement('div');
    el.style.pointerEvents = 'auto';
    el.style.background = 'rgba(255, 0, 0, 0.15)';
    el.style.border = '1px solid rgba(255, 0, 0, 0.5)';
    el.style.borderLeft = '4px solid #ff3333';
    el.style.borderRadius = '4px';
    el.style.padding = '12px';
    el.style.color = '#fff';
    el.style.fontFamily = 'var(--font-mono, monospace)';
    el.style.fontSize = '12px';
    el.style.cursor = 'pointer';
    el.style.backdropFilter = 'blur(8px)';
    el.style.transition = 'all 0.2s';
    
    el.onmouseover = () => { el.style.background = 'rgba(255, 0, 0, 0.25)'; };
    el.onmouseout = () => { el.style.background = 'rgba(255, 0, 0, 0.15)'; };
    
    el.onclick = () => {
      if (_viewer) {
        _viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(alert.lon, alert.lat, Math.max(10000, alert.alt + 5000))
        });
      }
    };
    
    el.innerHTML = `
      <div style="color: #ff3333; font-weight: bold; margin-bottom: 4px; display: flex; justify-content: space-between;">
        <span>⚠️ ${alert.type}</span>
        <span>SQ: ${alert.squawk}</span>
      </div>
      <div>FLIGHT: ${alert.callsign}</div>
      <div style="opacity: 0.7; font-size: 10px; margin-top: 4px;">Click to view</div>
    `;
    _container.appendChild(el);
  }
}
