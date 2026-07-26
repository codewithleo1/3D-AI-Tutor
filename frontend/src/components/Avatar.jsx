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

function NovaModel({ mood }) {
  const group = useRef()
  const { scene, animations } = useGLTF("/nova.glb")
  const { actions, names } = useAnimations(animations, group)

  useEffect(() => {
    // Log available animations on first load
    console.log("Available animations:", names)
  }, [names])

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

export default function Avatar({ mood = "idle" }) {
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
        <NovaModel mood={mood} />
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