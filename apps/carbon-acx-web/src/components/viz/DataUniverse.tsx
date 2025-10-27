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
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';

// Client-side only flag
const isClient = typeof window !== 'undefined';

// ============================================================================
// Camera Animation Types
// ============================================================================

interface CameraTarget {
  position: [number, number, number];
  target: [number, number, number];
  duration?: number;
}

interface CameraAnimationState {
  isAnimating: boolean;
  progress: number;
  from: CameraTarget | null;
  to: CameraTarget | null;
}

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
  /** Enable intro zoom animation */
  enableIntroAnimation?: boolean;
  /** Enable click-to-fly camera movements */
  enableClickToFly?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function DataUniverse({
  totalEmissions,
  activities,
  onActivityClick,
  enableIntroAnimation = false,
  enableClickToFly = true
}: DataUniverseProps) {
  const [isReady, setIsReady] = React.useState(false);
  const [selectedActivityId, setSelectedActivityId] = React.useState<string | null>(null);
  const [hoveredActivityId, setHoveredActivityId] = React.useState<string | null>(null);

  // Only render on client-side after mount
  React.useEffect(() => {
    setIsReady(true);
  }, []);

  // Clear selected activity after animation completes (2 seconds)
  React.useEffect(() => {
    if (selectedActivityId && enableClickToFly) {
      const timer = setTimeout(() => {
        setSelectedActivityId(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [selectedActivityId, enableClickToFly]);

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

  // Show loading state during SSR or initial mount
  if (!isClient || !isReady) {
    return (
      <div className="w-full h-full min-h-[600px] flex items-center justify-center" style={{ background: '#0a0e27' }}>
        <div style={{ color: '#fff', fontSize: '16px' }}>Loading 3D Universe...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[600px]">
      <ErrorBoundary>
        <Canvas
          camera={{ position: [15, 15, 15], fov: 50 }}
          style={{ background: '#0a0e27' }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
          }}
          onCreated={({ gl }) => {
            gl.setClearColor('#0a0e27');
          }}
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
              onClick={(act) => {
                // Update local state for camera animation
                if (enableClickToFly) {
                  setSelectedActivityId(act.id);
                }
                // Chain to external callback
                onActivityClick?.(act);
              }}
              isHovered={hoveredActivityId === activity.id}
              onHoverChange={(hovered) => setHoveredActivityId(hovered ? activity.id : null)}
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

          {/* Camera Animator */}
          {enableIntroAnimation && <CameraAnimator introAnimation />}
          {enableClickToFly && selectedActivityId && (
            <CameraAnimator
              activityId={selectedActivityId}
              activities={activities}
              centralSize={centralSize}
            />
          )}
        </Canvas>
      </ErrorBoundary>
    </div>
  );
}

// ============================================================================
// Error Boundary
// ============================================================================

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('DataUniverse Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="w-full h-full flex items-center justify-center flex-col gap-4"
          style={{ background: '#0a0e27', color: '#fff' }}
        >
          <div style={{ fontSize: '18px', fontWeight: '600' }}>3D Visualization Unavailable</div>
          <div style={{ fontSize: '14px', opacity: 0.7, maxWidth: '400px', textAlign: 'center' }}>
            Your browser may not support WebGL, or there was an error loading the 3D scene.
            Try switching to Timeline or Comparison view.
          </div>
          {this.state.error && (
            <div style={{ fontSize: '12px', opacity: 0.5, fontFamily: 'monospace' }}>
              {this.state.error.message}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
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
  isHovered?: boolean;
  onHoverChange?: (hovered: boolean) => void;
}

function OrbitingActivity({
  activity,
  index,
  totalActivities,
  size,
  color,
  orbitRadius,
  onClick,
  isHovered = false,
  onHoverChange,
}: OrbitingActivityProps) {
  const meshRef = React.useRef<THREE.Mesh>(null);
  const groupRef = React.useRef<THREE.Group>(null);
  const [localHovered, setLocalHovered] = React.useState(false);

  const hovered = isHovered || localHovered;

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

  const handlePointerOver = (e: any) => {
    e.stopPropagation?.();
    setLocalHovered(true);
    onHoverChange?.(true);
  };

  const handlePointerOut = (e: any) => {
    e.stopPropagation?.();
    setLocalHovered(false);
    onHoverChange?.(false);
  };

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 1.0 : 0.2}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>

      {/* Outer glow effect on hover */}
      {hovered && (
        <mesh>
          <sphereGeometry args={[size * 1.2, 16, 16]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Orbit path visualization (thin ring) */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[orbitRadius - 0.05, orbitRadius + 0.05, 64]} />
        <meshBasicMaterial color={color} opacity={0.1} transparent side={THREE.DoubleSide} />
      </mesh>

      {/* Compact label on hover */}
      {hovered && (
        <Html position={[0, size + 0.8, 0]} center>
          <div
            className="px-3 py-2 rounded-lg pointer-events-none transition-all duration-300"
            style={{
              backgroundColor: 'rgba(10, 14, 39, 0.95)',
              border: `2px solid ${color}`,
              boxShadow: `0 0 20px ${color}40`,
              color: 'white',
              fontSize: '12px',
              maxWidth: '250px',
            }}
          >
            <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '14px' }}>
              {activity.name}
            </div>
            <div style={{ opacity: 0.9, fontSize: '13px', marginBottom: '2px' }}>
              <strong>{(activity.annualEmissions / 1000).toFixed(2)}t</strong> CO₂/yr
            </div>
            {activity.category && (
              <div
                style={{
                  opacity: 0.7,
                  fontSize: '10px',
                  marginTop: '4px',
                  padding: '2px 6px',
                  background: `${color}30`,
                  borderRadius: '4px',
                  display: 'inline-block',
                }}
              >
                {activity.category}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

// ============================================================================
// Camera Animator
// ============================================================================

interface CameraAnimatorProps {
  introAnimation?: boolean;
  activityId?: string;
  activities?: Activity[];
  centralSize?: number;
}

function CameraAnimator({ introAnimation, activityId, activities, centralSize }: CameraAnimatorProps) {
  const { camera } = useThree();
  const [animationState, setAnimationState] = React.useState<CameraAnimationState>({
    isAnimating: false,
    progress: 0,
    from: null,
    to: null,
  });

  // Intro zoom animation: Start far out, zoom in
  React.useEffect(() => {
    if (introAnimation && !animationState.isAnimating) {
      setAnimationState({
        isAnimating: true,
        progress: 0,
        from: {
          position: [50, 50, 50],
          target: [0, 0, 0],
        },
        to: {
          position: [15, 15, 15],
          target: [0, 0, 0],
        },
      });
    }
  }, [introAnimation]);

  // Click-to-fly animation: Fly to selected activity
  React.useEffect(() => {
    if (activityId && activities && centralSize !== undefined) {
      const activity = activities.find((a) => a.id === activityId);
      if (!activity) return;

      const index = activities.indexOf(activity);
      const orbitRadius = centralSize + 4 + index * 0.5;

      // Calculate activity position (using same logic as OrbitingActivity)
      const time = Date.now() * (0.0005 + index * 0.0001);
      const phaseOffset = (index / activities.length) * Math.PI * 2;
      const angle = time + phaseOffset;
      const x = Math.cos(angle) * orbitRadius;
      const z = Math.sin(angle) * orbitRadius;
      const y = Math.sin(time * 2) * 2;

      // Camera position: approach from the side at an angle
      const cameraDistance = 8;
      const cameraX = x + Math.cos(angle + Math.PI / 4) * cameraDistance;
      const cameraZ = z + Math.sin(angle + Math.PI / 4) * cameraDistance;
      const cameraY = y + 3;

      setAnimationState({
        isAnimating: true,
        progress: 0,
        from: {
          position: [camera.position.x, camera.position.y, camera.position.z],
          target: [0, 0, 0],
        },
        to: {
          position: [cameraX, cameraY, cameraZ],
          target: [x, y, z],
        },
      });
    }
  }, [activityId, activities, centralSize]);

  // Animate camera movement
  useFrame((_state, delta) => {
    if (!animationState.isAnimating || !animationState.from || !animationState.to) return;

    const newProgress = Math.min(animationState.progress + delta * 0.8, 1);
    setAnimationState((prev) => ({ ...prev, progress: newProgress }));

    // Ease-in-out interpolation
    const t = newProgress < 0.5
      ? 2 * newProgress * newProgress
      : -1 + (4 - 2 * newProgress) * newProgress;

    // Interpolate camera position
    camera.position.x = THREE.MathUtils.lerp(animationState.from.position[0], animationState.to.position[0], t);
    camera.position.y = THREE.MathUtils.lerp(animationState.from.position[1], animationState.to.position[1], t);
    camera.position.z = THREE.MathUtils.lerp(animationState.from.position[2], animationState.to.position[2], t);

    // Interpolate look-at target
    const targetX = THREE.MathUtils.lerp(animationState.from.target[0], animationState.to.target[0], t);
    const targetY = THREE.MathUtils.lerp(animationState.from.target[1], animationState.to.target[1], t);
    const targetZ = THREE.MathUtils.lerp(animationState.from.target[2], animationState.to.target[2], t);
    camera.lookAt(targetX, targetY, targetZ);

    // End animation
    if (newProgress >= 1) {
      setAnimationState((prev) => ({ ...prev, isAnimating: false }));
    }
  });

  return null; // This component doesn't render anything visible
}
