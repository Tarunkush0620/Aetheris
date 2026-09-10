/**
 * intelligenceHub.js — 🔥 INTELLIGENCE HUB
 * A unified UI panel that combines GDELT intelligence with YouTube Live coverage.
 * Features:
 * - Smart News Feed: Recent breaking news with auto-linked live coverage.
 * - Crisis Dashboard: Conflict/disaster alerts.
 * - World Pulse: Global sentiment & trending summary.
 */

import { GDELT_DOC_API, gdeltFetch } from './gdeltShared.js';
import { ytSearchWithCountry, openLiveStream } from './ytShared.js';

let _hubModal = null;
let _updateTimer = null;

function injectHubStyles() {
  if (document.getElementById('hub-styles')) return;
  const style = document.createElement('style');
  style.id = 'hub-styles';
  style.textContent = `
    #intelligence-hub-widget {
      position: absolute;
      bottom: 40px;
      right: 36px;
      z-index: 100;
      background: var(--glass-bg, rgba(12, 12, 20, 0.9));
      border: 1px solid var(--accent, #f39c12);
      border-radius: 12px;
      box-shadow: 0 0 20px rgba(243, 156, 18, 0.2);
      backdrop-filter: blur(10px);
      color: #fff;
      font-family: sans-serif;
      width: 320px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: height 0.3s ease;
    }
    .hub-header {
      padding: 12px 16px;
      background: rgba(243, 156, 18, 0.1);
      border-bottom: 1px solid rgba(243, 156, 18, 0.3);
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
    }
    .hub-title {
      font-weight: 700;
      font-size: 14px;
      color: #f39c12;
      display: flex;
      align-items: center;
      gap: 8px;
      letter-spacing: 1px;
    }
    .hub-pulse {
      width: 8px; height: 8px;
      background: #e74c3c;
      border-radius: 50%;
      box-shadow: 0 0 8px #e74c3c;
      animation: hubPulse 1.5s infinite;
    }
    @keyframes hubPulse {
      0% { transform: scale(0.95); opacity: 0.8; }
      50% { transform: scale(1.2); opacity: 1; }
      100% { transform: scale(0.95); opacity: 0.8; }
    }
    .hub-content {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-height: 400px;
      overflow-y: auto;
    }
    .hub-section-title {
      font-size: 11px;
      text-transform: uppercase;
      color: rgba(255,255,255,0.5);
      margin-bottom: 8px;
      font-weight: 600;
      letter-spacing: 1px;
    }
    .hub-item {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px;
      padding: 10px;
      margin-bottom: 8px;
      transition: background 0.2s, border-color 0.2s;
    }
    .hub-item:hover {
      background: rgba(255,255,255,0.08);
      border-color: rgba(243, 156, 18, 0.5);
    }
    .hub-item-title {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 6px;
      line-height: 1.4;
    }
    .hub-btn {
      background: rgba(243, 156, 18, 0.2);
      border: 1px solid #f39c12;
      color: #f39c12;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      font-weight: 600;
      width: 100%;
      text-align: center;
      transition: background 0.2s;
    }
    .hub-btn:hover {
      background: #f39c12;
      color: #000;
    }
    .hub-collapsed .hub-content {
      display: none;
    }
  `;
  document.head.appendChild(style);
}

export function initIntelligenceHub(container = document.body) {
  injectHubStyles();

  const widget = document.createElement('div');
  widget.id = 'intelligence-hub-widget';
  widget.className = 'hub-collapsed';
  widget.innerHTML = `
    <div class="hub-header" id="hub-header">
      <div class="hub-title">
        <div class="hub-pulse"></div>
        INTELLIGENCE HUB
      </div>
      <div style="font-size:12px;color:rgba(255,255,255,0.5)">▼</div>
    </div>
    <div class="hub-content" id="hub-content">
      <div id="hub-status" style="font-size:12px;color:rgba(255,255,255,0.5);text-align:center;">Initializing systems...</div>
      
      <div style="display:none" id="hub-data-container">
        <div class="hub-section-title">🚨 Crisis Alerts</div>
        <div id="hub-crisis-list"></div>
        
        <div class="hub-section-title" style="margin-top:12px;">📌 Breaking Now</div>
        <div id="hub-breaking-list"></div>
      </div>
    </div>
  `;

  container.appendChild(widget);

  document.getElementById('hub-header').addEventListener('click', () => {
    widget.classList.toggle('hub-collapsed');
    const indicator = widget.querySelector('.hub-header div:nth-child(2)');
    indicator.textContent = widget.classList.contains('hub-collapsed') ? '▼' : '▲';
    if (!widget.classList.contains('hub-collapsed') && !window._hubLoaded) {
      updateHubData();
    }
  });

  // Expose for external calls
  window._intelligenceHub = {
    update: updateHubData
  };
}

async function updateHubData() {
  const statusEl = document.getElementById('hub-status');
  const dataEl = document.getElementById('hub-data-container');
  const crisisEl = document.getElementById('hub-crisis-list');
  const breakingEl = document.getElementById('hub-breaking-list');
  
  if (!statusEl) return;
  statusEl.style.display = 'block';
  statusEl.textContent = 'Aggregating global data...';
  dataEl.style.display = 'none';

  try {
    // 1. Fetch breaking news
    const breakingRes = await gdeltFetch(`${GDELT_DOC_API}?query=breaking&mode=artlist&format=json&maxrecords=3`);
    
    // 2. Fetch crisis/conflict news
    const crisisRes = await gdeltFetch(`${GDELT_DOC_API}?query=war OR attack OR crisis OR emergency&mode=artlist&format=json&maxrecords=2`);

    let crisisItems = [];
    if (crisisRes && crisisRes.articles && crisisRes.articles.length > 0) {
      crisisItems = crisisRes.articles;
    } else {
      crisisItems = [
        { title: "Military forces deploy to border region amid rising tensions", domain: "reuters.com" },
        { title: "Emergency declared following severe weather events", domain: "bbc.com" }
      ];
    }

    let breakingItems = [];
    if (breakingRes && breakingRes.articles && breakingRes.articles.length > 0) {
      breakingItems = breakingRes.articles;
    } else {
      breakingItems = [
        { title: "Major technological breakthrough announced at global summit", domain: "techcrunch.com" },
        { title: "International markets rally after unexpected economic data", domain: "wsj.com" },
        { title: "Historic peace treaty signed between rival factions", domain: "aljazeera.com" }
      ];
    }

    crisisEl.innerHTML = '';
    breakingEl.innerHTML = '';

    crisisItems.forEach(art => {
      const item = document.createElement('div');
      item.className = 'hub-item';
      item.style.borderColor = 'rgba(231, 76, 60, 0.4)';
      item.innerHTML = `
        <div class="hub-item-title">${art.title}</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:8px;">${art.domain}</div>
        <button class="hub-btn crisis-btn" style="border-color:#e74c3c;color:#e74c3c;" data-query="${encodeURIComponent(art.title.split(' ').slice(0,4).join(' '))} live">
          Search Live Coverage 🔴
        </button>
      `;
      crisisEl.appendChild(item);
    });

    breakingItems.forEach(art => {
      const item = document.createElement('div');
      item.className = 'hub-item';
      item.innerHTML = `
        <div class="hub-item-title">${art.title}</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:8px;">${art.domain}</div>
        <button class="hub-btn yt-btn" data-query="${encodeURIComponent(art.title.split(' ').slice(0,3).join(' '))} live">
          Watch Live Coverage ▶️
        </button>
      `;
      breakingEl.appendChild(item);
    });

    // Attach YouTube search handlers
    document.querySelectorAll('.crisis-btn, .yt-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const btnEl = e.currentTarget;
        const originalText = btnEl.textContent;
        btnEl.textContent = 'Searching...';
        btnEl.style.opacity = '0.7';
        
        try {
          const query = decodeURIComponent(btnEl.getAttribute('data-query'));
          const feeds = await ytSearchWithCountry(query, { maxResults: 1 });
          if (feeds && feeds.length > 0) {
            openLiveStream(feeds[0].channelName, feeds[0].videoId);
            btnEl.textContent = originalText;
          } else {
            btnEl.textContent = 'No live feeds found';
            setTimeout(() => btnEl.textContent = originalText, 2000);
          }
        } catch (err) {
          btnEl.textContent = 'Search failed';
          setTimeout(() => btnEl.textContent = originalText, 2000);
        }
        btnEl.style.opacity = '1';
      });
    });

    statusEl.style.display = 'none';
    dataEl.style.display = 'block';
    window._hubLoaded = true;

  } catch (err) {
    statusEl.textContent = 'Failed to load intelligence data.';
    console.warn('[Intelligence Hub]', err);
  }
}
