import React from 'react';
import { useCityStore } from '../stores/cityStore';
import DigitalTwinScene from '../features/digital-twin/DigitalTwinScene';
import TopBar from '../components/TopBar';
import LeftPanel from '../components/LeftPanel';
import RightPanel from '../components/RightPanel';
import BottomBar from '../components/BottomBar';
import CameraControls from '../components/CameraControls';
import WhatIfScenario from '../components/WhatIfScenario';
import SystemStatus from '../components/SystemStatus';
import LoadingScreen from '../components/LoadingScreen';

const DigitalTwin: React.FC = () => {
  const dataState = useCityStore((s) => s.dataState);
  const rainSimulation = useCityStore((s) => s.rainSimulation);

  const coreLoaded = dataState.buildings === 'loaded' && dataState.roads === 'loaded';

  return (
    <div className="w-full h-full relative overflow-hidden bg-cs-bg">
      {!coreLoaded && !dataState.error && <LoadingScreen />}
      {dataState.error && <LoadingScreen />}

      {coreLoaded && (
        <>
          <DigitalTwinScene />
          {rainSimulation && <div className="rain-overlay" />}
          <TopBar />
          <LeftPanel />
          <RightPanel />
          <BottomBar />
          <CameraControls />
          <WhatIfScenario />
          <SystemStatus />
          <div className="fixed bottom-1 left-1/2 -translate-x-1/2 z-10 text-[8px] text-slate-500/70 font-medium tracking-wide">
            © OpenStreetMap contributors
          </div>
        </>
      )}
    </div>
  );
};

export default DigitalTwin;
