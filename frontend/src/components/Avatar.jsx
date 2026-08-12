import React, { useRef, useEffect, useState, useMemo, useCallback, Suspense } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { useGLTF, useAnimations } from "@react-three/drei"

const MODEL_URL = "/rpm_test.glb"
// Ready Player Me animation clips (Mixamo-compatible rig) retargeted by bone name.
const CLIP_URLS = [
  "/idle_feminine.glb",   // F_Standing_Idle_001            (calm idle)
  "/anim_idle2.glb",      // F_Standing_Idle_Variations_002 (livelier idle)
  "/anim_talk1.glb",      // F_Talking_Variations_001       (gesture while talking)
  "/anim_talk2.glb",      // F_Talking_Variations_002
  "/anim_talk3.glb",      // F_Talking_Variations_003
]
useGLTF.preload(MODEL_URL)
CLIP_URLS.forEach(u => useGLTF.preload(u))

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

function NovaModel({ moodRef, isSpeakingRef, currentVisemeRef, poseSeedRef, onLoaded }) {
  const group = useRef()
  const { scene } = useGLTF(MODEL_URL)
  // Load each clip GLB and merge their AnimationClips into one list.
  const clipGltfs = CLIP_URLS.map(u => useGLTF(u))
  const clips = useMemo(
    () => clipGltfs.flatMap(g => g.animations),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    clipGltfs.map(g => g.animations)
  )
  const { actions, names } = useAnimations(clips, group)
  const morphMeshesRef = useRef([])
  const activeRef = useRef(null)
  const blink = useRef({ t: 0, next: 2 + Math.random() * 2 })

  const idleName = useMemo(() => names.find(n => n === "F_Standing_Idle_001") || names[0], [names])
  const idle2Name = useMemo(() => names.find(n => n.includes("Idle_Variations")) || idleName, [names, idleName])
  const talkNames = useMemo(() => names.filter(n => n.includes("Talking")), [names])

  function pickClip(mood, speaking, seed) {
    if (speaking && talkNames.length) return talkNames[Math.abs(seed) % talkNames.length]
    if (mood === "happy" || mood === "encouraging") return idle2Name
    return idleName
  }

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

  useFrame((state, delta) => {
    // Switch/crossfade body clip based on mood, speaking, and per-topic pose seed.
    if (names.length) {
      const desired = pickClip(moodRef.current, isSpeakingRef.current, poseSeedRef.current)
      if (desired && activeRef.current !== desired && actions[desired]) {
        const prev = activeRef.current
        if (prev && actions[prev]) actions[prev].fadeOut(0.4)
        actions[desired].reset().fadeIn(0.4).play()
        activeRef.current = desired
      }
    }

    const meshes = morphMeshesRef.current
    if (!meshes.length) return

    const t = state.clock.elapsedTime
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
      const set = (name, v) => { const i = dict[name]; if (i !== undefined) inf[i] = v }

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
      {/* Head-and-shoulders framing */}
      <primitive object={scene} scale={1.0} position={[0, -1.55, 0]} rotation={[0, 0, 0]} />
    </group>
  )
}

const AvatarCanvas = React.memo(function AvatarCanvas(props) {
  const { moodRef, isSpeakingRef, currentVisemeRef, poseSeedRef, onLoaded } = props
  return (
    <Canvas
      camera={{ position: [0, 0, 1.35], fov: 30 }}
      style={{ width: "100%", height: "100%" }}
      gl={{ preserveDrawingBuffer: true }}
      frameloop="always"
    >
      {/* Studio lighting: key + fill + cool rim from behind */}
      <ambientLight intensity={1.05} />
      <directionalLight position={[2, 3, 4]} intensity={1.35} />
      <directionalLight position={[-2, 1, 2]} intensity={0.45} />
      <directionalLight position={[0, 2.5, -3]} intensity={0.9} color="#c7d2fe" />
      <Suspense fallback={null}>
        <NovaModel
          moodRef={moodRef}
          isSpeakingRef={isSpeakingRef}
          currentVisemeRef={currentVisemeRef}
          poseSeedRef={poseSeedRef}
          onLoaded={onLoaded}
        />
      </Suspense>
    </Canvas>
  )
})

export default function Avatar({ mood = "idle", isSpeaking = false, currentViseme = 0, poseSeed = 0 }) {
  const moodRef = useRef(mood)
  const isSpeakingRef = useRef(isSpeaking)
  const currentVisemeRef = useRef(currentViseme)
  const poseSeedRef = useRef(poseSeed)
  moodRef.current = mood
  isSpeakingRef.current = isSpeaking
  currentVisemeRef.current = currentViseme
  poseSeedRef.current = poseSeed

  const [loaded, setLoaded] = useState(false)
  const handleLoaded = useCallback(() => setLoaded(true), [])

  return (
    <div style={{
      width: "100%", height: "100%", minHeight: "400px",
      background: "radial-gradient(120% 90% at 50% 0%, #F5F3FF 0%, #EDE9FE 45%, #E0F2F1 100%)",
      position: "relative", overflow: "hidden",
    }}>
      {/* Soft studio glow behind the head */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(42% 34% at 50% 34%, rgba(255,255,255,0.85), rgba(255,255,255,0) 70%)",
      }} />
      {/* Subtle grounding shadow under the bust */}
      <div style={{
        position: "absolute", left: "50%", bottom: "18px", transform: "translateX(-50%)",
        width: "62%", height: "26px", borderRadius: "50%",
        background: "radial-gradient(ellipse at center, rgba(76,29,149,0.18), rgba(76,29,149,0) 70%)",
        filter: "blur(3px)", pointerEvents: "none",
      }} />

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
          poseSeedRef={poseSeedRef}
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
