import * as Cesium from 'cesium';
import { aircraftIcon } from './aircraftIcons.js';
import { holdContinuousRender, releaseContinuousRender } from '../renderGovernor.js';

export const id = 'trains';
export const name = 'Live Trains';
export const icon = '🚆';
export const source = 'Amtraker V3';
const REFRESH_INTERVAL_MS = 15000;

export const trainData = new Map(); // id -> train object
let _viewer = null;
let _intervalId = null;
let _dataSource = null;
let _enabled = false;
let _lastFetchTime = 0;
let _fetchError = null;

export function init(viewer) {
  _viewer = viewer;
}

export async function enable() {
  _enabled = true;
  if (!_viewer) return;

  if (!_dataSource) {
    _dataSource = new Cesium.CustomDataSource('trains');
    _viewer.dataSources.add(_dataSource);
  }
  _dataSource.show = true;
  _lastFetchTime = 0;
  _fetchError = null;
  await _pollTrains();
  _intervalId = setInterval(_pollTrains, REFRESH_INTERVAL_MS);
}

export async function disable() {
  _enabled = false;
  if (_intervalId) clearInterval(_intervalId);
  _intervalId = null;
  if (_dataSource) _dataSource.show = false;
}

export function update() {
  // no-op, we use setInterval for polling
}

export function getStats() {
  return {
    count: trainData.size,
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
  trainData.clear();
  _viewer = null;
  _enabled = false;
}

// Map heading compass points (N, NE, E, etc.) to radians
function headingToRadians(headingStr) {
  const map = {
    'N': 0, 'NE': 45, 'E': 90, 'SE': 135,
    'S': 180, 'SW': 225, 'W': 270, 'NW': 315
  };
  const deg = map[headingStr] || 0;
  return Cesium.Math.toRadians(deg);
}

async function _pollTrains() {
  if (!_enabled) return;
  holdContinuousRender('trains-fetch');
  try {
    const res = await fetch('/api/trains');
    if (!res.ok) throw new Error(`Train API HTTP ${res.status}`);
    const data = await res.json();
    
    // Process train data
    const activeIds = new Set();
    Object.values(data).forEach(trainArray => {
      trainArray.forEach(train => {
        if (!train.lat || !train.lon) return;
        activeIds.add(train.trainID);
        
        let entry = trainData.get(train.trainID);
        const position = Cesium.Cartesian3.fromDegrees(train.lon, train.lat, 0); // 0 altitude for ground
        const headingRad = headingToRadians(train.heading);
        const orientation = Cesium.Transforms.headingPitchRollQuaternion(
          position,
          new Cesium.HeadingPitchRoll(headingRad, 0, 0)
        );
        const iconColor = Cesium.Color.fromCssColorString(train.iconColor || '#FF5500');

        if (!entry) {
          entry = {
            id: train.trainID,
            entity: _dataSource.entities.add({
              id: `train-${train.trainID}`,
              position: position,
              orientation: orientation,
              billboard: {
                image: aircraftIcon('train'),
                scale: 0.8,
                color: iconColor,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                alignedAxis: Cesium.Cartesian3.UNIT_Z,
                rotation: -headingRad,
                distanceDisplayCondition: new Cesium.DistanceDisplayCondition(15000.0, Number.MAX_VALUE),
              },
              box: {
                dimensions: new Cesium.Cartesian3(4.0, 25.0, 5.0), // width, length, height
                material: iconColor,
                heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0.0, 15000.0),
              }
            })
          };
          trainData.set(train.trainID, entry);
        }
        
        // Update position and metadata
        entry.data = train;
        entry.entity.position = position;
        entry.entity.orientation = orientation;
        entry.entity.billboard.rotation = -headingRad;
        entry.entity.billboard.color = iconColor;
        entry.entity.box.material = iconColor;
      });
    });

    // Remove stale trains
    for (const [id, entry] of trainData.entries()) {
      if (!activeIds.has(id)) {
        _dataSource.entities.remove(entry.entity);
        trainData.delete(id);
      }
    }
    
    _lastFetchTime = Date.now();
    _fetchError = null;
  } catch (err) {
    console.warn('[Trains] Fetch failed:', err);
    _fetchError = err;
  } finally {
    releaseContinuousRender('trains-fetch');
  }
}
