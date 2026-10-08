/**
 * CitySphere - Main Application Store
 * Uses Zustand for state management
 */

import { create } from 'zustand';
import type {
  BuildingFeature,
  RoadFeature,
  POIFeature,
  ParkFeature,
  WaterFeature,
  IntersectionFeature,
  JunctionPerformance,
  CityMetrics,
  Vehicle,
  LayerConfig,
  Scenario,
  Selection,
  ViewMode,
  CameraView,
  DataState,
  SystemStatus,
  CityStatistics,
} from '../types';

interface CityStore {
  // ─── OSM Data ───
  buildings: BuildingFeature[];
  roads: RoadFeature[];
  pois: POIFeature[];
  parks: ParkFeature[];
  water: WaterFeature[];
  intersections: IntersectionFeature[];

  setBuildings: (b: BuildingFeature[]) => void;
  setRoads: (r: RoadFeature[]) => void;
  setPOIs: (p: POIFeature[]) => void;
  setParks: (p: ParkFeature[]) => void;
  setWater: (w: WaterFeature[]) => void;
  setIntersections: (i: IntersectionFeature[]) => void;

  // ─── Data Loading State ───
  dataState: DataState;
  setDataState: (s: Partial<DataState>) => void;

  // ─── Selection ───
  selection: Selection;
  setSelection: (s: Selection) => void;
  clearSelection: () => void;

  // ─── View ───
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
  cameraView: CameraView;
  setCameraView: (v: CameraView) => void;

  // ─── Layers ───
  layers: LayerConfig[];
  toggleLayer: (id: string) => void;
  setLayers: (layers: LayerConfig[]) => void;

  // ─── City State (Simulated) ───
  cityMetrics: CityMetrics;
  setCityMetrics: (m: CityMetrics) => void;
  junctions: JunctionPerformance[];
  setJunctions: (j: JunctionPerformance[]) => void;
  selectedJunction: JunctionPerformance | null;
  setSelectedJunction: (j: JunctionPerformance | null) => void;

  // ─── Vehicles ───
  vehicles: Vehicle[];
  setVehicles: (v: Vehicle[]) => void;
  trafficDensity: 'low' | 'medium' | 'high';
  setTrafficDensity: (d: 'low' | 'medium' | 'high') => void;
  trafficEnabled: boolean;
  setTrafficEnabled: (e: boolean) => void;

  // ─── Scenarios ───
  scenarios: Scenario[];
  addScenario: (s: Scenario) => void;
  scenarioLabOpen: boolean;
  setScenarioLabOpen: (o: boolean) => void;

  // ─── Environment ───
  nightMode: boolean;
  setNightMode: (n: boolean) => void;
  transitVisible: boolean;
  setTransitVisible: (t: boolean) => void;
  rainSimulation: boolean;
  setRainSimulation: (r: boolean) => void;

  // ─── Simulation Clock ───
  simulationTime: Date;
  setSimulationTime: (t: Date) => void;
  simulationPlaying: boolean;
  setSimulationPlaying: (p: boolean) => void;
  simulationSpeed: number;
  setSimulationSpeed: (s: number) => void;

  // ─── System Status ───
  systemStatuses: SystemStatus[];
  setSystemStatuses: (s: SystemStatus[]) => void;

  // ─── UI State ───
  leftPanelOpen: boolean;
  setLeftPanelOpen: (o: boolean) => void;
  rightPanelOpen: boolean;
  setRightPanelOpen: (o: boolean) => void;

  // ─── Computed ───
  getCityStatistics: () => CityStatistics;
}

const DEFAULT_LAYERS: LayerConfig[] = [
  { id: 'buildings', name: 'Buildings', enabled: true, available: true, phase: 'current' },
  { id: 'roads', name: 'Roads', enabled: true, available: true, phase: 'current' },
  { id: 'parks', name: 'Parks', enabled: true, available: true, phase: 'current' },
  { id: 'water', name: 'Water', enabled: true, available: true, phase: 'current' },
  { id: 'pois', name: 'POIs', enabled: true, available: true, phase: 'current' },
  { id: 'vehicles', name: 'Vehicles', enabled: true, available: true, phase: 'current' },
  { id: 'junctions', name: 'Junctions', enabled: true, available: true, phase: 'current' },
  { id: 'traffic-flow', name: 'Traffic Flow', enabled: true, available: true, phase: 'current' },
  { id: 'energy-infra', name: 'Energy Infrastructure', enabled: false, available: false, phase: 'phase2' },
  { id: 'ev-stations', name: 'EV Stations', enabled: false, available: false, phase: 'phase2' },
  { id: 'waste-stations', name: 'Waste Stations', enabled: false, available: false, phase: 'phase2' },
  { id: 'renewable', name: 'Renewable Assets', enabled: false, available: false, phase: 'phase2' },
  { id: 'env-sensors', name: 'Environmental Sensors', enabled: false, available: false, phase: 'phase2' },
];

const DEFAULT_SYSTEM_STATUSES: SystemStatus[] = [
  { id: 'twin', name: 'Digital Twin', status: 'online' },
  { id: 'osm', name: 'OSM', status: 'not-connected' },
  { id: 'gis', name: 'GIS', status: 'not-connected' },
  { id: 'realtime', name: 'Realtime Stream', status: 'not-connected' },
  { id: 'simulation', name: 'Simulation', status: 'phase2' },
  { id: 'ai', name: 'AI', status: 'phase2' },
  { id: 'database', name: 'Database', status: 'phase2' },
  { id: 'websocket', name: 'WebSocket', status: 'ready' },
];

export const useCityStore = create<CityStore>((set, get) => ({
  // OSM Data
  buildings: [],
  roads: [],
  pois: [],
  parks: [],
  water: [],
  intersections: [],

  setBuildings: (buildings) => set({ buildings }),
  setRoads: (roads) => set({ roads }),
  setPOIs: (pois) => set({ pois }),
  setParks: (parks) => set({ parks }),
  setWater: (water) => set({ water }),
  setIntersections: (intersections) => set({ intersections }),

  // Data Loading
  dataState: {
    buildings: 'idle',
    roads: 'idle',
    pois: 'idle',
    parks: 'idle',
    water: 'idle',
  },
  setDataState: (partial) => set((s) => ({ dataState: { ...s.dataState, ...partial } })),

  // Selection
  selection: { type: 'none', id: null, data: null },
  setSelection: (selection) => set({ selection }),
  clearSelection: () => set({ selection: { type: 'none', id: null, data: null }, selectedJunction: null }),

  // View
  viewMode: 'digital-twin',
  setViewMode: (viewMode) => set({ viewMode }),
  cameraView: 'isometric',
  setCameraView: (cameraView) => set({ cameraView }),

  // Layers
  layers: DEFAULT_LAYERS,
  toggleLayer: (id) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id && l.available ? { ...l, enabled: !l.enabled } : l)),
    })),
  setLayers: (layers) => set({ layers }),

  // City State
  cityMetrics: {
    vehiclesTracked: 0,
    vehiclesPerHourAtJunctions: 0,
    co2PerHour: 0,
    congestionCostPerHour: 0,
    isSimulated: true,
  },
  setCityMetrics: (cityMetrics) => set({ cityMetrics }),
  junctions: [],
  setJunctions: (junctions) => set({ junctions }),
  selectedJunction: null,
  setSelectedJunction: (selectedJunction) => set({ selectedJunction }),

  // Vehicles
  vehicles: [],
  setVehicles: (vehicles) => set({ vehicles }),
  trafficDensity: 'medium',
  setTrafficDensity: (trafficDensity) => set({ trafficDensity }),
  trafficEnabled: true,
  setTrafficEnabled: (trafficEnabled) => set({ trafficEnabled }),

  // Scenarios
  scenarios: [],
  addScenario: (s) => set((state) => ({ scenarios: [...state.scenarios, s] })),
  scenarioLabOpen: false,
  setScenarioLabOpen: (scenarioLabOpen) => set({ scenarioLabOpen }),

  // Environment
  nightMode: false,
  setNightMode: (nightMode) => set({ nightMode }),
  transitVisible: false,
  setTransitVisible: (transitVisible) => set({ transitVisible }),
  rainSimulation: false,
  setRainSimulation: (rainSimulation) => set({ rainSimulation }),

  // Simulation Clock
  simulationTime: new Date(),
  setSimulationTime: (simulationTime) => set({ simulationTime }),
  simulationPlaying: true,
  setSimulationPlaying: (simulationPlaying) => set({ simulationPlaying }),
  simulationSpeed: 1,
  setSimulationSpeed: (simulationSpeed) => set({ simulationSpeed }),

  // System Status
  systemStatuses: DEFAULT_SYSTEM_STATUSES,
  setSystemStatuses: (systemStatuses) => set({ systemStatuses }),

  // UI
  leftPanelOpen: true,
  setLeftPanelOpen: (leftPanelOpen) => set({ leftPanelOpen }),
  rightPanelOpen: true,
  setRightPanelOpen: (rightPanelOpen) => set({ rightPanelOpen }),

  // Computed
  getCityStatistics: () => {
    const state = get();
    const totalRoadLength = state.roads.reduce((sum, r) => sum + (r.length || 0), 0);
    return {
      buildingCount: state.buildings.length,
      roadCount: state.roads.length,
      totalRoadLength: Math.round(totalRoadLength),
      intersectionCount: state.intersections.length,
      parkCount: state.parks.length,
      poiCount: state.pois.length,
      waterBodyCount: state.water.length,
      studyAreaSize: '1 km × 1 km',
    };
  },
}));
