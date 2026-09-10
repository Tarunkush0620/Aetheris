# OpenSky Network API Authentication & Setup Guide

This guide explains how to configure and verify live ADS-B flight telemetry integration with the [OpenSky Network](https://opensky-network.org/) in **AETHERIS**.

---

## 🔑 Authentication Architecture

OpenSky Network offers high-fidelity global flight tracking. While anonymous requests are heavily rate-limited (10-second resolution, restrictive quotas), authenticated accounts receive priority access and sub-second update intervals.

### OAuth2 Client Credentials Flow

1. **Authorization Server**: `https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token`
2. **Grant Type**: `client_credentials`
3. **API Base URL**: `https://opensky-network.org/api/states/all`

---

## ⚙️ Environment Configuration

Add your OpenSky Network API credentials to your root `.env` file:

```env
# OpenSky Network OAuth2 Credentials
OPENSKY_CLIENT_ID=tarunkushwaha5656@gmail.com-api-client
OPENSKY_CLIENT_SECRET=your_client_secret_here
OPENSKY_USERNAME=tarunkushwaha5656@gmail.com
OPENSKY_PASSWORD=your_account_password_here
```

> [!NOTE]
> Ensure that `.env` is never committed to version control. The client secret should be kept confidential.

---

## 🔄 Token Exchange Flow

```text
[AETHERIS] ───────── POST /openid-connect/token ───> [OpenSky Auth Server]
           <──────── 200 OK (access_token) ─────────
                
[AETHERIS] ───────── GET /api/states/all ───────────> [OpenSky REST API]
                      (Header: Bearer <token>)
           <──────── 200 OK (Live Flight States) ───
```

### Request Headers
```http
Authorization: Bearer <access_token>
Accept: application/json
```

---

## 🛰️ Live Telemetry State Vector Format

OpenSky returns an array of state vectors parsed into 3D aircraft instances:

| Index | Field | Description | Example |
| :--- | :--- | :--- | :--- |
| `[0]` | `icao24` | Unique 24-bit ICAO transponder address | `"a1b2c3"` |
| `[1]` | `callsign` | Aircraft flight number / callsign | `"UAL1234"` |
| `[2]` | `origin_country` | Country inferred from ICAO code | `"United States"` |
| `[5]` | `longitude` | WGS84 Longitude in decimal degrees | `-122.375` |
| `[6]` | `latitude` | WGS84 Latitude in decimal degrees | `37.618` |
| `[7]` | `baro_altitude` | Barometric altitude in meters | `10668.0` (FL350) |
| `[9]` | `velocity` | Ground speed in m/s | `240.5` |
| `[10]`| `true_track` | True track in decimal degrees clockwise from north | `185.2` |
| `[11]`| `vertical_rate` | Climb/descent rate in m/s | `-2.5` |
| `[14]`| `squawk` | Transponder squawk code (e.g., 7700 emergency) | `"7700"` |

---

## 🛠️ Verification & Troubleshooting

### 1. Test Token Generation
Run the following curl command in PowerShell / terminal:
```bash
curl -X POST "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=tarunkushwaha5656@gmail.com-api-client&client_secret=YOUR_SECRET"
```

### 2. Common HTTP Status Codes
- **`200 OK`**: Successfully authenticated; payload returned.
- **`401 Unauthorized`**: Invalid `client_id` or `client_secret`.
- **`429 Too Many Requests`**: Polling frequency exceeds tier limit. The platform automatically backs off and retries.
- **`503 Service Unavailable`**: OpenSky upstream maintenance; the platform activates cached flight tracks automatically.
