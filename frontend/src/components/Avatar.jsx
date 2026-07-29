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
  const bodyBonesRef = useRef([])

  useEffect(() => {
    const bodyBoneNames = [
      "LeftUpLeg_57", "LeftLeg_58", "LeftFoot_59", "LeftToeBase_60", "LeftToe_End_61",
      "RightUpLeg_62", "RightLeg_63", "RightFoot_64", "RightToeBase_65", "RightToe_End_66",
    ]
    const collected = []
      scene.traverse(obj => {
        if (obj.isBone && obj.name.toLowerCase().includes("head") && !obj.name.toLowerCase().includes("top")) headBoneRef.current = obj
        if (obj.isBone && bodyBoneNames.includes(obj.name)) {
        // Store bone + its rest rotation
        collected.push({
          bone: obj,
          restRotation: obj.rotation.clone(),
          restPosition: obj.position.clone(),
        })
      }
    })
    bodyBonesRef.current = collected
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
    }
  }, [mood, actions, names])

  useFrame(({ clock }) => {
    // Lock body bones to rest position every frame
    bodyBonesRef.current.forEach(({ bone, restRotation, restPosition }) => {
      bone.rotation.copy(restRotation)
      bone.position.copy(restPosition)
    })

    // Animate head while speaking
    if (!headBoneRef.current) return
    if (isSpeaking) {
      headBoneRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 8) * 0.04
    } else {
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