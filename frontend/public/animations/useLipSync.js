import { useRef, useEffect, useCallback } from 'react';

/**
 * Drives jawOpen / viseme_aa on every morph-target mesh from the volume of
 * a playing <audio> element. Works with any audio source: browser
 * speechSynthesis routed through an <audio> tag, an ElevenLabs/Azure/etc.
 * TTS mp3, or a prerecorded line.
 *
 * This is amplitude-based (mouth opens with loudness), not true per-phoneme
 * viseme timing. It looks convincing for a tutor avatar and needs zero
 * extra data. If your TTS provider returns phoneme/viseme timestamps
 * (Azure Speech SDK does), swap this for playVisemeSequence() below for
 * frame-accurate mouth shapes instead of just volume-based jaw movement.
 *
 * @param {React.MutableRefObject<THREE.Mesh[]>} morphMeshesRef - ref holding
 *   the array of meshes that have a morphTargetDictionary (collect these
 *   once after the avatar loads, see AvatarController).
 */
export function useLipSync(morphMeshesRef) {
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const rafRef = useRef(null);
  const sourceCacheRef = useRef(new WeakMap());

  const resetMouth = useCallback(() => {
    (morphMeshesRef.current || []).forEach((mesh) => {
      const dict = mesh.morphTargetDictionary;
      if (!dict) return;
      ['jawOpen', 'viseme_aa', 'mouthOpen'].forEach((name) => {
        if (dict[name] !== undefined) mesh.morphTargetInfluences[dict[name]] = 0;
      });
    });
  }, [morphMeshesRef]);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    resetMouth();
  }, [resetMouth]);

  // Amplitude-based lip sync from any HTMLAudioElement.
  const startFromAudioElement = useCallback((audioEl) => {
    if (!audioEl) return;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    if (!sourceCacheRef.current.has(audioEl)) {
      const source = ctx.createMediaElementSource(audioEl);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      sourceCacheRef.current.set(audioEl, analyser);
    }

    const analyser = sourceCacheRef.current.get(audioEl);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyserRef.current = analyser;
    dataArrayRef.current = dataArray;

    const tick = () => {
      analyser.getByteFrequencyData(dataArray);
      const volume = dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255;
      const target = Math.min(volume * 2.2, 1);

      (morphMeshesRef.current || []).forEach((mesh) => {
        const dict = mesh.morphTargetDictionary;
        const infl = mesh.morphTargetInfluences;
        if (!dict) return;
        if (dict['jawOpen'] !== undefined) {
          const current = infl[dict['jawOpen']];
          infl[dict['jawOpen']] = current + (target - current) * 0.4;
          if (dict['viseme_aa'] !== undefined) {
            infl[dict['viseme_aa']] = infl[dict['jawOpen']] * 0.6;
          }
        }
      });

      if (!audioEl.paused && !audioEl.ended) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        stop();
      }
    };
    tick();
  }, [morphMeshesRef, stop]);

  // Frame-accurate alternative: call this instead of startFromAudioElement
  // if you have a viseme timeline like [{ viseme: 'viseme_aa', time: 0.12 }, ...]
  // (e.g. from Azure Speech SDK's viseme events, or Rhubarb Lip Sync output).
  const playVisemeSequence = useCallback((audioEl, visemeTimeline) => {
    if (!audioEl || !visemeTimeline?.length) return;
    let i = 0;
    const tick = () => {
      const t = audioEl.currentTime;
      while (i < visemeTimeline.length - 1 && visemeTimeline[i + 1].time <= t) i += 1;
      const current = visemeTimeline[i]?.viseme;

      (morphMeshesRef.current || []).forEach((mesh) => {
        const dict = mesh.morphTargetDictionary;
        if (!dict) return;
        Object.keys(dict).forEach((name) => {
          if (!name.startsWith('viseme_')) return;
          const target = name === current ? 1 : 0;
          const idx = dict[name];
          mesh.morphTargetInfluences[idx] += (target - mesh.morphTargetInfluences[idx]) * 0.5;
        });
      });

      if (!audioEl.paused && !audioEl.ended) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        stop();
      }
    };
    tick();
  }, [morphMeshesRef, stop]);

  useEffect(() => stop, [stop]);

  return { startFromAudioElement, playVisemeSequence, stop };
}
