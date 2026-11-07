import React from 'react';
import { Viewer, UrlTemplateImageryProvider } from 'resium';
import { Cartesian3 } from 'cesium';
import { CITY_CENTER } from '../config/city';

export const MiniCesiumMap: React.FC = () => {
  // Center the view on the study area
  const position = Cartesian3.fromDegrees(
    CITY_CENTER.longitude,
    CITY_CENTER.latitude,
    2000 // camera height in meters
  );

  return (
    <div className="w-full h-64 rounded-lg overflow-hidden border border-slate-200">
      <Viewer
        full
        baseLayerPicker={false}
        timeline={false}
        animation={false}
        navigationHelpButton={false}
        sceneModePicker={false}
        homeButton={false}
        geocoder={false}
        infoBox={false}
        selectionIndicator={false}
        // Dark CartoDB basemap
        imageryProvider={new UrlTemplateImageryProvider({
          url: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
          credit: '© CartoDB',
        })}
      >
        {/* No data sources – just a styled basemap preview */}
      </Viewer>
    </div>
  );
};

export default MiniCesiumMap;
