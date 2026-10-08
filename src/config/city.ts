/**
 * CitySphere - City Configuration
 * 
 * Change CITY_CENTER to recenter the Digital Twin on any OSM-covered city.
 * Change STUDY_AREA_SIZE_METERS to adjust the study area.
 */

export const CITY_CENTER = {
  latitude: 19.0665,
  longitude: 72.8656,
  name: 'Mumbai',
  region: 'Maharashtra, India',
  studyArea: 'Bandra Kurla Complex',
};

export const STUDY_AREA_SIZE_METERS = 1000;

/** Compute bounding box from center + size */
export function getBoundingBox(
  center: { latitude: number; longitude: number },
  sizeMeters: number
) {
  const halfSize = sizeMeters / 2;
  const latOffset = halfSize / 111320;
  const lngOffset = halfSize / (111320 * Math.cos((center.latitude * Math.PI) / 180));

  return {
    south: center.latitude - latOffset,
    north: center.latitude + latOffset,
    west: center.longitude - lngOffset,
    east: center.longitude + lngOffset,
  };
}

export const STUDY_AREA_BBOX = getBoundingBox(CITY_CENTER, STUDY_AREA_SIZE_METERS);

/** Floor height assumption for building:levels conversion */
export const DEFAULT_FLOOR_HEIGHT_METERS = 3.2;

/** Fallback heights by building type when no height/levels data exists */
export const FALLBACK_HEIGHTS: Record<string, number> = {
  apartments: 18,
  residential: 12,
  house: 8,
  commercial: 15,
  office: 25,
  retail: 8,
  industrial: 10,
  warehouse: 8,
  church: 15,
  mosque: 12,
  temple: 10,
  hospital: 18,
  school: 12,
  university: 15,
  hotel: 22,
  yes: 10,
  default: 10,
};

export const TIMEZONE = 'Asia/Kolkata';

/** Map style - clean light basemap */
export const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

/** Road hierarchy styling */
export const ROAD_STYLES: Record<string, { width: number; color: string; zIndex: number }> = {
  motorway: { width: 8, color: '#334155', zIndex: 10 },
  trunk: { width: 7, color: '#475569', zIndex: 9 },
  primary: { width: 6, color: '#475569', zIndex: 8 },
  secondary: { width: 5, color: '#64748b', zIndex: 7 },
  tertiary: { width: 4, color: '#64748b', zIndex: 6 },
  residential: { width: 3, color: '#94a3b8', zIndex: 5 },
  service: { width: 2, color: '#a0aec0', zIndex: 4 },
  pedestrian: { width: 1.5, color: '#b0bec5', zIndex: 3 },
  default: { width: 2.5, color: '#94a3b8', zIndex: 4 },
};

/** Traffic visualization colors */
export const TRAFFIC_COLORS = {
  freeFlow: '#10b981',
  moderate: '#f59e0b',
  heavy: '#f97316',
  congested: '#ef4444',
};

/** Building colors for 3D visualization */
export const BUILDING_COLORS = {
  base: '#cbd5e1',
  tall: '#94a3b8',
  selected: '#6366f1',
  highlight: '#818cf8',
};
