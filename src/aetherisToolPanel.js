/**
 * Aetheris Tactical Tool Rail Component
 * Implements a 48px fixed right vertical dock matching the Aetheris left data layer rail.
 * Hosts STYLES, LOCATION, DISPLAY, CCTV, and CONTEXT in sleek glassmorphic flyouts.
 */

import * as Cesium from 'cesium';
import { LOCATIONS, CITY_POIS, flyToPresetLocation, searchAndFlyTo, flyToGlobeView } from './locations.js';

export const AETHERIS_TOOLS = [
  {
    id: 'styles',
    label: 'STYLES',
    fullLabel: 'VISUAL PRESETS & STYLES',
    icon: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a7 7 0 0 0 7 7c0 1.5-1 2-2 2h-1a2 2 0 0 0-2 2c0 1.5 1 2.5 1 3.5 0 2-2 3.5-3 3.5"/><circle cx="8" cy="10" r="1" fill="currentColor"/><circle cx="12" cy="7" r="1" fill="currentColor"/><circle cx="16" cy="10" r="1" fill="currentColor"/></svg>`,
    desc: 'Shader filters & 3D map engine presets',
  },
  {
    id: 'location',
    label: 'LOCATION',
    fullLabel: 'REGIONS & NAVIGATION',
    icon: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    desc: 'Global region hot zones & POI search',
  },
  {
    id: 'display',
    label: 'DISPLAY',
    fullLabel: 'DISPLAY & SHADERS',
    icon: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>`,
    desc: 'Post-processing bloom, sharpen & keyhole optics',
  },
  {
    id: 'cctv',
    label: 'CCTV',
    fullLabel: 'CCTV SURVEILLANCE',
    icon: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
    desc: 'Live camera grid & vision intelligence summaries',
  },
  {
    id: 'context',
    label: 'CONTEXT',
    fullLabel: 'TACTICAL INTEL & RADIO',
    icon: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 0 0-10 10c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/></svg>`,
    desc: 'Tracked targets, intelligence contacts & tactical radio',
  },
];

export const OSIRIS_TOOLS = AETHERIS_TOOLS;

const REGION_PRESETS = [
  { label: 'GLOBAL', lat: 20, lng: 0, alt: 25000000, icon: '🌍' },
  { label: 'EUROPE', lat: 48, lng: 10, alt: 4000000, icon: '🇪🇺' },
  { label: 'MIDDLE EAST', lat: 30, lng: 45, alt: 3500000, icon: '🔥', hot: true },
  { label: 'EAST ASIA', lat: 35, lng: 120, alt: 4000000, icon: '🌏' },
  { label: 'AMERICAS', lat: 25, lng: -90, alt: 6000000, icon: '🌎' },
  { label: 'UKRAINE', lat: 49, lng: 32, alt: 1800000, icon: '⚔️', hot: true },
  { label: 'INDIA', lat: 22, lng: 78, alt: 3500000, icon: '🇮🇳' },
  { label: 'ARCTIC', lat: 75, lng: 0, alt: 5000000, icon: '❄️' },
  { label: 'AUSTRALIA', lat: -25, lng: 134, alt: 4500000, icon: '🇦🇺' },
  { label: 'AFRICA', lat: 5, lng: 20, alt: 6000000, icon: '🌍' },
];

export function initAetherisToolPanel({ styleManager, viewer, dataManager }) {
  let rail = document.getElementById('aetheris-tool-rail') || document.getElementById('osiris-tool-rail');
  if (!rail) {
    rail = document.createElement('nav');
    rail.id = 'aetheris-tool-rail';
    rail.className = 'aetheris-tool-rail osiris-tool-rail';
    rail.setAttribute('aria-label', 'Tactical tools dock');
    document.body.appendChild(rail);
  } else {
    rail.id = 'aetheris-tool-rail';
    rail.className = 'aetheris-tool-rail osiris-tool-rail';
  }

  let pinnedToolId = null;
  let hoveredToolId = null;

  function render() {
    rail.innerHTML = '';

    const list = document.createElement('div');
    list.className = 'aetheris-tool-list osiris-tool-list';

    for (const tool of AETHERIS_TOOLS) {
      const isPinned = pinnedToolId === tool.id;
      const isHovered = hoveredToolId === tool.id;
      const isOpen = isPinned || isHovered;

      const groupWrapper = document.createElement('div');
      groupWrapper.className = `aetheris-tool-wrapper osiris-tool-wrapper${isOpen ? ' is-open' : ''}${isPinned ? ' is-pinned' : ''}`;

      groupWrapper.addEventListener('mouseenter', () => {
        hoveredToolId = tool.id;
        renderFlyouts();
      });
      groupWrapper.addEventListener('mouseleave', () => {
        hoveredToolId = null;
        renderFlyouts();
      });

      // Category Icon Button on Right Rail
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `aetheris-tool-btn osiris-tool-btn${isOpen ? ' active' : ''}`;
      btn.setAttribute('aria-expanded', String(isOpen));
      btn.setAttribute('aria-label', tool.fullLabel);
      btn.title = tool.fullLabel;
      btn.innerHTML = `
        <span class="aetheris-tool-icon osiris-tool-icon" aria-hidden="true">${tool.icon}</span>
      `;

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        pinnedToolId = (pinnedToolId === tool.id) ? null : tool.id;
        render();
      });

      groupWrapper.appendChild(btn);

      // Tool Flyout Panel (Opening to the Left of the Right Rail)
      const flyout = document.createElement('div');
      flyout.className = `aetheris-tool-flyout osiris-tool-flyout${isOpen ? ' visible' : ''}`;
      flyout.setAttribute('role', 'region');
      flyout.setAttribute('aria-label', tool.fullLabel);

      // Flyout Header
      const header = document.createElement('div');
      header.className = 'aetheris-tool-flyout-header osiris-tool-flyout-header';
      header.innerHTML = `
        <span class="aetheris-tool-flyout-title osiris-tool-flyout-title">${tool.label}</span>
        <span class="aetheris-tool-flyout-desc osiris-tool-flyout-desc">${tool.desc}</span>
        <button type="button" class="aetheris-tool-close-btn osiris-tool-close-btn" aria-label="Close">✕</button>
      `;

      header.querySelector('.aetheris-tool-close-btn, .osiris-tool-close-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        pinnedToolId = null;
        render();
      });

      flyout.appendChild(header);

      // Flyout Content Body
      const body = document.createElement('div');
      body.className = 'aetheris-tool-flyout-body osiris-tool-flyout-body';

      buildToolBody(tool.id, body, { styleManager, viewer, dataManager });

      flyout.appendChild(body);
      groupWrapper.appendChild(flyout);
      list.appendChild(groupWrapper);
    }

    rail.appendChild(list);
  }

  function renderFlyouts() {
    const wrappers = rail.querySelectorAll('.aetheris-tool-wrapper, .osiris-tool-wrapper');
    wrappers.forEach((wrapper, index) => {
      const tool = AETHERIS_TOOLS[index];
      const isPinned = pinnedToolId === tool.id;
      const isHovered = hoveredToolId === tool.id;
      const isOpen = isPinned || isHovered;

      wrapper.classList.toggle('is-open', isOpen);
      wrapper.classList.toggle('is-pinned', isPinned);

      const flyout = wrapper.querySelector('.aetheris-tool-flyout, .osiris-tool-flyout');
      if (flyout) flyout.classList.toggle('visible', isOpen);

      const btn = wrapper.querySelector('.aetheris-tool-btn, .osiris-tool-btn');
      if (btn) btn.classList.toggle('active', isOpen);
    });
  }

  function buildToolBody(toolId, container, { styleManager, viewer, dataManager }) {
    switch (toolId) {
      case 'styles': {
        const styleButtons = document.getElementById('style-buttons');
        const mapStackSection = document.querySelector('.map-source-section');
        if (styleButtons) {
          const styleGridClone = styleButtons.cloneNode(true);
          styleGridClone.id = 'aetheris-style-buttons';
          styleGridClone.querySelectorAll('.style-btn').forEach(b => {
            b.addEventListener('click', (e) => {
              e.stopPropagation();
              const style = b.getAttribute('data-style');
              if (style && styleManager?.setStyle) {
                styleManager.setStyle(style);
                updateActiveStyles(styleGridClone, style);
              }
            });
          });
          container.appendChild(styleGridClone);
        }
        if (mapStackSection) {
          const mapSectionClone = mapStackSection.cloneNode(true);
          container.appendChild(mapSectionClone);
        }
        break;
      }

      case 'location': {
        // Search Input
        const searchWrap = document.createElement('div');
        searchWrap.className = 'aetheris-search-wrap osiris-search-wrap';
        searchWrap.innerHTML = `
          <input type="text" class="aetheris-search-input osiris-search-input" placeholder="Search cities, coordinates, landmarks..." />
        `;
        const searchInput = searchWrap.querySelector('input');
        searchInput?.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && searchInput.value.trim()) {
            searchAndFlyTo(searchInput.value.trim(), viewer);
          }
        });
        container.appendChild(searchWrap);

        // Region Presets (Aetheris Style)
        const regionTitle = document.createElement('div');
        regionTitle.className = 'aetheris-subheading osiris-subheading';
        regionTitle.innerHTML = `<span>REGION HOT ZONES</span><span class="aetheris-hot-badge osiris-hot-badge">${REGION_PRESETS.filter(r => r.hot).length} HOT</span>`;
        container.appendChild(regionTitle);

        const regionGrid = document.createElement('div');
        regionGrid.className = 'aetheris-region-grid osiris-region-grid';
        for (const reg of REGION_PRESETS) {
          const rBtn = document.createElement('button');
          rBtn.type = 'button';
          rBtn.className = `aetheris-region-btn osiris-region-btn${reg.hot ? ' is-hot' : ''}`;
          rBtn.innerHTML = `
            <span class="aetheris-region-icon osiris-region-icon">${reg.icon}</span>
            <span class="aetheris-region-label osiris-region-label">${reg.label}</span>
            ${reg.hot ? '<span class="aetheris-pulse-dot osiris-pulse-dot"></span>' : ''}
          `;
          rBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (viewer) {
              viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(reg.lng, reg.lat, reg.alt),
                duration: 2.5,
              });
            }
          });
          regionGrid.appendChild(rBtn);
        }
        container.appendChild(regionGrid);

        // City POI Jump List
        const cityTitle = document.createElement('div');
        cityTitle.className = 'aetheris-subheading osiris-subheading';
        cityTitle.textContent = 'METROPOLITAN HUBS';
        container.appendChild(cityTitle);

        const cityGrid = document.createElement('div');
        cityGrid.className = 'aetheris-city-grid osiris-city-grid';
        const cities = [
          { id: 'austin', name: 'Austin' },
          { id: 'sf', name: 'San Francisco' },
          { id: 'nyc', name: 'New York' },
          { id: 'tokyo', name: 'Tokyo' },
          { id: 'london', name: 'London' },
        ];
        for (const city of cities) {
          const cBtn = document.createElement('button');
          cBtn.type = 'button';
          cBtn.className = 'aetheris-city-btn osiris-city-btn';
          cBtn.textContent = city.name;
          cBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            flyToPresetLocation(viewer, city.id);
          });
          cityGrid.appendChild(cBtn);
        }
        container.appendChild(cityGrid);
        break;
      }

      case 'display': {
        const ppToggles = document.getElementById('pp-toggles');
        if (ppToggles) {
          const ppClone = ppToggles.cloneNode(true);
          ppClone.id = 'aetheris-pp-controls';
          ppClone.classList.remove('collapsed', 'panel-collapsible');
          container.appendChild(ppClone);
        }
        break;
      }

      case 'cctv': {
        const cctvPanel = document.getElementById('cctv-panel');
        if (cctvPanel) {
          const cctvInner = cctvPanel.querySelector('.cctv-panel-inner');
          if (cctvInner) {
            const clone = cctvInner.cloneNode(true);
            container.appendChild(clone);
          }
        }
        break;
      }

      case 'context': {
        const contextPanel = document.getElementById('global-context-panel');
        if (contextPanel) {
          const contextInner = contextPanel.querySelector('.global-context-panel-inner');
          if (contextInner) {
            const clone = contextInner.cloneNode(true);
            container.appendChild(clone);
          }
        }
        break;
      }
    }
  }

  function updateActiveStyles(container, activeStyle) {
    container.querySelectorAll('.style-btn').forEach(b => {
      const isCurrent = b.getAttribute('data-style') === activeStyle;
      b.classList.toggle('active', isCurrent);
    });
  }

  // Keyboard shortcut & outside click handlers
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && pinnedToolId) {
      pinnedToolId = null;
      render();
    }
  });

  document.addEventListener('click', (e) => {
    if (pinnedToolId && !e.target.closest('#aetheris-tool-rail, #osiris-tool-rail')) {
      pinnedToolId = null;
      render();
    }
  });

  render();

  return {
    render,
    openTool: (id) => {
      pinnedToolId = id;
      render();
    },
    close: () => {
      pinnedToolId = null;
      hoveredToolId = null;
      render();
    },
  };
}

export const initOsirisToolPanel = initAetherisToolPanel;
