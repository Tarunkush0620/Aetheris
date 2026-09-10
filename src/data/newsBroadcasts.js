/**
 * newsBroadcasts.js — 📺 LIVE NEWS layer
 * Connects to the YouTube Data API to fetch live news broadcasts
 * and maps them to their country of origin on the globe.
 */
import { createYouTubeLayer } from './ytShared.js';

export default createYouTubeLayer({
  id: 'news',
  name: 'LIVE NEWS',
  icon: '📺',
  query: 'live news OR live breaking news',
  color: '#e74c3c',
  source: 'YouTube Live News',
});
