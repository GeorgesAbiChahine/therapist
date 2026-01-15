"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import Avatar from "./Avatar"
import { Emotion } from "../page"

type Props = {
  text: string
  emotion: Emotion
  speaking: boolean
}

export default function Scene({ text, emotion, speaking }: Props) {
  return (
    <Canvas
      camera={{ position: [0, 1.6, 2.5], fov: 35 }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[2, 3, 2]} intensity={1.1} />

      <Avatar
        text={text}
        emotion={emotion}
        speaking={speaking}
      />

      <OrbitControls
        target={[0, 1.6, 0]}
        enableZoom={false}
        enablePan={false}
      />
    </Canvas>
  )
}
