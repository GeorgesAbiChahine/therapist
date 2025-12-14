"use client"

import { useGLTF } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { useEffect, useRef } from "react"
import * as THREE from "three"

export default function Avatar() {
  const { scene } = useGLTF("/avatar.glb")
  const group = useRef<THREE.Group>(null)

  useEffect(() => {
    // Compute bounding box
    const box = new THREE.Box3().setFromObject(scene)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())

    // Recenter avatar so head is near origin
    scene.position.x -= center.x
    scene.position.z -= center.z
    scene.position.y += size.y / 2

    // Improve rendering quality
    scene.traverse((node: any) => {
      if (node.isMesh) {
        node.castShadow = true
        node.frustumCulled = false
      }
    })
  }, [scene])

  useFrame((state) => {
    if (!group.current) return

    // Subtle idle breathing motion
    group.current.position.y =
      Math.sin(state.clock.elapsedTime * 1.2) * 0.02
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
