/**
 * ytShared.js — Shared YouTube API utilities for all YouTube-based layers.
 * Centralizes: API key, country→coordinate mapping, video modal, icon generation.
 */
import * as Cesium from 'cesium';

export const YOUTUBE_API_KEY = 'AIzaSyBQ2PQkvVy5bb6pc6zR9EwbJ10xgaGoaAQ';

// 2-hour refresh to stay within YouTube free tier (10,000 units/day)
export const YT_REFRESH_INTERVAL = 7200000;

// ISO country code → geographic center coordinates
export const COUNTRY_CENTERS = {
  'US': { lat: 39.8283, lng: -98.5795, name: 'United States' },
  'GB': { lat: 55.3781, lng: -3.4360, name: 'United Kingdom' },
  'IN': { lat: 20.5937, lng: 78.9629, name: 'India' },
  'AU': { lat: -25.2744, lng: 133.7751, name: 'Australia' },
  'CA': { lat: 56.1304, lng: -106.3468, name: 'Canada' },
  'RU': { lat: 61.5240, lng: 105.3188, name: 'Russia' },
  'FR': { lat: 46.2276, lng: 2.2137, name: 'France' },
  'DE': { lat: 51.1657, lng: 10.4515, name: 'Germany' },
  'ZA': { lat: -30.5595, lng: 22.9375, name: 'South Africa' },
  'JP': { lat: 36.2048, lng: 138.2529, name: 'Japan' },
  'CN': { lat: 35.8617, lng: 104.1954, name: 'China' },
  'IT': { lat: 41.8719, lng: 12.5674, name: 'Italy' },
  'ES': { lat: 40.4637, lng: -3.7492, name: 'Spain' },
  'MX': { lat: 23.6345, lng: -102.5528, name: 'Mexico' },
  'BR': { lat: -14.2350, lng: -51.9253, name: 'Brazil' },
  'SA': { lat: 23.8859, lng: 45.0792, name: 'Saudi Arabia' },
  'AE': { lat: 23.4241, lng: 53.8478, name: 'United Arab Emirates' },
  'BD': { lat: 23.6850, lng: 90.3563, name: 'Bangladesh' },
  'PK': { lat: 30.3753, lng: 69.3451, name: 'Pakistan' },
  'KE': { lat: -0.0236, lng: 37.9062, name: 'Kenya' },
  'NG': { lat: 9.0820, lng: 8.6753, name: 'Nigeria' },
  'EG': { lat: 26.8206, lng: 30.8025, name: 'Egypt' },
  'TR': { lat: 38.9637, lng: 35.2433, name: 'Turkey' },
  'ID': { lat: -0.7893, lng: 113.9213, name: 'Indonesia' },
  'KR': { lat: 35.9078, lng: 127.7669, name: 'South Korea' },
  'TW': { lat: 23.6978, lng: 120.9605, name: 'Taiwan' },
  'TH': { lat: 15.8700, lng: 100.9925, name: 'Thailand' },
  'VN': { lat: 14.0583, lng: 108.2772, name: 'Vietnam' },
  'PH': { lat: 12.8797, lng: 121.7740, name: 'Philippines' },
  'MY': { lat: 4.2105, lng: 101.9758, name: 'Malaysia' },
  'AR': { lat: -38.4161, lng: -63.6167, name: 'Argentina' },
  'CL': { lat: -35.6751, lng: -71.5430, name: 'Chile' },
  'CO': { lat: 4.5709, lng: -74.2973, name: 'Colombia' },
  'PE': { lat: -9.1900, lng: -75.0152, name: 'Peru' },
  'SE': { lat: 60.1282, lng: 18.6435, name: 'Sweden' },
  'NO': { lat: 60.4720, lng: 8.4689, name: 'Norway' },
  'FI': { lat: 61.9241, lng: 25.7482, name: 'Finland' },
  'DK': { lat: 56.2639, lng: 9.5018, name: 'Denmark' },
  'PL': { lat: 51.9194, lng: 19.1451, name: 'Poland' },
  'UA': { lat: 48.3794, lng: 31.1656, name: 'Ukraine' },
  'GR': { lat: 39.0742, lng: 21.8243, name: 'Greece' },
  'PT': { lat: 39.3999, lng: -8.2245, name: 'Portugal' },
  'NZ': { lat: -40.9006, lng: 174.8860, name: 'New Zealand' },
  'IL': { lat: 31.0461, lng: 34.8516, name: 'Israel' },
  'QA': { lat: 25.3548, lng: 51.1839, name: 'Qatar' },
  'KW': { lat: 29.3117, lng: 47.4818, name: 'Kuwait' },
  'IQ': { lat: 33.2232, lng: 43.6793, name: 'Iraq' },
  'IR': { lat: 32.4279, lng: 53.6880, name: 'Iran' },
};

/** Generate a colored circle SVG icon for map markers */
export function generateIconSvg(color = '#e74c3c', size = 16) {
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="${color}" opacity="0.3"/>
    <circle cx="12" cy="12" r="6" fill="${color}"/>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

/** Inject the shared video modal styles (idempotent) */
export function injectVideoModalStyles() {
  if (document.getElementById('yt-shared-modal-styles')) return;
  const style = document.createElement('style');
  style.id = 'yt-shared-modal-styles';
  style.textContent = `
    #yt-video-modal {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 800px;
      max-width: 90vw;
      background: var(--glass-bg, rgba(12, 12, 20, 0.9));
      border: 1px solid var(--accent, #f39c12);
      border-radius: var(--panel-radius, 16px);
      box-shadow: 0 0 40px var(--accent-glow, rgba(243, 156, 18, 0.4));
      z-index: 1000;
      display: flex;
      flex-direction: column;
      backdrop-filter: blur(20px);
      transition: opacity 0.2s;
    }
    #yt-video-modal.hidden {
      opacity: 0;
      pointer-events: none;
    }
    .yt-modal-header {
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
    }
    .yt-modal-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary, #fff);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .yt-live-dot {
      width: 8px;
      height: 8px;
      background: #e74c3c;
      border-radius: 50%;
      box-shadow: 0 0 8px #e74c3c;
      animation: ytPulse 1.5s infinite;
    }
    .yt-modal-close {
      background: none;
      border: none;
      color: var(--text-secondary, rgba(255,255,255,0.5));
      cursor: pointer;
      padding: 4px;
      transition: color 0.2s;
    }
    .yt-modal-close:hover {
      color: var(--accent, #f39c12);
    }
    .yt-video-container {
      position: relative;
      padding-bottom: 56.25%;
      height: 0;
      border-bottom-left-radius: var(--panel-radius, 16px);
      border-bottom-right-radius: var(--panel-radius, 16px);
      overflow: hidden;
    }
    .yt-video-container iframe {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      border: none;
    }
    @keyframes ytPulse {
      0% { transform: scale(0.95); opacity: 0.8; }
      50% { transform: scale(1.1); opacity: 1; }
      100% { transform: scale(0.95); opacity: 0.8; }
    }
  `;
  document.head.appendChild(style);
}

/** Create or get the shared video modal element */
function ensureModal() {
  let modal = document.getElementById('yt-video-modal');
  if (modal) return modal;
  
  modal = document.createElement('div');
  modal.id = 'yt-video-modal';
  modal.className = 'hidden';
  modal.innerHTML = `
    <div class="yt-modal-header">
      <div class="yt-modal-title">
        <div class="yt-live-dot"></div>
        <span id="yt-modal-title-text">Live Broadcast</span>
      </div>
      <button class="yt-modal-close" aria-label="Close video">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"></path>
        </svg>
      </button>
    </div>
    <div class="yt-video-container" id="yt-video-container"></div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('.yt-modal-close').addEventListener('click', () => {
    modal.classList.add('hidden');
    document.getElementById('yt-video-container').innerHTML = '';
  });
  return modal;
}

/** Open a YouTube live stream in the shared modal */
export function openLiveStream(name, videoId) {
  injectVideoModalStyles();
  const modal = ensureModal();
  document.getElementById('yt-modal-title-text').textContent = `${name} — LIVE`;
  document.getElementById('yt-video-container').innerHTML =
    `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
  modal.classList.remove('hidden');
}

/** Close the shared video modal */
export function closeLiveStream() {
  const modal = document.getElementById('yt-video-modal');
  if (modal) {
    modal.classList.add('hidden');
    document.getElementById('yt-video-container').innerHTML = '';
  }
}

/**
 * Perform a YouTube search with country resolution.
 * Returns an array of { channelName, videoId, title, country } objects.
 * Each call uses ~105 quota units (100 search + ~5 channels).
 */
export async function ytSearchWithCountry(query, { signal, maxResults = 15 } = {}) {
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&eventType=live&type=video&videoEmbeddable=true&q=${encodeURIComponent(query)}&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`;
  const searchRes = await fetch(searchUrl, { signal });
  if (!searchRes.ok) throw new Error('YouTube Search error: ' + searchRes.statusText);
  const searchData = await searchRes.json();
  const items = searchData.items || [];
  if (items.length === 0) return [];

  // De-duplicate by channel
  const channelMap = {};
  items.forEach(item => {
    const cId = item.snippet.channelId;
    if (!channelMap[cId]) {
      channelMap[cId] = {
        channelName: item.snippet.channelTitle,
        videoId: item.id.videoId,
        title: item.snippet.title,
        country: 'UNKNOWN',
      };
    }
  });

  // Resolve country codes
  const channelIds = Object.keys(channelMap).join(',');
  const chRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelIds}&key=${YOUTUBE_API_KEY}`, { signal });
  if (chRes.ok) {
    const chData = await chRes.json();
    (chData.items || []).forEach(c => {
      if (channelMap[c.id]) channelMap[c.id].country = c.snippet.country || 'UNKNOWN';
    });
  }

  return Object.values(channelMap);
}

/**
 * Resolve a country code to globe coordinates with a random offset
 * so multiple channels from the same country don't stack.
 */
export function countryToPosition(countryCode, spreadDeg = 3) {
  const cc = COUNTRY_CENTERS[countryCode];
  const baseLat = cc ? cc.lat : (Math.random() * 120) - 60;
  const baseLng = cc ? cc.lng : (Math.random() * 360) - 180;
  const lat = baseLat + (Math.random() - 0.5) * spreadDeg;
  const lng = baseLng + (Math.random() - 0.5) * spreadDeg;
  return Cesium.Cartesian3.fromDegrees(lng, lat);
}

/**
 * Generic YouTube layer factory.
 * Creates a fully functional data layer that:
 *   1. Searches YouTube for the given query
 *   2. Resolves channel countries
 *   3. Places markers on the globe
 *   4. Opens live streams on click
 */
export function createYouTubeLayer({ id, name, icon, query, color = '#e74c3c', source = 'YouTube Live' }) {
  let _viewer = null;
  let _dataSource = null;
  let _clickHandler = null;
  let _enabled = false;

  return {
    id,
    name,
    icon,
    source,
    updateInterval: YT_REFRESH_INTERVAL,

    init() {
      injectVideoModalStyles();
    },

    async enable(viewer, { signal } = {}) {
      _viewer = viewer;
      _enabled = true;
      _dataSource = new Cesium.CustomDataSource(`yt-${id}`);
      viewer.dataSources.add(_dataSource);

      _clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      _clickHandler.setInputAction((click) => {
        if (!_enabled) return;
        const picked = viewer.scene.pick(click.position);
        if (Cesium.defined(picked) && picked.id && picked.id._ytLayerId === id) {
          openLiveStream(picked.id._ytChannelName, picked.id._ytVideoId);
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
      closeLiveStream();
    },

    destroy() {},
    setParams() {},

    async fetchAndRender(signal) {
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 15000);
        if (signal) signal.addEventListener('abort', () => ctrl.abort());

        const feeds = await ytSearchWithCountry(query, { signal: ctrl.signal, maxResults: 15 });
        clearTimeout(tid);

        if (_dataSource) _dataSource.entities.removeAll();

        const iconImg = generateIconSvg(color);
        feeds.forEach(feed => {
          const entity = _dataSource.entities.add({
            position: countryToPosition(feed.country),
            billboard: {
              image: iconImg,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(0, -5),
            },
            label: {
              text: feed.channelName,
              font: 'bold 10px sans-serif',
              fillColor: Cesium.Color.WHITE,
              style: Cesium.LabelStyle.FILL,
              verticalOrigin: Cesium.VerticalOrigin.TOP,
              pixelOffset: new Cesium.Cartesian2(0, 0),
            },
          });
          entity._ytLayerId = id;
          entity._ytChannelName = feed.channelName;
          entity._ytVideoId = feed.videoId;
        });
      } catch (err) {
        console.warn(`[${name}] Fetch error:`, err.message);
      }
    },
  };
}
