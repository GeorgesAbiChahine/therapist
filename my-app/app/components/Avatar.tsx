"use client"

import { useGLTF } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { useEffect, useRef, useState } from "react"
import * as THREE from "three"

// Define available emotions
type Emotion = "neutral" | "happy" | "concerned"

export default function Avatar() {
  const { scene } = useGLTF("/avatar.glb")
  const group = useRef<THREE.Group>(null)

  // --- BONE STATE ---
  const [head, setHead] = useState<THREE.Object3D | null>(null)
  const [neck, setNeck] = useState<THREE.Object3D | null>(null)
  const [spine, setSpine] = useState<THREE.Object3D | null>(null)
  
  // Posture Bones
  const [rightArm, setRightArm] = useState<THREE.Object3D | null>(null)
  const [leftArm, setLeftArm] = useState<THREE.Object3D | null>(null)
  const [rightForeArm, setRightForeArm] = useState<THREE.Object3D | null>(null)
  const [leftForeArm, setLeftForeArm] = useState<THREE.Object3D | null>(null)

  // --- MORPH STATE ---
  // Store meshes AND their specific indices for smile/open
  const [mouthMeshes, setMouthMeshes] = useState<{mesh: THREE.Mesh, openIdx: number, smileIdx: number}[]>([]) 
  const [blinkMeshes, setBlinkMeshes] = useState<any[]>([]) 
  
  const [emotion, setEmotion] = useState<Emotion>("neutral")
  
  // Animation Refs
  const blinkState = useRef({ value: 0, closing: false, nextBlink: 2.5 })
  const isSpeaking = useRef(false)

  useEffect(() => {
    // 1. CENTER AVATAR (Restored exactly as requested)
    const box = new THREE.Box3().setFromObject(scene)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())

    scene.position.x -= center.x
    scene.position.z -= center.z
    scene.position.y += size.y / 2

    // 2. FIND MESHES & BONES
    const foundMouths: {mesh: THREE.Mesh, openIdx: number, smileIdx: number}[] = []
    const foundBlinks: any[] = []

    scene.traverse((node: any) => {
      if (node.isMesh) {
        node.castShadow = true
        node.frustumCulled = false

        if (node.morphTargetDictionary) {
            const keys = Object.keys(node.morphTargetDictionary)

            // 1. Mouth & Smile
            const openIdx = keys.findIndex(k => k === "mouthOpen")
            const smileIdx = keys.findIndex(k => k === "mouthSmile")
            
            if (openIdx !== -1 || smileIdx !== -1) {
                foundMouths.push({ 
                    mesh: node, 
                    openIdx: openIdx, 
                    smileIdx: smileIdx 
                })
            }

            // 2. Blinks
            const leftIndex = keys.findIndex(k => k.includes('blink') || k.includes('Blink'))
            if (leftIndex !== -1) {
                 foundBlinks.push({ mesh: node, left: leftIndex, right: leftIndex })
            }
        }
      }
      
      if (node.isBone) {
        const name = node.name
        if (name === "Head" || name === "mixamorigHead") setHead(node)
        if (name === "Neck" || name === "mixamorigNeck") setNeck(node)
        if (name === "Spine2" || name === "mixamorigSpine2") setSpine(node)
        if (name === "RightArm" || name === "mixamorigRightArm") setRightArm(node)
        if (name === "LeftArm" || name === "mixamorigLeftArm") setLeftArm(node)
        if (name === "RightForeArm" || name === "mixamorigRightForeArm") setRightForeArm(node)
        if (name === "LeftForeArm" || name === "mixamorigLeftForeArm") setLeftForeArm(node)
      }
    })

    setMouthMeshes(foundMouths)
    setBlinkMeshes(foundBlinks)

  }, [scene])

  // --- POSTURE (Arms Tucked) ---
  useEffect(() => {
    if (!rightArm || !leftArm || !rightForeArm || !leftForeArm) return
    rightArm.rotation.z = -1.3
    leftArm.rotation.z = 1.3
    rightForeArm.rotation.x = 0.3
    leftForeArm.rotation.x = 0.3
    rightArm.rotation.y = -0.2
    leftArm.rotation.y = 0.2
  }, [rightArm, leftArm, rightForeArm, leftForeArm])


  // --- EMOTION TESTER (Cycles every 5s) ---
  useEffect(() => {
      const emotions: Emotion[] = ["neutral", "happy", "concerned"];
      let idx = 0;
      const interval = setInterval(() => {
          idx = (idx + 1) % emotions.length;
          setEmotion(emotions[idx]);
      }, 5000); 
      return () => clearInterval(interval);
  }, []);

  // --- SPEECH ---
  useEffect(() => {
    const speak = () => {
        const synth = window.speechSynthesis;
        if (!synth) return;
        let voices = synth.getVoices();
        
        const runSpeech = () => {
            const utterance = new SpeechSynthesisUtterance("I am centered. I am cycling through emotions. Neutral. Happy. Concerned.");
            const preferredVoice = voices.find(v => v.name.includes("Google US English") || v.name.includes("Zira"));
            if (preferredVoice) utterance.voice = preferredVoice;
            utterance.rate = 0.9; 
            utterance.onstart = () => { isSpeaking.current = true }
            utterance.onend = () => { isSpeaking.current = false }
            synth.cancel();
            synth.speak(utterance);
        };

        if (voices.length > 0) runSpeech();
        else synth.onvoiceschanged = () => {
            voices = synth.getVoices();
            runSpeech();
        };
    };
    const timer = setTimeout(speak, 1000);
    return () => clearTimeout(timer);
  }, []);


  // --- ANIMATION LOOP ---
  useFrame((state, delta) => {
    if (!group.current) return
    const t = state.clock.elapsedTime

    // 1. IDLE
    if (spine) {
      spine.rotation.x = Math.sin(t * 1) * 0.03 + Math.sin(t * 2.5) * 0.01
      spine.rotation.y = Math.sin(t * 0.5) * 0.03
      spine.rotation.z = Math.sin(t * 0.8) * 0.02
    }
    if (neck) {
      // Removed Neck Z-Tilt to prevent off-center drift
      neck.rotation.y = Math.sin(t * 0.6) * 0.05
      neck.rotation.x = Math.sin(t * 1.2) * 0.02
    }
    
    // Kept standard breathing height
    group.current.position.y = Math.sin(t * 1.2) * 0.01

    // 2. EYE CONTACT
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

    // 3. BLINKING
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

    // 4. LIP SYNC + EMOTIONS (Facial Only)
    if (mouthMeshes.length > 0) {
        let targetOpen = 0;
        let targetSmile = 0;

        // Lip Sync
        if (isSpeaking.current) {
            targetOpen = Math.abs(Math.sin(t * 12)) * 0.6 + 0.1
        } 

        // Emotions
        if (emotion === "happy") {
            targetSmile = 0.7; // Big smile
        } else if (emotion === "neutral") {
            targetSmile = 0.05; // Polite
        } else {
            // Concerned: Serious face (No smile)
            targetSmile = 0.0; 
        }

        // Apply
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

  return (
    <primitive 
      ref={group} 
      object={scene} 
      scale={1.15} 
    />
  )
}

useGLTF.preload("/avatar.glb")