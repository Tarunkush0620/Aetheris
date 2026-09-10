# Security Policy

## Supported Versions

Security updates are actively applied to the current main branch and stable releases.

| Version | Supported |
| :--- | :--- |
| `0.1.x` (Current Main) | :white_check_mark: |
| `< 0.1.0` | :x: |

---

## 🔒 Reporting a Vulnerability

We take the security and integrity of **AETHERIS** seriously. If you discover a vulnerability or potential exploit, please report it privately:

1. **Do not file public GitHub issues** for security vulnerabilities.
2. Email your report to: **tarunkushwaha5656@gmail.com**.
3. Include:
   - Detailed description of the vulnerability.
   - Steps to reproduce or proof-of-concept (PoC).
   - Potential impact and affected components.
   - Suggested mitigation or fix (if known).

### Response Timeline
- **Initial Acknowledgement**: Within 24 hours.
- **Triage & Impact Assessment**: Within 72 hours.
- **Fix & Disclosure Coordination**: We coordinate a patch release and advisory timeline with the reporter.

---

## 🛡️ Security Best Practices & API Key Safeguards

### 1. Client-Side API Keys & Environment Variables
- **Private Secrets**: Never commit `.env` files containing live credentials (`OPENSKY_CLIENT_SECRET`, `VITE_CESIUM_ION_TOKEN`, etc.) to public source control.
- **`.gitignore` Enforcement**: The repository `.gitignore` strictly excludes `.env`, `.env.local`, and sensitive credential dumps.
- **CORS & Rate Limiting**: Remote data feeds (OpenSky, USGS, NASA FIRMS, GDELT) should be routed through reverse proxies or edge handlers in production deployments to prevent client key exposure and rate-limit exhaustion.

### 2. Dependency Management
- Automated dependency scanning and audit:
  ```bash
  npm audit
  ```
- Keep all geospatial rendering dependencies (CesiumJS, Deck.gl, Three.js) up to date with the latest vulnerability patches.

### 3. Content Security Policy (CSP) & Iframe Sandboxing
- External tilesets and 3D glTF/3D Tiles models should be loaded only from verified origin domains (e.g., `api.cesium.com`, `tile.openstreetmap.org`, `khms0.googleapis.com`).
- Disallow arbitrary `eval()` and unsanitized HTML injections inside tooltips, tactical popups, and layer search inputs.
