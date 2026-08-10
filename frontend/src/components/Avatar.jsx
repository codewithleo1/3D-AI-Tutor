import React, { useRef, useEffect, useState, useCallback, Suspense } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { useGLTF, useAnimations } from "@react-three/drei"

const MODEL_URL = "/rpm_test.glb"
const IDLE_URL = "/idle_feminine.glb" // Ready Player Me standing idle (Mixamo-compatible rig)
useGLTF.preload(MODEL_URL)
useGLTF.preload(IDLE_URL)

// Facial expressions per mood, using the model's ARKit blendshape names.
const MOOD_TO_EXPRESSION = {
  happy:       { mouthSmileLeft: 0.5, mouthSmileRight: 0.5, cheekSquintLeft: 0.2, cheekSquintRight: 0.2 },
  concerned:   { mouthFrownLeft: 0.4, mouthFrownRight: 0.4, browInnerUp: 0.3 },
  thinking:    { browInnerUp: 0.35, eyeSquintLeft: 0.15, eyeSquintRight: 0.15 },
  explaining:  { browOuterUpLeft: 0.2, browOuterUpRight: 0.2, mouthSmileLeft: 0.15, mouthSmileRight: 0.15 },
  encouraging: { mouthSmileLeft: 0.35, mouthSmileRight: 0.35 },
  idle:        {},
}

const VISEME_MAP = {
  0: "viseme_sil", 1: "viseme_PP", 2: "viseme_FF", 3: "viseme_TH", 4: "viseme_DD",
  5: "viseme_kk", 6: "viseme_CH", 7: "viseme_SS", 8: "viseme_nn", 9: "viseme_RR",
  10: "viseme_aa", 11: "viseme_E", 12: "viseme_I", 13: "viseme_O", 14: "viseme_U",
}

const MANAGED_MORPHS = [
  "jawOpen", "mouthOpen", "eyeBlinkLeft", "eyeBlinkRight",
  ...Object.values(VISEME_MAP),
  ...new Set(Object.values(MOOD_TO_EXPRESSION).flatMap(o => Object.keys(o))),
]

function NovaModel({ moodRef, isSpeakingRef, currentVisemeRef, onLoaded }) {
  const group = useRef()
  const { scene } = useGLTF(MODEL_URL)
  const { animations: idleClips } = useGLTF(IDLE_URL)
  const { actions, names } = useAnimations(idleClips, group)
  const morphMeshesRef = useRef([])
  const blink = useRef({ t: 0, next: 2 + Math.random() * 2 })

  useEffect(() => {
    const meshes = []
    scene.traverse(obj => {
      if (obj.isMesh) {
        obj.frustumCulled = false
        if (obj.morphTargetDictionary && obj.morphTargetInfluences) meshes.push(obj)
      }
    })
    morphMeshesRef.current = meshes
    onLoaded?.()
  }, [scene])

  // Play the looping idle body animation (breathing + subtle gestures).
  useEffect(() => {
    if (!names.length) return
    const action = actions[names[0]]
    if (action) {
      action.reset().fadeIn(0.4).play()
      return () => action.fadeOut(0.3)
    }
  }, [actions, names])

  // Face is not touched by the idle clip, so we drive morphs here.
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const meshes = morphMeshesRef.current
    if (!meshes.length) return

    const isSpeaking = isSpeakingRef.current
    const mood = moodRef.current

    const b = blink.current
    b.t += delta
    let blinkVal = 0
    if (b.t >= b.next) {
      const phase = b.t - b.next
      if (phase < 0.14) blinkVal = Math.sin((phase / 0.14) * Math.PI)
      else { b.t = 0; b.next = 2 + Math.random() * 3 }
    }

    const viseme = VISEME_MAP[currentVisemeRef.current] || "viseme_sil"
    const hasViseme = isSpeaking && currentVisemeRef.current > 0
    const jawTarget = isSpeaking ? (hasViseme ? 0.06 : 0.12 + Math.abs(Math.sin(t * 11)) * 0.3) : 0
    const expr = MOOD_TO_EXPRESSION[mood] || {}

    meshes.forEach(mesh => {
      const dict = mesh.morphTargetDictionary
      const inf = mesh.morphTargetInfluences
      if (!dict || !inf) return
      const ease = (name, target, rate) => {
        const i = dict[name]
        if (i !== undefined) inf[i] += (target - inf[i]) * rate
      }
      const set = (name, v) => {
        const i = dict[name]
        if (i !== undefined) inf[i] = v
      }

      MANAGED_MORPHS.forEach(name => ease(name, 0, 0.25))

      set("eyeBlinkLeft", blinkVal)
      set("eyeBlinkRight", blinkVal)

      ease("jawOpen", jawTarget, 0.5)
      ease("mouthOpen", jawTarget * 0.5, 0.5)
      if (hasViseme) ease(viseme, 0.6, 0.5)

      Object.entries(expr).forEach(([name, target]) => ease(name, target, 0.1))
    })
  })

  return (
    <group ref={group}>
      {/* Head-and-shoulders framing: raised + centered on the face */}
      <primitive object={scene} scale={1.0} position={[0, -1.55, 0]} rotation={[0, 0, 0]} />
    </group>
  )
}

const AvatarCanvas = React.memo(function AvatarCanvas({ moodRef, isSpeakingRef, currentVisemeRef, onLoaded }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 1.35], fov: 30 }}
      style={{ width: "100%", height: "100%" }}
      gl={{ preserveDrawingBuffer: true }}
      frameloop="always"
    >
      <ambientLight intensity={1.25} />
      <directionalLight position={[2, 3, 4]} intensity={1.4} />
      <directionalLight position={[-2, 1, 2]} intensity={0.5} />
      <Suspense fallback={null}>
        <NovaModel
          moodRef={moodRef}
          isSpeakingRef={isSpeakingRef}
          currentVisemeRef={currentVisemeRef}
          onLoaded={onLoaded}
        />
      </Suspense>
    </Canvas>
  )
})

export default function Avatar({ mood = "idle", isSpeaking = false, currentViseme = 0 }) {
  const moodRef = useRef(mood)
  const isSpeakingRef = useRef(isSpeaking)
  const currentVisemeRef = useRef(currentViseme)
  moodRef.current = mood
  isSpeakingRef.current = isSpeaking
  currentVisemeRef.current = currentViseme

  const [loaded, setLoaded] = useState(false)
  const handleLoaded = useCallback(() => setLoaded(true), [])

  return (
    <div style={{
      width: "100%", height: "100%", minHeight: "400px",
      background: "linear-gradient(180deg, #EDE9FE 0%, #F0FDF4 100%)",
      position: "relative", overflow: "hidden",
    }}>
      {!loaded && (
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
          fontSize: "13px", color: "#7C3AED", fontWeight: 600, opacity: 0.6,
          pointerEvents: "none",
        }}>
          Loading Miss Nova…
        </div>
      )}
      <div style={{ position: "absolute", inset: 0 }}>
        <AvatarCanvas
          moodRef={moodRef}
          isSpeakingRef={isSpeakingRef}
          currentVisemeRef={currentVisemeRef}
          onLoaded={handleLoaded}
        />
      </div>
      <div style={{
        position: "absolute", bottom: "8px", left: 0, right: 0,
        textAlign: "center", fontSize: "11px", fontWeight: 700,
        color: "#7C3AED", letterSpacing: "1px",
      }}>
        MISS NOVA
      </div>
    </div>
  )
}
