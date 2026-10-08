/**
 * CitySphere - Left Control Panel
 * Contains: City identity, clock, city selector, simulation status,
 * environment controls, citywide metrics, junction list
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Train,
  CloudRain,
  Building2,
  Car,
  Gauge,
  MapPin,
} from 'lucide-react';
import { useCityStore } from '../stores/cityStore';
import { CITY_CENTER, TIMEZONE } from '../config/city';
import { getCongestionColor, getCongestionLabel } from '../services/simulation/simulationService';

const LeftPanel: React.FC = () => {
  const leftPanelOpen = useCityStore((s) => s.leftPanelOpen);
  const setLeftPanelOpen = useCityStore((s) => s.setLeftPanelOpen);
  const nightMode = useCityStore((s) => s.nightMode);
  const setNightMode = useCityStore((s) => s.setNightMode);
  const transitVisible = useCityStore((s) => s.transitVisible);
  const setTransitVisible = useCityStore((s) => s.setTransitVisible);
  const rainSimulation = useCityStore((s) => s.rainSimulation);
  const setRainSimulation = useCityStore((s) => s.setRainSimulation);
  const cityMetrics = useCityStore((s) => s.cityMetrics);
  const junctions = useCityStore((s) => s.junctions);
  const selectedJunction = useCityStore((s) => s.selectedJunction);
  const setSelectedJunction = useCityStore((s) => s.setSelectedJunction);
  const setSelection = useCityStore((s) => s.setSelection);

  // ─── Live Clock ───
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timeString = time.toLocaleTimeString('en-IN', {
    timeZone: TIMEZONE,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const dateString = time.toLocaleDateString('en-IN', {
    timeZone: TIMEZONE,
    weekday: 'short',
    month: 'short',
    day: '2-digit',
  }).toUpperCase();

  const handleJunctionClick = useCallback(
    (junction: typeof junctions[0]) => {
      setSelectedJunction(junction);
      setSelection({
        type: 'junction',
        id: junction.id,
        data: junction as any,
      });
    },
    [setSelectedJunction, setSelection]
  );

  return (
    <>
      {/* Toggle Button */}
      {!leftPanelOpen && (
        <button
          onClick={() => setLeftPanelOpen(true)}
          className="fixed left-3 top-1/2 -translate-y-1/2 z-30 cs-btn p-2"
        >
          <ChevronRight size={14} />
        </button>
      )}

      <AnimatePresence>
        {leftPanelOpen && (
          <motion.div
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed left-3 top-3 bottom-3 z-20 w-[310px] cs-panel flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-cs-border flex items-start justify-between">
              <div>
                <div className="text-[9px] font-semibold tracking-[0.2em] text-cs-text-muted uppercase">
                  Urban Digital Twin
                </div>
                <div className="text-xl font-extrabold tracking-wide bg-gradient-to-r from-blue-600 via-indigo-600 to-fuchsia-600 bg-clip-text text-transparent mt-0.5">
                  {CITY_CENTER.name.toUpperCase()}
                </div>
              </div>
              <button
                onClick={() => setLeftPanelOpen(false)}
                className="cs-btn p-1.5 mt-0.5"
              >
                <ChevronLeft size={12} />
              </button>
            </div>

            {/* Clock */}
            <div className="px-4 py-3 border-b border-cs-border bg-gradient-to-b from-slate-50/50 to-transparent">
              <div className="text-3xl font-mono font-medium tracking-wider text-slate-800">
                {timeString}
              </div>
              <div className="text-[10px] tracking-[0.15em] text-cs-text-muted font-medium mt-0.5">
                {dateString}
              </div>
            </div>

            {/* City Selector */}
            <div className="px-4 py-2.5 border-b border-cs-border">
              <div className="cs-card flex items-center gap-2.5 cursor-default">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xs">
                  <MapPin size={12} />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-800">{CITY_CENTER.name}</div>
                  <div className="text-[9px] text-cs-text-muted font-medium">{CITY_CENTER.region}</div>
                </div>
              </div>
            </div>

            {/* Simulation Status */}
            <div className="px-4 py-2 border-b border-cs-border">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-50/80 border border-amber-200/80">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]" />
                <span className="text-[9px] font-semibold tracking-[0.1em] text-amber-700 uppercase">
                  Simulated — Prototype City State
                </span>
              </div>
            </div>

            {/* Environment Controls */}
            <div className="px-4 py-2.5 border-b border-cs-border">
              <div className="text-[9px] font-semibold tracking-[0.15em] text-cs-text-muted uppercase mb-2">
                Environment
              </div>
              <div className="space-y-2">
                <ToggleRow
                  icon={nightMode ? <Moon size={12} /> : <Sun size={12} />}
                  label="Night View"
                  active={nightMode}
                  onToggle={() => setNightMode(!nightMode)}
                />
                <ToggleRow
                  icon={<Train size={12} />}
                  label="Transit"
                  active={transitVisible}
                  onToggle={() => setTransitVisible(!transitVisible)}
                />
                <ToggleRow
                  icon={<CloudRain size={12} />}
                  label="Rain Simulation"
                  active={rainSimulation}
                  onToggle={() => setRainSimulation(!rainSimulation)}
                />
              </div>
            </div>

            {/* Citywide Metrics */}
            <div className="px-4 py-2.5 border-b border-cs-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-semibold tracking-[0.15em] text-cs-text-muted uppercase">
                  Citywide · This Hour
                </span>
                <span className="cs-badge cs-badge-simulated">Simulated</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <MetricCard
                  icon={<Car size={11} />}
                  label="Vehicles Tracked"
                  value={cityMetrics.vehiclesTracked.toString()}
                  gradient="from-blue-500 to-indigo-600"
                />
                <MetricCard
                  icon={<Gauge size={11} />}
                  label="Veh/h at Junctions"
                  value={
                    cityMetrics.vehiclesPerHourAtJunctions >= 1000
                      ? `${(cityMetrics.vehiclesPerHourAtJunctions / 1000).toFixed(1)}K`
                      : cityMetrics.vehiclesPerHourAtJunctions.toString()
                  }
                  gradient="from-emerald-500 to-teal-600"
                />
                <MetricCard
                  icon={<Building2 size={11} />}
                  label="t CO₂ / Hour"
                  value={cityMetrics.co2PerHour.toFixed(2)}
                  gradient="from-amber-500 to-orange-600"
                />
                <MetricCard
                  icon={<Gauge size={11} />}
                  label="Congestion $/H"
                  value={`$${(cityMetrics.congestionCostPerHour / 1000).toFixed(1)}K`}
                  gradient="from-purple-500 to-pink-600"
                />
              </div>
            </div>

            {/* Junction List */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <div className="px-4 py-2.5">
                <div className="text-[9px] font-semibold tracking-[0.15em] text-cs-text-muted uppercase">
                  Junctions
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-1.5">
                {junctions.map((junction) => (
                  <button
                    key={junction.id}
                    onClick={() => handleJunctionClick(junction)}
                    className={`w-full text-left cs-card flex items-center gap-2.5 transition-all duration-150 hover:border-indigo-300 ${
                      selectedJunction?.id === junction.id
                        ? 'border-indigo-400 bg-gradient-to-r from-indigo-50/80 to-blue-50/50 shadow-xs ring-1 ring-indigo-300/50'
                        : ''
                    }`}
                  >
                    <div
                      className="cs-status-dot flex-shrink-0"
                      style={{
                        backgroundColor: getCongestionColor(junction.congestionLevel),
                        boxShadow: `0 0 6px ${getCongestionColor(junction.congestionLevel)}80`,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-semibold text-slate-800 truncate">
                        {junction.name}
                      </div>
                      <div className="text-[9px] text-cs-text-muted font-medium">
                        {junction.vehiclesPerHour.toLocaleString()} /h
                      </div>
                    </div>
                    <div
                      className="text-[8px] font-semibold px-1.5 py-0.5 rounded"
                      style={{
                        color: getCongestionColor(junction.congestionLevel),
                        backgroundColor: `${getCongestionColor(junction.congestionLevel)}15`,
                      }}
                    >
                      {getCongestionLabel(junction.congestionLevel)}
                    </div>
                  </button>
                ))}
                {junctions.length === 0 && (
                  <div className="text-[10px] text-cs-text-muted text-center py-4">
                    Loading junction data...
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// ─── Sub-Components ───

const ToggleRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onToggle: () => void;
}> = ({ icon, label, active, onToggle }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2 text-[11px] text-cs-text font-medium">
      <span className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
        {icon}
      </span>
      {label}
    </div>
    <div
      className={`cs-toggle ${active ? 'active' : ''}`}
      onClick={onToggle}
    />
  </div>
);

const MetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  gradient?: string;
}> = ({ icon, label, value, gradient = 'from-blue-500 to-indigo-600' }) => (
  <div className="cs-card !p-2 group hover:border-indigo-300 transition-all">
    <div className="flex items-center gap-1.5 mb-1.5">
      <span className={`w-4 h-4 rounded-md bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-xs`}>
        {icon}
      </span>
      <span className="text-[8px] text-cs-text-muted uppercase tracking-wider font-semibold">{label}</span>
    </div>
    <div className="text-sm font-bold text-slate-800 tracking-tight">{value}</div>
  </div>
);

export default LeftPanel;
