/**
 * DataUniverse - 3D visualization of carbon emissions data
 *
 * Central sphere = total annual emissions (size based on tonnes CO₂)
 * Orbiting spheres = individual activities (size based on activity emissions)
 * Color coding = carbon intensity (low/moderate/high)
 *
 * Interactive:
 * - Orbit camera controls (drag to rotate, scroll to zoom)
 * - Click spheres for detail panel
 * - Hover for highlights
 */

import * as React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';

// ============================================================================
// Types
// ============================================================================

export interface Activity {
  id: string;
  name: string;
  annualEmissions: number; // kg CO₂
  category?: string;
  color?: string;
}

export interface DataUniverseProps {
  totalEmissions: number; // kg CO₂
  activities: Activity[];
  onActivityClick?: (activity: Activity) => void;
}

// ============================================================================
// Component
// ============================================================================

export function DataUniverse({ totalEmissions, activities, onActivityClick }: DataUniverseProps) {
  // Calculate sphere size based on emissions (logarithmic scale for better visual distribution)
  const getEmissionSize = (emissions: number) => {
    // Base size + log scale to prevent huge size differences
    const minSize = 0.5;
    const scale = 0.3;
    return minSize + Math.log10(Math.max(emissions, 1)) * scale;
  };

  // Get color based on carbon intensity
  const getEmissionColor = (emissions: number) => {
    const tonnes = emissions / 1000;
    if (tonnes < 1) return '#10b981'; // low (green)
    if (tonnes < 5) return '#f59e0b'; // moderate (amber)
    return '#ef4444'; // high (red)
  };

  const centralSize = getEmissionSize(totalEmissions);

  return (
    <div className="w-full h-full min-h-[600px]">
      <Canvas
        camera={{ position: [15, 15, 15], fov: 50 }}
        style={{ background: '#0a0e27' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />

        {/* Starfield background */}
        <Stars
          radius={100}
          depth={50}
          count={5000}
          factor={4}
          saturation={0}
          fade
          speed={0.5}
        />

        {/* Central emission sphere */}
        <CentralSphere
          size={centralSize}
          emissions={totalEmissions}
          color={getEmissionColor(totalEmissions)}
        />

        {/* Activity orbits */}
        {activities.map((activity, index) => (
          <OrbitingActivity
            key={activity.id}
            activity={activity}
            index={index}
            totalActivities={activities.length}
            size={getEmissionSize(activity.annualEmissions)}
            color={getEmissionColor(activity.annualEmissions)}
            orbitRadius={centralSize + 4 + index * 0.5}
            onClick={onActivityClick}
          />
        ))}

        {/* Camera controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={50}
          autoRotate={false}
        />
      </Canvas>
    </div>
  );
}

// ============================================================================
// Central Sphere
// ============================================================================

interface CentralSphereProps {
  size: number;
  emissions: number;
  color: string;
}

function CentralSphere({ size, emissions, color }: CentralSphereProps) {
  const meshRef = React.useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = React.useState(false);

  // Gentle pulse animation
  React.useEffect(() => {
    if (!meshRef.current) return;

    let frame: number;
    const animate = () => {
      if (meshRef.current) {
        const scale = 1 + Math.sin(Date.now() * 0.001) * 0.05;
        meshRef.current.scale.setScalar(scale);
      }
      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <group>
      <mesh
        ref={meshRef}
        position={[0, 0, 0]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.6 : 0.3}
          metalness={0.5}
          roughness={0.4}
        />
      </mesh>

      {/* Label */}
      {hovered && (
        <Html position={[0, size + 1, 0]} center>
          <div
            className="px-3 py-2 rounded-lg pointer-events-none whitespace-nowrap"
            style={{
              backgroundColor: 'rgba(10, 14, 39, 0.9)',
              border: `1px solid ${color}`,
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Total: {(emissions / 1000).toFixed(1)}t CO₂/yr
          </div>
        </Html>
      )}
    </group>
  );
}

// ============================================================================
// Orbiting Activity
// ============================================================================

interface OrbitingActivityProps {
  activity: Activity;
  index: number;
  totalActivities: number;
  size: number;
  color: string;
  orbitRadius: number;
  onClick?: (activity: Activity) => void;
}

function OrbitingActivity({
  activity,
  index,
  totalActivities,
  size,
  color,
  orbitRadius,
  onClick,
}: OrbitingActivityProps) {
  const meshRef = React.useRef<THREE.Mesh>(null);
  const groupRef = React.useRef<THREE.Group>(null);
  const [hovered, setHovered] = React.useState(false);

  // Orbital motion
  React.useEffect(() => {
    if (!groupRef.current) return;

    let frame: number;
    const speed = 0.0005 + index * 0.0001; // Stagger orbital speeds
    const phaseOffset = (index / totalActivities) * Math.PI * 2; // Evenly space activities

    const animate = () => {
      if (groupRef.current) {
        const time = Date.now() * speed;
        const angle = time + phaseOffset;
        const x = Math.cos(angle) * orbitRadius;
        const z = Math.sin(angle) * orbitRadius;
        const y = Math.sin(time * 2) * 2; // Vertical wobble

        groupRef.current.position.set(x, y, z);
      }
      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [index, totalActivities, orbitRadius]);

  const handleClick = (e: any) => {
    e.stopPropagation?.();
    onClick?.(activity);
  };

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.8 : 0.2}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>

      {/* Orbit path visualization (thin ring) */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[orbitRadius - 0.05, orbitRadius + 0.05, 64]} />
        <meshBasicMaterial color={color} opacity={0.1} transparent side={THREE.DoubleSide} />
      </mesh>

      {/* Label on hover */}
      {hovered && (
        <Html position={[0, size + 0.8, 0]} center>
          <div
            className="px-3 py-2 rounded-lg pointer-events-none"
            style={{
              backgroundColor: 'rgba(10, 14, 39, 0.95)',
              border: `1px solid ${color}`,
              color: 'white',
              fontSize: '12px',
              maxWidth: '200px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>{activity.name}</div>
            <div style={{ opacity: 0.8, fontSize: '11px' }}>
              {(activity.annualEmissions / 1000).toFixed(2)}t CO₂/yr
            </div>
            {activity.category && (
              <div style={{ opacity: 0.6, fontSize: '10px', marginTop: '2px' }}>
                {activity.category}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
