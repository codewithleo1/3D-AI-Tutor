import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export function useProceduralIdle(morphMeshesRef, spineBoneRef, { enabled = true } = {}) {
  const blinkTimer = useRef(Math.random() * 3 + 2)
  const blinkPhase = useRef(0)

  useFrame((state, delta) => {
    if (!enabled) return
    const t = state.clock.elapsedTime

    if (spineBoneRef?.current) {
      spineBoneRef.current.rotation.x = Math.sin(t * 0.9) * 0.015
    }

    blinkTimer.current -= delta
    if (blinkTimer.current <= 0) {
      blinkPhase.current = 1
      blinkTimer.current = Math.random() * 4 + 2.5
    }

    if (blinkPhase.current > 0) {
      blinkPhase.current = Math.max(0, blinkPhase.current - delta * 6)
      const v = Math.sin(blinkPhase.current * Math.PI)
      ;(morphMeshesRef.current || []).forEach((mesh) => {
        const idx = mesh.morphTargetDictionary?.['eyeBlinkLeft']
        const idx2 = mesh.morphTargetDictionary?.['eyeBlinkRight']
        if (idx !== undefined) mesh.morphTargetInfluences[idx] = v
        if (idx2 !== undefined) mesh.morphTargetInfluences[idx2] = v
      })
    }
  })
}