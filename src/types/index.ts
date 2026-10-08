/** CitySphere TypeScript Types */
import type * as GeoJSON from 'geojson';

// ─── OSM Feature Types ───

export interface BuildingFeature {
  id: string;
  osmId: number;
  type: 'building';
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  properties: {
    building: string;
    name?: string;
    height?: number;        // actual OSM height
    levels?: number;        // actual OSM building:levels
    estimatedHeight: number; // computed/fallback height
    heightSource: 'osm_height' | 'osm_levels' | 'estimated';
    amenity?: string;
    office?: string;
    shop?: string;
    tourism?: string;
    addrStreet?: string;
    addrHouseNumber?: string;
    tags: Record<string, string>;
  };
  center: [number, number]; // [lng, lat]
  footprintArea?: number;
}

export interface RoadFeature {
  id: string;
  osmId: number;
  type: 'road';
  geometry: GeoJSON.LineString | GeoJSON.MultiLineString;
  properties: {
    highway: string;
    name?: string;
    lanes?: number;
    maxspeed?: number;
    oneway?: boolean;
    surface?: string;
    tags: Record<string, string>;
  };
  length?: number;
}

export interface POIFeature {
  id: string;
  osmId: number;
  type: 'poi';
  geometry: GeoJSON.Point;
  properties: {
    name?: string;
    amenity?: string;
    shop?: string;
    tourism?: string;
    leisure?: string;
    office?: string;
    poiType: string;
    tags: Record<string, string>;
  };
}

export interface ParkFeature {
  id: string;
  osmId: number;
  type: 'park';
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  properties: {
    name?: string;
    leisure?: string;
    landuse?: string;
    tags: Record<string, string>;
  };
  center: [number, number];
  area?: number;
}

export interface WaterFeature {
  id: string;
  osmId: number;
  type: 'water';
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  properties: {
    name?: string;
    natural?: string;
    water?: string;
    tags: Record<string, string>;
  };
}

export interface IntersectionFeature {
  id: string;
  type: 'intersection';
  position: [number, number]; // [lng, lat]
  connectedRoads: string[];
  name?: string;
  generatedName?: string;
}

// ─── City State Types ───

export type CongestionLevel = 'free-flow' | 'moderate' | 'heavy' | 'congested';

export interface JunctionPerformance {
  id: string;
  name: string;
  position: [number, number];
  congestionLevel: CongestionLevel;
  vehiclesPerHour: number;
  avgDelay: number;       // seconds
  co2PerHour: number;     // kg
  costPerHour: number;    // USD
  historyCost: number[];   // last 60 samples
  isSimulated: true;       // always true in Phase 1
}

export interface CityMetrics {
  vehiclesTracked: number;
  vehiclesPerHourAtJunctions: number;
  co2PerHour: number;
  congestionCostPerHour: number;
  isSimulated: true;
}

// ─── Vehicle Types ───

export interface Vehicle {
  id: string;
  position: [number, number]; // [lng, lat]
  heading: number;            // degrees
  speed: number;              // km/h
  type: 'car' | 'bus' | 'truck' | 'auto-rickshaw';
  roadId: string;
  progress: number;          // 0-1 along road
  congestionLevel: CongestionLevel;
}

// ─── Layer Types ───

export interface LayerConfig {
  id: string;
  name: string;
  enabled: boolean;
  available: boolean;
  phase?: 'current' | 'phase2';
  icon?: string;
}

// ─── Scenario Types ───

export type ScenarioType =
  | 'rooftop-solar'
  | 'ev-charging'
  | 'battery-storage'
  | 'traffic-signal'
  | 'waste-route'
  | 'green-area'
  | 'building-energy';

export interface Scenario {
  id: string;
  type: ScenarioType;
  name: string;
  status: 'draft' | 'ready' | 'running' | 'completed';
  config: Record<string, unknown>;
  createdAt: Date;
}

// ─── System Status Types ───

export type SystemStatusLevel = 'online' | 'loaded' | 'connected' | 'not-connected' | 'phase2' | 'ready';

export interface SystemStatus {
  id: string;
  name: string;
  status: SystemStatusLevel;
  detail?: string;
}

// ─── Selection Types ───

export type SelectionType = 'none' | 'building' | 'road' | 'junction';

export interface Selection {
  type: SelectionType;
  id: string | null;
  data: BuildingFeature | RoadFeature | JunctionPerformance | null;
}

// ─── View Mode ───

export type ViewMode = 'digital-twin' | 'map';
export type CameraView = 'isometric' | 'top' | 'custom';

// ─── Data Loading State ───

export type LoadingState = 'idle' | 'loading' | 'loaded' | 'error';

export interface DataState {
  buildings: LoadingState;
  roads: LoadingState;
  pois: LoadingState;
  parks: LoadingState;
  water: LoadingState;
  error?: string;
}

// ─── Realtime Data Service Interface ───

export interface RealtimeDataService {
  connect(): Promise<void>;
  disconnect(): void;
  onCityMetrics(callback: (metrics: CityMetrics) => void): void;
  onJunctionUpdate(callback: (junction: JunctionPerformance) => void): void;
  onVehicleUpdate(callback: (vehicles: Vehicle[]) => void): void;
  isConnected: boolean;
}

// ─── City Statistics ───

export interface CityStatistics {
  buildingCount: number;
  roadCount: number;
  totalRoadLength: number;
  intersectionCount: number;
  parkCount: number;
  poiCount: number;
  waterBodyCount: number;
  studyAreaSize: string;
}
