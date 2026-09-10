/**
 * Aetheris Layer Panel Component
 * Implements a 48px fixed left vertical tactical dock with category icons,
 * live entity badges, and frosted glass flyout menus with toggle switches.
 */

import { AETHERIS_LAYER_GROUPS } from './data/aetherisLayerGroups.js';

export function initAetherisLayerPanel({ dataManager, styleManager, viewer }) {
  let rail = document.getElementById('aetheris-layer-rail') || document.getElementById('osiris-layer-rail');
  if (!rail) {
    rail = document.createElement('nav');
    rail.id = 'aetheris-layer-rail';
    rail.className = 'aetheris-layer-rail osiris-layer-rail';
    rail.setAttribute('aria-label', 'Data layers dock');
    document.body.appendChild(rail);
  } else {
    rail.id = 'aetheris-layer-rail';
    rail.className = 'aetheris-layer-rail osiris-layer-rail';
  }

  let pinnedGroupId = null;
  let hoveredGroupId = null;

  // Track display layer states that live outside DataManager
  const displayStates = {
    models3d: true,
    detection: false,
    scope: false,
    celestial: false,
    bloom: false,
    sharpen: true,
    'clean-ui': false,
  };

  function isLayerActive(key) {
    if (key in displayStates) return displayStates[key];
    return dataManager ? dataManager.isEnabled(key) : false;
  }

  function getLayerCount(key) {
    if (!dataManager) return null;
    const layer = typeof dataManager.get === 'function' ? dataManager.get(key) : null;
    if (!layer || !layer.stats) return null;
    const count = layer.stats.count ?? layer.stats.aircraftCount ?? layer.stats.satCount ?? layer.stats.vesselCount ?? layer.stats.totalCount;
    return typeof count === 'number' && count > 0 ? count : null;
  }

  function formatCount(num) {
    if (num === null || num === undefined) return '';
    return Number(num).toLocaleString();
  }

  async function toggleLayer(key) {
    if (key in displayStates) {
      displayStates[key] = !displayStates[key];
      handleDisplayToggle(key, displayStates[key]);
      render();
      return;
    }

    if (!dataManager) return;
    const current = dataManager.isEnabled(key);
    try {
      await dataManager.setEnabled(key, !current, { origin: 'user' });
    } catch (err) {
      console.warn(`[Aetheris] Failed to toggle layer ${key}:`, err);
    }
    render();
  }

  function handleDisplayToggle(key, active) {
    switch (key) {
      case 'models3d': {
        const btn = document.getElementById('models3d-toggle');
        if (btn) btn.click();
        break;
      }
      case 'detection': {
        const btn = document.getElementById('detection-toggle');
        if (btn) btn.click();
        break;
      }
      case 'scope': {
        const btn = document.getElementById('scope-toggle');
        if (btn) btn.click();
        break;
      }
      case 'celestial': {
        const btn = document.getElementById('celestial-toggle');
        if (btn) btn.click();
        break;
      }
      case 'bloom': {
        const btn = document.getElementById('bloom-toggle');
        if (btn) btn.click();
        break;
      }
      case 'sharpen': {
        const btn = document.getElementById('sharpen-toggle');
        if (btn) btn.click();
        break;
      }
      case 'clean-ui': {
        const btn = document.getElementById('clean-view-toggle');
        if (btn) btn.click();
        break;
      }
    }
  }

  async function toggleGroup(group) {
    const counted = group.layers.filter(l => !(l.key in displayStates));
    const anyOn = counted.some(l => dataManager && dataManager.isEnabled(l.key));
    const targetState = !anyOn;

    for (const layer of group.layers) {
      if (layer.key in displayStates) {
        displayStates[layer.key] = targetState;
        handleDisplayToggle(layer.key, targetState);
      } else if (dataManager) {
        try {
          await dataManager.setEnabled(layer.key, targetState, { origin: 'user' });
        } catch (e) {
          /* best effort */
        }
      }
    }
    render();
  }

  function render() {
    rail.innerHTML = '';

    const list = document.createElement('div');
    list.className = 'aetheris-rail-list osiris-rail-list';

    for (const group of AETHERIS_LAYER_GROUPS) {
      const activeCount = group.layers.filter(l => isLayerActive(l.key)).length;
      const isPinned = pinnedGroupId === group.id;
      const isHovered = hoveredGroupId === group.id;
      const isOpen = isPinned || isHovered;

      const groupWrapper = document.createElement('div');
      groupWrapper.className = `aetheris-group-wrapper osiris-group-wrapper${isOpen ? ' is-open' : ''}${isPinned ? ' is-pinned' : ''}`;

      // Mouse enter/leave events for flyout
      groupWrapper.addEventListener('mouseenter', () => {
        hoveredGroupId = group.id;
        renderFlyouts();
      });
      groupWrapper.addEventListener('mouseleave', () => {
        hoveredGroupId = null;
        renderFlyouts();
      });

      // Category Icon Button on Rail
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `aetheris-category-btn osiris-category-btn${activeCount > 0 ? ' has-active' : ''}${isOpen ? ' active' : ''}`;
      btn.setAttribute('aria-expanded', String(isOpen));
      btn.setAttribute('aria-label', `${group.fullLabel} (${activeCount} active)`);
      btn.title = group.fullLabel;
      btn.innerHTML = `
        <span class="aetheris-category-icon osiris-category-icon" aria-hidden="true">${group.icon}</span>
        ${activeCount > 0 ? `<span class="aetheris-category-badge osiris-category-badge">${activeCount}</span>` : ''}
      `;

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        pinnedGroupId = (pinnedGroupId === group.id) ? null : group.id;
        render();
      });

      groupWrapper.appendChild(btn);

      // Category Flyout Submenu
      const flyout = document.createElement('div');
      flyout.className = `aetheris-flyout osiris-flyout${isOpen ? ' visible' : ''}`;
      flyout.setAttribute('role', 'region');
      flyout.setAttribute('aria-label', group.fullLabel);

      // Flyout Header
      const header = document.createElement('div');
      header.className = 'aetheris-flyout-header osiris-flyout-header';
      header.innerHTML = `
        <span class="aetheris-flyout-title osiris-flyout-title">${group.fullLabel}</span>
        <div class="aetheris-flyout-actions osiris-flyout-actions">
          <button type="button" class="aetheris-batch-btn osiris-batch-btn" title="Toggle all layers in ${group.label}">
            ${activeCount > 0 ? 'NONE' : 'ALL'}
          </button>
          ${isPinned ? '<button type="button" class="aetheris-close-btn osiris-close-btn" aria-label="Close">✕</button>' : ''}
        </div>
      `;

      header.querySelector('.aetheris-batch-btn, .osiris-batch-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleGroup(group);
      });

      header.querySelector('.aetheris-close-btn, .osiris-close-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        pinnedGroupId = null;
        render();
      });

      flyout.appendChild(header);

      // Layer Items List
      const layerList = document.createElement('div');
      layerList.className = 'aetheris-layer-list osiris-layer-list';

      for (const layer of group.layers) {
        const active = isLayerActive(layer.key);
        const count = getLayerCount(layer.key);

        const row = document.createElement('button');
        row.type = 'button';
        row.className = `aetheris-layer-row osiris-layer-row${active ? ' is-active' : ''}`;
        row.setAttribute('aria-pressed', String(active));
        row.setAttribute('aria-label', layer.label);

        row.innerHTML = `
          <span class="aetheris-toggle-switch osiris-toggle-switch${active ? ' active' : ''}" aria-hidden="true">
            <span class="aetheris-toggle-thumb osiris-toggle-thumb"></span>
          </span>
          <span class="aetheris-layer-text osiris-layer-text">
            <span class="aetheris-layer-name osiris-layer-name">${layer.label}</span>
            ${layer.desc ? `<span class="aetheris-layer-desc osiris-layer-desc">${layer.desc}</span>` : ''}
          </span>
          ${count !== null ? `<span class="aetheris-layer-count osiris-layer-count">${formatCount(count)}</span>` : ''}
        `;

        row.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleLayer(layer.key);
        });

        layerList.appendChild(row);
      }

      flyout.appendChild(layerList);
      groupWrapper.appendChild(flyout);
      list.appendChild(groupWrapper);
    }

    rail.appendChild(list);
  }

  function renderFlyouts() {
    const wrappers = rail.querySelectorAll('.aetheris-group-wrapper, .osiris-group-wrapper');
    wrappers.forEach((wrapper, index) => {
      const group = AETHERIS_LAYER_GROUPS[index];
      const isPinned = pinnedGroupId === group.id;
      const isHovered = hoveredGroupId === group.id;
      const isOpen = isPinned || isHovered;

      wrapper.classList.toggle('is-open', isOpen);
      wrapper.classList.toggle('is-pinned', isPinned);

      const flyout = wrapper.querySelector('.aetheris-flyout, .osiris-flyout');
      if (flyout) flyout.classList.toggle('visible', isOpen);

      const btn = wrapper.querySelector('.aetheris-category-btn, .osiris-category-btn');
      if (btn) btn.classList.toggle('active', isOpen);
    });
  }

  // Close pinned flyout on Escape key or outside click
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && pinnedGroupId) {
      pinnedGroupId = null;
      render();
    }
  });

  document.addEventListener('click', (e) => {
    if (pinnedGroupId && !e.target.closest('#aetheris-layer-rail, #osiris-layer-rail')) {
      pinnedGroupId = null;
      render();
    }
  });

  // Subscribe to DataManager events for live counter & toggle updates
  if (dataManager && typeof dataManager.subscribe === 'function') {
    dataManager.subscribe(() => {
      render();
    });
  }

  render();

  return {
    render,
    openGroup: (id) => {
      pinnedGroupId = id;
      render();
    },
    close: () => {
      pinnedGroupId = null;
      hoveredGroupId = null;
      render();
    },
  };
}

export const initOsirisLayerPanel = initAetherisLayerPanel;
