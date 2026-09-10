/**
 * gdeltShared.js — Shared GDELT API utilities for all GDELT-based layers.
 * Centralizes: fetch helpers, info modal, icon generation.
 */
import * as Cesium from 'cesium';

/** GDELT API base URLs */
export const GDELT_DOC_API = 'https://api.gdeltproject.org/api/v2/doc/doc';
export const GDELT_GEO_API = 'https://api.gdeltproject.org/api/v2/geo/geo';
export const GDELT_TV_API  = 'https://api.gdeltproject.org/api/v2/tv/tv';

// 30-minute refresh for GDELT layers (no quota limit, but be respectful)
export const GDELT_REFRESH_INTERVAL = 1800000;

/** Generate a colored marker icon */
export function gdeltIcon(color = '#f39c12', size = 14) {
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="${color}" opacity="0.35"/>
    <circle cx="12" cy="12" r="5" fill="${color}"/>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

/** Inject the shared GDELT info modal styles (idempotent) */
export function injectGdeltModalStyles() {
  if (document.getElementById('gdelt-shared-modal-styles')) return;
  const style = document.createElement('style');
  style.id = 'gdelt-shared-modal-styles';
  style.textContent = `
    #gdelt-info-modal {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 550px;
      max-width: 90vw;
      max-height: 70vh;
      background: var(--glass-bg, rgba(12, 12, 20, 0.92));
      border: 1px solid var(--accent, #f39c12);
      border-radius: var(--panel-radius, 16px);
      box-shadow: 0 0 40px var(--accent-glow, rgba(243, 156, 18, 0.4));
      z-index: 1000;
      display: flex;
      flex-direction: column;
      backdrop-filter: blur(20px);
      transition: opacity 0.2s;
      color: #fff;
      overflow: hidden;
    }
    #gdelt-info-modal.hidden {
      opacity: 0;
      pointer-events: none;
    }
    .gdelt-modal-header {
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      flex-shrink: 0;
    }
    .gdelt-modal-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--accent, #f39c12);
    }
    .gdelt-modal-close {
      background: none;
      border: none;
      color: rgba(255,255,255,0.5);
      cursor: pointer;
      padding: 4px;
      transition: color 0.2s;
    }
    .gdelt-modal-close:hover { color: var(--accent, #f39c12); }
    .gdelt-modal-body {
      padding: 16px 20px;
      font-size: 13px;
      line-height: 1.6;
      overflow-y: auto;
      flex: 1;
    }
    .gdelt-modal-body a {
      color: var(--accent, #f39c12);
      text-decoration: none;
    }
    .gdelt-modal-body a:hover { text-decoration: underline; }
    .gdelt-meta {
      font-size: 11px;
      color: rgba(255,255,255,0.4);
      margin-top: 8px;
      font-family: monospace;
    }
    .gdelt-tone-bar {
      height: 6px;
      border-radius: 3px;
      margin: 8px 0;
      background: linear-gradient(to right, #e74c3c 0%, #f39c12 50%, #2ecc71 100%);
      position: relative;
    }
    .gdelt-tone-marker {
      position: absolute;
      top: -4px;
      width: 14px;
      height: 14px;
      background: #fff;
      border-radius: 50%;
      border: 2px solid var(--accent, #f39c12);
      transform: translateX(-50%);
    }
    .gdelt-img-thumb {
      width: 100%;
      border-radius: 8px;
      margin: 8px 0;
    }
  `;
  document.head.appendChild(style);
}

/** Create or get the shared GDELT info modal */
function ensureGdeltModal() {
  let modal = document.getElementById('gdelt-info-modal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'gdelt-info-modal';
  modal.className = 'hidden';
  modal.innerHTML = `
    <div class="gdelt-modal-header">
      <div class="gdelt-modal-title" id="gdelt-modal-title">Event</div>
      <button class="gdelt-modal-close">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"></path>
        </svg>
      </button>
    </div>
    <div class="gdelt-modal-body" id="gdelt-modal-body"></div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('.gdelt-modal-close').addEventListener('click', () => {
    modal.classList.add('hidden');
  });
  return modal;
}

/** Open the GDELT info modal with arbitrary HTML content */
export function openGdeltModal(title, bodyHtml) {
  injectGdeltModalStyles();
  const modal = ensureGdeltModal();
  document.getElementById('gdelt-modal-title').textContent = title;
  document.getElementById('gdelt-modal-body').innerHTML = bodyHtml;
  modal.classList.remove('hidden');
}

/** Close the GDELT info modal */
export function closeGdeltModal() {
  const modal = document.getElementById('gdelt-info-modal');
  if (modal) modal.classList.add('hidden');
}

/**
 * Fetch from GDELT with a timeout + fallback.
 * Returns parsed JSON or null on failure.
 */
export async function gdeltFetch(url, { signal, timeoutMs = 8000 } = {}) {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), timeoutMs);
  if (signal) signal.addEventListener('abort', () => ctrl.abort());
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(tid);
    if (!res.ok) throw new Error(`GDELT ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(tid);
    console.warn('[GDELT] Fetch failed:', url.substring(0, 80), err.message);
    return null;
  }
}
