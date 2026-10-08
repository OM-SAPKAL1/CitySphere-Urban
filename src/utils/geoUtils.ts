/**
 * CitySphere - Geo Utilities
 * Convert geographic coordinates to local scene coordinates for Three.js
 */

import { CITY_CENTER } from '../config/city';
import earcut from 'earcut';

const DEG_TO_RAD = Math.PI / 180;
const EARTH_RADIUS = 6371000;

/** Convert [lng, lat] to local [x, z] meters relative to city center */
export function geoToLocal(lng: number, lat: number): [number, number] {
  const centerLat = CITY_CENTER.latitude * DEG_TO_RAD;

  const x = (lng - CITY_CENTER.longitude) * DEG_TO_RAD * EARTH_RADIUS * Math.cos(centerLat);
  const z = -(lat - CITY_CENTER.latitude) * DEG_TO_RAD * EARTH_RADIUS;

  return [x, z];
}

/** Convert local [x, z] back to [lng, lat] */
export function localToGeo(x: number, z: number): [number, number] {
  const centerLat = CITY_CENTER.latitude * DEG_TO_RAD;

  const lng = CITY_CENTER.longitude + x / (EARTH_RADIUS * Math.cos(centerLat) * DEG_TO_RAD);
  const lat = CITY_CENTER.latitude - z / (EARTH_RADIUS * DEG_TO_RAD);

  return [lng, lat];
}

/** Convert polygon coordinates to local coordinate ring */
export function polygonToLocal(coords: number[][]): [number, number][] {
  return coords.map(([lng, lat]) => geoToLocal(lng, lat));
}

/** Convert linestring coordinates to local 3D path */
export function lineToLocal(coords: number[][]): [number, number][] {
  return coords.map(([lng, lat]) => geoToLocal(lng, lat));
}

/** Simple triangulation of a 2D polygon for Three.js geometry */
export function triangulatePolygon(
  ring: [number, number][]
): { vertices: Float32Array; indices: Uint32Array } | null {
  // Use earcut for robust triangulation
  const flatCoords: number[] = [];
  for (let i = 0; i < ring.length - 1; i++) {
    flatCoords.push(ring[i][0], ring[i][1]);
  }

  // Use imported earcut

  const indices = earcut(flatCoords, undefined, 2);
  if (indices.length === 0) return null;

  const vertices = new Float32Array(flatCoords);
  return { vertices, indices: new Uint32Array(indices) };
}

/** Compute normal for a polygon */
export function computePolygonNormal(ring: [number, number][]): number {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const j = (i + 1) % (ring.length - 1);
    area += ring[i][0] * ring[j][1] - ring[j][0] * ring[i][1];
  }
  return area / 2;
}

/** Ensure polygon winding is counter-clockwise for correct normals */
export function ensureCCW(ring: [number, number][]): [number, number][] {
  const area = computePolygonNormal(ring);
  if (area > 0) {
    return ring.slice().reverse();
  }
  return ring;
}
