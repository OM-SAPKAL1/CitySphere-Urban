/**
 * CitySphere - System Status Panel
 * Small floating system status indicator
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Server, X } from 'lucide-react';
import { useCityStore } from '../stores/cityStore';
import type { SystemStatusLevel } from '../types';

const STATUS_LABELS: Record<SystemStatusLevel, string> = {
  online: 'Online',
  loaded: 'Loaded',
  connected: 'Connected',
  'not-connected': 'Not Connected',
  phase2: 'Phase 2',
  ready: 'Ready',
};

const SystemStatus: React.FC = () => {
  const [open, setOpen] = useState(false);
  const systemStatuses = useCityStore((s) => s.systemStatuses);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-20 left-3 z-20 cs-btn p-2 hover:border-indigo-300"
        title="System Status"
      >
        <Server size={12} className="text-indigo-600" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-32 left-3 z-30 cs-panel w-[210px]"
          >
            <div className="p-2.5 border-b border-cs-border flex items-center justify-between">
              <span className="text-[9px] font-bold tracking-wider text-slate-800 uppercase">
                System Status
              </span>
              <button onClick={() => setOpen(false)} className="cs-btn p-1">
                <X size={9} />
              </button>
            </div>
            <div className="p-2.5 space-y-1.5">
              {systemStatuses.map((status) => (
                <div key={status.id} className="flex items-center gap-2">
                  <div className={`cs-status-dot cs-status-${status.status}`} />
                  <span className="text-[9px] text-cs-text-dim flex-1 font-medium">{status.name}</span>
                  <span
                    className={`text-[8px] font-bold ${
                      status.status === 'online' || status.status === 'loaded' || status.status === 'connected'
                        ? 'text-emerald-600'
                        : status.status === 'ready'
                          ? 'text-amber-600'
                          : 'text-slate-400'
                    }`}
                  >
                    {STATUS_LABELS[status.status]}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SystemStatus;
