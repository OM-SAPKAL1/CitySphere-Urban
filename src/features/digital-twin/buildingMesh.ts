/**
 * CitySphere - 3D Building Mesh Generator
 * Converts OSM building footprints into extruded 3D geometry using Three.js
 */

import * as THREE from 'three';
import earcut from 'earcut';
import type { BuildingFeature } from '../../types';
import { geoToLocal } from '../../utils/geoUtils';

// Make earcut available globally for geoUtils
(window as unknown as Record<string, unknown>).__earcut = earcut;

interface BuildingMeshData {
  geometry: THREE.BufferGeometry;
  buildingId: string;
  center: [number, number];
  height: number;
}

/**
 * Create merged building geometry for performance.
 * Groups buildings into a single mesh for efficient rendering.
 */
export function createBuildingGeometries(
  buildings: BuildingFeature[]
): { merged: THREE.BufferGeometry; buildingMap: Map<number, BuildingFeature> } {
  const allVertices: number[] = [];
  const allNormals: number[] = [];
  const allColors: number[] = [];
  const allIndices: number[] = [];
  const buildingMap = new Map<number, BuildingFeature>();

  let vertexOffset = 0;
  let buildingIndex = 0;

  for (const building of buildings) {
    const meshData = createSingleBuildingGeometry(building, buildingIndex);
    if (!meshData) continue;

    const positions = meshData.geometry.getAttribute('position');
    const normals = meshData.geometry.getAttribute('normal');
    const colors = meshData.geometry.getAttribute('color');
    const index = meshData.geometry.getIndex();

    if (!positions || !normals || !index) {
      meshData.geometry.dispose();
      continue;
    }

    // Copy positions
    for (let i = 0; i < positions.count; i++) {
      allVertices.push(positions.getX(i), positions.getY(i), positions.getZ(i));
    }

    // Copy normals
    for (let i = 0; i < normals.count; i++) {
      allNormals.push(normals.getX(i), normals.getY(i), normals.getZ(i));
    }

    // Copy colors (encode building index for picking)
    if (colors) {
      for (let i = 0; i < colors.count; i++) {
        allColors.push(colors.getX(i), colors.getY(i), colors.getZ(i));
      }
    } else {
      // Default building color
      const h = building.properties.estimatedHeight;
      const colorIntensity = Math.min(0.7, 0.5 + h / 100);
      for (let i = 0; i < positions.count; i++) {
        allColors.push(
          0.56 * colorIntensity,
          0.64 * colorIntensity,
          0.72 * colorIntensity
        );
      }
    }

    // Copy indices with offset
    for (let i = 0; i < index.count; i++) {
      allIndices.push(index.array[i] + vertexOffset);
    }

    buildingMap.set(buildingIndex, building);
    vertexOffset += positions.count;
    buildingIndex++;

    meshData.geometry.dispose();
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(allVertices, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(allNormals, 3));
  merged.setAttribute('color', new THREE.Float32BufferAttribute(allColors, 3));
  merged.setIndex(allIndices);

  return { merged, buildingMap };
}

function createSingleBuildingGeometry(
  building: BuildingFeature,
  _buildingIndex: number
): BuildingMeshData | null {
  const coords = building.geometry.type === 'Polygon'
    ? building.geometry.coordinates[0]
    : building.geometry.coordinates[0][0];

  if (!coords || coords.length < 4) return null;

  // Convert to local coordinates
  const localCoords = coords.map((pt) => geoToLocal(pt[0], pt[1]));

  const height = building.properties.estimatedHeight;

  // Generate extruded building geometry
  const geometry = extrudePolygon(localCoords, height, building);
  if (!geometry) return null;

  return {
    geometry,
    buildingId: building.id,
    center: building.center,
    height,
  };
}

function extrudePolygon(
  ring: [number, number][],
  height: number,
  building: BuildingFeature
): THREE.BufferGeometry | null {
  // Remove closing point for earcut
  const openRing = ring.slice(0, -1);
  if (openRing.length < 3) return null;

  // Flatten for earcut
  const flatCoords: number[] = [];
  for (const [x, z] of openRing) {
    flatCoords.push(x, z);
  }

  // Triangulate the cap
  const capIndices = earcut(flatCoords, undefined, 2);
  if (capIndices.length === 0) return null;

  const vertices: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  // Color based on height - modern architectural hues
  const h = height;
  const baseR = h > 20 ? 0.72 : h > 12 ? 0.78 : 0.84;
  const baseG = h > 20 ? 0.76 : h > 12 ? 0.82 : 0.87;
  const baseB = h > 20 ? 0.84 : h > 12 ? 0.88 : 0.92;

  // Subtle color variation per building
  const variation = ((building.osmId % 100) - 50) / 1000;
  const r = Math.max(0.2, Math.min(0.98, baseR + variation));
  const g = Math.max(0.2, Math.min(0.98, baseG + variation));
  const b = Math.max(0.2, Math.min(0.98, baseB + variation));

  // ─── Top cap ───
  const topBaseIdx = vertices.length / 3;
  const topR = h > 20 ? r * 0.95 : Math.min(1, r * 1.05);
  const topG = h > 20 ? g * 0.98 : Math.min(1, g * 1.05);
  const topB = h > 20 ? Math.min(1, b * 1.12) : Math.min(1, b * 1.05);
  for (const [x, z] of openRing) {
    vertices.push(x, height, z);
    normals.push(0, 1, 0);
    colors.push(topR, topG, topB);
  }
  for (const idx of capIndices) {
    indices.push(topBaseIdx + idx);
  }

  // ─── Bottom cap ───
  const bottomBaseIdx = vertices.length / 3;
  for (const [x, z] of openRing) {
    vertices.push(x, 0, z);
    normals.push(0, -1, 0);
    colors.push(r * 0.7, g * 0.7, b * 0.7);
  }
  for (let i = capIndices.length - 1; i >= 0; i--) {
    indices.push(bottomBaseIdx + capIndices[i]);
  }

  // ─── Sides ───
  const n = openRing.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const [x1, z1] = openRing[i];
    const [x2, z2] = openRing[j];

    // Compute wall normal
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.sqrt(dx * dx + dz * dz);
    const nx = dz / len;
    const nz = -dx / len;

    // Side shading - slight variation based on normal direction
    const sideFactor = 0.85 + 0.15 * Math.abs(nx);

    const sideBaseIdx = vertices.length / 3;

    // 4 vertices per wall quad
    vertices.push(x1, 0, z1);
    normals.push(nx, 0, nz);
    colors.push(r * sideFactor, g * sideFactor, b * sideFactor);

    vertices.push(x2, 0, z2);
    normals.push(nx, 0, nz);
    colors.push(r * sideFactor, g * sideFactor, b * sideFactor);

    vertices.push(x2, height, z2);
    normals.push(nx, 0, nz);
    colors.push(r * sideFactor * 1.05, g * sideFactor * 1.05, b * sideFactor * 1.05);

    vertices.push(x1, height, z1);
    normals.push(nx, 0, nz);
    colors.push(r * sideFactor * 1.05, g * sideFactor * 1.05, b * sideFactor * 1.05);

    // Two triangles per wall
    indices.push(sideBaseIdx, sideBaseIdx + 1, sideBaseIdx + 2);
    indices.push(sideBaseIdx, sideBaseIdx + 2, sideBaseIdx + 3);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);

  return geometry;
}

/**
 * Create highlighted outline for a selected building
 */
export function createBuildingOutline(building: BuildingFeature): THREE.LineSegments {
  const coords = building.geometry.type === 'Polygon'
    ? building.geometry.coordinates[0]
    : building.geometry.coordinates[0][0];

  const localCoords = coords.map((pt) => geoToLocal(pt[0], pt[1]));
  const height = building.properties.estimatedHeight;

  const points: THREE.Vector3[] = [];

  // Bottom outline
  for (let i = 0; i < localCoords.length - 1; i++) {
    const j = (i + 1) % (localCoords.length - 1);
    points.push(
      new THREE.Vector3(localCoords[i][0], 0.5, localCoords[i][1]),
      new THREE.Vector3(localCoords[j][0], 0.5, localCoords[j][1])
    );
  }

  // Top outline
  for (let i = 0; i < localCoords.length - 1; i++) {
    const j = (i + 1) % (localCoords.length - 1);
    points.push(
      new THREE.Vector3(localCoords[i][0], height + 0.5, localCoords[i][1]),
      new THREE.Vector3(localCoords[j][0], height + 0.5, localCoords[j][1])
    );
  }

  // Vertical edges
  for (let i = 0; i < localCoords.length - 1; i++) {
    points.push(
      new THREE.Vector3(localCoords[i][0], 0.5, localCoords[i][1]),
      new THREE.Vector3(localCoords[i][0], height + 0.5, localCoords[i][1])
    );
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0x6366f1,
    linewidth: 2.5,
    transparent: true,
    opacity: 0.95,
  });

  return new THREE.LineSegments(geometry, material);
}

/**
 * Create road geometry as lines in 3D space
 */
export function createRoadGeometry(roads: import('../../types').RoadFeature[]): THREE.Group {
  const group = new THREE.Group();
  const ROAD_STYLES: Record<string, { width: number; color: number }> = {
    motorway: { width: 3.2, color: 0x334155 },
    trunk: { width: 2.6, color: 0x475569 },
    primary: { width: 2.3, color: 0x475569 },
    secondary: { width: 1.9, color: 0x64748b },
    tertiary: { width: 1.6, color: 0x64748b },
    residential: { width: 1.1, color: 0x94a3b8 },
    service: { width: 0.8, color: 0xa0aec0 },
    pedestrian: { width: 0.6, color: 0xb0bec5 },
  };

  // Group roads by type for batch rendering
  const roadsByType = new Map<string, THREE.Vector3[][]>();

  for (const road of roads) {
    const type = road.properties.highway;
    if (!roadsByType.has(type)) {
      roadsByType.set(type, []);
    }

    const coords =
      road.geometry.type === 'LineString'
        ? road.geometry.coordinates
        : road.geometry.coordinates[0];

    const points = coords.map((pt) => {
      const [x, z] = geoToLocal(pt[0], pt[1]);
      return new THREE.Vector3(x, 0.3, z);
    });

    roadsByType.get(type)!.push(points);
  }

  // Create geometry for each road type
  for (const [type, roadPaths] of roadsByType) {
    const style = ROAD_STYLES[type] || ROAD_STYLES.residential;

    for (const points of roadPaths) {
      if (points.length < 2) continue;

      // Create road surface using ribbon geometry
      const ribbonGeom = createRoadRibbon(points, style.width);
      if (ribbonGeom) {
        const material = new THREE.MeshBasicMaterial({
          color: style.color,
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(ribbonGeom, material);
        group.add(mesh);
      }
    }
  }

  return group;
}

function createRoadRibbon(points: THREE.Vector3[], width: number): THREE.BufferGeometry | null {
  if (points.length < 2) return null;

  const vertices: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < points.length; i++) {
    let dir: THREE.Vector3;

    if (i === 0) {
      dir = new THREE.Vector3().subVectors(points[1], points[0]).normalize();
    } else if (i === points.length - 1) {
      dir = new THREE.Vector3().subVectors(points[i], points[i - 1]).normalize();
    } else {
      const d1 = new THREE.Vector3().subVectors(points[i], points[i - 1]).normalize();
      const d2 = new THREE.Vector3().subVectors(points[i + 1], points[i]).normalize();
      dir = new THREE.Vector3().addVectors(d1, d2).normalize();
    }

    // Perpendicular in XZ plane
    const perp = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(width / 2);

    const left = new THREE.Vector3().addVectors(points[i], perp);
    const right = new THREE.Vector3().subVectors(points[i], perp);

    vertices.push(left.x, left.y, left.z);
    vertices.push(right.x, right.y, right.z);
  }

  for (let i = 0; i < points.length - 1; i++) {
    const base = i * 2;
    indices.push(base, base + 1, base + 2);
    indices.push(base + 1, base + 3, base + 2);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Create park geometry as flat green polygons
 */
export function createParkGeometry(parks: import('../../types').ParkFeature[]): THREE.Group {
  const group = new THREE.Group();

  for (const park of parks) {
    const coords = park.geometry.type === 'Polygon'
      ? park.geometry.coordinates[0]
      : park.geometry.coordinates[0]?.[0];

    if (!coords || coords.length < 4) continue;

    const localCoords = coords.map((pt) => geoToLocal(pt[0], pt[1]));
    const openRing = localCoords.slice(0, -1);
    if (openRing.length < 3) continue;

    const flatCoords: number[] = [];
    for (const [x, z] of openRing) {
      flatCoords.push(x, z);
    }

    const triIndices = earcut(flatCoords, undefined, 2);
    if (triIndices.length === 0) continue;

    const vertices: number[] = [];
    for (const [x, z] of openRing) {
      vertices.push(x, 0.1, z);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(triIndices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);
  }

  return group;
}

/**
 * Create water geometry as flat blue polygons
 */
export function createWaterGeometry(water: import('../../types').WaterFeature[]): THREE.Group {
  const group = new THREE.Group();

  for (const body of water) {
    const coords = body.geometry.type === 'Polygon'
      ? body.geometry.coordinates[0]
      : body.geometry.coordinates[0]?.[0];

    if (!coords || coords.length < 4) continue;

    const localCoords = coords.map((pt) => geoToLocal(pt[0], pt[1]));
    const openRing = localCoords.slice(0, -1);
    if (openRing.length < 3) continue;

    const flatCoords: number[] = [];
    for (const [x, z] of openRing) {
      flatCoords.push(x, z);
    }

    const triIndices = earcut(flatCoords, undefined, 2);
    if (triIndices.length === 0) continue;

    const vertices: number[] = [];
    for (const [x, z] of openRing) {
      vertices.push(x, 0.05, z);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(triIndices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);
  }

  return group;
}
