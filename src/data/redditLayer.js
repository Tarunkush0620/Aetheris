import { fetchRegionalBrief, normalizeRegionalPlace, regionalDistanceM } from './regionalBrief.js';

let _lastFetchedPoint = null;
let _currentPosts = [];
let _onPostsUpdated = null;
let _abortController = null;

// Only fetch if we've moved more than 50km
const FETCH_DISTANCE_THRESHOLD_M = 50000;

export function initRedditLayer(onPostsUpdated) {
  _onPostsUpdated = onPostsUpdated;
}

export async function updateRedditForLocation(latitude, longitude) {
  const currentPoint = { latitude, longitude };
  
  if (_lastFetchedPoint && regionalDistanceM(_lastFetchedPoint, currentPoint) < FETCH_DISTANCE_THRESHOLD_M) {
    return; // Hasn't moved enough
  }

  if (_abortController) {
    _abortController.abort();
  }
  _abortController = new AbortController();
  const signal = _abortController.signal;

  try {
    // 1. Get the city name for the current coordinates
    const brief = await fetchRegionalBrief(latitude, longitude, { signal });
    const place = brief.place;
    
    if (!place || (!place.locality && !place.region)) {
      setPosts([], "Unknown Location");
      return;
    }
    
    const query = place.locality || place.region;
    
    // 2. Fetch Reddit posts for that city
    const response = await fetch(`/api/reddit?q=${encodeURIComponent(query)}`, { signal });
    if (!response.ok) throw new Error('Reddit fetch failed');
    
    const data = await response.json();
    const children = data?.data?.children || [];
    
    const posts = children.map(child => {
      const p = child.data;
      return {
        id: p.id,
        title: p.title,
        author: p.author,
        subreddit: p.subreddit_name_prefixed,
        url: p.url,
        thumbnail: p.thumbnail && p.thumbnail.startsWith('http') ? p.thumbnail : null,
        ups: p.ups,
        created: p.created_utc * 1000,
      };
    }).filter(p => p.title);

    _lastFetchedPoint = currentPoint;
    setPosts(posts, query);
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('[RedditLayer] Failed to update:', err);
      // Keep existing posts on error
    }
  }
}

function setPosts(posts, locationName) {
  _currentPosts = posts;
  if (_onPostsUpdated) {
    _onPostsUpdated(_currentPosts, locationName);
  }
}

export function getCurrentPosts() {
  return _currentPosts;
}
