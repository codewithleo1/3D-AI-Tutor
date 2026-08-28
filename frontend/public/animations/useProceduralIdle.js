import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

/**
 * Zero-asset "alive" layer: gentle chest breathing + random blinking.
 * Runs every frame on top of (or instead of) a baked Mixamo idle clip —
 * use it as your procedural fallback when no Mixamo clip is loaded, or
 * layer it in alongside the Mixamo idle for extra subtlety (Mixamo idles
 * rarely include blinking).
 *
 * @param {React.MutableRefObject<THREE.Mesh[]>} morphMeshesRef
 * @param {React.MutableRefObject<THREE.Bone>} spineBoneRef - optional, the
 *   Spine2 bone gives the most natural-looking breathing motion
 * @param {object} options
 * @param {boolean} options.enabled - set false to disable (e.g. if you'd
 *   rather rely purely on a baked Mixamo idle clip)
 */
export function useProceduralIdle(morphMeshesRef, spineBoneRef, { enabled = true } = {}) {
  const blinkTimer = useRef(Math.random() * 3 + 2);
  const blinkPhase = useRef(0); // 0 = eyes open, counts down while blinking

  useFrame((state, delta) => {
    if (!enabled) return;
    const t = state.clock.elapsedTime;

    if (spineBoneRef?.current) {
      spineBoneRef.current.rotation.x = Math.sin(t * 0.9) * 0.015;
    }

    blinkTimer.current -= delta;
    if (blinkTimer.current <= 0) {
      blinkPhase.current = 1;
      blinkTimer.current = Math.random() * 4 + 2.5;
    }

    if (blinkPhase.current > 0) {
      blinkPhase.current = Math.max(0, blinkPhase.current - delta * 6);
      const v = Math.sin(blinkPhase.current * Math.PI); // 0 -> 1 -> 0 close/open
      (morphMeshesRef.current || []).forEach((mesh) => {
        const idx = mesh.morphTargetDictionary?.['eyesClosed'];
        if (idx !== undefined) mesh.morphTargetInfluences[idx] = v;
      });
    }
  });
}
