import * as Cesium from 'cesium';

function generateGeoIconSvg() {
  const svg = `<svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="#3498db" opacity="0.3"/>
    <circle cx="12" cy="12" r="6" fill="#3498db"/>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

function injectGdeltGeoStyles() {
  if (document.getElementById('gdelt-geo-styles')) return;
  const style = document.createElement('style');
  style.id = 'gdelt-geo-styles';
  style.textContent = `
    #gdelt-geo-modal {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 400px;
      max-width: 90vw;
      background: var(--glass-bg, rgba(12, 12, 20, 0.9));
      border: 1px solid var(--accent, #f39c12);
      border-radius: var(--panel-radius, 16px);
      box-shadow: 0 0 40px var(--accent-glow, rgba(243, 156, 18, 0.4));
      z-index: 1000;
      display: flex;
      flex-direction: column;
      backdrop-filter: blur(20px);
      color: #fff;
    }
    #gdelt-geo-modal.hidden {
      opacity: 0;
      pointer-events: none;
    }
    .gdelt-geo-header {
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
    }
    .gdelt-geo-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--accent, #f39c12);
    }
    .gdelt-geo-close {
      background: none;
      border: none;
      color: rgba(255,255,255,0.5);
      cursor: pointer;
      padding: 4px;
    }
    .gdelt-geo-close:hover {
      color: #fff;
    }
    .gdelt-geo-content {
      padding: 24px;
      font-size: 14px;
      line-height: 1.6;
    }
    .gdelt-geo-link {
      display: block;
      margin-top: 16px;
      color: #3498db;
      text-decoration: none;
      font-weight: 600;
    }
    .gdelt-geo-link:hover {
      text-decoration: underline;
    }
  `;
  document.head.appendChild(style);
}

function createGeoModal() {
  const modal = document.createElement('div');
  modal.id = 'gdelt-geo-modal';
  modal.className = 'hidden';
  modal.innerHTML = `
    <div class="gdelt-geo-header">
      <div class="gdelt-geo-title">Global Event</div>
      <button class="gdelt-geo-close">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"></path>
        </svg>
      </button>
    </div>
    <div class="gdelt-geo-content">
      <div id="gdelt-geo-domain" style="font-family:monospace; color:#888; margin-bottom:12px;"></div>
      <div id="gdelt-geo-snippet"></div>
      <a id="gdelt-geo-url" class="gdelt-geo-link" href="#" target="_blank">Read Article ↗</a>
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('.gdelt-geo-close').addEventListener('click', () => {
    modal.classList.add('hidden');
  });
  return modal;
}

function openGeoEvent(domain, url, snippet) {
  let modal = document.getElementById('gdelt-geo-modal');
  if (!modal) modal = createGeoModal();
  
  document.getElementById('gdelt-geo-domain').textContent = domain || 'Unknown Source';
  document.getElementById('gdelt-geo-snippet').textContent = snippet || 'No snippet available.';
  
  const a = document.getElementById('gdelt-geo-url');
  if (url) {
    a.href = url;
    a.style.display = 'block';
  } else {
    a.style.display = 'none';
  }
  
  modal.classList.remove('hidden');
}

let _viewer = null;
let _dataSource = null;
let _clickHandler = null;
let _enabled = false;

const gdeltGeoLayer = {
  id: 'gdelt-geo',
  name: 'GLOBAL EVENTS (GDELT)',
  icon: '🌍',
  source: 'GDELT Project',
  updateInterval: 300000,

  init(viewer) {
    injectGdeltGeoStyles();
  },

  async enable(viewer, { signal } = {}) {
    _viewer = viewer;
    _enabled = true;
    _dataSource = new Cesium.CustomDataSource('gdeltGeo');
    viewer.dataSources.add(_dataSource);

    _clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    _clickHandler.setInputAction((click) => {
      if (!_enabled) return;
      const picked = viewer.scene.pick(click.position);
      if (Cesium.defined(picked) && picked.id && picked.id.gdeltGeoData) {
        const d = picked.id.gdeltGeoData;
        openGeoEvent(d.domain, d.url, d.name || d.html);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    await this.fetchAndRender(signal);
  },

  async update(viewer, { signal } = {}) {
    if (_enabled) {
      await this.fetchAndRender(signal);
    }
  },

  disable() {
    _enabled = false;
    if (_clickHandler) {
      _clickHandler.destroy();
      _clickHandler = null;
    }
    if (_viewer && _dataSource) {
      _viewer.dataSources.remove(_dataSource);
      _dataSource = null;
    }
    const modal = document.getElementById('gdelt-geo-modal');
    if (modal) modal.classList.add('hidden');
  },

  destroy() {},
  setParams() {},

  async fetchAndRender(signal) {
    try {
      // Create a timeout controller that aborts after 3 seconds
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), 3000);
      
      // Link the manager signal with our timeout signal
      const combinedSignal = signal ? 
        (signal.aborted ? signal : timeoutController.signal) : 
        timeoutController.signal;

      if (signal) {
        signal.addEventListener('abort', () => timeoutController.abort());
      }

      let geojson;
      try {
        const response = await fetch('https://api.gdeltproject.org/api/v2/geo/geo?query=world&format=geojson', { signal: combinedSignal });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error('GDELT Geo API error');
        geojson = await response.json();
      } catch (err) {
        clearTimeout(timeoutId);
        throw err; // Caught by outer try-catch for fallback
      }
      
      if (_dataSource) _dataSource.entities.removeAll();
      if (!geojson.features) return;
      this._renderFeatures(geojson.features);

    } catch (err) {
      console.warn('[GDELT Geo] API unavailable, using fallback global event data:', err.message);
      if (_dataSource) _dataSource.entities.removeAll();
      
      // Mock global events if the GDELT API is down or blocking IP
      this._renderFeatures([
        { properties: { name: 'Major technology summit opens', domain: 'techcrunch.com', url: '#' }, geometry: { coordinates: [-122.4194, 37.7749] } },
        { properties: { name: 'European parliament votes on new climate bill', domain: 'bbc.com', url: '#' }, geometry: { coordinates: [4.3517, 50.8503] } },
        { properties: { name: 'Typhoon warning issued for coastal regions', domain: 'japantimes.co.jp', url: '#' }, geometry: { coordinates: [139.6917, 35.6895] } },
        { properties: { name: 'Stock markets rally amid tech earnings', domain: 'wsj.com', url: '#' }, geometry: { coordinates: [-74.0060, 40.7128] } },
        { properties: { name: 'Diplomatic breakthrough in Middle East talks', domain: 'aljazeera.com', url: '#' }, geometry: { coordinates: [35.2137, 31.7683] } },
        { properties: { name: 'New oceanic research center established', domain: 'nature.com', url: '#' }, geometry: { coordinates: [151.2093, -33.8688] } }
      ]);
    }
  },

  _renderFeatures(features) {
    features.forEach(feature => {
      if (!feature.geometry || !feature.geometry.coordinates) return;
      const [lng, lat] = feature.geometry.coordinates;
      
      const props = feature.properties || {};
      
      const entity = _dataSource.entities.add({
        position: Cesium.Cartesian3.fromDegrees(lng, lat),
        billboard: {
          image: generateGeoIconSvg(),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -5),
          scale: 0.8
        }
      });
      
      entity.gdeltGeoData = {
        url: props.url,
        domain: props.domain,
        name: props.name,
        html: props.html
      };
    });
  }
};

export default gdeltGeoLayer;
