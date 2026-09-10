/**
 * spaceShared.js
 * 
 * Shared utilities for the Space Intelligence Expansion layers.
 * Handles proxy fetching for Space-Track, ESA DISCOS, SatNOGS, and CelesTrak JSON APIs.
 */

// Fetch ESA DISCOS metadata for a specific object (by NORAD ID/Object ID)
export async function fetchDiscosMetadata(objectId, { signal = null } = {}) {
  try {
    const res = await fetch(`/api/discos?${objectId}`, { signal });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('[SpaceShared] DISCOS fetch failed:', err);
    return null;
  }
}

// Fetch CelesTrak SATCAT metadata
export async function fetchSatcatMetadata({ signal = null } = {}) {
  try {
    const res = await fetch(`/api/celestrak-ext?endpoint=satcat`, { signal });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn('[SpaceShared] SATCAT fetch failed:', err);
    return [];
  }
}

// Fetch SOCRATES Conjunctions
export async function fetchSocratesConjunctions({ signal = null } = {}) {
  try {
    const res = await fetch(`/api/celestrak-ext?endpoint=socrates`, { signal });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn('[SpaceShared] SOCRATES fetch failed:', err);
    return [];
  }
}

// Fetch Space-Track GP Catalog (JSON format)
export async function fetchSpaceTrackGp(query = 'class/gp/decay_date/null-val/orderby/NORAD_CAT_ID/limit/5000/format/json', { signal = null } = {}) {
  try {
    const res = await fetch(`/api/space-track?${query}`, { signal });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn('[SpaceShared] Space-Track fetch failed:', err);
    return [];
  }
}

// Fetch SatNOGS data
export async function fetchSatNogs(apiType, endpoint, { signal = null } = {}) {
  try {
    const res = await fetch(`/api/satnogs?apiType=${apiType}&endpoint=${endpoint}`, { signal });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn(`[SpaceShared] SatNOGS ${apiType}/${endpoint} fetch failed:`, err);
    return [];
  }
}

/**
 * Converts a Space-Track or CelesTrak JSON OMM object to a Two-Line Element (TLE) string.
 * This allows us to use the existing fast `satellite.js` parser in `satellites.js`.
 * Note: OMM JSON often includes the raw TLE lines directly (TLE_LINE1, TLE_LINE2).
 */
export function ommJsonToTleLines(omm) {
  // If the JSON provides the raw TLE lines, just use them (Space-Track does this)
  if (omm.TLE_LINE1 && omm.TLE_LINE2) {
    return [omm.TLE_LINE1, omm.TLE_LINE2];
  }
  return null;
}
