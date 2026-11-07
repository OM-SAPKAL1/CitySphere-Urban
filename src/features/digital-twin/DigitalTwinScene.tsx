import React, { useEffect, useMemo } from 'react';
import { Viewer, ImageryLayer, GeoJsonDataSource, useCesium, ScreenSpaceEventHandler, ScreenSpaceEvent } from 'resium';
import * as Cesium from 'cesium';
import { useCityStore } from '../../stores/cityStore';
import { CITY_CENTER, STUDY_AREA_SIZE_METERS } from '../../config/city';

const SceneInteraction: React.FC = () => {
  const { viewer } = useCesium();
  const setSelection = useCityStore((s) => s.setSelection);
  const clearSelection = useCityStore((s) => s.clearSelection);
  const cameraView = useCityStore((s) => s.cameraView);
  const buildings = useCityStore((s) => s.buildings);
  const roads = useCityStore((s) => s.roads);

  useEffect(() => {
    if (!viewer) return;
    if (cameraView === 'isometric') {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(CITY_CENTER.longitude, CITY_CENTER.latitude, STUDY_AREA_SIZE_METERS),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-45),
          roll: 0.0,
        },
        duration: 1.5
      });
    } else if (cameraView === 'top') {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(CITY_CENTER.longitude, CITY_CENTER.latitude, STUDY_AREA_SIZE_METERS * 2),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-90),
          roll: 0.0,
        },
        duration: 1.5
      });
    }
  }, [cameraView, viewer]);

  // Handle explicit camera actions (zoom, reset)
  const cameraAction = useCityStore((s) => s.cameraAction);
  useEffect(() => {
    if (!viewer || !cameraAction.action) return;
    
    if (cameraAction.action === 'reset') {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(CITY_CENTER.longitude, CITY_CENTER.latitude, STUDY_AREA_SIZE_METERS),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-45),
          roll: 0.0,
        },
        duration: 1.5
      });
      useCityStore.getState().setCameraView('isometric');
    } else if (cameraAction.action === 'zoomIn') {
      viewer.camera.zoomIn(viewer.camera.positionCartographic.height * 0.4);
    } else if (cameraAction.action === 'zoomOut') {
      viewer.camera.zoomOut(viewer.camera.positionCartographic.height * 0.4);
    }
  }, [cameraAction, viewer]);

  // Initial load camera setup and complete unrestricted mouse & keyboard controls
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;

    // Set initial camera view centered on Pune Shivajinagar-Deccan
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(CITY_CENTER.longitude, CITY_CENTER.latitude, STUDY_AREA_SIZE_METERS),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0.0,
      }
    });

    // Configure Cesium screenSpaceCameraController for complete free-will movement
    const controller = viewer.scene.screenSpaceCameraController;

    // 1. Enable all dimensions of camera interaction
    controller.enableInputs = true;
    controller.enableRotate = true;
    controller.enableTranslate = true;
    controller.enableZoom = true;
    controller.enableTilt = true;
    controller.enableLook = true;

    // 2. CRITICAL: Disable collision detection so camera never locks or freezes near ground/buildings
    controller.enableCollisionDetection = false;

    // 3. Zoom range: street level (1m) up to regional view (2,500,000m)
    controller.minimumZoomDistance = 1.0;
    controller.maximumZoomDistance = 2500000.0;

    // 4. Responsive zoom and momentum
    controller.zoomFactor = 3.5;
    controller.inertiaSpin = 0.6;
    controller.inertiaTranslate = 0.6;
    controller.inertiaZoom = 0.6;

    // 5. Unrestricted vertical tilt angle (full pitch freedom)
    controller.maximumTiltAngle = Math.PI;

    // 6. Intuitive Mouse Event Bindings:
    // Left drag: Move / pan across Pune freely
    controller.rotateEventTypes = Cesium.CameraEventType.LEFT_DRAG;

    // Mouse wheel & Pinch: Zoom in and out smoothly at mouse cursor
    controller.zoomEventTypes = [
      Cesium.CameraEventType.WHEEL,
      Cesium.CameraEventType.PINCH,
      {
        eventType: Cesium.CameraEventType.RIGHT_DRAG,
        modifier: Cesium.KeyboardEventModifier.CTRL,
      },
    ];

    // Right drag & Middle drag & Ctrl+Left drag: 3D Tilt and Orbit Rotation
    controller.tiltEventTypes = [
      Cesium.CameraEventType.RIGHT_DRAG,
      Cesium.CameraEventType.MIDDLE_DRAG,
      Cesium.CameraEventType.PINCH,
      {
        eventType: Cesium.CameraEventType.LEFT_DRAG,
        modifier: Cesium.KeyboardEventModifier.CTRL,
      },
    ];

    // Shift + Left/Right drag: 360° Free Look
    controller.lookEventTypes = [
      {
        eventType: Cesium.CameraEventType.LEFT_DRAG,
        modifier: Cesium.KeyboardEventModifier.SHIFT,
      },
      {
        eventType: Cesium.CameraEventType.RIGHT_DRAG,
        modifier: Cesium.KeyboardEventModifier.SHIFT,
      },
    ];

    // 7. Robust Wheel Zoom Fallback (for when cursor is in the sky/horizon where Cesium ray misses the globe)
    const canvas = viewer.canvas;
    const handleCanvasWheel = (e: WheelEvent) => {
      if (!viewer || viewer.isDestroyed()) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const ray = viewer.camera.getPickRay(new Cesium.Cartesian2(mouseX, mouseY));
      if (!ray) return;
      const intersection = viewer.scene.globe.pick(ray, viewer.scene);
      if (!intersection) {
        // Cursor is in the sky or above horizon: perform direct smooth zoom along camera direction
        const height = viewer.camera.positionCartographic.height;
        const delta = Math.min(Math.max(height * 0.18, 10.0), 35000.0);
        if (e.deltaY < 0) {
          viewer.camera.zoomIn(delta);
        } else if (e.deltaY > 0) {
          viewer.camera.zoomOut(delta);
        }
      }
    };
    canvas.addEventListener('wheel', handleCanvasWheel, { passive: true });

    // 8. 60 FPS Keyboard Flight Navigation (WASD / Arrow Keys + Q/E + Shift boost)
    const activeKeys = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ', 'KeyE', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        activeKeys.add(e.code);
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        activeKeys.add('Shift');
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      activeKeys.delete(e.code);
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        activeKeys.delete('Shift');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const removePreRender = viewer.scene.preRender.addEventListener(() => {
      if (activeKeys.size === 0 || !viewer || viewer.isDestroyed()) return;
      const height = viewer.camera.positionCartographic.height;
      let speed = Math.min(Math.max(height * 0.025, 2.0), 500.0);
      if (activeKeys.has('Shift')) {
        speed *= 3.0;
      }
      const cam = viewer.camera;
      if (activeKeys.has('KeyW') || activeKeys.has('ArrowUp')) {
        cam.moveForward(speed);
      }
      if (activeKeys.has('KeyS') || activeKeys.has('ArrowDown')) {
        cam.moveBackward(speed);
      }
      if (activeKeys.has('KeyA') || activeKeys.has('ArrowLeft')) {
        cam.moveLeft(speed);
      }
      if (activeKeys.has('KeyD') || activeKeys.has('ArrowRight')) {
        cam.moveRight(speed);
      }
      if (activeKeys.has('KeyE')) {
        cam.moveUp(speed);
      }
      if (activeKeys.has('KeyQ')) {
        cam.moveDown(speed);
      }
    });

    return () => {
      canvas.removeEventListener('wheel', handleCanvasWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      removePreRender();
    };
  }, [viewer]);

  return (
    <ScreenSpaceEventHandler>
      <ScreenSpaceEvent
        action={(click: any) => {
          if (!viewer) return;
          const pickedObject = viewer.scene.pick(click.position);
          if (Cesium.defined(pickedObject) && pickedObject.id) {
            const entity = pickedObject.id;
            // Properties from GeoJSON are stored in entity.properties
            // We use the ID to check if it's a building or road. Wait, ID is in entity.id
            const id = entity.id as string;
            const properties = entity.properties ? entity.properties.getValue(viewer.clock.currentTime) : {};
            
            if (id.startsWith('building_') || id.startsWith('building-') || id.startsWith('way/')) {
              const b = buildings.find(item => item.id === id || String(item.osmId) === id.replace('way/', '').replace('building-', ''));
              setSelection({
                type: 'building',
                id,
                data: b || null
              });
            } else if (id.startsWith('road_') || id.startsWith('road-')) {
              const r = roads.find(item => item.id === id || String(item.osmId) === id.replace('way/', '').replace('road-', ''));
              setSelection({
                type: 'road',
                id,
                data: r || null
              });
            } else {
              const b = buildings.find(item => item.id === id);
              setSelection({
                type: 'building',
                id,
                data: b || null
              });
            }
          } else {
            clearSelection();
          }
        }}
        type={Cesium.ScreenSpaceEventType.LEFT_CLICK}
      />
    </ScreenSpaceEventHandler>
  );
};

const DigitalTwinScene: React.FC = () => {
  const buildings = useCityStore((s) => s.buildings);
  const roads = useCityStore((s) => s.roads);

  const buildingGeoJson = useMemo(() => {
    if (!buildings.length) return null;
    return {
      type: 'FeatureCollection',
      features: buildings.map(b => ({
        type: 'Feature',
        id: b.id,
        geometry: b.geometry,
        properties: {
          ...b.properties,
          height: b.properties.estimatedHeight || 20,
          color: '#e2e8f0'
        }
      }))
    };
  }, [buildings]);

  const roadGeoJson = useMemo(() => {
    if (!roads.length) return null;
    return {
      type: 'FeatureCollection',
      features: roads.map(r => ({
        type: 'Feature',
        id: r.id,
        geometry: r.geometry,
        properties: {
          ...r.properties,
          stroke: '#94a3b8',
          strokeWidth: 3
        }
      }))
    };
  }, [roads]);

  return (
    <div className="absolute inset-0 w-full h-full z-0">
      <Viewer 
        full 
        timeline={false} 
        animation={false} 
        baseLayerPicker={false}
        navigationHelpButton={false}
        sceneModePicker={false}
        homeButton={false}
        geocoder={false}
        infoBox={false}
        selectionIndicator={false}
      >
        {/* Satellite basemap */}
        <ImageryLayer
          imageryProvider={new Cesium.UrlTemplateImageryProvider({
            url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            credit: '© Esri, Maxar, Earthstar Geographics',
          })}
        />
        <SceneInteraction />
        
        {buildingGeoJson && (
          <GeoJsonDataSource 
            data={buildingGeoJson} 
            onLoad={(ds: Cesium.GeoJsonDataSource) => {
              const entities = ds.entities.values;
              for (let i = 0; i < entities.length; i++) {
                const entity = entities[i];
                if (entity.polygon) {
                  const height = entity.properties?.height ? entity.properties.height.getValue(Cesium.JulianDate.now()) : 20;
                  const colorStr = entity.properties?.color ? entity.properties.color.getValue(Cesium.JulianDate.now()) : '#e2e8f0';

                  entity.polygon.extrudedHeight = new Cesium.ConstantProperty(height);
                  entity.polygon.material = new Cesium.ColorMaterialProperty(Cesium.Color.fromCssColorString(colorStr).withAlpha(0.9));
                  entity.polygon.outline = new Cesium.ConstantProperty(true);
                  entity.polygon.outlineColor = new Cesium.ConstantProperty(Cesium.Color.fromCssColorString('#cbd5e1'));
                }
              }
            }}
          />
        )}

        {roadGeoJson && (
          <GeoJsonDataSource 
            data={roadGeoJson} 
            onLoad={(ds: Cesium.GeoJsonDataSource) => {
              const entities = ds.entities.values;
              for (let i = 0; i < entities.length; i++) {
                const entity = entities[i];
                if (entity.polyline) {
                  const strokeStr = entity.properties?.stroke ? entity.properties.stroke.getValue(Cesium.JulianDate.now()) : '#94a3b8';
                  const strokeWidth = entity.properties?.strokeWidth ? entity.properties.strokeWidth.getValue(Cesium.JulianDate.now()) : 3;

                  entity.polyline.material = new Cesium.ColorMaterialProperty(Cesium.Color.fromCssColorString(strokeStr).withAlpha(0.8));
                  entity.polyline.width = new Cesium.ConstantProperty(strokeWidth);
                }
              }
            }}
          />
        )}
      </Viewer>
    </div>
  );
};

export default DigitalTwinScene;
