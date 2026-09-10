import { initRedditLayer, updateRedditForLocation } from './data/redditLayer.js';
import * as Cesium from 'cesium';

let _viewer = null;
let _updateInterval = null;
let _contentContainer = null;

export function initRedditUi(viewer) {
  _viewer = viewer;
  
  _contentContainer = document.getElementById('local-chatter-content');
  
  const panel = document.getElementById('local-chatter-panel');
  if (panel) {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'class') {
          const isCollapsed = panel.classList.contains('collapsed');
          if (!isCollapsed) {
            startTracking();
          } else {
            stopTracking();
          }
        }
      }
    });
    
    observer.observe(panel, { attributes: true });
    
    // Check initial state
    if (!panel.classList.contains('collapsed')) {
      startTracking();
    }
  }

  const searchInput = document.getElementById('reddit-search-input');
  const searchBtn = document.getElementById('reddit-search-btn');
  
  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', () => {
      const query = searchInput.value.trim();
      if (query) performManualSearch(query);
    });
    
    searchInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) performManualSearch(query);
      }
    });
    
    // Resume auto-tracking when the user clears the input
    searchInput.addEventListener('input', () => {
      if (searchInput.value.trim() === '') {
        checkCameraLocation();
      }
    });
  }

  initRedditLayer(renderPosts);
}

async function performManualSearch(query) {
  if (!_contentContainer) return;
  _contentContainer.innerHTML = `<div style="opacity: 0.5; font-size: 12px; font-style: italic;">Searching Reddit for "${query}"...</div>`;
  
  try {
    const response = await fetch(`/api/reddit?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    renderPosts(data, query);
  } catch (err) {
    console.error('Reddit search failed:', err);
    renderPosts([], query);
  }
}

function startTracking() {
  if (_updateInterval) clearInterval(_updateInterval);
  _updateInterval = setInterval(checkCameraLocation, 2000);
  checkCameraLocation();
}

function stopTracking() {
  if (_updateInterval) {
    clearInterval(_updateInterval);
    _updateInterval = null;
  }
}

function checkCameraLocation() {
  const searchInput = document.getElementById('reddit-search-input');
  if (searchInput && searchInput.value.trim() !== '') {
    // A manual search is active, skip auto-tracking
    return;
  }

  if (!_viewer || !_viewer.camera) return;
  const cartographic = _viewer.camera.positionCartographic;
  if (cartographic) {
    const lat = Cesium.Math.toDegrees(cartographic.latitude);
    const lon = Cesium.Math.toDegrees(cartographic.longitude);
    
    // Only fetch if we are zoomed in enough (below 2000km altitude)
    if (cartographic.height < 2000000) {
      updateRedditForLocation(lat, lon);
    } else {
      renderPosts([], "Zoom in closer to see local chatter");
    }
  }
}

function renderPosts(posts, locationName) {
  if (!_contentContainer) return;
  
  if (!posts || posts.length === 0) {
    _contentContainer.innerHTML = `<div style="opacity: 0.5; font-size: 12px; font-style: italic;">No posts found for this area.</div>`;
    return;
  }

  _contentContainer.innerHTML = '';

  for (const post of posts) {
    const el = document.createElement('div');
    // Using the app's standard styling colors
    el.style.background = 'rgba(0, 30, 40, 0.4)';
    el.style.border = '1px solid var(--color-cyan-dim, rgba(0, 255, 255, 0.15))';
    el.style.borderRadius = '4px';
    el.style.padding = '10px';
    el.style.fontSize = '12px';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.gap = '6px';
    
    let contentHtml = `<div style="font-weight: 500; font-size: 13px; line-height: 1.3; color: var(--color-text-primary, #fff);">${post.title}</div>`;
    
    if (post.thumbnail) {
      contentHtml += `<img src="${post.thumbnail}" style="max-width: 100%; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1);" onerror="this.style.display='none'" />`;
    }
    
    el.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; opacity: 0.8; font-size: 10px; color: var(--color-cyan, #00ffff);">
        <span style="font-weight: bold; letter-spacing: 0.5px;">${post.subreddit}</span>
        <span>${new Date(post.created).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
      </div>
      ${contentHtml}
      <div style="display: flex; justify-content: space-between; align-items: center; opacity: 0.6; font-size: 11px;">
        <span>u/${post.author}</span>
        <span style="display: flex; align-items: center; gap: 4px;">
          <span class="material-symbols-outlined" style="font-size: 12px;">arrow_upward</span> ${post.ups}
        </span>
      </div>
    `;
    
    el.style.cursor = 'pointer';
    el.onclick = () => window.open(post.url, '_blank');
    el.onmouseover = () => { 
      el.style.background = 'rgba(0, 255, 255, 0.1)'; 
      el.style.borderColor = 'var(--color-cyan, rgba(0, 255, 255, 0.5))'; 
    };
    el.onmouseout = () => { 
      el.style.background = 'rgba(0, 30, 40, 0.4)'; 
      el.style.borderColor = 'var(--color-cyan-dim, rgba(0, 255, 255, 0.15))'; 
    };
    
    _contentContainer.appendChild(el);
  }
}
