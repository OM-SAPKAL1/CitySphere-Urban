/**
 * CitySphere - Right Information Panel
 * Dynamic contextual panel showing:
 * - City overview (default)
 * - Building info (when building selected)
 * - Road info (when road selected)
 * - Junction performance (when junction selected)
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Building2,
  Route,
  Trees,
  MapPin,
  Layers,
  Droplets,
  X,
  Zap,
  Sun,
  Activity,
} from 'lucide-react';
import { useCityStore } from '../stores/cityStore';
import { getCongestionColor, getCongestionLabel } from '../services/simulation/simulationService';

const RightPanel: React.FC = () => {
  const rightPanelOpen = useCityStore((s) => s.rightPanelOpen);
  const setRightPanelOpen = useCityStore((s) => s.setRightPanelOpen);
  const selection = useCityStore((s) => s.selection);
  const selectedJunction = useCityStore((s) => s.selectedJunction);
  const getCityStatistics = useCityStore((s) => s.getCityStatistics);
  const clearSelection = useCityStore((s) => s.clearSelection);
  const dataState = useCityStore((s) => s.dataState);

  const stats = getCityStatistics();

  return (
    <>
      {!rightPanelOpen && (
        <button
          onClick={() => setRightPanelOpen(true)}
          className="fixed right-3 top-1/2 -translate-y-1/2 z-30 cs-btn p-2"
        >
          <ChevronLeft size={14} />
        </button>
      )}

      <AnimatePresence>
        {rightPanelOpen && (
          <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed right-3 top-3 bottom-3 z-20 w-[310px] cs-panel flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-cs-border flex items-center justify-between">
              <div className="text-[9px] font-semibold tracking-[0.15em] text-cs-text-muted uppercase">
                {selectedJunction
                  ? 'Junction Performance'
                  : selection.type === 'building'
                    ? 'Building Information'
                    : selection.type === 'road'
                      ? 'Road Information'
                      : 'City Overview'}
              </div>
              <div className="flex items-center gap-1.5">
                {(selectedJunction || selection.type !== 'none') && (
                  <button onClick={clearSelection} className="cs-btn p-1.5">
                    <X size={11} />
                  </button>
                )}
                <button onClick={() => setRightPanelOpen(false)} className="cs-btn p-1.5">
                  <ChevronRight size={11} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {selectedJunction ? (
                <JunctionView junction={selectedJunction} />
              ) : selection.type === 'building' && selection.data ? (
                <BuildingView building={selection.data as import('../types').BuildingFeature} />
              ) : (
                <CityOverview stats={stats} dataState={dataState} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// ─── City Overview ───

const CityOverview: React.FC<{
  stats: import('../types').CityStatistics;
  dataState: import('../types').DataState;
}> = ({ stats, dataState }) => (
  <div className="space-y-3">
    {/* Study Area */}
    <div className="cs-card">
      <div className="text-[9px] tracking-[0.15em] text-cs-text-muted uppercase mb-1 font-semibold">
        Study Area
      </div>
      <div className="text-base font-bold text-slate-800">{stats.studyAreaSize}</div>
      <div className="text-[10px] text-cs-text-dim mt-0.5 font-medium">Bandra Kurla Complex</div>
    </div>

    {/* Statistics */}
    <div className="space-y-2">
      <StatRow
        icon={<Building2 size={12} />}
        gradient="from-blue-500 to-indigo-600"
        label="Buildings"
        value={stats.buildingCount.toLocaleString()}
        loading={dataState.buildings === 'loading'}
      />
      <StatRow
        icon={<Route size={12} />}
        gradient="from-cyan-500 to-blue-600"
        label="Road Network"
        value={`${stats.roadCount} segments`}
        sub={stats.totalRoadLength > 0 ? `${(stats.totalRoadLength / 1000).toFixed(1)} km` : undefined}
        loading={dataState.roads === 'loading'}
      />
      <StatRow
        icon={<Activity size={12} />}
        gradient="from-indigo-500 to-purple-600"
        label="Intersections"
        value={stats.intersectionCount.toString()}
      />
      <StatRow
        icon={<Trees size={12} />}
        gradient="from-emerald-500 to-teal-600"
        label="Parks & Green"
        value={stats.parkCount.toString()}
        loading={dataState.parks === 'loading'}
      />
      <StatRow
        icon={<MapPin size={12} />}
        gradient="from-pink-500 to-rose-600"
        label="POIs"
        value={stats.poiCount.toString()}
        loading={dataState.pois === 'loading'}
      />
      <StatRow
        icon={<Droplets size={12} />}
        gradient="from-sky-500 to-cyan-600"
        label="Water Bodies"
        value={stats.waterBodyCount.toString()}
        loading={dataState.water === 'loading'}
      />
    </div>

    {/* Data Source */}
    <div className="cs-card mt-4">
      <div className="text-[9px] tracking-[0.15em] text-cs-text-muted uppercase mb-1 font-semibold">
        Data Source
      </div>
      <div className="text-[10px] text-cs-text-dim font-medium">
        © OpenStreetMap contributors
      </div>
      <div className="text-[9px] text-cs-text-muted mt-1">
        Real geographic data loaded from OpenStreetMap
      </div>
    </div>
  </div>
);

// ─── Building View ───

const BuildingView: React.FC<{
  building: import('../types').BuildingFeature;
}> = ({ building }) => (
  <div className="space-y-3">
    <div className="cs-card">
      <div className="text-[9px] tracking-[0.15em] text-cs-text-muted uppercase mb-1 font-semibold">
        Building
      </div>
      {building.properties.name && (
        <div className="text-base font-bold text-slate-800 mb-1">{building.properties.name}</div>
      )}
      <div className="text-[10px] text-cs-text-dim font-medium">
        OSM ID: {building.osmId}
      </div>
    </div>

    <div className="space-y-2">
      <InfoRow label="Type" value={building.properties.building} />
      <InfoRow
        label="Height"
        value={`${building.properties.estimatedHeight.toFixed(1)} m`}
        badge={
          building.properties.heightSource === 'estimated' ? (
            <span className="cs-badge cs-badge-simulated">Estimated</span>
          ) : building.properties.heightSource === 'osm_levels' ? (
            <span className="cs-badge cs-badge-online">OSM Levels</span>
          ) : (
            <span className="cs-badge cs-badge-online">OSM Height</span>
          )
        }
      />
      {building.properties.levels && (
        <InfoRow label="Levels" value={building.properties.levels.toString()} />
      )}
      {building.footprintArea && (
        <InfoRow label="Footprint" value={`${building.footprintArea.toFixed(0)} m²`} />
      )}
      {building.properties.addrStreet && (
        <InfoRow label="Street" value={building.properties.addrStreet} />
      )}
      {building.properties.amenity && (
        <InfoRow label="Amenity" value={building.properties.amenity} />
      )}
      {building.properties.office && (
        <InfoRow label="Office" value={building.properties.office} />
      )}
    </div>

    {/* Prototype Metrics */}
    <div className="cs-card mt-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] tracking-[0.15em] text-cs-text-muted uppercase font-semibold">
          Prototype Metrics
        </span>
        <span className="cs-badge cs-badge-simulated">Prototype Estimate</span>
      </div>
      <div className="space-y-2">
        <ProtoMetric icon={<Zap size={11} />} label="Energy Use" value={`${(Math.random() * 50 + 20).toFixed(0)} kWh/day`} />
        <ProtoMetric icon={<Sun size={11} />} label="Solar Potential" value={`${(Math.random() * 30 + 10).toFixed(0)} kW`} />
        <ProtoMetric icon={<Activity size={11} />} label="CO₂" value={`${(Math.random() * 5 + 1).toFixed(1)} t/year`} />
      </div>
    </div>
  </div>
);

// ─── Junction View ───

const JunctionView: React.FC<{
  junction: import('../types').JunctionPerformance;
}> = ({ junction }) => (
  <div className="space-y-3">
    <div className="cs-card">
      <div className="text-base font-bold text-slate-800 mb-1">{junction.name}</div>
      <div className="flex items-center gap-2 mt-2">
        <div
          className="cs-status-dot"
          style={{
            backgroundColor: getCongestionColor(junction.congestionLevel),
            boxShadow: `0 0 8px ${getCongestionColor(junction.congestionLevel)}60`,
            width: 8,
            height: 8,
          }}
        />
        <span
          className="text-[11px] font-bold"
          style={{ color: getCongestionColor(junction.congestionLevel) }}
        >
          {getCongestionLabel(junction.congestionLevel)}
        </span>
      </div>
    </div>

    <div className="space-y-2">
      <InfoRow label="Veh / Hour" value={junction.vehiclesPerHour.toLocaleString()} />
      <InfoRow label="Avg Delay / Veh" value={`${junction.avgDelay.toFixed(1)}s`} />
      <InfoRow label="kg CO₂ / Hour" value={junction.co2PerHour.toFixed(1)} />
      <InfoRow label="Cost to City / Hour" value={`$${junction.costPerHour.toLocaleString()}`} />
    </div>

    {/* Cost History */}
    <div className="cs-card mt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] tracking-[0.15em] text-cs-text-muted uppercase font-semibold">
          Cost — Last 60 Samples
        </span>
        <span className="cs-badge cs-badge-simulated">Simulated</span>
      </div>
      <div className="flex items-end gap-[2px] h-12">
        {junction.historyCost.map((cost, i) => {
          const maxCost = Math.max(...junction.historyCost);
          const h = maxCost > 0 ? (cost / maxCost) * 100 : 0;
          return (
            <div
              key={i}
              className="flex-1 rounded-t-sm"
              style={{
                height: `${h}%`,
                backgroundColor: getCongestionColor(junction.congestionLevel),
                opacity: 0.4 + (i / junction.historyCost.length) * 0.6,
              }}
            />
          );
        })}
      </div>
    </div>

    <div className="text-[9px] text-cs-text-muted text-center mt-2 font-medium">
      All junction metrics are prototype/simulated values
    </div>
  </div>
);

// ─── Sub-Components ───

const StatRow: React.FC<{
  icon: React.ReactNode;
  gradient?: string;
  label: string;
  value: string;
  sub?: string;
  loading?: boolean;
}> = ({ icon, gradient = 'from-blue-500 to-indigo-600', label, value, sub, loading }) => (
  <div className="cs-card flex items-center gap-2.5 hover:border-indigo-300 transition-all">
    <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-xs`}>
      {icon}
    </div>
    <div className="flex-1">
      <div className="text-[10px] text-cs-text-dim font-medium">{label}</div>
    </div>
    <div className="text-right">
      {loading ? (
        <div className="cs-spinner" style={{ width: 14, height: 14 }} />
      ) : (
        <>
          <div className="text-[11px] font-bold text-slate-800">{value}</div>
          {sub && <div className="text-[9px] text-cs-text-muted font-medium">{sub}</div>}
        </>
      )}
    </div>
  </div>
);

const InfoRow: React.FC<{
  label: string;
  value: string;
  badge?: React.ReactNode;
}> = ({ label, value, badge }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-cs-border/40">
    <span className="text-[10px] text-cs-text-muted font-medium">{label}</span>
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-800 font-semibold">{value}</span>
      {badge}
    </div>
  </div>
);

const ProtoMetric: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-1.5 text-[10px] text-cs-text-dim font-medium">
      <span className="text-indigo-500">{icon}</span>
      {label}
    </div>
    <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">{value}</span>
  </div>
);

export default RightPanel;
