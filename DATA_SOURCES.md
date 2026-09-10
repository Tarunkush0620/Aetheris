# Data Sources & Intelligence Feed Registry

This document catalogues all live feeds, external APIs, and local GeoJSON datasets utilized across the **40 Intelligence Layers** in **AETHERIS**.

---

## 📡 1. Air & Space Domain

| Layer Name | Identifier | Provider / API Endpoint | Format | Update Frequency | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Live Flights (ADS-B)** | `flights` | [OpenSky Network](https://opensky-network.org/) API v2 (`/states/all`) | JSON / REST | 15 seconds | Authenticated via OAuth2 Client Credentials. Live lat, lon, baro_altitude, velocity, track, squawk. |
| **Satellites (LEO/GEO)** | `satellites` | [CelesTrak](https://celestrak.org/) Active TLE Feed | 2-Line Element (TLE) | Continuous SGP4 | Computed orbital state vectors propagated in real-time. |
| **Starlink Constellation** | `starlink` | CelesTrak Starlink Catalog | TLE | Continuous SGP4 | Low Earth Orbit broadband satellite constellation mesh. |
| **Global Airports** | `airports` | [OurAirports](https://ourairports.com/) Open Data | GeoJSON | Cached / Static | ICAO/IATA codes, runways, elevation, airport type. |
| **Military Airbases** | `military_bases` | Defense Logistics / OpenStreetMap | GeoJSON | Cached / Static | Global military facilities, coordinates, base names. |
| **Airspace Sectors / FIR** | `airspace` | Eurocontrol / FAA / OpenAIP | GeoJSON | Static | Flight Information Regions (FIR) and controlled airspace volumes. |

---

## 🚢 2. Maritime & Naval Domain

| Layer Name | Identifier | Provider / API Endpoint | Format | Update Frequency | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AIS Live Vessels** | `ships` | AISHub / Barentswatch / Local Feed | JSON / WebSocket | 30 seconds | MMSI, vessel type, cargo, speed over ground, heading. |
| **Global Seaports** | `seaports` | World Port Index (NGA) / UN LOCODE | GeoJSON | Cached / Static | Port names, harbor sizes, vessel berths, cargo throughput. |
| **Submarine Cables** | `undersea_cables` | [TeleGeography](https://www.submarinecablemap.com/) | GeoJSON | Static | Global transoceanic fiber-optic cable routes and landing points. |
| **Cable Landing Stations**| `landing_stations`| TeleGeography Open Data | GeoJSON | Static | Physical coastal points where submarine fiber connects ashore. |
| **Marine Protected Areas**| `marine_protected`| UN Environment Programme (UNEP-WCMC)| GeoJSON | Static | Global maritime reserves, EEZ boundaries, conservation zones. |
| **Naval Bases & Fleets** | `naval_bases` | Open Military Open Source Data | GeoJSON | Static | Global naval dockyards, repair ports, and carrier berths. |

---

## 🏢 3. Terrestrial & Critical Infrastructure

| Layer Name | Identifier | Provider / API Endpoint | Format | Update Frequency | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Global Datacenters** | `datacenters` | Cloud & Colocation Registry | GeoJSON | Static | Hyperscale facilities (AWS, Azure, GCP, Equinix, Digital Realty). |
| **Power Plants** | `power_plants` | [Global Power Plant Database](https://datasets.wri.org/) (WRI)| GeoJSON | Static | Hydro, Nuclear, Coal, Gas, Solar, Wind capacities (MW). |
| **Dams & Reservoirs** | `dams` | Global Dam and Reservoir Database (GRANnD)| GeoJSON | Static | Water storage capacity, dam height, river catchment area. |
| **Nuclear Facilities** | `nuclear` | IAEA Power Reactor Information System | GeoJSON | Static | Operational, under-construction, and decommissioned reactors. |
| **Border Crossings** | `borders` | Natural Earth 1:10m Cultural Boundaries | GeoJSON | Static | Sovereign frontiers, disputed territories, crossing checkpoints. |
| **Pipelines (Oil/Gas)** | `pipelines` | Global Energy Monitor (GEM) | GeoJSON | Static | Major crude oil and natural gas transcontinental pipelines. |

---

## 🚨 4. Crisis, Disaster & Conflict Intelligence

| Layer Name | Identifier | Provider / API Endpoint | Format | Update Frequency | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Live Earthquakes** | `earthquakes` | [USGS Earthquake Hazards](https://earthquake.usgs.gov/) | GeoJSON Feed | 60 seconds | M2.5+ real-time events with magnitude, depth, and tsunami alerts. |
| **Active Wildfires (FIRMS)**| `wildfires` | [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/) (MODIS/VIIRS)| CSV / GeoJSON | 5 minutes | Thermal brightness temperature, fire radiative power (FRP). |
| **Global Disasters (GDACS)**| `disasters` | [GDACS](https://www.gdacs.org/) Multi-hazard RSS/JSON | GeoJSON | 2 minutes | Tropical cyclones, floods, tsunamis, volcanic eruptions. |
| **Conflict & Geopolitics** | `conflict_events`| [GDELT 2.0](https://www.gdeltproject.org/) / ACLED | GeoJSON / REST | 15 minutes | Real-time global event news geolocations, civil unrest, strikes. |
| **Weather Radar & Cloud** | `weather_radar` | OpenWeatherMap / RainViewer | Tile / Raster | 10 minutes | Global Doppler precipitation radar reflectivity tiles. |

---

## 🌐 5. Cyber & Telecommunications

| Layer Name | Identifier | Provider / API Endpoint | Format | Update Frequency | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Internet Exchange (IXPs)**| `ixp_nodes` | Packet Clearing House / PeeringDB | GeoJSON | Static | Core interconnection hubs routing global internet transit. |
| **GNSS / GPS Jamming** | `gnss_interference`| GPSJam.org / ADS-B Navigational Anomaly | GeoJSON / Grid | 1 hour | Aircraft ADS-B navigational accuracy (NIC/NAC) degradation maps. |
| **Cellular Towers** | `cell_towers` | OpenCellID Global Database | GeoJSON / Aggregated | Static | 4G/5G base transceiver station density clusters. |

---

## 💾 Local Fallback & Offline Resilience

All mission-critical static datasets are mirrored locally in:
```text
src/data/local_data/
├── dams/
├── datacenters/
├── natural_earth/
├── neighborhoods/
└── telegeography_submarine_cables/
```

When an external network connection is unavailable or rate limits are exceeded, the platform seamlessly fails over to local GeoJSON records to maintain uninterrupted operation.
