# Testing Guide & Verification Suite

This document outlines testing procedures, automated validation scripts, and manual verification checklists for **AETHERIS**.

---

## 🧪 Test Execution

### 1. Production Build & Static Validation
Verify that all JavaScript modules, shaders, 3D assets, and GeoJSON datasets compile with zero errors:
```bash
npm run build
```

### 2. Automated Test Runner
Run unit and integration test suites:
```bash
npm test
```

---

## 🔍 Test Coverage Areas

### 1. Data Layer Ingestion & Registry Testing
Each of the 40 intelligence layers is audited against:
- **Schema Validation**: GeoJSON feature structures, coordinates (`[lon, lat, alt]`), and property dictionaries.
- **Provider Fallback**: Graceful degradation to local cache (`src/data/local_data/`) when live APIs (OpenSky, NASA FIRMS, USGS) encounter network timeouts or HTTP 429 rate limits.
- **Lifecycle Management**: Ensuring `enableLayer(id)` mounts primitives correctly and `disableLayer(id)` frees GPU resources and Cesium/Deck.gl primitives without memory leaks.

### 2. Aetheris Dual-Rail UI Testing
- **Left Rail (Data Layer Drawer)**:
  - Collapse / Expand transition animations (48px rail to full drawer).
  - Category accordion toggle states (Air & Space, Maritime, Terrestrial, Crisis, Cyber).
  - Real-time layer search filter response (< 50ms).
  - Active layer toggle indicators, count badges, and opacity sliders.
- **Right Rail (Tactical Tools)**:
  - Tool activation exclusivity (activating Line of Sight deactivates conflicting point-picker tools).
  - Canvas mouse interaction handlers for polyline drawing, distance measurement, and radial circle placement.
- **Map Stack & HUD Widgets**:
  - `3D | 2D | MAP | SAT` mode switcher synchronizes camera pitch, globe/plane projection, and tile layers.
  - Coordinate tracker precision (Lat/Lon, MGRS, Altitude, Heading/Pitch/Roll).

### 3. OpenSky Network OAuth2 Handshake Testing
- Validation of client credentials flow (`client_id`, `client_secret`) against `https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token`.
- Token expiry, auto-refresh scheduling, and telemetry stream decoding into instanced aircraft 3D markers.

### 4. Tactical Tool Mathematics & Kinematics
- **Line of Sight (LOS)**: Accurate ray-triangle intersection against digital elevation model (DEM) and 3D buildings.
- **Threat Domes**: Proper 3D Cartesian transforms, geodesic circle projection, and dynamic altitude ceiling scaling.
- **Intercept Calculator**: Validation against standard kinematic intercept benchmarks with constant velocity vectors.

---

## 📋 Pre-Deployment QA Checklist

| Check Item | Description | Pass Criteria |
| :--- | :--- | :--- |
| **WebGL Context** | Initialize Cesium & Deck.gl canvas | Zero WebGL context loss warnings |
| **Asset Loading** | 3D models (`public/models/`), icons, sounds | 200 OK for all static assets |
| **FPS Stability** | Performance under 10k simultaneous points | >= 55 FPS on standard GPU |
| **Responsive UI** | Mobile, tablet, and ultra-wide monitor views | Rails collapse gracefully; HUD readable |
| **Token Refresh** | Live OpenSky & Satellite TLE feeds | Zero unhandled token rejections |
