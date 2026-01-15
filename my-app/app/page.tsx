"use client"
import "./page.css"

import { useState } from "react"
import { AiChat } from "@/app/components/ai-chat"
import Scene from "./components/Scene"

export type Emotion = "neutral" | "happy" | "concerned"

export default function Page() {
  const [text, setText] = useState("Je suis là.")
  const [emotion, setEmotion] = useState<Emotion>("neutral")
  const [speaking, setSpeaking] = useState(false)

  return (
    <div className="room">
      <aside className="chat">
        <AiChat
          onBotReply={(text, emotion, speaking) => {
            setText(text)
            setEmotion(emotion)
            setSpeaking(speaking)
          }}
        />
      </aside>

      <main style={{ width: "100vw", height: "100vh" }}>
        <Scene
          text={text}
          emotion={emotion}
          speaking={speaking}
        />
      </main>
    </div>
  )
}
