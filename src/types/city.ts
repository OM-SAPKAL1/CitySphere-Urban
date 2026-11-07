export interface Building {
  id: string;
  type: string;
  coordinates: [number, number];
  height?: number;
  usage?: 'residential' | 'commercial' | 'industrial' | 'mixed';
}

export interface Road {
  id: string;
  type: 'highway' | 'arterial' | 'local';
  coordinates: [number, number][];
  lanes: number;
}

export interface WasteStation {
  id: string;
  location: [number, number];
  capacity: number;
  currentLoad: number;
}

export interface EnergyRecord {
  timestamp: string;
  consumption: number;
  generation: number;
  gridStatus: 'stable' | 'stressed' | 'critical';
}

export interface TrafficRecord {
  timestamp: string;
  roadId: string;
  vehicleCount: number;
  averageSpeed: number;
  congestionLevel: 'low' | 'medium' | 'high';
}

export interface SimulationState {
  status: 'stopped' | 'running' | 'paused';
  time: string;
  speed: number;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
  createdAt: string;
}
