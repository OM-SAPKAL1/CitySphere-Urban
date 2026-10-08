/**
 * CitySphere - Top Header Bar
 */

import React from 'react';
import { Activity } from 'lucide-react';
import { useCityStore } from '../stores/cityStore';
import { CITY_CENTER } from '../config/city';

const TopBar: React.FC = () => {
  const dataState = useCityStore((s) => s.dataState);

  const osmLoaded = dataState.buildings === 'loaded' && dataState.roads === 'loaded';
  const isLoading = dataState.buildings === 'loading' || dataState.roads === 'loading';

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4">
      {/* Brand */}
      <div className="cs-panel px-4 py-2 flex items-center gap-6">
        {/* Left: Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 via-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-md shadow-indigo-500/25">
            <Activity size={14} className="text-white" />
          </div>
          <div>
            <div className="text-[11px] font-extrabold tracking-[0.15em] bg-gradient-to-r from-blue-600 via-indigo-600 to-fuchsia-600 bg-clip-text text-transparent">
              CITYSPHERE
            </div>
            <div className="text-[7.5px] font-semibold tracking-[0.2em] text-cs-text-muted uppercase">
              Urban Digital Twin
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-cs-border" />

        {/* Study Area */}
        <div className="text-center">
          <div className="text-[10px] font-semibold text-cs-text">{CITY_CENTER.studyArea}</div>
          <div className="text-[8px] text-cs-text-muted font-medium">1 km × 1 km Study Area</div>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-cs-border" />

        {/* Status */}
        <div className="flex items-center gap-3">
          {/* Digital Twin Status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
            <div className="cs-status-dot cs-status-online" />
            <span className="text-[8px] font-bold tracking-wider text-emerald-700 uppercase">
              Digital Twin Online
            </span>
          </div>

          {/* OSM Status */}
          <div className="flex items-center gap-1.5">
            {isLoading ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200">
                <div className="cs-spinner" style={{ width: 8, height: 8 }} />
                <span className="text-[8px] font-bold tracking-wider text-amber-700 uppercase">
                  Loading OSM...
                </span>
              </div>
            ) : osmLoaded ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200">
                <div className="cs-status-dot cs-status-loaded" />
                <span className="text-[8px] font-bold tracking-wider text-indigo-700 uppercase">
                  OSM Loaded
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200">
                <div className="cs-status-dot cs-status-not-connected" />
                <span className="text-[8px] font-bold tracking-wider text-slate-500 uppercase">
                  OSM Pending
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
