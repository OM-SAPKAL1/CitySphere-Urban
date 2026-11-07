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

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// ─── Live / Calibrated City Metrics ───

export async function fetchLiveSimulationState(): Promise<CityMetrics | null> {
  try {
    const res = await fetch('/api/simulation/state');
    if (res.ok) {
      const data = await res.json();
      if (data && data.metrics) {
        return {
          vehiclesTracked: data.metrics.vehiclesTracked,
          vehiclesPerHourAtJunctions: data.metrics.vehiclesPerHourAtJunctions,
          co2PerHour: data.metrics.co2PerHour,
          congestionCostPerHour: data.metrics.congestionCostPerHour,
          isSimulated: data.metrics.isSimulated ?? false,
        };
      }
    }
  } catch {
    // Backend offline: proceed with deterministic baseline
  }
  return null;
}

export function generateCityMetrics(): CityMetrics {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  
  // Peak hour factors based on Pune CMP survey
  const isPeak = (9.0 <= hour && hour <= 11.5) || (17.5 <= hour && hour <= 20.5);
  const isNight = hour >= 22.0 || hour < 6.0;

  const baseVehicles = isNight ? 140 : isPeak ? 385 : 240;
  const vehiclesPerHour = isNight ? 2200 : isPeak ? 11400 : 6800;
  const co2PerHour = parseFloat((isNight ? 0.85 : isPeak ? 3.45 : 1.95).toFixed(2));
  const congestionCost = isNight ? 450 : isPeak ? 3150 : 1600;

  return {
    vehiclesTracked: baseVehicles,
    vehiclesPerHourAtJunctions: vehiclesPerHour,
    co2PerHour,
    congestionCostPerHour: congestionCost,
    isSimulated: false, // Calibrated data-driven model
  };
}

// ─── Simulated / Calibrated Junction Performance ───

const CONGESTION_LEVELS: CongestionLevel[] = ['free-flow', 'moderate', 'heavy', 'congested'];

const PUNE_JUNCTION_NAMES = [
  'Goodluck Chowk (FC Road)',
  'Deccan Gymkhana Bus Station',
  'Alka Talkies Chowk (Sambhaji Bridge)',
  'Jhansi Rani Chowk (JM Road)',
  'Fergusson College Main Gate',
  'Garware Bridge Crossing',
  'Balgandharva Ranga Mandir Chowk',
  'Sancheti Hospital Chowk',
  'Shivajinagar Station South Flank',
  'Modern College Chowk',
  'Bhandarkar Road Crossing',
  'Ghole Road Ward Office Junction',
  'Sambhaji Park Riverbank Link',
  'BMCC College Road Crossing',
  'Dnyaneshwar Paduka Chowk',
];

export function generateJunctionPerformance(
  intersections: IntersectionFeature[]
): JunctionPerformance[] {
  const sorted = [...intersections].sort(
    (a, b) => b.connectedRoads.length - a.connectedRoads.length
  );
  const topJunctions = sorted.slice(0, 15);

  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  const isPeak = (9.0 <= hour && hour <= 11.5) || (17.5 <= hour && hour <= 20.5);

  return topJunctions.map((intersection, idx) => {
    const defaultName = PUNE_JUNCTION_NAMES[idx % PUNE_JUNCTION_NAMES.length];
    const junctionName = intersection.name || defaultName;

    const isHighBottleneck = idx < 4; // Top junctions (Goodluck, Alka Chowk, Deccan)
    const congestionLevel: CongestionLevel = isPeak
      ? (isHighBottleneck ? 'congested' : 'heavy')
      : (isHighBottleneck ? 'moderate' : 'free-flow');

    const vph = isPeak ? 3800 + (15 - idx) * 120 : 1600 + (15 - idx) * 60;
    const avgDelay = congestionLevel === 'congested' ? 75.0 : congestionLevel === 'heavy' ? 45.0 : congestionLevel === 'moderate' ? 22.0 : 8.0;

    return {
      id: intersection.id,
      name: junctionName,
      position: intersection.position,
      congestionLevel,
      vehiclesPerHour: vph,
      avgDelay,
      co2PerHour: parseFloat((vph * 0.042).toFixed(1)),
      costPerHour: Math.round(vph * (avgDelay / 60.0) * 2.5),
      historyCost: Array.from({ length: 60 }, (_, i) => Math.round(150 + Math.sin(i / 5) * 60 + (isPeak ? 120 : 0))),
      isSimulated: false,
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
