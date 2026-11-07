import { CITY_CENTER } from '../config/city';

/** Simple wrapper around the backend API */
export const cityService = {
  /** Fetch study‑area metadata */
  async getStudyArea() {
    const resp = await fetch('/api/study-area');
    if (!resp.ok) throw new Error('Failed to fetch study area');
    return resp.json();
  },

  /** Fetch the latest simulation state (metrics, timestamp, etc.) */
  async getSimulationState() {
    const resp = await fetch('/api/simulation/state');
    if (!resp.ok) throw new Error('Failed to fetch simulation state');
    return resp.json();
  },

  /** Summary metrics for the dashboard */
  async getMetricsSummary() {
    const state = await this.getSimulationState();
    return {
      energyDemand: state.energy?.demand_kw ?? null,
      trafficCongestion: state.traffic?.congestion_pct ?? null,
      wasteGeneration: state.waste?.cumulative_generated_kg ?? null,
      renewableEnergy: state.energy?.renewable_pct ?? null,
      co2Emissions: state.emissions?.co2_kg_per_hr ?? null,
      gridDependency: state.energy?.grid_dependency_pct ?? null,
      timestamp: state.timestamp_ist,
    };
  },

  /** Fetch saved scenario history – stub for now */
  async getScenarioHistory() {
    const resp = await fetch('/api/scenarios');
    if (!resp.ok) return [];
    return resp.json();
  },

  /** Persist a draft scenario */
  async saveScenarioDraft(draft: any) {
    const resp = await fetch('/api/scenarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    if (!resp.ok) throw new Error('Failed to save scenario');
    return resp.json();
  },

  /** Run a scenario (event) using existing backend endpoint */
  async runScenario(payload: any) {
    const resp = await fetch('/api/simulation/run_event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error('Scenario run failed');
    return resp.json();
  },
};
