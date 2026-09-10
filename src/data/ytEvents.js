/**
 * ytEvents.js — 🎪 LIVE EVENTS layer
 * Searches YouTube for live concerts, protests, sports, and other real-time events.
 */
import { createYouTubeLayer } from './ytShared.js';

export default createYouTubeLayer({
  id: 'yt-events',
  name: 'LIVE EVENTS',
  icon: '🎪',
  query: 'live event OR live concert OR live protest OR live sports event',
  color: '#f1c40f',
  source: 'YouTube Live Events',
});
