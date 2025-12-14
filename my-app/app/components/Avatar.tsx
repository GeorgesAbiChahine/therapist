"use client"

import { useGLTF } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { useEffect, useRef, useState } from "react"
import * as THREE from "three"

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

  // --- FACE MESH STATE (Reverted to Morph Search) ---
  const [faceMesh, setFaceMesh] = useState<THREE.SkinnedMesh | null>(null)
  const [blinkIndices, setBlinkIndices] = useState<{left: number, right: number} | null>(null)
  
  // Blink Timer
  const blinkState = useRef({ value: 0, closing: false, nextBlink: 2.5 })

  useEffect(() => {
    // 1. Center Avatar
    const box = new THREE.Box3().setFromObject(scene)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())

    scene.position.x -= center.x
    scene.position.z -= center.z
    scene.position.y += size.y / 2

    // 2. Find Bones & Face Mesh
    scene.traverse((node: any) => {
      if (node.isMesh) {
        node.castShadow = true
        node.frustumCulled = false

        // --- SMART FIND FACE MESH (Reverted Logic) ---
        if (node.morphTargetDictionary) {
            const keys = Object.keys(node.morphTargetDictionary)
            
            // Search for blink shapes
            const leftIndex = keys.findIndex(k => 
                (k.includes('blink') || k.includes('Blink') || k.includes('closed')) && 
                (k.includes('left') || k.includes('Left') || k.includes('L'))
            )
            const rightIndex = keys.findIndex(k => 
                (k.includes('blink') || k.includes('Blink') || k.includes('closed')) && 
                (k.includes('right') || k.includes('Right') || k.includes('R'))
            )
            const unifiedIndex = keys.findIndex(k => k.toLowerCase() === 'blink' || k.toLowerCase() === 'eyesclosed')

            if (leftIndex !== -1 && rightIndex !== -1) {
                setFaceMesh(node)
                setBlinkIndices({ left: leftIndex, right: rightIndex })
            } else if (unifiedIndex !== -1) {
                setFaceMesh(node)
                setBlinkIndices({ left: unifiedIndex, right: unifiedIndex })
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
  }, [scene])

  // --- POSTURE (Preserved) ---
  useEffect(() => {
    if (!rightArm || !leftArm || !rightForeArm || !leftForeArm) return
    rightArm.rotation.z = -1.3
    leftArm.rotation.z = 1.3
    rightForeArm.rotation.x = 0.3
    leftForeArm.rotation.x = 0.3
    rightArm.rotation.y = -0.2
    leftArm.rotation.y = 0.2
  }, [rightArm, leftArm, rightForeArm, leftForeArm])


  // --- STEP 4: TEXT-TO-SPEECH INIT ---
  useEffect(() => {
    // Simple greeting to test voice capability
    const speak = () => {
        if (!window.speechSynthesis) return;
        
        // Cancel any previous speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance("Hello. I am here to listen. How are you feeling today?");
        
        // Try to pick a softer voice
        const voices = window.speechSynthesis.getVoices();
        const femaleVoice = voices.find(v => v.name.includes("Female") || v.name.includes("Samantha") || v.name.includes("Google US English"));
        if (femaleVoice) utterance.voice = femaleVoice;
        
        utterance.rate = 0.9; // Slightly slower is more therapeutic
        utterance.pitch = 1.0;

        // Speak
        window.speechSynthesis.speak(utterance);
    };

    // Small delay to ensure browser is ready
    const timer = setTimeout(speak, 1000);
    return () => clearTimeout(timer);
  }, []);


  // --- ANIMATION LOOP ---
  useFrame((state, delta) => {
    if (!group.current) return
    const t = state.clock.elapsedTime

    // --- IDLE MOTION ---
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

    // --- EYE CONTACT ---
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

    // --- BLINKING (Reverted) ---
    if (faceMesh && blinkIndices && faceMesh.morphTargetInfluences) {
        blinkState.current.nextBlink -= delta
        if (blinkState.current.nextBlink <= 0 && !blinkState.current.closing && blinkState.current.value <= 0) {
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

        faceMesh.morphTargetInfluences[blinkIndices.left] = blinkState.current.value
        faceMesh.morphTargetInfluences[blinkIndices.right] = blinkState.current.value
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