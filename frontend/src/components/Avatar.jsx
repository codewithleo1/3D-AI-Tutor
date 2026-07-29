import { useRef, useEffect } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { useGLTF, useAnimations, OrbitControls } from "@react-three/drei"
import * as THREE from "three"

const MOOD_TO_ANIMATION = {
  idle: "Idle",
  explaining: "Talking",
  thinking: "Thinking",
  quiz: "Thinking",
  happy: "Happy",
  concerned: "Sad",
  encouraging: "Talking",
}

function NovaModel({ mood, isSpeaking }) {
  const group = useRef()
  const { scene, animations } = useGLTF("/nova.glb")
  const { actions, names } = useAnimations(animations, group)
  const headBoneRef = useRef(null)
  useEffect(() => {
    scene.traverse(obj => {
      if (obj.isBone && obj.name === "Head_5") headBoneRef.current = obj
    })
  }, [scene])



  useEffect(() => {
    if (!actions || names.length === 0) return

    // Stop all current animations
    Object.values(actions).forEach(action => action?.stop())

    // Find the best matching animation
    const targetName = MOOD_TO_ANIMATION[mood] || "Idle"
    
    // Try exact match first, then partial match
    let action = actions[targetName]
    if (!action) {
      const match = names.find(n => 
        n.toLowerCase().includes(targetName.toLowerCase())
      )
      if (match) action = actions[match]
    }
    
    // Fall back to first animation if nothing matches
    if (!action && names.length > 0) {
      action = actions[names[0]]
    }

    if (action) {
      action.reset().fadeIn(0.3).play()

      // Mute body bones — only head and hands animate
      const allowedBones = [
        "Head_5", "HeadTop_End_6", "LeftEye_7", "RightEye_8",
        "LeftHand_12", "LeftHandThumb1_13", "LeftHandThumb2_14", "LeftHandThumb3_15", "LeftHandThumb4_16",
        "LeftHandIndex1_17", "LeftHandIndex2_18", "LeftHandIndex3_19", "LeftHandIndex4_20",
        "LeftHandMiddle1_21", "LeftHandMiddle2_22", "LeftHandMiddle3_23", "LeftHandMiddle4_24",
        "LeftHandRing1_25", "LeftHandRing2_26", "LeftHandRing3_27", "LeftHandRing4_28",
        "LeftHandPinky1_29", "LeftHandPinky2_30", "LeftHandPinky3_31", "LeftHandPinky4_32",
        "RightHand_36", "RightHandThumb1_37", "RightHandThumb2_38", "RightHandThumb3_39", "RightHandThumb4_40",
        "RightHandIndex1_41", "RightHandIndex2_42", "RightHandIndex3_43", "RightHandIndex4_44",
        "RightHandMiddle1_45", "RightHandMiddle2_46", "RightHandMiddle3_47", "RightHandMiddle4_48",
        "RightHandRing1_49", "RightHandRing2_50", "RightHandRing3_51", "RightHandRing4_52",
        "RightHandPinky1_53", "RightHandPinky2_54", "RightHandPinky3_55", "RightHandPinky4_56",
      ]

      const clip = action.getClip()
      clip.tracks.forEach(track => {
        // track name format: "BoneName.property"
        const boneName = track.name.split(".")[0]
        if (!allowedBones.includes(boneName)) {
          // Find the mixer property and mute it
          const binding = action.getMixer()._bindings.find(b => b._targetPath && b._node?.name === boneName)
          if (binding) binding.weight = 0
        }
      })
    }
  }, [mood, actions, names])

  useFrame(({ clock }) => {
    if (!headBoneRef.current) return
    if (isSpeaking) {
      // Subtle jaw-like nod: sine wave on X rotation
      headBoneRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 8) * 0.04
    } else {
      // Smoothly return to neutral
      headBoneRef.current.rotation.x *= 0.85
    }
  })

  return (
    <group ref={group}>
      <primitive 
        object={scene} 
        scale={2.0}
        position={[0, -2.3, 0]}
        rotation={[0, 0, 0]}
        />
    </group>
  )
}

export default function Avatar({ mood = "idle", isSpeaking = false }) {
    return (
        <div style={{
        width: "100%",
        height: "100%",
        minHeight: "400px",
        background: "linear-gradient(180deg, #EDE9FE 0%, #F0FDF4 100%)",
        position: "relative",
        overflow: "hidden",
        }}>
        <Canvas
            camera={{ position: [0, 0.3, 6.5], fov: 31 }}
            style={{ width: "100%", height: "100%" }}
        >
        <ambientLight intensity={1} />
        <directionalLight position={[0, 4, 4]} intensity={1.2} />
        <NovaModel mood={mood} isSpeaking={isSpeaking} />
      </Canvas>
      <div style={{
        position: "absolute",
        bottom: "8px",
        left: 0, right: 0,
        textAlign: "center",
        fontSize: "11px",
        fontWeight: 700,
        color: "#7C3AED",
        letterSpacing: "1px"
      }}>
        MISS NOVA
      </div>
    </div>
  )
}