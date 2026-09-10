/**
 * ytSpace.js — 🛸 LIVE SPACE layer
 * Searches YouTube for ISS, NASA, SpaceX, and rocket launch live streams.
 * Pins markers to known launch sites and space agency HQs.
 */
import * as Cesium from 'cesium';
import { YOUTUBE_API_KEY, YT_REFRESH_INTERVAL, generateIconSvg, injectVideoModalStyles, openLiveStream, closeLiveStream, ytSearchWithCountry } from './ytShared.js';

// Known space launch sites and HQs for more accurate placement
const SPACE_LOCATIONS = {
  'NASA': { lat: 28.5721, lng: -80.6480, name: 'Kennedy Space Center' },
  'SpaceX': { lat: 25.9972, lng: -97.1570, name: 'Starbase, TX' },
  'ISS': { lat: 0, lng: 0, name: 'International Space Station' },
  'ESA': { lat: 5.2378, lng: -52.7684, name: 'Guiana Space Centre' },
  'ISRO': { lat: 13.7199, lng: 80.2304, name: 'Sriharikota, India' },
  'JAXA': { lat: 30.4009, lng: 131.0089, name: 'Tanegashima, Japan' },
  'Roscosmos': { lat: 45.9650, lng: 63.3050, name: 'Baikonur, Kazakhstan' },
  'Rocket Lab': { lat: -39.2615, lng: 177.8649, name: 'Mahia, NZ' },
  'Blue Origin': { lat: 31.4222, lng: -104.7574, name: 'West Texas' },
  'ULA': { lat: 28.5620, lng: -80.5772, name: 'Cape Canaveral' },
};

function matchSpaceLocation(title, channelName) {
  const text = (title + ' ' + channelName).toLowerCase();
  for (const [key, loc] of Object.entries(SPACE_LOCATIONS)) {
    if (text.includes(key.toLowerCase())) return loc;
  }
  return null;
}

let _viewer = null;
let _dataSource = null;
let _clickHandler = null;
let _enabled = false;

const ytSpaceLayer = {
  id: 'yt-space',
  name: 'LIVE SPACE',
  icon: '🛸',
  source: 'YouTube Live Space',
  updateInterval: YT_REFRESH_INTERVAL,

  init() { injectVideoModalStyles(); },

  async enable(viewer, { signal } = {}) {
    _viewer = viewer;
    _enabled = true;
    _dataSource = new Cesium.CustomDataSource('yt-space');
    viewer.dataSources.add(_dataSource);

    _clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    _clickHandler.setInputAction((click) => {
      if (!_enabled) return;
      const picked = viewer.scene.pick(click.position);
      if (Cesium.defined(picked) && picked.id && picked.id._ytLayerId === 'yt-space') {
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

      const feeds = await ytSearchWithCountry(
        'ISS live OR NASA live OR SpaceX live OR rocket launch live',
        { signal: ctrl.signal, maxResults: 10 }
      );
      clearTimeout(tid);

      if (_dataSource) _dataSource.entities.removeAll();
      const iconImg = generateIconSvg('#1abc9c');

      feeds.forEach(feed => {
        // Try to match to a known space location first
        const spaceLoc = matchSpaceLocation(feed.title, feed.channelName);
        let position;
        if (spaceLoc) {
          const latOff = (Math.random() - 0.5) * 2;
          const lngOff = (Math.random() - 0.5) * 2;
          position = Cesium.Cartesian3.fromDegrees(spaceLoc.lng + lngOff, spaceLoc.lat + latOff);
        } else {
          // Fall back to country-based positioning
          const cc = COUNTRY_CENTERS[feed.country];
          const lat = cc ? cc.lat + (Math.random() - 0.5) * 3 : (Math.random() * 120) - 60;
          const lng = cc ? cc.lng + (Math.random() - 0.5) * 3 : (Math.random() * 360) - 180;
          position = Cesium.Cartesian3.fromDegrees(lng, lat);
        }

        const entity = _dataSource.entities.add({
          position,
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
        entity._ytLayerId = 'yt-space';
        entity._ytChannelName = feed.channelName;
        entity._ytVideoId = feed.videoId;
      });
    } catch (err) {
      console.warn('[LIVE SPACE] Fetch error:', err.message);
    }
  },
};

export default ytSpaceLayer;
