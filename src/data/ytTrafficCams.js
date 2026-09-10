/**
 * ytTrafficCams.js — 🚦 LIVE TRAFFIC CAMS layer
 * Searches YouTube for live traffic and highway camera feeds.
 */
import { createYouTubeLayer } from './ytShared.js';

export default createYouTubeLayer({
  id: 'yt-traffic-cams',
  name: 'LIVE TRAFFIC CAMS',
  icon: '🚦',
  query: 'live traffic cam OR highway camera live OR road camera live',
  color: '#e67e22',
  source: 'YouTube Live Traffic',
});
