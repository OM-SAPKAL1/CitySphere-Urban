/**
 * CitySphere - What-If Scenario Lab
 * Scenario configuration drawer
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sun,
  Zap,
  Battery,
  TrafficCone,
  Trash2,
  TreePine,
  Building2,
  Check,
  FlaskConical,
} from 'lucide-react';
import { useCityStore } from '../stores/cityStore';
import type { ScenarioType, Scenario } from '../types';

interface ScenarioOption {
  type: ScenarioType;
  name: string;
  icon: React.ReactNode;
  fields: { key: string; label: string; type: 'number' | 'text'; default: string }[];
}

const SCENARIO_OPTIONS: ScenarioOption[] = [
  {
    type: 'rooftop-solar',
    name: 'Rooftop Solar',
    icon: <Sun size={14} />,
    fields: [
      { key: 'buildings', label: 'Buildings', type: 'number', default: '10' },
      { key: 'capacity', label: 'Capacity (kW)', type: 'number', default: '250' },
      { key: 'target', label: 'Target Area', type: 'text', default: 'Selected buildings' },
    ],
  },
  {
    type: 'ev-charging',
    name: 'EV Charging',
    icon: <Zap size={14} />,
    fields: [
      { key: 'stations', label: 'Stations', type: 'number', default: '5' },
      { key: 'chargers', label: 'Chargers per Station', type: 'number', default: '4' },
    ],
  },
  {
    type: 'battery-storage',
    name: 'Battery Storage',
    icon: <Battery size={14} />,
    fields: [
      { key: 'capacity', label: 'Capacity (MWh)', type: 'number', default: '2' },
      { key: 'location', label: 'Location', type: 'text', default: 'BKC Grid Node' },
    ],
  },
  {
    type: 'traffic-signal',
    name: 'Traffic Signal Optimization',
    icon: <TrafficCone size={14} />,
    fields: [
      { key: 'junctions', label: 'Junctions', type: 'number', default: '8' },
      { key: 'algorithm', label: 'Algorithm', type: 'text', default: 'Adaptive' },
    ],
  },
  {
    type: 'waste-route',
    name: 'Waste Route Optimization',
    icon: <Trash2 size={14} />,
    fields: [
      { key: 'routes', label: 'Routes', type: 'number', default: '12' },
      { key: 'vehicles', label: 'Vehicles', type: 'number', default: '6' },
    ],
  },
  {
    type: 'green-area',
    name: 'Green Area Expansion',
    icon: <TreePine size={14} />,
    fields: [
      { key: 'area', label: 'Area (m²)', type: 'number', default: '5000' },
      { key: 'type', label: 'Type', type: 'text', default: 'Urban Park' },
    ],
  },
  {
    type: 'building-energy',
    name: 'Building Energy Upgrade',
    icon: <Building2 size={14} />,
    fields: [
      { key: 'buildings', label: 'Buildings', type: 'number', default: '15' },
      { key: 'upgrade', label: 'Upgrade Type', type: 'text', default: 'Insulation + HVAC' },
    ],
  },
];

const WhatIfScenario: React.FC = () => {
  const scenarioLabOpen = useCityStore((s) => s.scenarioLabOpen);
  const setScenarioLabOpen = useCityStore((s) => s.setScenarioLabOpen);
  const addScenario = useCityStore((s) => s.addScenario);
  const scenarios = useCityStore((s) => s.scenarios);

  const [selectedType, setSelectedType] = useState<ScenarioType | null>(null);
  const [scenarioName, setScenarioName] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [created, setCreated] = useState(false);

  const selectedOption = SCENARIO_OPTIONS.find((o) => o.type === selectedType);

  const handleCreate = () => {
    if (!selectedType) return;

    const scenario: Scenario = {
      id: `scenario-${Date.now()}`,
      type: selectedType,
      name: scenarioName || selectedOption?.name || 'Unnamed Scenario',
      status: 'ready',
      config: fieldValues,
      createdAt: new Date(),
    };

    addScenario(scenario);
    setCreated(true);

    setTimeout(() => {
      setCreated(false);
      setSelectedType(null);
      setScenarioName('');
      setFieldValues({});
    }, 3000);
  };

  return (
    <AnimatePresence>
      {scenarioLabOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 cs-panel w-[600px] max-h-[400px] overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-cs-border flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 via-indigo-500 to-fuchsia-500 flex items-center justify-center text-white shadow-xs">
                  <FlaskConical size={13} />
                </div>
                <span className="text-[12px] font-bold tracking-wider text-slate-800 uppercase">
                  What-If Scenario Lab
                </span>
              </div>
              <div className="text-[9px] text-cs-text-muted mt-0.5 font-medium">
                Test a future urban intervention
              </div>
            </div>
            <button onClick={() => setScenarioLabOpen(false)} className="cs-btn p-1.5">
              <X size={12} />
            </button>
          </div>

          <div className="p-4 overflow-y-auto max-h-[300px]">
            {created ? (
              <div className="text-center py-8">
                <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-300 flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <Check size={18} className="text-emerald-600" />
                </div>
                <div className="text-base font-bold text-slate-800 mb-1">Scenario Created</div>
                <div className="text-[10px] text-emerald-700 font-semibold mb-2">Status: Ready for Simulation</div>
                <div className="text-[9px] text-cs-text-muted font-medium">
                  The simulation engine will be connected in Phase 2.
                </div>
              </div>
            ) : selectedType && selectedOption ? (
              <div className="space-y-3">
                <button
                  onClick={() => setSelectedType(null)}
                  className="text-[10px] text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                >
                  ← Back to scenario types
                </button>

                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xs">
                    {selectedOption.icon}
                  </span>
                  <span className="text-sm font-bold text-slate-800">{selectedOption.name}</span>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="text-[9px] text-cs-text-muted uppercase tracking-wider font-semibold block mb-1">
                      Scenario Name
                    </label>
                    <input
                      type="text"
                      value={scenarioName}
                      onChange={(e) => setScenarioName(e.target.value)}
                      placeholder={`${selectedOption.name} - BKC`}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 shadow-xs"
                    />
                  </div>

                  {selectedOption.fields.map((field) => (
                    <div key={field.key}>
                      <label className="text-[9px] text-cs-text-muted uppercase tracking-wider font-semibold block mb-1">
                        {field.label}
                      </label>
                      <input
                        type={field.type}
                        value={fieldValues[field.key] ?? field.default}
                        onChange={(e) =>
                          setFieldValues({ ...fieldValues, [field.key]: e.target.value })
                        }
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 shadow-xs"
                      />
                    </div>
                  ))}
                </div>

                <button onClick={handleCreate} className="cs-btn cs-btn-primary w-full mt-3 py-2 font-semibold">
                  <FlaskConical size={12} />
                  <span>Create Scenario</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {SCENARIO_OPTIONS.map((option) => (
                  <button
                    key={option.type}
                    onClick={() => {
                      setSelectedType(option.type);
                      const defaults: Record<string, string> = {};
                      option.fields.forEach((f) => (defaults[f.key] = f.default));
                      setFieldValues(defaults);
                    }}
                    className="cs-card flex items-center gap-2.5 text-left hover:border-indigo-300 hover:shadow-sm transition-all"
                  >
                    <span className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                      {option.icon}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-800">{option.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Existing Scenarios */}
            {scenarios.length > 0 && !created && !selectedType && (
              <div className="mt-4 pt-3 border-t border-cs-border">
                <div className="text-[9px] font-semibold tracking-[0.15em] text-cs-text-muted uppercase mb-2">
                  Created Scenarios ({scenarios.length})
                </div>
                <div className="space-y-1.5">
                  {scenarios.map((s) => (
                    <div key={s.id} className="cs-card flex items-center justify-between">
                      <span className="text-[10px] text-slate-800 font-semibold">{s.name}</span>
                      <span className="cs-badge cs-badge-simulated">
                        {s.status === 'ready' ? 'Ready' : s.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WhatIfScenario;
