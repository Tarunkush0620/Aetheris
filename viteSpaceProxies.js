import path from 'node:path';
import { promises as fsp } from 'node:fs';

export function spaceIntelligenceProxies() {
  const CACHE_DIR = path.join(process.cwd(), '.gev-cache');

  // Shared generic cache/fetch logic
  const memCache = new Map();
  const inFlight = new Map();

  async function readDisk(key) {
    try {
      const parsed = JSON.parse(await fsp.readFile(path.join(CACHE_DIR, `space-${key}.json`), 'utf8'));
      if (typeof parsed?.body === 'string' && Number.isFinite(parsed?.at)) return parsed;
    } catch { /* no disk cache yet */ }
    return null;
  }

  async function writeDisk(key, entry) {
    try {
      await fsp.mkdir(CACHE_DIR, { recursive: true });
      await fsp.writeFile(path.join(CACHE_DIR, `space-${key}.json`), JSON.stringify(entry), 'utf8');
    } catch (err) {
      console.warn(`[space-proxy] cache write failed for ${key}:`, err?.message || err);
    }
  }

  async function handleCachedProxyRequest(req, res, targetUrl, cacheKey, ttlMs, customHeaders = {}) {
    const send = (status, body, cacheStatus) => {
      if (res.headersSent) return;
      res.writeHead(status, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'x-space-cache': cacheStatus 
      });
      res.end(body);
    };

    try {
      const now = Date.now();
      let entry = memCache.get(cacheKey);
      if (!entry) {
        entry = await readDisk(cacheKey);
        if (entry) memCache.set(cacheKey, entry);
      }
      
      if (entry && now - entry.at < ttlMs) {
        send(200, entry.body, 'HIT');
        return;
      }

      if (!inFlight.has(cacheKey)) {
        inFlight.set(cacheKey, (async () => {
          try {
            const fetchRes = await fetch(targetUrl, {
              signal: AbortSignal.timeout(30000),
              headers: { 
                'User-Agent': 'aetheris-space-proxy/1.0 (+https://github.com/Tarunkush0620/Aetheris)',
                ...customHeaders 
              }
            });
            if (!fetchRes.ok) throw new Error(`HTTP ${fetchRes.status}`);
            const body = await fetchRes.text();
            const fresh = { at: Date.now(), body };
            memCache.set(cacheKey, fresh);
            await writeDisk(cacheKey, fresh);
            return fresh;
          } catch (err) {
            console.warn(`[space-proxy] ${cacheKey} fetch failed (${err?.message || err})`);
            return null;
          } finally {
            inFlight.delete(cacheKey);
          }
        })());
      }

      const fresh = await inFlight.get(cacheKey);
      if (fresh) {
        send(200, fresh.body, 'MISS');
      } else if (entry) {
        send(200, entry.body, 'STALE-ERROR');
      } else {
        // Fallback for demo purposes if CelesTrak is completely down
        if (cacheKey.includes('gp') || cacheKey.includes('spacetrack')) {
          send(200, JSON.stringify([
            {
              "OBJECT_NAME":"ISS (ZARYA)","NORAD_CAT_ID":"25544","CLASSIFICATION_TYPE":"U",
              "COUNTRY_CODE":"ISS","APOAPSIS":"420","PERIAPSIS":"415","PERIOD":"92.7",
              "TLE_LINE1":"1 25544U 98067A   26248.51347648  .00015528  00000-0  27572-3 0  9997",
              "TLE_LINE2":"2 25544  51.6402 186.2081 0004550  38.7185 106.8797 15.50291993451554"
            },
            {
              "OBJECT_NAME":"HST","NORAD_CAT_ID":"20580","CLASSIFICATION_TYPE":"U",
              "COUNTRY_CODE":"US","APOAPSIS":"540","PERIAPSIS":"537","PERIOD":"95.4",
              "TLE_LINE1":"1 20580U 90037B   26248.49132144  .00001402  00000-0  79116-4 0  9999",
              "TLE_LINE2":"2 20580  28.4695  25.4293 0002820  14.6534  80.8973 15.09311680582230"
            },
            {
              "OBJECT_NAME":"NOAA 20 (JPSS-1)","NORAD_CAT_ID":"43013","CLASSIFICATION_TYPE":"U",
              "COUNTRY_CODE":"US","APOAPSIS":"825","PERIAPSIS":"824","PERIOD":"101.4",
              "TLE_LINE1":"1 43013U 17073A   26248.00000000  .00000160  00000-0  20670-4 0  9997",
              "TLE_LINE2":"2 43013  97.7370  23.0891 0001567  73.1740 287.0000 14.95615559484564"
            },
            {
              "OBJECT_NAME":"STARLINK-2378","NORAD_CAT_ID":"48274","CLASSIFICATION_TYPE":"U",
              "COUNTRY_CODE":"US","APOAPSIS":"550","PERIAPSIS":"540","PERIOD":"95.6",
              "TLE_LINE1":"1 48274U 21035A   26248.00000000  .00000200  00000-0  25000-4 0  9991",
              "TLE_LINE2":"2 48274  97.5100 300.0000 0001234 200.0000 160.0000 15.18000000100007"
            },
            {
              "OBJECT_NAME":"INTELSAT 10-02","NORAD_CAT_ID":"27424","CLASSIFICATION_TYPE":"U",
              "COUNTRY_CODE":"US","APOAPSIS":"35800","PERIAPSIS":"35780","PERIOD":"1436",
              "TLE_LINE1":"1 27424U 02022A   26248.00000000  .00000020  00000-0  00000+0 0  9998",
              "TLE_LINE2":"2 27424   0.0300  60.0000 0003500 270.0000  90.0000  1.00270000200008"
            },
            {
              "OBJECT_NAME":"GOES 16","NORAD_CAT_ID":"29155","CLASSIFICATION_TYPE":"U",
              "COUNTRY_CODE":"US","APOAPSIS":"35800","PERIAPSIS":"35780","PERIOD":"1436",
              "TLE_LINE1":"1 29155U 06022A   26248.00000000  .00000020  00000-0  00000+0 0  9995",
              "TLE_LINE2":"2 29155   0.0200  75.0000 0004000 280.0000  80.0000  1.00270000150006"
            }
          ]), 'FALLBACK');
        } else if (cacheKey.includes('socrates')) {
          send(200, JSON.stringify([]), 'FALLBACK');
        } else if (cacheKey.includes('satnogs')) {
          send(200, JSON.stringify([]), 'FALLBACK');
        } else {
          send(502, JSON.stringify({ error: 'Upstream fetch failed and no cache available' }), 'NONE');
        }
      }
    } catch (err) {
      send(500, JSON.stringify({ error: `proxy error: ${err?.message || err}` }), 'ERROR');
    }
  }

  return {
    name: 'space-intelligence-proxies',
    configureServer(server) {
      // 1. Space-Track Proxy (Auth injected, heavy cache to respect 300/hr limit)
      server.middlewares.use('/api/space-track', async (req, res) => {
        const query = String(req.url || '').replace(/^\//, ''); // e.g. class/tle_latest/ORDINAL/1/format/json
        const user = process.env.SPACE_TRACK_USER;
        const pass = process.env.SPACE_TRACK_PASS;
        if (!user || !pass) {
          // Graceful fallback to CelesTrak active satellites if Space-Track credentials are not set
          const cacheKey = `celestrak-gp-active-json`;
          const targetUrl = `https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json`;
          return await handleCachedProxyRequest(req, res, targetUrl, cacheKey, 6 * 60 * 60 * 1000);
        }
        
        // Cache Space-Track for 1 hour to heavily protect the API limit
        const cacheKey = `spacetrack-${Buffer.from(query).toString('base64').substring(0, 32)}`;
        const targetUrl = `https://www.space-track.org/basicspacedata/query/${query}`;
        const auth = Buffer.from(`${user}:${pass}`).toString('base64');
        
        await handleCachedProxyRequest(req, res, targetUrl, cacheKey, 60 * 60 * 1000, {
          'Authorization': `Basic ${auth}`
        });
      });

      // 2. CelesTrak JSON / SOCRATES / SATCAT Proxy
      server.middlewares.use('/api/celestrak-ext', async (req, res) => {
        const urlParams = new URLSearchParams(req.url.split('?')[1]);
        const endpoint = urlParams.get('endpoint'); // e.g. 'gp.php', 'socrates.json', 'satcat.json'
        const group = urlParams.get('GROUP');
        const format = urlParams.get('FORMAT') || 'json';
        const catnr = urlParams.get('CATNR');
        
        let targetUrl = '';
        let cacheKey = '';
        
        if (endpoint === 'socrates') {
          targetUrl = 'https://celestrak.org/SOCRATES/socrates.json';
          cacheKey = 'celestrak-socrates';
        } else if (endpoint === 'satcat') {
          targetUrl = 'https://celestrak.org/satcat/satcat.json';
          cacheKey = 'celestrak-satcat';
        } else {
          // gp.php generic
          targetUrl = `https://celestrak.org/NORAD/elements/gp.php?FORMAT=${format}`;
          if (group) targetUrl += `&GROUP=${group}`;
          if (catnr) targetUrl += `&CATNR=${catnr}`;
          cacheKey = `celestrak-gp-${group || catnr}-${format}`;
        }

        // Cache CelesTrak for 6 hours
        await handleCachedProxyRequest(req, res, targetUrl, cacheKey, 6 * 60 * 60 * 1000);
      });

      // 3. ESA DISCOS Proxy
      server.middlewares.use('/api/discos', async (req, res) => {
        const query = String(req.url || '').replace(/^\//, ''); // e.g. objects?status=active
        const targetUrl = `https://discosweb.esoc.esa.int/api/${query}`;
        const cacheKey = `discos-${Buffer.from(query).toString('base64').substring(0, 32)}`;
        // Cache ESA DISCOS metadata for 24 hours (rarely changes)
        await handleCachedProxyRequest(req, res, targetUrl, cacheKey, 24 * 60 * 60 * 1000);
      });

      // 4. SatNOGS Proxy
      server.middlewares.use('/api/satnogs', async (req, res) => {
        const urlParams = new URLSearchParams(req.url.split('?')[1]);
        const apiType = urlParams.get('apiType'); // 'db' or 'network'
        const endpoint = urlParams.get('endpoint');
        
        const baseUrl = apiType === 'network' ? 'https://network.satnogs.org/api' : 'https://db.satnogs.org/api';
        const targetUrl = `${baseUrl}/${endpoint}`;
        const cacheKey = `satnogs-${apiType}-${Buffer.from(endpoint).toString('base64').substring(0, 32)}`;
        
        // Cache SatNOGS for 1 hour
        await handleCachedProxyRequest(req, res, targetUrl, cacheKey, 60 * 60 * 1000);
      });
    },
  };
}
