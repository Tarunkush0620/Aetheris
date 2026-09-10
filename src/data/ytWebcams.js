/**
 * ytWebcams.js — 📷 LIVE WEBCAMS layer
 * Searches YouTube for live webcam streams worldwide.
 */
import { createYouTubeLayer } from './ytShared.js';

export default createYouTubeLayer({
  id: 'yt-webcams',
  name: 'LIVE WEBCAMS',
  icon: '📷',
  query: 'live webcam city',
  color: '#3498db',
  source: 'YouTube Live Webcams',
});
