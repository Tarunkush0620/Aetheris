/**
 * ytStorms.js — 🌪️ STORM CHASERS layer
 * Searches YouTube for live storm chaser and severe weather streams.
 */
import { createYouTubeLayer } from './ytShared.js';

export default createYouTubeLayer({
  id: 'yt-storms',
  name: 'STORM CHASERS',
  icon: '🌪️',
  query: 'live storm chase OR live severe weather OR live tornado',
  color: '#9b59b6',
  source: 'YouTube Live Weather',
});
