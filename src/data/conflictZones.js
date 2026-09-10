import * as Cesium from 'cesium';

// The 13 Active Zones from the Static OSINT Intel
const ZONES = [
  { name: 'UKRAINE WAR', lat: 48.3794, lng: 31.1656, severity: 'red' },
  { name: 'GAZA CONFLICT', lat: 31.4167, lng: 34.3333, severity: 'red' },
  { name: 'SAHEL INSTABILITY', lat: 14.4974, lng: -4.2758, severity: 'orange' },
  { name: 'SUDAN CIVIL WAR', lat: 12.8628, lng: 30.2176, severity: 'red' },
  { name: 'ETHIOPIA', lat: 9.145, lng: 40.4897, severity: 'orange' },
  { name: 'SOMALIA', lat: 5.1521, lng: 46.1996, severity: 'orange' },
  { name: 'DRC EASTERN CONFLICT', lat: -2.3995, lng: 28.8524, severity: 'red' },
  { name: 'YEMEN WAR', lat: 15.5527, lng: 48.5164, severity: 'red' },
  { name: 'MYANMAR CONFLICT', lat: 21.914, lng: 95.956, severity: 'red' },
  { name: 'TAIWAN STRAIT', lat: 24.1678, lng: 119.5495, severity: 'orange' },
  { name: 'KOREAN DMZ', lat: 38.3308, lng: 127.1593, severity: 'orange' },
  { name: 'HAITI', lat: 18.9712, lng: -72.2852, severity: 'red' },
  { name: 'MEXICAN CARTEL CONFLICT', lat: 23.6345, lng: -102.5528, severity: 'orange' }
];

function generateWarningSvg(color) {
  // Simple Warning Triangle SVG
  const fill = color === 'red' ? '#e74c3c' : '#f39c12';
  const svg = `<svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L1 21h22L12 2zm0 3.8l7.5 13.2H4.5L12 5.8zm-1 3v5h2v-5h-2zm0 6v2h2v-2h-2z" fill="${fill}"/></svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

export function initConflictZones(viewer) {
  const dataSource = new Cesium.CustomDataSource('conflictZones');
  viewer.dataSources.add(dataSource);

  ZONES.forEach(zone => {
    dataSource.entities.add({
      position: Cesium.Cartesian3.fromDegrees(zone.lng, zone.lat),
      billboard: {
        image: generateWarningSvg(zone.severity),
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -5)
      },
      label: {
        text: zone.name,
        font: 'bold 10px sans-serif',
        fillColor: zone.severity === 'red' ? Cesium.Color.fromCssColorString('#e74c3c') : Cesium.Color.fromCssColorString('#f39c12'),
        style: Cesium.LabelStyle.FILL,
        verticalOrigin: Cesium.VerticalOrigin.TOP,
        pixelOffset: new Cesium.Cartesian2(0, 0)
      }
    });
  });

  return dataSource;
}
