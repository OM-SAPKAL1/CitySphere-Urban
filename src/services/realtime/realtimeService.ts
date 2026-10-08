/**
 * CitySphere - Realtime Data Service
 * 
 * Clean abstraction for future WebSocket connection.
 * Currently uses simulation data.
 * 
 * Future Architecture:
 *   Data Sources → Backend → WebSocket → CitySphere State Store → Digital Twin → UI
 */

import type {
  RealtimeDataService,
  CityMetrics,
  JunctionPerformance,
  Vehicle,
} from '../../types';

export class PrototypeRealtimeService implements RealtimeDataService {
  isConnected = false;
  private metricsCallbacks: ((m: CityMetrics) => void)[] = [];
  private junctionCallbacks: ((j: JunctionPerformance) => void)[] = [];
  private vehicleCallbacks: ((v: Vehicle[]) => void)[] = [];

  async connect(): Promise<void> {
    // In Phase 2, this will establish a WebSocket connection
    // For now, it's a no-op. The simulation service provides data directly.
    console.log('[CitySphere] Realtime service ready (prototype mode)');
    this.isConnected = false; // Explicitly not connected - no real WebSocket
  }

  disconnect(): void {
    this.isConnected = false;
    this.metricsCallbacks = [];
    this.junctionCallbacks = [];
    this.vehicleCallbacks = [];
  }

  onCityMetrics(callback: (metrics: CityMetrics) => void): void {
    this.metricsCallbacks.push(callback);
  }

  onJunctionUpdate(callback: (junction: JunctionPerformance) => void): void {
    this.junctionCallbacks.push(callback);
  }

  onVehicleUpdate(callback: (vehicles: Vehicle[]) => void): void {
    this.vehicleCallbacks.push(callback);
  }

  // Internal: dispatch events (used by simulation layer)
  _dispatchMetrics(m: CityMetrics): void {
    this.metricsCallbacks.forEach((cb) => cb(m));
  }

  _dispatchJunction(j: JunctionPerformance): void {
    this.junctionCallbacks.forEach((cb) => cb(j));
  }

  _dispatchVehicles(v: Vehicle[]): void {
    this.vehicleCallbacks.forEach((cb) => cb(v));
  }
}

export const realtimeService = new PrototypeRealtimeService();
