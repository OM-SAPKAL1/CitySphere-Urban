/**
 * CitySphere - Layer Manager
 * Compact layer toggle panel
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Building2,
  Route,
  Trees,
  Droplets,
  MapPin,
  Car,
  CircleDot,
  Activity,
  X,
  Lock,
} from 'lucide-react';
import { useCityStore } from '../stores/cityStore';

const LAYER_ICONS: Record<string, React.ReactNode> = {
  buildings: <Building2 size={12} />,
  roads: <Route size={12} />,
  parks: <Trees size={12} />,
  water: <Droplets size={12} />,
  pois: <MapPin size={12} />,
  vehicles: <Car size={12} />,
  junctions: <CircleDot size={12} />,
  'traffic-flow': <Activity size={12} />,
};

const LayerManager: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const layers = useCityStore((s) => s.layers);
  const toggleLayer = useCityStore((s) => s.toggleLayer);

  const currentLayers = layers.filter((l) => l.phase === 'current');
  const futureLayers = layers.filter((l) => l.phase === 'phase2');

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-20 right-3 z-30 cs-panel w-[220px] overflow-hidden"
        >
          <div className="p-3 border-b border-cs-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xs">
                <Layers size={11} />
              </div>
              <span className="text-[10px] font-bold tracking-wider text-slate-800 uppercase">
                Layers
              </span>
            </div>
            <button onClick={onClose} className="cs-btn p-1">
              <X size={10} />
            </button>
          </div>

          <div className="p-3 space-y-1.5">
            {currentLayers.map((layer) => (
              <button
                key={layer.id}
                onClick={() => toggleLayer(layer.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left transition-all duration-150 ${
                  layer.enabled
                    ? 'bg-gradient-to-r from-indigo-50 to-blue-50/70 border border-indigo-200/80 shadow-xs'
                    : 'border border-transparent hover:bg-slate-100/70'
                }`}
              >
                <span className={layer.enabled ? 'text-indigo-600' : 'text-cs-text-muted'}>
                  {LAYER_ICONS[layer.id] || <Layers size={12} />}
                </span>
                <span
                  className={`text-[10px] flex-1 ${
                    layer.enabled ? 'text-slate-800 font-semibold' : 'text-cs-text-dim font-medium'
                  }`}
                >
                  {layer.name}
                </span>
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    layer.enabled ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' : 'bg-slate-300'
                  }`}
                />
              </button>
            ))}
          </div>

          {futureLayers.length > 0 && (
            <div className="p-3 pt-0">
              <div className="text-[8px] font-semibold tracking-[0.15em] text-cs-text-muted uppercase mb-1.5 mt-1">
                Phase 2
              </div>
              {futureLayers.map((layer) => (
                <div
                  key={layer.id}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 opacity-40"
                >
                  <Lock size={10} className="text-cs-text-muted" />
                  <span className="text-[10px] text-cs-text-muted">{layer.name}</span>
                  <span className="cs-badge cs-badge-phase2 ml-auto">Phase 2</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LayerManager;
