'use client'

/**
 * DataUniverse - 3D visualization of carbon emissions data
 * Ported from ACX084 with Next.js SSR safety and manifest integration
 *
 * Central sphere = total annual emissions (size based on tonnes CO₂)
 * Orbiting spheres = individual activities (size based on activity emissions)
 * Color coding = carbon intensity (low/moderate/high)
 *
 * Interactive:
 * - Orbit camera controls (drag to rotate, scroll to zoom)
 * - Click spheres for manifest details
 * - Hover for highlights and tooltips
 */

/// <reference types="@react-three/fiber" />

import * as React from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars, Html } from '@react-three/drei'
import * as THREE from 'three'

// ============================================================================
// Types
// ============================================================================

export interface Activity {
  id: string
  name: string
  annualEmissions: number // kg CO₂
  category?: string
  color?: string
  manifestId?: string // NEW: Link to manifest
}

export interface DataUniverseProps {
  totalEmissions: number // kg CO₂
  activities: Activity[]
  onActivityClick?: (activity: Activity) => void
  enableIntroAnimation?: boolean
  enableClickToFly?: boolean
}

interface CameraTarget {
  position: [number, number, number]
  target: [number, number, number]
}

interface CameraAnimationState {
  isAnimating: boolean
  progress: number
  from: CameraTarget | null
  to: CameraTarget | null
}

// ============================================================================
// Main Component
// ============================================================================

export function DataUniverse({
  totalEmissions,
  activities,
  onActivityClick,
  enableIntroAnimation = false,
  enableClickToFly = true,
}: DataUniverseProps) {
  const [isReady, setIsReady] = React.useState(false)
  const [selectedActivityId, setSelectedActivityId] = React.useState<string | null>(null)
  const [hoveredActivityId, setHoveredActivityId] = React.useState<string | null>(null)

  // Only render after client-side mount
  React.useEffect(() => {
    setIsReady(true)
  }, [])

  // Clear selection after animation
  React.useEffect(() => {
    if (selectedActivityId && enableClickToFly) {
      const timer = setTimeout(() => setSelectedActivityId(null), 2000)
      return () => clearTimeout(timer)
    }
  }, [selectedActivityId, enableClickToFly])

  // Calculate sphere size (logarithmic scale)
  const getEmissionSize = (emissions: number) => {
    const minSize = 0.5
    const scale = 0.3
    return minSize + Math.log10(Math.max(emissions, 1)) * scale
  }

  // Get color based on carbon intensity
  const getEmissionColor = (emissions: number) => {
    const tonnes = emissions / 1000
    if (tonnes < 1) return '#10b981' // green
    if (tonnes < 5) return '#f59e0b' // amber
    return '#ef4444' // red
  }

  const centralSize = getEmissionSize(totalEmissions)

  if (!isReady) {
    return (
      <div className="w-full h-full min-h-[600px] flex items-center justify-center bg-[#0a0e27]">
        <div className="text-white text-base">Loading 3D Universe...</div>
      </div>
    )
  }

  return (
    <div className="w-full h-full min-h-[600px]">
      <ErrorBoundary>
        <Canvas
          camera={{ position: [15, 15, 15], fov: 50 }}
          className="bg-[#0a0e27]"
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
          }}
        >
          <ambientLight intensity={0.4} />
          <pointLight position={[10, 10, 10]} intensity={1.5} />
          <pointLight position={[-10, -10, -10]} intensity={0.5} />

          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={0.5} />

          <CentralSphere
            size={centralSize}
            emissions={totalEmissions}
            color={getEmissionColor(totalEmissions)}
          />

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
                if (enableClickToFly) setSelectedActivityId(act.id)
                onActivityClick?.(act)
              }}
              isHovered={hoveredActivityId === activity.id}
              onHoverChange={(hovered) => setHoveredActivityId(hovered ? activity.id : null)}
            />
          ))}

          <OrbitControls
            enablePan
            enableZoom
            enableRotate
            minDistance={5}
            maxDistance={50}
            autoRotate={false}
          />

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
  )
}

// ============================================================================
// Error Boundary
// ============================================================================

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('DataUniverse Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[600px] flex flex-col items-center justify-center gap-4 p-8 bg-[#0a0e27] text-white">
          <div className="text-lg font-semibold">3D Visualization Unavailable</div>
          <div className="text-sm opacity-70 max-w-md text-center">
            WebGL context was lost or your browser does not support 3D graphics.
            Try refreshing the page or use a different visualization mode.
          </div>
          {this.state.error && (
            <div className="text-xs opacity-50 font-mono mt-2">
              {this.state.error.message}
            </div>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// ============================================================================
// Central Sphere
// ============================================================================

interface CentralSphereProps {
  size: number
  emissions: number
  color: string
}

function CentralSphere({ size, emissions, color }: CentralSphereProps) {
  const meshRef = React.useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = React.useState(false)

  React.useEffect(() => {
    if (!meshRef.current) return

    let frame: number
    const animate = () => {
      if (meshRef.current) {
        const scale = 1 + Math.sin(Date.now() * 0.001) * 0.05
        meshRef.current.scale.setScalar(scale)
      }
      frame = requestAnimationFrame(animate)
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])

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
  )
}

// ============================================================================
// Orbiting Activity
// ============================================================================

interface OrbitingActivityProps {
  activity: Activity
  index: number
  totalActivities: number
  size: number
  color: string
  orbitRadius: number
  onClick?: (activity: Activity) => void
  isHovered?: boolean
  onHoverChange?: (hovered: boolean) => void
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
  const meshRef = React.useRef<THREE.Mesh>(null)
  const groupRef = React.useRef<THREE.Group>(null)
  const [localHovered, setLocalHovered] = React.useState(false)

  const hovered = isHovered || localHovered

  React.useEffect(() => {
    if (!groupRef.current) return

    let frame: number
    const speed = 0.0005 + index * 0.0001
    const phaseOffset = (index / totalActivities) * Math.PI * 2

    const animate = () => {
      if (groupRef.current) {
        const time = Date.now() * speed
        const angle = time + phaseOffset
        const x = Math.cos(angle) * orbitRadius
        const z = Math.sin(angle) * orbitRadius
        const y = Math.sin(time * 2) * 2

        groupRef.current.position.set(x, y, z)
      }
      frame = requestAnimationFrame(animate)
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [index, totalActivities, orbitRadius])

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation()
          onClick?.(activity)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setLocalHovered(true)
          onHoverChange?.(true)
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          setLocalHovered(false)
          onHoverChange?.(false)
        }}
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

      {hovered && (
        <mesh>
          <sphereGeometry args={[size * 1.2, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.3} depthWrite={false} />
        </mesh>
      )}

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[orbitRadius - 0.05, orbitRadius + 0.05, 64]} />
        <meshBasicMaterial color={color} opacity={0.1} transparent side={THREE.DoubleSide} />
      </mesh>

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
            <div className="font-semibold mb-1 text-sm">{activity.name}</div>
            <div className="text-[13px] mb-0.5">
              <strong>{(activity.annualEmissions / 1000).toFixed(2)}t</strong> CO₂/yr
            </div>
            {activity.category && (
              <div
                className="text-[10px] mt-1 px-1.5 py-0.5 rounded inline-block"
                style={{ opacity: 0.7, background: `${color}30` }}
              >
                {activity.category}
              </div>
            )}
            {activity.manifestId && (
              <div className="text-[10px] mt-1 opacity-60">
                Manifest: {activity.manifestId}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  )
}

// ============================================================================
// Camera Animator
// ============================================================================

interface CameraAnimatorProps {
  introAnimation?: boolean
  activityId?: string
  activities?: Activity[]
  centralSize?: number
}

function CameraAnimator({ introAnimation, activityId, activities, centralSize }: CameraAnimatorProps) {
  const { camera } = useThree()
  const [animationState, setAnimationState] = React.useState<CameraAnimationState>({
    isAnimating: false,
    progress: 0,
    from: null,
    to: null,
  })

  React.useEffect(() => {
    if (introAnimation && !animationState.isAnimating) {
      setAnimationState({
        isAnimating: true,
        progress: 0,
        from: { position: [50, 50, 50], target: [0, 0, 0] },
        to: { position: [15, 15, 15], target: [0, 0, 0] },
      })
    }
  }, [introAnimation, animationState.isAnimating])

  React.useEffect(() => {
    if (activityId && activities && centralSize !== undefined) {
      const activity = activities.find((a) => a.id === activityId)
      if (!activity) return

      const index = activities.indexOf(activity)
      const orbitRadius = centralSize + 4 + index * 0.5

      const time = Date.now() * (0.0005 + index * 0.0001)
      const phaseOffset = (index / activities.length) * Math.PI * 2
      const angle = time + phaseOffset
      const x = Math.cos(angle) * orbitRadius
      const z = Math.sin(angle) * orbitRadius
      const y = Math.sin(time * 2) * 2

      const cameraDistance = 8
      const cameraX = x + Math.cos(angle + Math.PI / 4) * cameraDistance
      const cameraZ = z + Math.sin(angle + Math.PI / 4) * cameraDistance
      const cameraY = y + 3

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
      })
    }
  }, [activityId, activities, centralSize, camera.position])

  useFrame((_state, delta) => {
    if (!animationState.isAnimating || !animationState.from || !animationState.to) return

    const newProgress = Math.min(animationState.progress + delta * 0.8, 1)
    setAnimationState((prev) => ({ ...prev, progress: newProgress }))

    const t = newProgress < 0.5 ? 2 * newProgress * newProgress : -1 + (4 - 2 * newProgress) * newProgress

    camera.position.x = THREE.MathUtils.lerp(animationState.from.position[0], animationState.to.position[0], t)
    camera.position.y = THREE.MathUtils.lerp(animationState.from.position[1], animationState.to.position[1], t)
    camera.position.z = THREE.MathUtils.lerp(animationState.from.position[2], animationState.to.position[2], t)

    const targetX = THREE.MathUtils.lerp(animationState.from.target[0], animationState.to.target[0], t)
    const targetY = THREE.MathUtils.lerp(animationState.from.target[1], animationState.to.target[1], t)
    const targetZ = THREE.MathUtils.lerp(animationState.from.target[2], animationState.to.target[2], t)
    camera.lookAt(targetX, targetY, targetZ)

    if (newProgress >= 1) {
      setAnimationState((prev) => ({ ...prev, isAnimating: false }))
    }
  })

  return null
}
