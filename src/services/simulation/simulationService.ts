/**
 * CitySphere - Simulation Data Service
 * Provides prototype/simulated city state data.
 * All values are clearly marked as SIMULATED.
 * Architecture ready for future WebSocket/real-time replacement.
 */

import type {
  CityMetrics,
  JunctionPerformance,
  Vehicle,
  CongestionLevel,
  IntersectionFeature,
  RoadFeature,
} from '../../types';
import { TRAFFIC_COLORS } from '../../config/city';

// ─── Simulated City Metrics ───

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function generateCityMetrics(): CityMetrics {
  return {
    vehiclesTracked: Math.round(randomBetween(250, 400)),
    vehiclesPerHourAtJunctions: Math.round(randomBetween(8000, 12000)),
    co2PerHour: parseFloat(randomBetween(1.8, 3.2).toFixed(2)),
    congestionCostPerHour: Math.round(randomBetween(1800, 3200)),
    isSimulated: true,
  };
}

// ─── Simulated Junction Performance ───

const CONGESTION_LEVELS: CongestionLevel[] = ['free-flow', 'moderate', 'heavy', 'congested'];

export function generateJunctionPerformance(
  intersections: IntersectionFeature[]
): JunctionPerformance[] {
  // Pick up to 15 most connected intersections
  const sorted = [...intersections].sort(
    (a, b) => b.connectedRoads.length - a.connectedRoads.length
  );
  const topJunctions = sorted.slice(0, 15);

  return topJunctions.map((intersection, _idx) => {
    const congestionLevel = CONGESTION_LEVELS[Math.floor(Math.random() * 3)]; // bias toward less congested
    const vehiclesPerHour = Math.round(randomBetween(600, 1500));
    const avgDelay =
      congestionLevel === 'free-flow'
        ? randomBetween(5, 15)
        : congestionLevel === 'moderate'
          ? randomBetween(15, 35)
          : congestionLevel === 'heavy'
            ? randomBetween(35, 60)
            : randomBetween(60, 120);

    return {
      id: intersection.id,
      name: intersection.generatedName || intersection.name || `Junction ${intersection.id}`,
      position: intersection.position,
      congestionLevel,
      vehiclesPerHour,
      avgDelay: parseFloat(avgDelay.toFixed(1)),
      co2PerHour: parseFloat(randomBetween(10, 80).toFixed(1)),
      costPerHour: Math.round(randomBetween(50, 500)),
      historyCost: Array.from({ length: 60 }, () => Math.round(randomBetween(30, 300))),
      isSimulated: true,
    };
  });
}

// ─── Simulated Vehicles ───

export function generateVehicles(
  roads: RoadFeature[],
  density: 'low' | 'medium' | 'high'
): Vehicle[] {
  const count = density === 'low' ? 30 : density === 'medium' ? 80 : 150;
  const vehicles: Vehicle[] = [];
  const eligibleRoads = roads.filter(
    (r) =>
      r.properties.highway !== 'pedestrian' &&
      r.properties.highway !== 'service' &&
      r.geometry.type === 'LineString' &&
      r.geometry.coordinates.length >= 2
  );

  if (eligibleRoads.length === 0) return vehicles;

  const types: Vehicle['type'][] = ['car', 'car', 'car', 'bus', 'truck', 'auto-rickshaw'];

  for (let i = 0; i < count; i++) {
    const road = eligibleRoads[Math.floor(Math.random() * eligibleRoads.length)];
    const coords =
      road.geometry.type === 'LineString'
        ? road.geometry.coordinates
        : road.geometry.coordinates[0];

    const progress = Math.random();
    const segmentIdx = Math.floor(progress * (coords.length - 1));
    const t = progress * (coords.length - 1) - segmentIdx;
    const p1 = coords[Math.min(segmentIdx, coords.length - 1)];
    const p2 = coords[Math.min(segmentIdx + 1, coords.length - 1)];

    const lng = p1[0] + (p2[0] - p1[0]) * t;
    const lat = p1[1] + (p2[1] - p1[1]) * t;
    const heading = Math.atan2(p2[0] - p1[0], p2[1] - p1[1]) * (180 / Math.PI);

    const congestionLevel = CONGESTION_LEVELS[Math.floor(Math.random() * 4)];
    const speed =
      congestionLevel === 'free-flow'
        ? randomBetween(30, 50)
        : congestionLevel === 'moderate'
          ? randomBetween(15, 30)
          : congestionLevel === 'heavy'
            ? randomBetween(5, 15)
            : randomBetween(0, 5);

    vehicles.push({
      id: `vehicle-${i}`,
      position: [lng, lat],
      heading,
      speed,
      type: types[Math.floor(Math.random() * types.length)],
      roadId: road.id,
      progress,
      congestionLevel,
    });
  }

  return vehicles;
}

/** Update vehicle positions along their roads */
export function updateVehicles(
  vehicles: Vehicle[],
  roads: RoadFeature[],
  deltaTime: number
): Vehicle[] {
  const roadMap = new Map(roads.map((r) => [r.id, r]));

  return vehicles.map((v) => {
    const road = roadMap.get(v.roadId);
    if (!road) return v;

    const coords =
      road.geometry.type === 'LineString'
        ? road.geometry.coordinates
        : road.geometry.coordinates[0];

    // Move forward
    const speedFactor = v.speed / 3600; // km/h to km/s
    const moveDistance = speedFactor * deltaTime * 0.00001; // approximate degree movement
    let newProgress = v.progress + moveDistance;

    // Wrap around
    if (newProgress > 1) {
      newProgress = 0;
      // Optionally pick a new road
      const eligibleRoads = roads.filter(
        (r) =>
          r.properties.highway !== 'pedestrian' &&
          r.geometry.type === 'LineString' &&
          r.geometry.coordinates.length >= 2
      );
      if (eligibleRoads.length > 0) {
        const newRoad = eligibleRoads[Math.floor(Math.random() * eligibleRoads.length)];
        return {
          ...v,
          roadId: newRoad.id,
          progress: 0,
          position: newRoad.geometry.type === 'LineString'
            ? [newRoad.geometry.coordinates[0][0], newRoad.geometry.coordinates[0][1]] as [number, number]
            : v.position,
        };
      }
    }

    const segmentIdx = Math.floor(newProgress * (coords.length - 1));
    const t = newProgress * (coords.length - 1) - segmentIdx;
    const p1 = coords[Math.min(segmentIdx, coords.length - 1)];
    const p2 = coords[Math.min(segmentIdx + 1, coords.length - 1)];

    const lng = p1[0] + (p2[0] - p1[0]) * t;
    const lat = p1[1] + (p2[1] - p1[1]) * t;
    const heading = Math.atan2(p2[0] - p1[0], p2[1] - p1[1]) * (180 / Math.PI);

    return {
      ...v,
      position: [lng, lat],
      heading,
      progress: newProgress,
    };
  });
}

/** Get congestion color */
export function getCongestionColor(level: CongestionLevel): string {
  switch (level) {
    case 'free-flow':
      return TRAFFIC_COLORS.freeFlow;
    case 'moderate':
      return TRAFFIC_COLORS.moderate;
    case 'heavy':
      return TRAFFIC_COLORS.heavy;
    case 'congested':
      return TRAFFIC_COLORS.congested;
  }
}

/** Get congestion label */
export function getCongestionLabel(level: CongestionLevel): string {
  switch (level) {
    case 'free-flow':
      return 'FREE FLOW';
    case 'moderate':
      return 'MODERATE';
    case 'heavy':
      return 'HEAVY';
    case 'congested':
      return 'CONGESTED';
  }
}
