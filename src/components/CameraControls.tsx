/**
 * CitySphere - Camera Controls
 * Floating camera control buttons
 */

import React, { useState } from 'react';
import {
  RotateCcw,
  Maximize2,
  Layers,
  Eye,
  Map,
  Box,
  ZoomIn,
  ZoomOut,
  MousePointer,
  Navigation,
  Compass,
  X,
} from 'lucide-react';
import { useCityStore } from '../stores/cityStore';
import LayerManager from './LayerManager';

const CameraControls: React.FC = () => {
  const viewMode = useCityStore((s) => s.viewMode);
  const setViewMode = useCityStore((s) => s.setViewMode);
  const setCameraView = useCityStore((s) => s.setCameraView);
  const rightPanelOpen = useCityStore((s) => s.rightPanelOpen);
  const [layerOpen, setLayerOpen] = useState(false);
  const [controlsHelpOpen, setControlsHelpOpen] = useState(false);

  return (
    <>
      <div
        className="fixed top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5 transition-all duration-300"
        style={{ right: rightPanelOpen ? '326px' : '12px' }}
      >
        {/* View Mode Toggle */}
        <div className="cs-panel p-1 flex flex-col gap-0.5">
          <button
            onClick={() => setViewMode('digital-twin')}
            className={`cs-btn p-2 ${viewMode === 'digital-twin' ? 'cs-btn-primary' : ''}`}
            title="Digital Twin (3D)"
          >
            <Box size={13} />
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`cs-btn p-2 ${viewMode === 'map' ? 'cs-btn-primary' : ''}`}
            title="Map (2D)"
          >
            <Map size={13} />
          </button>
        </div>

        {/* Camera Controls */}
        <div className="cs-panel p-1 flex flex-col gap-0.5">
          <button
            onClick={() => useCityStore.getState().triggerCameraAction('zoomIn')}
            className="cs-btn p-2"
            title="Zoom In (or use Mouse Scroll Up)"
          >
            <ZoomIn size={13} />
          </button>
          <button
            onClick={() => useCityStore.getState().triggerCameraAction('zoomOut')}
            className="cs-btn p-2"
            title="Zoom Out (or use Mouse Scroll Down)"
          >
            <ZoomOut size={13} />
          </button>
          <button
            onClick={() => setCameraView('isometric')}
            className="cs-btn p-2"
            title="Isometric View"
          >
            <Eye size={13} />
          </button>
          <button
            onClick={() => setCameraView('top')}
            className="cs-btn p-2"
            title="Top View"
          >
            <Maximize2 size={13} />
          </button>
          <button
            onClick={() => useCityStore.getState().triggerCameraAction('reset')}
            className="cs-btn p-2"
            title="Reset View to Shivajinagar Center"
          >
            <RotateCcw size={13} />
          </button>
        </div>

        {/* Navigation Help & Layer Toggle */}
        <div className="cs-panel p-1 flex flex-col gap-0.5">
          <button
            onClick={() => setControlsHelpOpen(!controlsHelpOpen)}
            className={`cs-btn p-2 ${controlsHelpOpen ? 'cs-btn-primary' : ''}`}
            title="Mouse & Keyboard Navigation Guide"
          >
            <MousePointer size={13} />
          </button>
          <button
            onClick={() => setLayerOpen(!layerOpen)}
            className={`cs-btn p-2 ${layerOpen ? 'cs-btn-primary' : ''}`}
            title="Layers"
          >
            <Layers size={13} />
          </button>
        </div>
      </div>

      {/* Navigation Controls Guide Modal */}
      {controlsHelpOpen && (
        <div
          className="fixed top-1/2 -translate-y-1/2 z-30 cs-panel p-4 shadow-2xl backdrop-blur-md bg-slate-900/90 border border-slate-700/60 rounded-xl w-72 text-slate-200 transition-all duration-300"
          style={{ right: rightPanelOpen ? '376px' : '64px' }}
        >
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <Compass size={14} className="text-cyan-400" />
              <span className="text-xs font-bold tracking-wide uppercase text-cyan-300">
                Free Will Controls
              </span>
            </div>
            <button
              onClick={() => setControlsHelpOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded transition-colors"
            >
              <X size={12} />
            </button>
          </div>

          <div className="space-y-3 text-[11px]">
            <div>
              <div className="text-[10px] font-semibold text-cyan-400/90 uppercase tracking-wider mb-1">
                Mouse Navigation
              </div>
              <ul className="space-y-1.5 text-slate-300">
                <li className="flex justify-between items-center">
                  <span className="text-slate-400">Scroll Wheel:</span>
                  <span className="font-medium text-white bg-slate-800/80 px-1.5 py-0.5 rounded text-[10px]">Zoom In / Out</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-slate-400">Left Drag:</span>
                  <span className="font-medium text-white bg-slate-800/80 px-1.5 py-0.5 rounded text-[10px]">Pan / Move Ground</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-slate-400">Right Drag:</span>
                  <span className="font-medium text-white bg-slate-800/80 px-1.5 py-0.5 rounded text-[10px]">3D Tilt & Orbit Rotate</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-slate-400">Shift + Drag:</span>
                  <span className="font-medium text-white bg-slate-800/80 px-1.5 py-0.5 rounded text-[10px]">360° Free Look</span>
                </li>
              </ul>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <div className="text-[10px] font-semibold text-emerald-400/90 uppercase tracking-wider mb-1">
                Keyboard Flight
              </div>
              <ul className="space-y-1.5 text-slate-300">
                <li className="flex justify-between items-center">
                  <span className="text-slate-400">W / S / A / D:</span>
                  <span className="font-medium text-white bg-slate-800/80 px-1.5 py-0.5 rounded text-[10px]">Fly Forward / Back / Sides</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-slate-400">Q / E:</span>
                  <span className="font-medium text-white bg-slate-800/80 px-1.5 py-0.5 rounded text-[10px]">Descend / Ascend</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-slate-400">Shift (hold):</span>
                  <span className="font-medium text-emerald-300 bg-slate-800/80 px-1.5 py-0.5 rounded text-[10px]">3x Turbo Boost</span>
                </li>
              </ul>
            </div>

            <div className="text-[9.5px] text-slate-400 italic pt-1">
              Collision locking disabled: explore Pune from high altitude right down to street level freely!
            </div>
          </div>
        </div>
      )}

      <LayerManager open={layerOpen} onClose={() => setLayerOpen(false)} />
    </>
  );
};

export default CameraControls;
