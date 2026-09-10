import * as Cesium from 'cesium';
import { aircraftIcon } from './aircraftIcons.js';
import { isOwnedByOtherLayer, registerPickOwner, unregisterPickOwner } from './pickRegistry.js';
import { holdContinuousRender, releaseContinuousRender } from '../renderGovernor.js';

export const id = 'transit';
export const name = 'Live Transit';
export const icon = '🚌';
export const source = 'MBTA V3';
const REFRESH_INTERVAL_MS = 15000;

export const transitData = new Map(); // id -> vehicle object
let _viewer = null;
let _intervalId = null;
let _dataSource = null;
let _enabled = false;
let _lastFetchTime = 0;
let _fetchError = null;
let _clickHandler = null;
let _trackedEntityChangedRemove = null;
let _trackedTransitId = null;

function _installClickHandler(viewer) {
  if (_clickHandler) return;

  if (!_trackedEntityChangedRemove) {
    _trackedEntityChangedRemove = viewer.trackedEntityChanged.addEventListener(() => {
      if (!_enabled) return;
      if (_trackedTransitId && _viewer.trackedEntity && _viewer.trackedEntity.id !== `transit-${_trackedTransitId}`) {
        _clearTracking();
      }
    });
  }

  _clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  _clickHandler.setInputAction((click) => {
    if (!_enabled) return;
    const picked = viewer.scene.pick(click.position);

    if (picked) {
      // Ignore if clicking the already tracked bus
      if (picked.id && picked.id.id && picked.id.id === `transit-${_trackedTransitId}`) return;

      // Clicked a transit entity
      if (picked.id && picked.id.id && String(picked.id.id).startsWith('transit-')) {
        const transitId = picked.id.id.replace('transit-', '');
        _trackTransit(transitId);
        return;
      }

      // Ignore if another layer owns it
      const pickedId = picked.id ? picked.id.id : null;
      if (pickedId && isOwnedByOtherLayer('transit', pickedId)) return;
    }

    // Clicked empty space
    if (_trackedTransitId) {
      _clearTracking();
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

function _trackTransit(vehicleId) {
  _clearTracking();
  const entry = transitData.get(vehicleId);
  if (!entry || !entry.data) return;

  _trackedTransitId = vehicleId;
  _viewer.trackedEntity = entry.entity;
  
  // Frame the bus nicely from behind and above
  entry.entity.viewFrom = new Cesium.Cartesian3(0, -60, 30);

  const attrs = entry.data.attributes || {};
  const routeId = entry.data.relationships?.route?.data?.id || 'Route';
  const headsign = attrs.headsign || '';
  const status = attrs.current_status ? attrs.current_status.replace(/_/g, ' ') : 'IN TRANSIT';

  entry.entity.label = {
    text: `${routeId} ${headsign}\n${status}`,
    font: 'bold 16px sans-serif',
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    fillColor: Cesium.Color.WHITE,
    outlineColor: Cesium.Color.BLACK,
    outlineWidth: 3,
    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
    pixelOffset: new Cesium.Cartesian2(0, -60),
    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5000),
  };
}

function _clearTracking() {
  if (_trackedTransitId) {
    const entry = transitData.get(_trackedTransitId);
    if (entry && entry.entity) {
      entry.entity.label = undefined;
      entry.entity.viewFrom = undefined;
    }
    if (_viewer && _viewer.trackedEntity && _viewer.trackedEntity.id === `transit-${_trackedTransitId}`) {
      _viewer.trackedEntity = undefined;
    }
    _trackedTransitId = null;
  }
}

export function init(viewer) {
  _viewer = viewer;
}

export async function enable(viewer) {
  _enabled = true;
  _installClickHandler(viewer);
  registerPickOwner('transit', (pickedId) => String(pickedId).startsWith('transit-'));
  
  if (!_dataSource) {
    _dataSource = new Cesium.CustomDataSource('transit');
    _viewer.dataSources.add(_dataSource);
  }
  _dataSource.show = true;
  _lastFetchTime = 0;
  _fetchError = null;
  await _pollTransit();
  _intervalId = setInterval(_pollTransit, REFRESH_INTERVAL_MS);
}

export async function disable() {
  _enabled = false;
  _clearTracking();
  if (_clickHandler) {
    _clickHandler.destroy();
    _clickHandler = null;
  }
  if (_trackedEntityChangedRemove) {
    _trackedEntityChangedRemove();
    _trackedEntityChangedRemove = null;
  }
  unregisterPickOwner('transit');
  
  if (_intervalId) clearInterval(_intervalId);
  _intervalId = null;
  if (_dataSource) _dataSource.show = false;
}

export function update() {
  // no-op, we use setInterval for polling
}

export function getStats() {
  return {
    count: transitData.size,
    lastUpdate: _lastFetchTime,
    lastError: _fetchError,
  };
}

export async function destroy() {
  if (_intervalId) clearInterval(_intervalId);
  _intervalId = null;
  if (_dataSource && _viewer) {
    _viewer.dataSources.remove(_dataSource);
    _dataSource = null;
  }
  transitData.clear();
  _viewer = null;
  _enabled = false;
}

function getRouteMetadata(routeId) {
  const str = String(routeId || '');
  if (str.startsWith('Red') || str === 'Mattapan') return { color: '#DA291C', icon: 'train' };
  if (str.startsWith('Orange')) return { color: '#ED8B00', icon: 'train' };
  if (str.startsWith('Blue')) return { color: '#003DA5', icon: 'train' };
  if (str.startsWith('Green')) return { color: '#00843D', icon: 'train' };
  if (str.startsWith('CR-')) return { color: '#80276C', icon: 'train' };
  if (str.includes('Silver') || str.startsWith('74') || str.startsWith('75')) return { color: '#7C878E', icon: 'bus' };
  return { color: '#FFC72C', icon: 'bus' }; // standard bus
}

async function _pollTransit() {
  if (!_enabled) return;
  holdContinuousRender('transit-fetch');
  try {
    const res = await fetch('/api/mbta-vehicles');
    if (!res.ok) throw new Error(`Transit API HTTP ${res.status}`);
    const data = await res.json();
    
    const activeIds = new Set();
    const vehicles = data.data || [];

    vehicles.forEach(vehicle => {
      const attrs = vehicle.attributes;
      if (!attrs.latitude || !attrs.longitude) return;
      activeIds.add(vehicle.id);
      
      let entry = transitData.get(vehicle.id);
      const position = Cesium.Cartesian3.fromDegrees(attrs.longitude, attrs.latitude, 0);
      const headingRad = Cesium.Math.toRadians(attrs.bearing || 0);
      const orientation = Cesium.Transforms.headingPitchRollQuaternion(
        position,
        new Cesium.HeadingPitchRoll(headingRad, 0, 0)
      );
      
      const routeId = vehicle.relationships?.route?.data?.id;
      const meta = getRouteMetadata(routeId);
      const iconColor = Cesium.Color.fromCssColorString(meta.color);

      if (!entry) {
        const entityDef = {
          id: `transit-${vehicle.id}`,
          position: position,
          orientation: orientation,
          billboard: {
            image: aircraftIcon(meta.icon),
            scale: meta.icon === 'train' ? 0.6 : 0.45,
            color: iconColor,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            alignedAxis: Cesium.Cartesian3.UNIT_Z,
            rotation: -headingRad,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(5000.0, 150000.0),
          },
        };
        if (meta.icon === 'bus') {
          entityDef.model = {
            uri: '/models/mta_bus.glb',
            scale: 1.0,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0.0, 5000.0),
            color: iconColor,
            colorBlendMode: Cesium.ColorBlendMode.MIX,
            colorBlendAmount: 0.2,
          };
        } else {
          entityDef.box = {
            dimensions: new Cesium.Cartesian3(3.5, 25.0, 4.0),
            material: iconColor,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0.0, 5000.0),
          };
        }
        entry = {
          id: vehicle.id,
          entity: _dataSource.entities.add(entityDef),
        };
        transitData.set(vehicle.id, entry);
      }
      
      // Update position and metadata
      entry.data = vehicle;
      entry.entity.position = position;
      entry.entity.orientation = orientation;
      entry.entity.billboard.rotation = -headingRad;
      entry.entity.billboard.color = iconColor;
      if (entry.entity.box) {
        entry.entity.box.material = iconColor;
      }
      if (entry.entity.model) {
        entry.entity.model.color = iconColor;
      }
      if (_trackedTransitId === vehicle.id) {
        // Update label text in case status changes
        if (entry.entity.label) {
          const routeLabel = routeId || 'Route';
          const headsign = attrs.headsign || '';
          const status = attrs.current_status ? attrs.current_status.replace(/_/g, ' ') : 'IN TRANSIT';
          entry.entity.label.text = `${routeLabel} ${headsign}\n${status}`;
        }
      }
    });

    // Remove stale vehicles
    for (const [id, entry] of transitData.entries()) {
      if (!activeIds.has(id)) {
        if (_trackedTransitId === id) _clearTracking();
        _dataSource.entities.remove(entry.entity);
        transitData.delete(id);
      }
    }
    
    _lastFetchTime = Date.now();
    _fetchError = null;
  } catch (err) {
    console.warn('[Transit] Fetch failed:', err);
    _fetchError = err;
  } finally {
    releaseContinuousRender('transit-fetch');
  }
}
