"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import Avatar from "./Avatar"

export default function Scene() {
  return (
    <Canvas
      camera={{
        position: [0, 1.6, 2.5],
        fov: 35,
      }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.9} />
      <directionalLight position={[2, 3, 2]} intensity={1.1} />

      {/* Avatar */}
      <Avatar />

      {/* Lock camera on face level */}
      <OrbitControls
        target={[0, 1.6, 0]}
        enableZoom={false}
        enablePan={false}
      />
    </Canvas>
    
  )
}
