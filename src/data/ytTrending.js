/**
 * ytTrending.js — 📈 TRENDING NOW layer
 * Uses the YouTube `videos.list?chart=mostPopular` endpoint per region.
 * Only costs 1 unit per regionCode call (vs 100 for search), so very quota-friendly!
 */
import * as Cesium from 'cesium';
import { YOUTUBE_API_KEY, YT_REFRESH_INTERVAL, COUNTRY_CENTERS, generateIconSvg, injectVideoModalStyles, openLiveStream, closeLiveStream } from './ytShared.js';

// Regions to poll — prioritize diverse global coverage
const REGIONS = ['US', 'GB', 'IN', 'JP', 'BR', 'DE', 'FR', 'RU', 'KR', 'AU', 'MX', 'SA', 'NG', 'KE', 'ZA', 'ID', 'TR', 'EG'];

let _viewer = null;
let _dataSource = null;
let _clickHandler = null;
let _enabled = false;

const ytTrendingLayer = {
  id: 'yt-trending',
  name: 'TRENDING NOW',
  icon: '📈',
  source: 'YouTube Trending',
  updateInterval: YT_REFRESH_INTERVAL,

  init() { injectVideoModalStyles(); },

  async enable(viewer, { signal } = {}) {
    _viewer = viewer;
    _enabled = true;
    _dataSource = new Cesium.CustomDataSource('yt-trending');
    viewer.dataSources.add(_dataSource);

    _clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    _clickHandler.setInputAction((click) => {
      if (!_enabled) return;
      const picked = viewer.scene.pick(click.position);
      if (Cesium.defined(picked) && picked.id && picked.id._ytLayerId === 'yt-trending') {
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
      const tid = setTimeout(() => ctrl.abort(), 20000);
      if (signal) signal.addEventListener('abort', () => ctrl.abort());

      if (_dataSource) _dataSource.entities.removeAll();
      const iconImg = generateIconSvg('#2ecc71');

      // Fetch trending #1 video for each region — only 1 unit per call!
      const promises = REGIONS.map(async (region) => {
        try {
          const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&regionCode=${region}&maxResults=1&key=${YOUTUBE_API_KEY}`;
          const res = await fetch(url, { signal: ctrl.signal });
          if (!res.ok) return null;
          const data = await res.json();
          const video = data.items?.[0];
          if (!video) return null;
          return {
            region,
            videoId: video.id,
            title: video.snippet.title,
            channelName: video.snippet.channelTitle,
          };
        } catch { return null; }
      });

      const results = (await Promise.all(promises)).filter(Boolean);
      clearTimeout(tid);

      results.forEach(r => {
        const cc = COUNTRY_CENTERS[r.region];
        if (!cc) return;
        const lat = cc.lat + (Math.random() - 0.5) * 2;
        const lng = cc.lng + (Math.random() - 0.5) * 2;

        const entity = _dataSource.entities.add({
          position: Cesium.Cartesian3.fromDegrees(lng, lat),
          billboard: {
            image: iconImg,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -5),
            scale: 1.2,
          },
          label: {
            text: `#1 ${r.region}`,
            font: 'bold 11px sans-serif',
            fillColor: Cesium.Color.fromCssColorString('#2ecc71'),
            style: Cesium.LabelStyle.FILL,
            verticalOrigin: Cesium.VerticalOrigin.TOP,
            pixelOffset: new Cesium.Cartesian2(0, 2),
          },
        });
        entity._ytLayerId = 'yt-trending';
        entity._ytChannelName = `${r.channelName} — ${r.title.substring(0, 40)}`;
        entity._ytVideoId = r.videoId;
      });
    } catch (err) {
      console.warn('[TRENDING NOW] Fetch error:', err.message);
    }
  },
};

export default ytTrendingLayer;
