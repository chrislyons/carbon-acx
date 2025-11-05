/**
 * React Three Fiber type declarations
 * Extends JSX namespace to include Three.js elements
 */

import { Object3DNode, extend } from '@react-three/fiber'
import * as THREE from 'three'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      // Lights
      ambientLight: Object3DNode<THREE.AmbientLight, typeof THREE.AmbientLight>
      pointLight: Object3DNode<THREE.PointLight, typeof THREE.PointLight>
      directionalLight: Object3DNode<THREE.DirectionalLight, typeof THREE.DirectionalLight>
      spotLight: Object3DNode<THREE.SpotLight, typeof THREE.SpotLight>
      hemisphereLight: Object3DNode<THREE.HemisphereLight, typeof THREE.HemisphereLight>

      // Geometry
      sphereGeometry: Object3DNode<THREE.SphereGeometry, typeof THREE.SphereGeometry>
      boxGeometry: Object3DNode<THREE.BoxGeometry, typeof THREE.BoxGeometry>
      ringGeometry: Object3DNode<THREE.RingGeometry, typeof THREE.RingGeometry>
      planeGeometry: Object3DNode<THREE.PlaneGeometry, typeof THREE.PlaneGeometry>
      cylinderGeometry: Object3DNode<THREE.CylinderGeometry, typeof THREE.CylinderGeometry>

      // Materials
      meshStandardMaterial: Object3DNode<THREE.MeshStandardMaterial, typeof THREE.MeshStandardMaterial>
      meshBasicMaterial: Object3DNode<THREE.MeshBasicMaterial, typeof THREE.MeshBasicMaterial>
      meshPhysicalMaterial: Object3DNode<THREE.MeshPhysicalMaterial, typeof THREE.MeshPhysicalMaterial>

      // Objects
      mesh: Object3DNode<THREE.Mesh, typeof THREE.Mesh>
      group: Object3DNode<THREE.Group, typeof THREE.Group>
      line: Object3DNode<THREE.Line, typeof THREE.Line>
      points: Object3DNode<THREE.Points, typeof THREE.Points>
    }
  }
}
