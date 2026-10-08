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
} from 'lucide-react';
import { useCityStore } from '../stores/cityStore';
import LayerManager from './LayerManager';

const CameraControls: React.FC = () => {
  const viewMode = useCityStore((s) => s.viewMode);
  const setViewMode = useCityStore((s) => s.setViewMode);
  const setCameraView = useCityStore((s) => s.setCameraView);
  const rightPanelOpen = useCityStore((s) => s.rightPanelOpen);
  const [layerOpen, setLayerOpen] = useState(false);

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
            onClick={() => setCameraView('isometric')}
            className="cs-btn p-2"
            title="Reset View"
          >
            <RotateCcw size={13} />
          </button>
        </div>

        {/* Layer Toggle */}
        <div className="cs-panel p-1">
          <button
            onClick={() => setLayerOpen(!layerOpen)}
            className={`cs-btn p-2 ${layerOpen ? 'cs-btn-primary' : ''}`}
            title="Layers"
          >
            <Layers size={13} />
          </button>
        </div>
      </div>

      <LayerManager open={layerOpen} onClose={() => setLayerOpen(false)} />
    </>
  );
};

export default CameraControls;
