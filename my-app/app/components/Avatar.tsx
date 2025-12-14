"use client"

import { useGLTF } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { useEffect, useRef, useState } from "react"
import * as THREE from "three"

export default function Avatar() {
  const { scene } = useGLTF("/avatar.glb")
  const group = useRef<THREE.Group>(null)
  const [head, setHead] = useState<THREE.Object3D | null>(null)

  useEffect(() => {
    // 1. Compute bounding box to center the avatar
    const box = new THREE.Box3().setFromObject(scene)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())

    // Recenter avatar so head is near origin
    scene.position.x -= center.x
    scene.position.z -= center.z
    scene.position.y += size.y / 2

    // 2. Improve rendering quality & Find Head Bone
    scene.traverse((node: any) => {
      if (node.isMesh) {
        node.castShadow = true
        node.frustumCulled = false
      }
      // Search for standard bone names
      if (node.isBone && (node.name === "Head" || node.name === "mixamorigHead")) {
        setHead(node)
      }
    })
  }, [scene])

  useFrame((state, delta) => {
    if (!group.current) return

    // --- IDLE BREATHING ---
    // Subtle vertical movement
    group.current.position.y = Math.sin(state.clock.elapsedTime * 1.2) * 0.02

    // --- STEP 1: EYE CONTACT ---
    if (head) {
      const cameraPos = state.camera.position.clone()
      
      // Convert camera world position to head's local space
      const localCameraPos = head.worldToLocal(cameraPos)

      // Calculate angles
      let targetYaw = Math.atan2(localCameraPos.x, localCameraPos.z)
      let targetPitch = Math.atan2(localCameraPos.y, localCameraPos.z)

      // --- ADJUST GAZE HEIGHT ---
      // If he looks down, increase this number. If he looks up, decrease it.
      // 0.1 - 0.2 is usually the sweet spot for Mixamo/RPM models.
      const PITCH_OFFSET = 0.15 
      targetPitch += PITCH_OFFSET

      // --- CLAMP ROTATION ---
      // Limit movement so he doesn't break his neck
      const maxYaw = 0.5   // ~30 degrees Left/Right
      const maxPitch = 0.25 // ~15 degrees Up/Down

      targetYaw = THREE.MathUtils.clamp(targetYaw, -maxYaw, maxYaw)
      targetPitch = THREE.MathUtils.clamp(targetPitch, -maxPitch, maxPitch)

      // Create target rotation
      const targetQuaternion = new THREE.Quaternion()
      // Order 'YXZ' ensures we rotate Yaw (left/right) first, then Pitch (up/down)
      targetQuaternion.setFromEuler(new THREE.Euler(targetPitch, targetYaw, 0, 'YXZ'))

      // Smoothly interpolate (Slerp) to target
      // 0.1 = smooth/heavy, 0.5 = twitchy/fast
      head.quaternion.slerp(targetQuaternion, 0.1)
    }
  })

  return (
    <primitive 
      ref={group} 
      object={scene} 
      scale={1.15} 
    />
  )
}

useGLTF.preload("/avatar.glb")