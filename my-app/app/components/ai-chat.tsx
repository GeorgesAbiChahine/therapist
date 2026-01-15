"use client"
import { ArrowUp } from "lucide-react"
import { getTherapistResponse } from "@/app/actions/chat"
import { generateSpeech } from "@/app/actions/voice"
import { useState, useRef } from "react"


type Message = {
  from: "user" | "bot"
  text: string
}

type Props = {
  onBotReply: (text: string, emotion: "neutral" | "happy" | "concerned", speaking: boolean) => void
}

export function AiChat({ onBotReply }: Props) {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isThinking, setIsThinking] = useState(false)
  const currentAudio = useRef<HTMLAudioElement | null>(null)

  const send = async () => {
    if (!input.trim() || isThinking) return

    const userMessage = input
    setMessages(prev => [...prev, { from: "user", text: userMessage }])
    setInput("")
    setIsThinking(true)

    try {
      // 1️⃣ Texte IA
      const rawText = await getTherapistResponse([...messages, { from: "user", text: userMessage }])

      // extraire l’émotion
      const tagMatch = rawText.match(/^\[(.*?)\]/)
      let cleanText = rawText
      let emotion: "neutral" | "happy" | "concerned" = "neutral"
      if (tagMatch) {
        const tag = tagMatch[1].toUpperCase()
        cleanText = rawText.replace(/^\[(.*?)\]/, "").trim()
        if (tag.includes("HAPPY")) emotion = "happy"
        else if (tag.includes("CONCERNED")) emotion = "concerned"
      }

      // 2️⃣ Ajouter au chat
      setMessages(prev => [...prev, { from: "bot", text: cleanText }])

      // 3️⃣ Générer la voix
      const audioUrl = await generateSpeech(cleanText)
      if (audioUrl) {
        // stop previous audio
        if (currentAudio.current) {
          currentAudio.current.pause()
          currentAudio.current = null
        }

        const audio = new Audio(audioUrl)
        currentAudio.current = audio
        audio.play()
        onBotReply(cleanText, emotion, true) // speaking = true

        audio.onended = () => {
          onBotReply(cleanText, emotion, false) // speaking = false
        }
      } else {
        onBotReply(cleanText, emotion, false)
      }

    } catch (error) {
      console.error(error)
      setMessages(prev => [...prev, { from: "bot", text: "Oops… il y a eu un problème." }])
      onBotReply("Oops… il y a eu un problème.", "neutral", false)
    } finally {
      setIsThinking(false)
    }
  }

  return (
    <div>
      {/* messages */}
      <div style={{
        maxHeight: 300,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.from === "user" ? "flex-end" : "flex-start",
              background: m.from === "user" ? "#337997ff" : "#333",
              color: "white",
              padding: "6px 10px",
              borderRadius: 12,
              maxWidth: "80%",
            }}
          >
            {m.text}
          </div>
        ))}
      </div>

      {/* input */}
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Écris ici..."
          style={{
            flex: 1,
            resize: "none",
            padding: 8,
            borderRadius: 6,
            outline: "none",
          }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || isThinking}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "none",
            background: "#228be6",
            color: "white",
            cursor: "pointer",
          }}
        >
          <ArrowUp size={16} />
        </button>
      </div>
    </div>
  )
}
