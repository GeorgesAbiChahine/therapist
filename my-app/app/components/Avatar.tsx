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

  // --- STEP 3 STATE: EYE MESHES (For "Squash Blink") ---
  const [eyeL, setEyeL] = useState<THREE.Object3D | null>(null)
  const [eyeR, setEyeR] = useState<THREE.Object3D | null>(null)
  
  // Blink Logic Ref
  // value: current Scale Y (1 = open, 0.1 = closed)
  const blinkState = useRef({ value: 1, closing: false, nextBlink: 2.5 })

  useEffect(() => {
    // 1. Center Avatar
    const box = new THREE.Box3().setFromObject(scene)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())

    scene.position.x -= center.x
    scene.position.z -= center.z
    scene.position.y += size.y / 2

    // 2. Find Bones & Eye Meshes
    scene.traverse((node: any) => {
      if (node.isMesh) {
        node.castShadow = true
        node.frustumCulled = false

        // --- FIND EYES MANUALLY ---
        // Your logs showed "EyeLeft" and "EyeRight" exist as meshes.
        // We will target them directly for scaling.
        if (node.name.includes("EyeLeft")) {
            setEyeL(node)
        }
        if (node.name.includes("EyeRight")) {
            setEyeR(node)
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

    // --- STEP 3: BLINK (THE "SQUASH" TRICK) ---
    // If we found the eye meshes, we scale them down to simulate a blink.
    if (eyeL && eyeR) {
        
        // Timer Logic
        blinkState.current.nextBlink -= delta
        if (blinkState.current.nextBlink <= 0 && !blinkState.current.closing) {
            blinkState.current.closing = true
            blinkState.current.nextBlink = Math.random() * 3 + 2 
        }

        // Animation Logic (Scale Y)
        // 1 = Open, 0.1 = Closed (Squashed)
        if (blinkState.current.closing) {
            // Close fast
            blinkState.current.value -= delta * 15 
            if (blinkState.current.value <= 0.1) {
                blinkState.current.value = 0.1
                blinkState.current.closing = false // Start opening
            }
        } else {
            // Open fast
            blinkState.current.value += delta * 15
            if (blinkState.current.value >= 1) {
                blinkState.current.value = 1
            }
        }

        // Apply Scale
        eyeL.scale.y = blinkState.current.value
        eyeR.scale.y = blinkState.current.value
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