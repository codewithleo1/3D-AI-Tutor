import React, { useRef, useEffect, Suspense } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { useGLTF, useAnimations } from "@react-three/drei"
import * as THREE from "three"

// The Ready Player Me model that ships with the app.
// (Previously this pointed at "/nova.glb" — the old model — which is why
//  the avatar showed nothing after switching to the RPM model.)
const MODEL_URL = "/rpm_test.glb"
useGLTF.preload(MODEL_URL)

const MOOD_TO_ANIMATION = {
  idle: "Idle", explaining: "Talking", thinking: "Thinking",
  quiz: "Thinking", happy: "Happy", concerned: "Sad", encouraging: "Talking",
}

// ARKit / RPM blendshapes used to convey mood on the face.
const MOOD_TO_EXPRESSION = {
  happy:      { mouthSmileLeft: 0.5, mouthSmileRight: 0.5, cheekSquintLeft: 0.2, cheekSquintRight: 0.2 },
  concerned:  { mouthFrownLeft: 0.4, mouthFrownRight: 0.4, browInnerUp: 0.3 },
  thinking:   { browInnerUp: 0.35, eyeSquintLeft: 0.15, eyeSquintRight: 0.15 },
  explaining: { browOuterUpLeft: 0.2, browOuterUpRight: 0.2, mouthSmileLeft: 0.15, mouthSmileRight: 0.15 },
  encouraging:{ mouthSmileLeft: 0.35, mouthSmileRight: 0.35 },
  idle:       {},
}

const VISEME_MAP = {
  0: "viseme_sil", 1: "viseme_PP", 2: "viseme_FF", 3: "viseme_TH", 4: "viseme_DD",
  5: "viseme_kk", 6: "viseme_CH", 7: "viseme_SS", 8: "viseme_nn", 9: "viseme_RR",
  10: "viseme_aa", 11: "viseme_E", 12: "viseme_I", 13: "viseme_O", 14: "viseme_U",
}

// Morphs we actively drive — everything else is left at rest.
const MANAGED_MORPHS = [
  "jawOpen", "mouthOpen", "eyeBlinkLeft", "eyeBlinkRight",
  ...Object.values(VISEME_MAP),
  ...new Set(Object.values(MOOD_TO_EXPRESSION).flatMap(o => Object.keys(o))),
]

function NovaModel({ moodRef, isSpeakingRef, currentVisemeRef }) {
  const group = useRef()
  const { scene, animations } = useGLTF(MODEL_URL)
  const { actions, names } = useAnimations(animations, group)
  const morphMeshesRef = useRef([])
  const bonesRef = useRef({})
  const blink = useRef({ t: 0, next: 2 + Math.random() * 2 })

  useEffect(() => {
    const meshes = []
    scene.traverse(obj => {
      if (obj.isMesh) {
        obj.frustumCulled = false
        if (obj.morphTargetDictionary && obj.morphTargetInfluences) meshes.push(obj)
      }
      if (obj.isBone) {
        if (obj.name === "Head") bonesRef.current.head = obj
        if (obj.name === "Neck") bonesRef.current.neck = obj
        if (obj.name === "Spine2") bonesRef.current.spine = obj
      }
    })
    morphMeshesRef.current = meshes
  }, [scene])

  // If the model DOES have clips, play the mood-matched one (RPM export has none).
  useEffect(() => {
    if (!actions || names.length === 0) return
    const target = MOOD_TO_ANIMATION[moodRef.current] || "Idle"
    const action = actions[target] || actions[names[0]]
    action?.reset().fadeIn(0.3).play()
    return () => action?.fadeOut(0.2)
  }, [actions, names])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const mood = moodRef.current
    const isSpeaking = isSpeakingRef.current

    // Subtle "alive" idle motion (head sway) — the model has no baked animation.
    const { head, neck } = bonesRef.current
    if (head) {
      head.rotation.y = Math.sin(t * 0.5) * 0.05
      head.rotation.x = Math.sin(t * 0.8) * 0.03 + (isSpeaking ? Math.sin(t * 9) * 0.03 : 0)
    }
    if (neck) neck.rotation.y = Math.sin(t * 0.5) * 0.02

    const meshes = morphMeshesRef.current
    if (!meshes.length) return

    // Blink scheduler: quick eyelid pulse every few seconds.
    const b = blink.current
    b.t += delta
    let blinkVal = 0
    if (b.t >= b.next) {
      const phase = b.t - b.next
      if (phase < 0.14) blinkVal = Math.sin((phase / 0.14) * Math.PI)
      else { b.t = 0; b.next = 2 + Math.random() * 3 }
    }

    // Mouth movement while speaking (Web Speech gives no phonemes, so we animate the jaw).
    const viseme = VISEME_MAP[currentVisemeRef.current] || "viseme_sil"
    const jawTarget = isSpeaking ? 0.12 + Math.abs(Math.sin(t * 11)) * 0.33 : 0
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

      // Relax everything we manage, then re-apply targets below.
      MANAGED_MORPHS.forEach(name => ease(name, 0, 0.2))

      set("eyeBlinkLeft", blinkVal)
      set("eyeBlinkRight", blinkVal)

      ease("jawOpen", jawTarget, 0.5)
      ease("mouthOpen", jawTarget * 0.5, 0.5)
      if (isSpeaking) ease(viseme, 0.5, 0.4)

      Object.entries(expr).forEach(([name, target]) => ease(name, target, 0.1))
    })
  })

  return (
    <group ref={group}>
      <primitive object={scene} scale={1.0} position={[0, -0.9, 0]} rotation={[0, 0, 0]} />
    </group>
  )
}

const AvatarCanvas = React.memo(function AvatarCanvas({ moodRef, isSpeakingRef, currentVisemeRef }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 3], fov: 60 }}
      style={{ width: "100%", height: "100%" }}
      gl={{ preserveDrawingBuffer: true }}
      frameloop="always"
    >
      <ambientLight intensity={1.2} />
      <directionalLight position={[2, 4, 4]} intensity={1.3} />
      <directionalLight position={[-2, 2, 2]} intensity={0.5} />
      <Suspense fallback={null}>
        <NovaModel
          moodRef={moodRef}
          isSpeakingRef={isSpeakingRef}
          currentVisemeRef={currentVisemeRef}
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

  return (
    <div style={{
      width: "100%", height: "100%", minHeight: "400px",
      background: "linear-gradient(180deg, #EDE9FE 0%, #F0FDF4 100%)",
      position: "relative", overflow: "hidden",
    }}>
      {/* Loading hint shown until the WebGL canvas paints the model */}
      <div style={{
        position: "absolute", inset: 0, display: "flex",
        alignItems: "center", justifyContent: "center",
        fontSize: "13px", color: "#7C3AED", fontWeight: 600, opacity: 0.6,
        pointerEvents: "none",
      }}>
        Loading Miss Nova…
      </div>
      <div style={{ position: "absolute", inset: 0 }}>
        <AvatarCanvas
          moodRef={moodRef}
          isSpeakingRef={isSpeakingRef}
          currentVisemeRef={currentVisemeRef}
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
