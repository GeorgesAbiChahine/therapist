"use client"

import { useGLTF } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { useEffect, useRef } from "react"
import * as THREE from "three"

type Emotion = "neutral" | "happy" | "concerned"

type AvatarProps = {
  text: string
  emotion: Emotion
  speaking: boolean
}

export default function Avatar({ text, emotion, speaking }: AvatarProps) {
  const { scene } = useGLTF("/avatar.glb")
  const group = useRef<THREE.Group>(null)
  const head = useRef<THREE.Object3D | null>(null)

  // init head
  useEffect(() => {
    scene.traverse((n: any) => {
      if (n.isBone && n.name.includes("Head")) {
        head.current = n
      }
    })
  }, [scene])

  useFrame((state) => {
    if (!head.current) return
    const t = state.clock.elapsedTime

    // simple idle
    head.current.rotation.y = Math.sin(t * 0.5) * 0.2

    // fake mouth open if speaking
    scene.traverse((n: any) => {
      if (n.morphTargetInfluences && speaking) {
        n.morphTargetInfluences[0] = Math.abs(Math.sin(t * 12)) * 0.5
      }
    })
  })

  return (
    <group ref={group}>
      <primitive object={scene} scale={1.2} />
    </group>
  )
}
