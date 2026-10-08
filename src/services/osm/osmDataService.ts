/**
 * CitySphere OSM Data Service
 * 
 * Fetches real OpenStreetMap data via Overpass API with resilient multi-endpoint
 * fallback and instant cached real OpenStreetMap data for Mumbai BKC.
 * Normalizes raw OSM data into typed GeoJSON features.
 */

import { STUDY_AREA_BBOX, DEFAULT_FLOOR_HEIGHT_METERS, FALLBACK_HEIGHTS } from '../../config/city';
import bkcCityData from '../../assets/bkc_city_data.json';
import type {
  BuildingFeature,
  RoadFeature,
  POIFeature,
  ParkFeature,
  WaterFeature,
  IntersectionFeature,
} from '../../types';

const OVERPASS_ENDPOINTS = import.meta.env.DEV
  ? [
      '/api/overpass-de',
      '/api/overpass-kumi',
      '/api/overpass-lz4',
    ]
  : [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://lz4.overpass-api.de/api/interpreter',
    ];

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  nodes?: number[];
  geometry?: { lat: number; lon: number }[];
  members?: Array<{
    type: string;
    ref: number;
    role: string;
    geometry?: { lat: number; lon: number }[];
  }>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

async function queryOverpass(query: string, timeoutMs = 10000): Promise<OverpassResponse> {
  let lastError: Error | null = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.json();
      }
      lastError = new Error(`Overpass API error (${endpoint}): ${response.status} ${response.statusText}`);
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error('All Overpass API endpoints failed');
}

function buildBBox(): string {
  const { south, west, north, east } = STUDY_AREA_BBOX;
  return `${south},${west},${north},${east}`;
}

// ─── Buildings ───

export async function getBuildings(): Promise<BuildingFeature[]> {
  const bbox = buildBBox();
  const query = `
    [out:json][timeout:10];
    (
      way["building"](${bbox});
      relation["building"](${bbox});
    );
    out body geom;
  `;

  try {
    const data = await queryOverpass(query);
    const normalized = data.elements
      .filter((el) => el.geometry && el.geometry.length >= 3)
      .map((el) => normalizeBuilding(el))
      .filter((b): b is BuildingFeature => b !== null);

    if (normalized.length > 0) {
      return normalized;
    }
  } catch (err) {
    console.warn('[CitySphere] Overpass buildings query failed, using authentic OSM BKC cache:', err);
  }

  // Fallback to real OSM Bandra Kurla Complex buildings dataset
  return bkcCityData.buildings as unknown as BuildingFeature[];
}

function normalizeBuilding(el: OverpassElement): BuildingFeature | null {
  const tags = el.tags || {};
  let coords: [number, number][];

  if (el.type === 'way' && el.geometry) {
    coords = el.geometry.map((g) => [g.lon, g.lat]);
  } else if (el.type === 'relation' && el.members) {
    const outer = el.members.find((m) => m.role === 'outer' && m.geometry);
    if (!outer || !outer.geometry) return null;
    coords = outer.geometry.map((g) => [g.lon, g.lat]);
  } else {
    return null;
  }

  if (coords.length < 3) return null;

  // Close polygon if not already closed
  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    coords.push([...first] as [number, number]);
  }

  // Compute height
  const osmHeight = tags['height'] ? parseFloat(tags['height']) : undefined;
  const osmLevels = tags['building:levels'] ? parseInt(tags['building:levels'], 10) : undefined;

  let estimatedHeight: number;
  let heightSource: 'osm_height' | 'osm_levels' | 'estimated';

  if (osmHeight && !isNaN(osmHeight) && osmHeight > 0) {
    estimatedHeight = osmHeight;
    heightSource = 'osm_height';
  } else if (osmLevels && !isNaN(osmLevels) && osmLevels > 0) {
    estimatedHeight = osmLevels * DEFAULT_FLOOR_HEIGHT_METERS;
    heightSource = 'osm_levels';
  } else {
    const buildingType = tags['building'] || 'default';
    estimatedHeight = FALLBACK_HEIGHTS[buildingType] || FALLBACK_HEIGHTS['default'];
    const nameLower = (tags['name'] || '').toLowerCase();
    if (nameLower.includes('tower') || nameLower.includes('centre') || nameLower.includes('center') || nameLower.includes('bkc')) {
      estimatedHeight = Math.max(estimatedHeight, 48);
    }
    heightSource = 'estimated';
  }

  // Compute center
  const center = computePolygonCenter(coords);

  // Compute footprint area
  const footprintArea = computePolygonArea(coords);

  return {
    id: `building-${el.id}`,
    osmId: el.id,
    type: 'building',
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
    properties: {
      building: tags['building'] || 'yes',
      name: tags['name'],
      height: osmHeight,
      levels: osmLevels,
      estimatedHeight,
      heightSource,
      amenity: tags['amenity'],
      office: tags['office'],
      shop: tags['shop'],
      tourism: tags['tourism'],
      addrStreet: tags['addr:street'],
      addrHouseNumber: tags['addr:housenumber'],
      tags,
    },
    center,
    footprintArea,
  };
}

// ─── Roads ───

export async function getRoads(): Promise<RoadFeature[]> {
  const bbox = buildBBox();
  const query = `
    [out:json][timeout:10];
    (
      way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|service|pedestrian|living_street|unclassified)$"](${bbox});
    );
    out body geom;
  `;

  try {
    const data = await queryOverpass(query);
    const normalized = data.elements
      .filter((el) => el.geometry && el.geometry.length >= 2)
      .map((el) => normalizeRoad(el))
      .filter((r): r is RoadFeature => r !== null);

    if (normalized.length > 0) {
      return normalized;
    }
  } catch (err) {
    console.warn('[CitySphere] Overpass roads query failed, using authentic OSM BKC cache:', err);
  }

  // Fallback to real OSM Bandra Kurla Complex roads dataset
  return bkcCityData.roads as unknown as RoadFeature[];
}

function normalizeRoad(el: OverpassElement): RoadFeature | null {
  if (!el.geometry || el.geometry.length < 2) return null;

  const tags = el.tags || {};
  const coords = el.geometry.map((g) => [g.lon, g.lat] as [number, number]);

  // Compute length
  const length = computeLineLength(coords);

  return {
    id: `road-${el.id}`,
    osmId: el.id,
    type: 'road',
    geometry: {
      type: 'LineString',
      coordinates: coords,
    },
    properties: {
      highway: tags['highway'] || 'residential',
      name: tags['name'],
      lanes: tags['lanes'] ? parseInt(tags['lanes'], 10) : undefined,
      maxspeed: tags['maxspeed'] ? parseInt(tags['maxspeed'], 10) : undefined,
      oneway: tags['oneway'] === 'yes',
      surface: tags['surface'],
      tags,
    },
    length,
  };
}

// ─── POIs ───

export async function getPOIs(): Promise<POIFeature[]> {
  const bbox = buildBBox();
  const query = `
    [out:json][timeout:10];
    (
      node["amenity"~"^(school|hospital|clinic|college|university|library|place_of_worship|bank|atm|pharmacy|police|fire_station|post_office|fuel|parking|bus_station|cinema|theatre|restaurant|cafe)$"](${bbox});
      node["tourism"~"^(hotel|museum|attraction|viewpoint)$"](${bbox});
      node["shop"~"^(supermarket|mall|department_store)$"](${bbox});
    );
    out body;
  `;

  try {
    const data = await queryOverpass(query);
    const normalized = data.elements
      .filter((el) => el.lat !== undefined && el.lon !== undefined)
      .map((el) => normalizePOI(el));

    if (normalized.length > 0) {
      return normalized;
    }
  } catch (err) {
    console.warn('[CitySphere] Overpass POIs query failed, using authentic OSM BKC cache:', err);
  }

  return bkcCityData.pois as unknown as POIFeature[];
}

function normalizePOI(el: OverpassElement): POIFeature {
  const tags = el.tags || {};
  const poiType = tags['amenity'] || tags['tourism'] || tags['shop'] || tags['leisure'] || 'unknown';

  return {
    id: `poi-${el.id}`,
    osmId: el.id,
    type: 'poi',
    geometry: {
      type: 'Point',
      coordinates: [el.lon!, el.lat!],
    },
    properties: {
      name: tags['name'],
      amenity: tags['amenity'],
      shop: tags['shop'],
      tourism: tags['tourism'],
      leisure: tags['leisure'],
      office: tags['office'],
      poiType,
      tags,
    },
  };
}

// ─── Parks ───

export async function getParks(): Promise<ParkFeature[]> {
  const bbox = buildBBox();
  const query = `
    [out:json][timeout:10];
    (
      way["leisure"~"^(park|garden|playground|pitch|sports_centre)$"](${bbox});
      way["landuse"~"^(grass|recreation_ground|meadow)$"](${bbox});
      relation["leisure"="park"](${bbox});
    );
    out body geom;
  `;

  try {
    const data = await queryOverpass(query);
    const normalized = data.elements
      .filter((el) => el.geometry && el.geometry.length >= 3)
      .map((el) => normalizePark(el))
      .filter((p): p is ParkFeature => p !== null);

    if (normalized.length > 0) {
      return normalized;
    }
  } catch (err) {
    console.warn('[CitySphere] Overpass parks query failed, using authentic OSM BKC cache:', err);
  }

  return bkcCityData.parks as unknown as ParkFeature[];
}

function normalizePark(el: OverpassElement): ParkFeature | null {
  let coords: [number, number][];

  if (el.type === 'way' && el.geometry) {
    coords = el.geometry.map((g) => [g.lon, g.lat]);
  } else if (el.type === 'relation' && el.members) {
    const outer = el.members.find((m) => m.role === 'outer' && m.geometry);
    if (!outer || !outer.geometry) return null;
    coords = outer.geometry.map((g) => [g.lon, g.lat]);
  } else {
    return null;
  }

  if (coords.length < 3) return null;

  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    coords.push([...first] as [number, number]);
  }

  const tags = el.tags || {};
  const center = computePolygonCenter(coords);
  const area = computePolygonArea(coords);

  return {
    id: `park-${el.id}`,
    osmId: el.id,
    type: 'park',
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
    properties: {
      name: tags['name'],
      leisure: tags['leisure'],
      landuse: tags['landuse'],
      tags,
    },
    center,
    area,
  };
}

// ─── Water ───

export async function getWater(): Promise<WaterFeature[]> {
  const bbox = buildBBox();
  const query = `
    [out:json][timeout:10];
    (
      way["natural"="water"](${bbox});
      way["water"](${bbox});
      way["waterway"~"^(river|stream|canal)$"](${bbox});
      relation["natural"="water"](${bbox});
    );
    out body geom;
  `;

  try {
    const data = await queryOverpass(query);
    const normalized = data.elements
      .filter((el) => el.geometry && el.geometry.length >= 3)
      .map((el) => normalizeWater(el))
      .filter((w): w is WaterFeature => w !== null);

    if (normalized.length > 0) {
      return normalized;
    }
  } catch (err) {
    console.warn('[CitySphere] Overpass water query failed, using authentic OSM BKC cache:', err);
  }

  return bkcCityData.waters as unknown as WaterFeature[];
}

function normalizeWater(el: OverpassElement): WaterFeature | null {
  let coords: [number, number][];

  if (el.type === 'way' && el.geometry) {
    coords = el.geometry.map((g) => [g.lon, g.lat]);
  } else if (el.type === 'relation' && el.members) {
    const outer = el.members.find((m) => m.role === 'outer' && m.geometry);
    if (!outer || !outer.geometry) return null;
    coords = outer.geometry.map((g) => [g.lon, g.lat]);
  } else {
    return null;
  }

  if (coords.length < 3) return null;

  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    coords.push([...first] as [number, number]);
  }

  const tags = el.tags || {};

  return {
    id: `water-${el.id}`,
    osmId: el.id,
    type: 'water',
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
    properties: {
      name: tags['name'],
      natural: tags['natural'],
      water: tags['water'],
      tags,
    },
  };
}

// ─── Intersections ───

export function deriveIntersections(roads: RoadFeature[]): IntersectionFeature[] {
  const nodeMap = new Map<string, { position: [number, number]; roads: Set<string>; names: string[] }>();

  for (const road of roads) {
    const coords =
      road.geometry.type === 'LineString'
        ? road.geometry.coordinates
        : road.geometry.coordinates[0];

    for (const coord of coords) {
      // Round to ~10 meter precision for matching
      const key = `${(coord[0] * 10000).toFixed(0)},${(coord[1] * 10000).toFixed(0)}`;
      if (!nodeMap.has(key)) {
        nodeMap.set(key, {
          position: [coord[0], coord[1]],
          roads: new Set(),
          names: [],
        });
      }
      const node = nodeMap.get(key)!;
      node.roads.add(road.id);
      if (road.properties.name && !node.names.includes(road.properties.name)) {
        node.names.push(road.properties.name);
      }
    }
  }

  const intersections: IntersectionFeature[] = [];
  let counter = 1;

  for (const [, node] of nodeMap) {
    if (node.roads.size >= 2) {
      const name =
        node.names.length >= 2
          ? `${node.names[0]} & ${node.names[1]}`
          : node.names.length === 1
            ? `${node.names[0]} Crossing`
            : undefined;

      intersections.push({
        id: `intersection-${counter}`,
        type: 'intersection',
        position: node.position,
        connectedRoads: Array.from(node.roads),
        name,
        generatedName: name || `BKC Junction J-${String(counter).padStart(3, '0')}`,
      });
      counter++;
    }
  }

  if (intersections.length === 0 && bkcCityData.intersections) {
    return bkcCityData.intersections as unknown as IntersectionFeature[];
  }

  return intersections;
}

// ─── Utility Functions ───

function computePolygonCenter(coords: [number, number][]): [number, number] {
  let sumLng = 0;
  let sumLat = 0;
  const n = coords.length - 1; // Exclude closing point
  if (n <= 0) return coords[0] || [0, 0];
  for (let i = 0; i < n; i++) {
    sumLng += coords[i][0];
    sumLat += coords[i][1];
  }
  return [sumLng / n, sumLat / n];
}

function computePolygonArea(coords: [number, number][]): number {
  let area = 0;
  const n = coords.length - 1;
  if (n < 3) return 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += coords[i][0] * coords[j][1];
    area -= coords[j][0] * coords[i][1];
  }
  area = Math.abs(area) / 2;

  const avgLat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos((avgLat * Math.PI) / 180);
  return area * mPerDegLat * mPerDegLng;
}

function computeLineLength(coords: [number, number][]): number {
  let length = 0;
  for (let i = 1; i < coords.length; i++) {
    length += haversineDistance(coords[i - 1], coords[i]);
  }
  return length;
}

function haversineDistance(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
