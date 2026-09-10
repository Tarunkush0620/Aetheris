/**
 * Aetheris Layer Groups Definition
 * Categorizes all live telemetry and data sources into tactical groups
 * with icons, labels, descriptions, and batch control support.
 * All layer keys map 1:1 to canonical DataLayerManager IDs.
 */

export const AETHERIS_LAYER_GROUPS = [
  {
    id: 'aviation',
    label: 'AVIATION',
    fullLabel: 'AERIAL RADAR & FLIGHTS',
    icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`,
    layers: [
      { key: 'flights', label: 'Commercial Flights', desc: 'OpenSky Network · Global ADS-B' },
      { key: 'military', label: 'Military Flights', desc: 'adsb.lol · Defense Transponders' },
    ],
  },
  {
    id: 'maritime',
    label: 'MARITIME',
    fullLabel: 'MARITIME & SUBSEA',
    icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.34-.42-.6-.48L20 13V5c0-1.1-.9-2-2-2h-3V1h-2v2h-2V1H9v2H6c-1.1 0-2 .9-2 2v8l-1.28.26c-.26.06-.48.24-.6.48s-.14.52-.06.78L3.95 19zM6 5h12v7.19l-6-1.2-6 1.2V5z"/></svg>`,
    layers: [
      { key: 'ais-live-vessels', label: 'AIS Live Vessels', desc: 'AISStream · Real-Time AIS' },
      { key: 'fishing-watch', label: 'Global Fishing Watch', desc: 'Vessel Tracking & Fleet Intel' },
      { key: 'telegeography-submarine-cables', label: 'Submarine Fiber Cables', desc: 'TeleGeography Global Subsea Mesh' },
    ],
  },
  {
    id: 'space',
    label: 'SPACE',
    fullLabel: 'SPACE & ORBITAL ASSETS',
    icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M5 2c-1.66 0-3 1.34-3 3 0 1.31.84 2.41 2 2.83V11c0 1.1.9 2 2 2h3v1.17c-1.16.41-2 1.52-2 2.83 0 1.66 1.34 3 3 3s3-1.34 3-3c0-1.31-.84-2.42-2-2.83V13h3c1.1 0 2-.9 2-2V7.83c1.16-.42 2-1.52 2-2.83 0-1.66-1.34-3-3-3s-3 1.34-3 3c0 1.31.84 2.41 2 2.83V11h-4V7.83c1.16-.42 2-1.52 2-2.83 0-1.66-1.34-3-3-3S7 3.34 7 5c0 1.31.84 2.41 2 2.83V11H7V7.83C8.16 7.41 9 6.31 9 5c0-1.66-1.34-3-3-3zM5 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm14 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm0 13c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z"/></svg>`,
    layers: [
      { key: 'satellites', label: 'All Satellites', desc: 'CelesTrak SGP4 / Ephemeris' },
      { key: 'rocket-launches', label: 'Space Missions', desc: 'Launch Library 2 · 30d Timeline' },
      { key: 'celestrak-debris', label: 'Space Debris', desc: 'Tracked Orbital Fragments' },
      { key: 'satnogs-stations', label: 'SatNOGS Network', desc: 'Decentralized Ground Stations' },
      { key: 'satnogs-transmitters', label: 'Sat Transmitters', desc: 'Active Satellite Transmitters' },
      { key: 'celestrak-socrates', label: 'SOCRATES Conjunctions', desc: 'Orbital Collision Proximity' },
      { key: 'space-track', label: 'SpaceTrack Catalog', desc: 'Official 18th Space Defense Catalog' },
      { key: 'yt-space', label: 'Live ISS Downlinks', desc: 'NASA / Space Video Streams' },
    ],
  },
  {
    id: 'surveillance',
    label: 'SURVEIL',
    fullLabel: 'SURVEILLANCE & OPTICAL',
    icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4zM14 13h-3v3H9v-3H6v-2h3V8h2v3h3v2z"/></svg>`,
    layers: [
      { key: 'cctv', label: 'CCTV Traffic Cameras', desc: 'City DOT & Intersections Feeds' },
      { key: 'yt-traffic-cams', label: 'Live Traffic Feeds', desc: 'Highways & Metropolis Cams' },
      { key: 'yt-webcams', label: 'Global City Webcams', desc: 'EarthCam & City Streams' },
      { key: 'yt-events', label: 'Live Global Events', desc: 'Real-Time News & Event Cameras' },
    ],
  },
  {
    id: 'hazards',
    label: 'HAZARDS',
    fullLabel: 'NATURAL HAZARDS & WEATHER',
    icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2c1.1 0 2 .9 2 2 0 .74-.4 1.38-1 1.72v2.34l3.22 1.86c.64-.58 1.49-.92 2.42-.92 1.93 0 3.5 1.57 3.5 3.5 0 .93-.34 1.78-.92 2.42L20 18.14V20c0 1.1-.9 2-2 2h-1.86l-1.86-3.22c-.58.64-1.43.98-2.36.98-1.93 0-3.5-1.57-3.5-3.5 0-.93.34-1.78.92-2.42L6 10.62V8c0-1.1.9-2 2-2h1.86l1.86-3.22c.34-.6 1-.98 1.74-.98s1.4.38 1.74.98L17.2 6H19c.55 0 1 .45 1 1v1.8l-1.8 1.04-1.4-1.4L15 9.8l1.4 1.4-1.04 1.8H13.5v2h1.86l1.04 1.8-1.4 1.4 1.4 1.4-1.4-1.4-1.8 1.04V21h-2v-1.86l-1.8-1.04-1.4 1.4-1.4-1.4 1.4-1.4-1.04-1.8H9v-2H7.14l-1.04-1.8 1.4-1.4-1.4-1.4 1.4 1.4 1.8-1.04V7c0-.55.45-1 1-1h1.8l1.04-1.8L12 2z"/></svg>`,
    layers: [
      { key: 'earthquakes', label: 'USGS Earthquakes', desc: 'Real-Time M2.5+ Global Events' },
      { key: 'firms-thermal', label: 'NASA FIRMS Fires', desc: 'MODIS/VIIRS Active Thermal Hotspots' },
      { key: 'dams', label: 'Global Dams & Reservoirs', desc: 'GRANnD Water Infrastructure' },
      { key: 'weather-radar', label: 'Doppler Weather Radar', desc: 'RainViewer Precipitation Tiles' },
      { key: 'volcanoes', label: 'Volcanic Activity', desc: 'Global Eruption & Alert Status' },
    ],
  },
  {
    id: 'defense',
    label: 'DEFENSE',
    fullLabel: 'DEFENSE & INFRASTRUCTURE',
    icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>`,
    layers: [
      { key: 'military-installations', label: 'Military Bases', desc: 'Defense Logistics Global Facilities' },
      { key: 'datacenters', label: 'Global Data Centers', desc: 'Cloud & Colocation Infrastructure' },
      { key: 'natural-earth-borders', label: 'Sovereign Borders', desc: '1:10m Cultural Boundaries' },
      { key: 'sf-neighborhoods', label: 'Urban Districts', desc: 'Metro Neighborhood Polygons' },
    ],
  },
  {
    id: 'broadcast',
    label: 'SIGNALS',
    fullLabel: 'RADIO & SIGNALS INTEL',
    icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 2.85 1.2 5.42 3.12 7.24l1.42-1.42C4.94 16.27 4 14.25 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8c0 2.25-.94 4.27-2.54 5.82l1.42 1.42C20.8 17.42 22 14.85 22 12c0-5.52-4.48-10-10-10zm0 4c-3.31 0-6 2.69-6 6 0 1.71.72 3.25 1.88 4.34l1.42-1.42C8.54 14.22 8 13.17 8 12c0-2.21 1.79-4 4-4s4 1.79 4 4c0 1.17-.54 2.22-1.3 2.92l1.42 1.42C17.28 15.25 18 13.71 18 12c0-3.31-2.69-6-6-6zm0 4c-1.1 0-2 .9-2 2 0 .58.25 1.1.65 1.47l1.35-1.35V12c0-.55.45-1 1-1s1 .45 1 1v.12l1.35 1.35c.4-.37.65-.89.65-1.47 0-1.1-.9-2-2-2z"/></svg>`,
    layers: [
      { key: 'radio', label: 'Broadcast Radio Streams', desc: 'Global Live Radio Stations' },
      { key: 'atc-audio', label: 'Live ATC Tower Audio', desc: 'Airport Tower Transmissions' },
    ],
  },
  {
    id: 'ground',
    label: 'GROUND',
    fullLabel: 'GROUND TRANSIT & VEHICLES',
    icon: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.08 3.11H5.77L6.85 7zM19 17H5v-4.66l.12-.34h13.77l.11.34V17z"/><circle cx="7.5" cy="14.5" r="1.5"/><circle cx="16.5" cy="14.5" r="1.5"/></svg>`,
    layers: [
      { key: 'ground-traffic', label: 'Road Traffic Flow', desc: 'Global Real-Time Transit Speed' },
      { key: 'mta-bus', label: 'Metro Buses (Live)', desc: 'GPS Vehicle Locations' },
    ],
  },
];

export const OSIRIS_LAYER_GROUPS = AETHERIS_LAYER_GROUPS;
