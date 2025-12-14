"use client"
import "./page.css"

import { AiChat } from "@/components/blocks/ai-chat/ai-chat"
import Scene from "./components/Scene"

export default function Page() {
  return (
        <div className="room">
        <aside className="chat">
          <AiChat />
        </aside>
        <main style={{ width: "100vw", height: "100vh" }}>
          <Scene />
        </main>
        </div>
  )
}
