/**
 * CitySphere - Loading Screen
 * Shown while OSM data is loading
 */

import React from 'react';
import { Activity } from 'lucide-react';
import { useCityStore } from '../stores/cityStore';
import { CITY_CENTER } from '../config/city';

const LoadingScreen: React.FC = () => {
  const dataState = useCityStore((s) => s.dataState);
  const hasError = dataState.error;

  const steps = [
    { key: 'buildings', label: 'Loading buildings...', state: dataState.buildings },
    { key: 'roads', label: 'Loading roads...', state: dataState.roads },
    { key: 'pois', label: 'Loading POIs...', state: dataState.pois },
    { key: 'parks', label: 'Loading parks...', state: dataState.parks },
    { key: 'water', label: 'Loading water bodies...', state: dataState.water },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 flex items-center justify-center relative overflow-hidden">
      {/* Decorative ambient gradient blooms */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="text-center max-w-md relative z-10">
        {/* Logo */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-fuchsia-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/25">
          <Activity size={28} className="text-white" />
        </div>

        <h1 className="text-2xl font-extrabold tracking-wider bg-gradient-to-r from-blue-600 via-indigo-600 to-fuchsia-600 bg-clip-text text-transparent mb-0.5">
          CITYSPHERE
        </h1>
        <p className="text-[10px] tracking-[0.2em] text-cs-text-muted uppercase font-semibold mb-6">
          Urban Digital Twin
        </p>

        <div className="text-sm text-slate-800 font-semibold mb-1">
          {CITY_CENTER.name} · {CITY_CENTER.studyArea}
        </div>
        <div className="text-[10px] text-cs-text-muted mb-6 font-medium">
          Loading real OpenStreetMap data for 1 km × 1 km study area
        </div>

        {hasError ? (
          <div className="cs-card text-left p-4 mb-4">
            <div className="text-red-600 text-[11px] font-bold mb-1">
              Unable to Load City Data
            </div>
            <div className="text-[10px] text-cs-text-dim mb-3 font-medium">{hasError}</div>
            <button
              onClick={() => window.location.reload()}
              className="cs-btn cs-btn-primary w-full py-2 font-semibold"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {steps.map((step) => (
              <div
                key={step.key}
                className="flex items-center gap-3 text-left cs-card !py-2.5"
              >
                {step.state === 'loading' ? (
                  <div className="cs-spinner" style={{ width: 14, height: 14 }} />
                ) : step.state === 'loaded' ? (
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-100 border border-emerald-400 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  </div>
                ) : step.state === 'error' ? (
                  <div className="w-3.5 h-3.5 rounded-full bg-red-100 border border-red-400" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full bg-slate-200" />
                )}
                <span
                  className={`text-[10px] font-medium ${
                    step.state === 'loaded'
                      ? 'text-emerald-700 font-semibold'
                      : step.state === 'loading'
                        ? 'text-indigo-600 font-semibold'
                        : step.state === 'error'
                          ? 'text-red-600 font-semibold'
                          : 'text-slate-400'
                  }`}
                >
                  {step.state === 'loaded'
                    ? step.label.replace('Loading', 'Loaded').replace('...', ' ✓')
                    : step.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Attribution */}
        <div className="mt-6 text-[8px] text-cs-text-muted font-medium">
          © OpenStreetMap contributors
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
