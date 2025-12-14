"use client"

import { useGLTF, Html } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { getTherapistResponse } from "@/app/actions/chat" 

type Emotion = "neutral" | "happy" | "concerned"

// New Type for History
type Message = {
  role: "user" | "model"
  text: string
}

export default function Avatar() {
  const { scene } = useGLTF("/avatar.glb")
  const group = useRef<THREE.Group>(null)

  // --- STATE ---
  const [head, setHead] = useState<THREE.Object3D | null>(null)
  const [neck, setNeck] = useState<THREE.Object3D | null>(null)
  const [spine, setSpine] = useState<THREE.Object3D | null>(null)
  const [rightArm, setRightArm] = useState<THREE.Object3D | null>(null)
  const [leftArm, setLeftArm] = useState<THREE.Object3D | null>(null)
  const [rightForeArm, setRightForeArm] = useState<THREE.Object3D | null>(null)
  const [leftForeArm, setLeftForeArm] = useState<THREE.Object3D | null>(null)

  const [mouthMeshes, setMouthMeshes] = useState<{mesh: THREE.Mesh, openIdx: number, smileIdx: number}[]>([]) 
  const [blinkMeshes, setBlinkMeshes] = useState<any[]>([]) 
  
  const [emotion, setEmotion] = useState<Emotion>("neutral")
  const [input, setInput] = useState("")
  const [response, setResponse] = useState("Hello. I am here to listen.")
  const [isThinking, setIsThinking] = useState(false)
  
  // ✅ STEP 10: HISTORY STATE
  const [history, setHistory] = useState<Message[]>([])

  const blinkState = useRef({ value: 0, closing: false, nextBlink: 2.5 })
  const isSpeaking = useRef(false)

  // --- INIT ---
  useEffect(() => {
    const foundMouths: {mesh: THREE.Mesh, openIdx: number, smileIdx: number}[] = []
    const foundBlinks: any[] = []

    scene.traverse((node: any) => {
      if (node.isMesh) {
        node.castShadow = true
        node.frustumCulled = false
        if (node.morphTargetDictionary) {
            const keys = Object.keys(node.morphTargetDictionary)
            const openIdx = keys.findIndex(k => k === "mouthOpen")
            const smileIdx = keys.findIndex(k => k === "mouthSmile")
            if (openIdx !== -1 || smileIdx !== -1) {
                foundMouths.push({ mesh: node, openIdx: openIdx, smileIdx: smileIdx })
            }
            const leftIndex = keys.findIndex(k => k.includes('blink') || k.includes('Blink'))
            if (leftIndex !== -1) {
                 foundBlinks.push({ mesh: node, left: leftIndex, right: leftIndex })
            }
        }
      }
      if (node.isBone) {
        if (node.name === "Head" || node.name === "mixamorigHead") setHead(node)
        if (node.name === "Neck" || node.name === "mixamorigNeck") setNeck(node)
        if (node.name === "Spine2" || node.name === "mixamorigSpine2") setSpine(node)
        if (node.name === "RightArm" || node.name === "mixamorigRightArm") setRightArm(node)
        if (node.name === "LeftArm" || node.name === "mixamorigLeftArm") setLeftArm(node)
        if (node.name === "RightForeArm" || node.name === "mixamorigRightForeArm") setRightForeArm(node)
        if (node.name === "LeftForeArm" || node.name === "mixamorigLeftForeArm") setLeftForeArm(node)
      }
    })
    setMouthMeshes(foundMouths)
    setBlinkMeshes(foundBlinks)
  }, [scene])

  // --- POSTURE ---
  useEffect(() => {
    if (!rightArm || !leftArm || !rightForeArm || !leftForeArm) return
    rightArm.rotation.z = -1.3
    leftArm.rotation.z = 1.3
    rightForeArm.rotation.x = 0.3
    leftForeArm.rotation.x = 0.3
    rightArm.rotation.y = -0.2
    leftArm.rotation.y = 0.2
  }, [rightArm, leftArm, rightForeArm, leftForeArm])


  // --- CHAT HANDLER (With Memory) ---
  const handleChat = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!input.trim() || isThinking) return

      setIsThinking(true)
      const userMessage = input
      setInput("") 

      // 1. Update History with User Message
      const newHistory: Message[] = [...history, { role: "user", text: userMessage }]
      setHistory(newHistory)
      
      try {
        // 2. Send FULL History to Server
        const rawText = await getTherapistResponse(newHistory)

        const tagMatch = rawText.match(/^\[(.*?)\]/)
        let cleanText = rawText
        let newEmotion: Emotion = "neutral"

        if (tagMatch) {
            const tag = tagMatch[1].toUpperCase()
            cleanText = rawText.replace(/^\[(.*?)\]/, "").trim() 

            if (tag.includes("HAPPY")) newEmotion = "happy"
            else if (tag.includes("CONCERNED")) newEmotion = "concerned"
        }

        // 3. Update History with Model Response
        setHistory(prev => [...prev, { role: "model", text: cleanText }])

        setEmotion(newEmotion)
        setResponse(cleanText)
        setIsThinking(false)

        const synth = window.speechSynthesis
        const utterance = new SpeechSynthesisUtterance(cleanText)
        const voices = synth.getVoices()
        const preferredVoice = voices.find(v => v.name.includes("Google US English") || v.name.includes("Zira"))
        if (preferredVoice) utterance.voice = preferredVoice
        utterance.rate = 0.9
        utterance.onstart = () => { isSpeaking.current = true }
        utterance.onend = () => { isSpeaking.current = false }
        synth.cancel()
        synth.speak(utterance)

      } catch (error) {
        console.error(error)
        setResponse("I am having trouble processing that.")
        setIsThinking(false)
      }
  }

  // --- ANIMATION LOOP ---
  useFrame((state, delta) => {
    if (!group.current) return
    const t = state.clock.elapsedTime

    if (spine) {
      spine.rotation.x = Math.sin(t * 1) * 0.03 + Math.sin(t * 2.5) * 0.01
      spine.rotation.y = Math.sin(t * 0.5) * 0.03
      spine.rotation.z = Math.sin(t * 0.8) * 0.02
    }
    if (neck) {
      neck.rotation.y = Math.sin(t * 0.6) * 0.05
      neck.rotation.x = Math.sin(t * 1.2) * 0.02
    }
    group.current.position.y = Math.sin(t * 1.2) * 0.01

    if (head) {
      const cameraPos = state.camera.position.clone()
      const localCameraPos = head.worldToLocal(cameraPos)
      let targetYaw = Math.atan2(localCameraPos.x, localCameraPos.z)
      let targetPitch = Math.atan2(localCameraPos.y, localCameraPos.z)
      targetPitch += 0.15 
      targetYaw = THREE.MathUtils.clamp(targetYaw, -0.6, 0.6)
      targetPitch = THREE.MathUtils.clamp(targetPitch, -0.3, 0.3)
      const targetQuaternion = new THREE.Quaternion()
      targetQuaternion.setFromEuler(new THREE.Euler(targetPitch, targetYaw, 0, 'YXZ'))
      head.quaternion.slerp(targetQuaternion, 0.1)
    }

    if (blinkMeshes.length > 0) {
        blinkState.current.nextBlink -= delta
        if (blinkState.current.nextBlink <= 0 && !blinkState.current.closing) {
            blinkState.current.closing = true
            blinkState.current.nextBlink = Math.random() * 3 + 2 
        }
        if (blinkState.current.closing) {
            blinkState.current.value += delta * 15
            if (blinkState.current.value >= 1) {
                blinkState.current.value = 1
                blinkState.current.closing = false
            }
        } else {
            blinkState.current.value -= delta * 15
            if (blinkState.current.value <= 0) blinkState.current.value = 0
        }
        blinkMeshes.forEach(item => {
            if (item.mesh.morphTargetInfluences) {
                item.mesh.morphTargetInfluences[item.left] = blinkState.current.value
                item.mesh.morphTargetInfluences[item.right] = blinkState.current.value
            }
        })
    }

    if (mouthMeshes.length > 0) {
        let targetOpen = 0;
        let targetSmile = 0;
        if (isSpeaking.current) targetOpen = Math.abs(Math.sin(t * 12)) * 0.6 + 0.1
        if (emotion === "happy") targetSmile = 0.7; 
        else if (emotion === "neutral") targetSmile = 0.05; 
        else targetSmile = 0.0; 

        mouthMeshes.forEach(item => {
             if (item.mesh.morphTargetInfluences) {
                 if (item.openIdx !== -1) {
                    const currentOpen = item.mesh.morphTargetInfluences[item.openIdx]
                    item.mesh.morphTargetInfluences[item.openIdx] = THREE.MathUtils.lerp(currentOpen, targetOpen, 0.2)
                 }
                 if (item.smileIdx !== -1) {
                    const currentSmile = item.mesh.morphTargetInfluences[item.smileIdx]
                    item.mesh.morphTargetInfluences[item.smileIdx] = THREE.MathUtils.lerp(currentSmile, targetSmile, 0.05)
                 }
             }
        })
    }
  })

  // --- RENDER ---
  return (
    <group ref={group} position={[0.4, 0, 0]}>
        <primitive object={scene} scale={1.15} />

        <Html 
            position={[-0.8, 1.6, 0.6]} 
            transform 
            scale={0.12}
        >
            <div style={{
                background: 'rgba(255, 255, 255, 0.95)',
                padding: '12px',
                borderRadius: '8px',
                width: '300px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                pointerEvents: 'auto'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #eee', paddingBottom: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isThinking ? '#ffc107' : '#28a745' }}/>
                    <span style={{ fontSize: '11px', color: '#888', fontWeight: 600 }}>{isThinking ? "Thinking..." : "AI Therapist"}</span>
                </div>
                <div style={{ fontSize: '14px', lineHeight: '1.4', color: '#222', background: '#f1f3f5', padding: '10px', borderRadius: '6px' }}>
                    {response}
                </div>
                <form onSubmit={handleChat} style={{ display: 'flex', gap: '6px' }}>
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Say something..."
                        style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px', outline: 'none' }}
                    />
                    <button type="submit" disabled={!input.trim()} style={{ padding: '8px 12px', background: '#228be6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                        Send
                    </button>
                </form>
            </div>
        </Html>
    </group>
  )
}

useGLTF.preload("/avatar.glb")