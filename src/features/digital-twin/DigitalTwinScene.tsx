/**
 * CitySphere - Digital Twin 3D Scene
 * Main Three.js scene that renders the 3D city using React Three Fiber
 */

import React, { useRef, useMemo, useEffect, useCallback, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useCityStore } from '../../stores/cityStore';
import {
  createBuildingGeometries,
  createBuildingOutline,
  createRoadGeometry,
  createParkGeometry,
  createWaterGeometry,
} from './buildingMesh';
import { geoToLocal } from '../../utils/geoUtils';
import { getCongestionColor } from '../../services/simulation/simulationService';
import type { BuildingFeature, RoadFeature, Vehicle } from '../../types';

// ─── City Scene Component ───

const CityScene: React.FC = () => {
  const buildings = useCityStore((s) => s.buildings);
  const roads = useCityStore((s) => s.roads);
  const parks = useCityStore((s) => s.parks);
  const water = useCityStore((s) => s.water);
  const vehicles = useCityStore((s) => s.vehicles);
  const layers = useCityStore((s) => s.layers);
  const selection = useCityStore((s) => s.selection);
  const junctions = useCityStore((s) => s.junctions);
  const selectedJunction = useCityStore((s) => s.selectedJunction);
  const nightMode = useCityStore((s) => s.nightMode);

  const isLayerEnabled = useCallback(
    (id: string) => layers.find((l) => l.id === id)?.enabled ?? false,
    [layers]
  );

  // ─── Building Geometry ───
  const buildingData = useMemo(() => {
    if (buildings.length === 0) return null;
    return createBuildingGeometries(buildings);
  }, [buildings]);

  // ─── Road Geometry ───
  const roadGroup = useMemo(() => {
    if (roads.length === 0) return null;
    return createRoadGeometry(roads);
  }, [roads]);

  // ─── Park Geometry ───
  const parkGroup = useMemo(() => {
    if (parks.length === 0) return null;
    return createParkGeometry(parks);
  }, [parks]);

  // ─── Water Geometry ───
  const waterGroup = useMemo(() => {
    if (water.length === 0) return null;
    return createWaterGeometry(water);
  }, [water]);

  // ─── Selected Building Outline ───
  const selectedOutline = useMemo(() => {
    if (selection.type === 'building' && selection.data) {
      return createBuildingOutline(selection.data as BuildingFeature);
    }
    return null;
  }, [selection]);

  return (
    <>
      {/* Ambient Light */}
      <ambientLight intensity={nightMode ? 0.15 : 0.85} />

      {/* Directional Sunlight */}
      <directionalLight
        position={[200, 300, 100]}
        intensity={nightMode ? 0.3 : 1.4}
        color={nightMode ? '#4466aa' : '#ffffff'}
        castShadow={false}
      />

      {/* Fill light */}
      <directionalLight
        position={[-100, 150, -50]}
        intensity={nightMode ? 0.1 : 0.55}
        color={nightMode ? '#334488' : '#e0e7ff'}
      />

      {/* Ground Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[6000, 6000]} />
        <meshStandardMaterial
          color={nightMode ? '#080c18' : '#e8edf4'}
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>

      {/* Buildings */}
      {isLayerEnabled('buildings') && buildingData && (
        <BuildingMesh geometry={buildingData.merged} buildingMap={buildingData.buildingMap} />
      )}

      {/* Selected Building Outline */}
      {selectedOutline && <primitive object={selectedOutline} />}

      {/* Roads */}
      {isLayerEnabled('roads') && roadGroup && <primitive object={roadGroup} />}

      {/* Parks */}
      {isLayerEnabled('parks') && parkGroup && <primitive object={parkGroup} />}

      {/* Water */}
      {isLayerEnabled('water') && waterGroup && <primitive object={waterGroup} />}

      {/* Vehicles */}
      {isLayerEnabled('vehicles') && <VehicleMarkers vehicles={vehicles} />}

      {/* Junctions */}
      {isLayerEnabled('junctions') && (
        <JunctionMarkers
          junctions={junctions}
          selectedId={selectedJunction?.id || null}
        />
      )}
    </>
  );
};

// ─── Building Mesh with Raycasting ───

const BuildingMesh: React.FC<{
  geometry: THREE.BufferGeometry;
  buildingMap: Map<number, BuildingFeature>;
}> = ({ geometry, buildingMap }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const setSelection = useCityStore((s) => s.setSelection);
  const buildings = useCityStore((s) => s.buildings);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.7,
        metalness: 0.1,
        side: THREE.DoubleSide,
      }),
    []
  );

  const handleClick = useCallback(
    (e: THREE.Event & { faceIndex?: number; stopPropagation: () => void }) => {
      e.stopPropagation();
      if (e.faceIndex === undefined) return;

      // Find which building was clicked by checking face index ranges
      // Since buildings are merged, we need to map face to building
      const faceIdx = e.faceIndex;
      let currentFaceCount = 0;

      // A simpler approach: use the intersection point to find nearest building
      const point = (e as unknown as { point: THREE.Vector3 }).point;
      if (!point) return;

      let closest: BuildingFeature | null = null;
      let closestDist = Infinity;

      for (const building of buildings) {
        const [cx, cz] = geoToLocal(building.center[0], building.center[1]);
        const dist = Math.sqrt((point.x - cx) ** 2 + (point.z - cz) ** 2);
        if (dist < closestDist) {
          closestDist = dist;
          closest = building;
        }
      }

      if (closest) {
        setSelection({
          type: 'building',
          id: closest.id,
          data: closest,
        });
      }
    },
    [buildings, setSelection]
  );

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      onClick={handleClick as unknown as (e: THREE.Event) => void}
    />
  );
};

// ─── Vehicle Markers ───

const VehicleMarkers: React.FC<{ vehicles: Vehicle[] }> = React.memo(({ vehicles }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorArray = useMemo(() => new Float32Array(vehicles.length * 3), [vehicles.length]);

  useEffect(() => {
    if (!meshRef.current || vehicles.length === 0) return;

    vehicles.forEach((v, i) => {
      const [x, z] = geoToLocal(v.position[0], v.position[1]);
      dummy.position.set(x, 1.5, z);
      dummy.rotation.set(0, (v.heading * Math.PI) / 180, 0);

      const scale = v.type === 'bus' ? 1.5 : v.type === 'truck' ? 1.3 : 1;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);

      const color = new THREE.Color(getCongestionColor(v.congestionLevel));
      colorArray[i * 3] = color.r;
      colorArray[i * 3 + 1] = color.g;
      colorArray[i * 3 + 2] = color.b;
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.geometry.setAttribute(
      'color',
      new THREE.InstancedBufferAttribute(colorArray, 3)
    );
  }, [vehicles, dummy, colorArray]);

  if (vehicles.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, vehicles.length]}>
      <boxGeometry args={[2, 1, 4]} />
      <meshStandardMaterial vertexColors roughness={0.5} metalness={0.3} />
    </instancedMesh>
  );
});

// ─── Junction Markers ───

const JunctionMarkers: React.FC<{
  junctions: import('../../types').JunctionPerformance[];
  selectedId: string | null;
}> = React.memo(({ junctions, selectedId }) => {
  const setSelectedJunction = useCityStore((s) => s.setSelectedJunction);
  const setSelection = useCityStore((s) => s.setSelection);

  return (
    <group>
      {junctions.map((junction) => {
        const [x, z] = geoToLocal(junction.position[0], junction.position[1]);
        const isSelected = junction.id === selectedId;
        const color = getCongestionColor(junction.congestionLevel);

        return (
          <group key={junction.id} position={[x, 0.5, z]}>
            {/* Junction ring */}
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedJunction(junction);
                setSelection({
                  type: 'junction',
                  id: junction.id,
                  data: junction as unknown as import('../../types').BuildingFeature,
                });
              }}
            >
              <ringGeometry args={[isSelected ? 12 : 8, isSelected ? 16 : 12, 32]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={isSelected ? 0.8 : 0.4}
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* Center dot */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[isSelected ? 4 : 3, 16]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.9}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
});

// ─── Camera Controller ───

const CameraController: React.FC = () => {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();
  const cameraView = useCityStore((s) => s.cameraView);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized) {
      // Set initial isometric view
      camera.position.set(300, 400, 300);
      camera.lookAt(0, 0, 0);
      setInitialized(true);
    }
  }, [camera, initialized]);

  useEffect(() => {
    if (!controlsRef.current) return;

    const controls = controlsRef.current;

    if (cameraView === 'top') {
      camera.position.set(0, 600, 0.1);
      controls.target.set(0, 0, 0);
      controls.update();
    } else if (cameraView === 'isometric') {
      camera.position.set(300, 400, 300);
      controls.target.set(0, 0, 0);
      controls.update();
    }
  }, [cameraView, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={50}
      maxDistance={1500}
      maxPolarAngle={Math.PI / 2.1}
      minPolarAngle={0.1}
      target={[0, 0, 0]}
    />
  );
};

// ─── Main Digital Twin Canvas ───

const DigitalTwinScene: React.FC = () => {
  const nightMode = useCityStore((s) => s.nightMode);
  const clearSelection = useCityStore((s) => s.clearSelection);

  return (
    <div className="absolute inset-0" id="digital-twin-canvas">
      <Canvas
        camera={{
          fov: 50,
          near: 1,
          far: 5000,
          position: [300, 400, 300],
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        style={{ background: nightMode ? '#050810' : '#f1f5f9' }}
        onPointerMissed={() => clearSelection()}
      >
        <color attach="background" args={[nightMode ? '#050810' : '#e6edf5']} />
        <fog attach="fog" args={[nightMode ? '#050810' : '#e6edf5', 400, 2200]} />
        <CameraController />
        <CityScene />
      </Canvas>
    </div>
  );
};

export default DigitalTwinScene;
