/**
 * CitySphere - Main Application
 * 
 * Orchestrates:
 * 1. OSM data loading pipeline
 * 2. Simulation data generation
 * 3. Vehicle animation loop
 * 4. All UI panels overlaid on the 3D Digital Twin
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useCityStore } from './stores/cityStore';
import {
  getBuildings,
  getRoads,
  getPOIs,
  getParks,
  getWater,
  deriveIntersections,
} from './services/osm/osmDataService';
import {
  generateCityMetrics,
  generateJunctionPerformance,
  generateVehicles,
  updateVehicles,
} from './services/simulation/simulationService';
import DigitalTwinScene from './features/digital-twin/DigitalTwinScene';
import TopBar from './components/TopBar';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import BottomBar from './components/BottomBar';
import CameraControls from './components/CameraControls';
import WhatIfScenario from './components/WhatIfScenario';
import SystemStatus from './components/SystemStatus';
import LoadingScreen from './components/LoadingScreen';

const App: React.FC = () => {
  const setBuildings = useCityStore((s) => s.setBuildings);
  const setRoads = useCityStore((s) => s.setRoads);
  const setPOIs = useCityStore((s) => s.setPOIs);
  const setParks = useCityStore((s) => s.setParks);
  const setWater = useCityStore((s) => s.setWater);
  const setIntersections = useCityStore((s) => s.setIntersections);
  const setDataState = useCityStore((s) => s.setDataState);
  const setVehicles = useCityStore((s) => s.setVehicles);
  const setCityMetrics = useCityStore((s) => s.setCityMetrics);
  const setJunctions = useCityStore((s) => s.setJunctions);
  const setSystemStatuses = useCityStore((s) => s.setSystemStatuses);
  const dataState = useCityStore((s) => s.dataState);
  const roads = useCityStore((s) => s.roads);
  const vehicles = useCityStore((s) => s.vehicles);
  const trafficEnabled = useCityStore((s) => s.trafficEnabled);
  const trafficDensity = useCityStore((s) => s.trafficDensity);
  const simulationPlaying = useCityStore((s) => s.simulationPlaying);
  const rainSimulation = useCityStore((s) => s.rainSimulation);

  const [isReady, setIsReady] = useState(false);
  const animationRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);

  // ─── Load OSM Data ───
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        // Load buildings
        setDataState({ buildings: 'loading' });
        const buildingData = await getBuildings();
        if (cancelled) return;
        setBuildings(buildingData);
        setDataState({ buildings: 'loaded' });
        await new Promise((r) => setTimeout(r, 80));

        // Load roads
        setDataState({ roads: 'loading' });
        const roadData = await getRoads();
        if (cancelled) return;
        setRoads(roadData);
        setDataState({ roads: 'loaded' });
        await new Promise((r) => setTimeout(r, 80));

        // Derive intersections from roads
        const intersectionData = deriveIntersections(roadData);
        setIntersections(intersectionData);

        // Generate simulated junction performance
        const junctionData = generateJunctionPerformance(intersectionData);
        setJunctions(junctionData);

        // Generate simulated city metrics
        const metrics = generateCityMetrics();
        setCityMetrics(metrics);

        // Generate initial vehicles
        const vehicleData = generateVehicles(roadData, trafficDensity);
        setVehicles(vehicleData);

        // Load POIs
        setDataState({ pois: 'loading' });
        const poiData = await getPOIs();
        if (cancelled) return;
        setPOIs(poiData);
        setDataState({ pois: 'loaded' });
        await new Promise((r) => setTimeout(r, 80));

        // Load parks
        setDataState({ parks: 'loading' });
        const parkData = await getParks();
        if (cancelled) return;
        setParks(parkData);
        setDataState({ parks: 'loaded' });
        await new Promise((r) => setTimeout(r, 80));

        // Load water
        setDataState({ water: 'loading' });
        const waterData = await getWater();
        if (cancelled) return;
        setWater(waterData);
        setDataState({ water: 'loaded' });
        await new Promise((r) => setTimeout(r, 80));

        // Update system statuses
        setSystemStatuses([
          { id: 'twin', name: 'Digital Twin', status: 'online' },
          { id: 'osm', name: 'OSM', status: 'loaded' },
          { id: 'gis', name: 'GIS', status: 'connected' },
          { id: 'realtime', name: 'Realtime Stream', status: 'not-connected' },
          { id: 'simulation', name: 'Simulation', status: 'phase2' },
          { id: 'ai', name: 'AI', status: 'phase2' },
          { id: 'database', name: 'Database', status: 'phase2' },
          { id: 'websocket', name: 'WebSocket', status: 'ready' },
        ]);

        setIsReady(true);
      } catch (error) {
        console.error('[CitySphere] Unexpected error loading city data:', error);
        setIsReady(true);
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Vehicle Animation Loop ───
  useEffect(() => {
    if (!simulationPlaying || !trafficEnabled || roads.length === 0) return;

    const animate = (timestamp: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      const delta = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      if (delta < 0.5) {
        // Only update if frame time is reasonable (avoid huge jumps)
        const currentVehicles = useCityStore.getState().vehicles;
        if (currentVehicles.length > 0) {
          const updated = updateVehicles(currentVehicles, roads, delta);
          setVehicles(updated);
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      lastTimeRef.current = 0;
    };
  }, [simulationPlaying, trafficEnabled, roads, setVehicles]);

  // ─── Regenerate vehicles on density change ───
  useEffect(() => {
    if (roads.length > 0) {
      const vehicleData = generateVehicles(roads, trafficDensity);
      setVehicles(vehicleData);
    }
  }, [trafficDensity, roads, setVehicles]);

  // ─── Periodic metrics update ───
  useEffect(() => {
    if (!isReady) return;

    const interval = setInterval(() => {
      const metrics = generateCityMetrics();
      setCityMetrics(metrics);
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [isReady, setCityMetrics]);

  // ─── Check if core data loaded ───
  const coreLoaded = dataState.buildings === 'loaded' && dataState.roads === 'loaded';

  return (
    <div className="w-full h-full relative overflow-hidden bg-cs-bg">
      {/* Loading Screen */}
      {!coreLoaded && !dataState.error && <LoadingScreen />}
      {dataState.error && <LoadingScreen />}

      {/* 3D Digital Twin - Always render once core data available */}
      {coreLoaded && (
        <>
          {/* Main 3D Scene */}
          <DigitalTwinScene />

          {/* Rain effect overlay */}
          {rainSimulation && <div className="rain-overlay" />}

          {/* UI Overlay */}
          <TopBar />
          <LeftPanel />
          <RightPanel />
          <BottomBar />
          <CameraControls />
          <WhatIfScenario />
          <SystemStatus />

          {/* OSM Attribution */}
          <div className="fixed bottom-1 left-1/2 -translate-x-1/2 z-10 text-[8px] text-slate-500/70 font-medium tracking-wide">
            © OpenStreetMap contributors
          </div>
        </>
      )}
    </div>
  );
};

export default App;
