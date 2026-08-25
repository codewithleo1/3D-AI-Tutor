import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { useLipSync } from '../hooks/useLipSync';
import { useProceduralIdle } from '../hooks/useProceduralIdle';
import { ONE_SHOT_CLIPS } from '../config/animations';

/**
 * Usage:
 *   const avatarRef = useRef();
 *   <AvatarController ref={avatarRef} avatarUrl="/models/rpm_test_animated.glb" position={[0,-1,0]} />
 *
 *   avatarRef.current.playAnimation('GestureExplain')
 *   avatarRef.current.speak(audioEl)          // starts lip sync + resumes to Idle when audio ends
 *   avatarRef.current.playAnimation('Happy')  // one-shot emotion, auto-returns to Idle
 *
 * Loads rpm_test_animated.glb, which has Idle/Talking/GestureExplain/
 * GesturePoint/Happy/Thinking baked directly into it (see bake_animations.py) --
 * no Mixamo FBX or retargeting step needed. If you later want real mocap
 * quality instead of these procedural clips, download Mixamo FBX animations
 * yourself and swap in the retargetMixamoAnimation.js + useFBX approach
 * (kept in this project for that purpose) -- same actions API either way.
 */
const AvatarController = forwardRef(function AvatarController(
  { avatarUrl = '/models/rpm_test_animated.glb', enableProceduralIdle = true, ...props },
  ref
) {
  const group = useRef();
  const { scene, animations } = useGLTF(avatarUrl);
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  const { actions, mixer } = useAnimations(animations, group);

  const [morphMeshes, setMorphMeshes] = useState([]);
  const morphMeshesRef = useRef([]);
  const spineBoneRef = useRef(null);

  useEffect(() => {
    const meshes = [];
    clonedScene.traverse((child) => {
      if (child.isMesh && child.morphTargetDictionary && 'jawOpen' in child.morphTargetDictionary) {
        meshes.push(child);
      }
      if (child.isBone && child.name === 'Spine2') {
        spineBoneRef.current = child;
      }
    });
    setMorphMeshes(meshes);
    morphMeshesRef.current = meshes;
  }, [clonedScene]);

  const { startFromAudioElement, playVisemeSequence, stop: stopLipSync } = useLipSync(morphMeshesRef);
  useProceduralIdle(morphMeshesRef, spineBoneRef, { enabled: enableProceduralIdle });

  const currentActionName = useRef(null);

  const playAnimation = (name, { fadeTime = 0.4 } = {}) => {
    const next = actions[name];
    if (!next) {
      console.warn(`AvatarController: no animation registered as "${name}". Check config/animations.js.`);
      return;
    }
    if (currentActionName.current === name) return;

    const prevName = currentActionName.current;
    const isOneShot = ONE_SHOT_CLIPS.has(name);

    next.reset();
    next.setLoop(isOneShot ? THREE.LoopOnce : THREE.LoopRepeat, isOneShot ? 1 : Infinity);
    next.clampWhenFinished = isOneShot;
    next.fadeIn(fadeTime).play();

    if (prevName && actions[prevName] && prevName !== name) {
      actions[prevName].fadeOut(fadeTime);
    }
    currentActionName.current = name;

    if (isOneShot) {
      const onFinished = (e) => {
        if (e.action === next) {
          mixer.removeEventListener('finished', onFinished);
          playAnimation('Idle', { fadeTime });
        }
      };
      mixer.addEventListener('finished', onFinished);
    }
  };

  useImperativeHandle(ref, () => ({
    playAnimation,
    speak: (audioEl) => {
      playAnimation('Talking');
      startFromAudioElement(audioEl);
      audioEl.addEventListener('ended', () => playAnimation('Idle'), { once: true });
    },
    speakWithVisemes: (audioEl, visemeTimeline) => {
      playAnimation('Talking');
      playVisemeSequence(audioEl, visemeTimeline);
      audioEl.addEventListener('ended', () => playAnimation('Idle'), { once: true });
    },
    stopSpeaking: stopLipSync,
    availableAnimations: () => Object.keys(actions),
  }));

  useEffect(() => {
    if (actions.Idle) playAnimation('Idle', { fadeTime: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions]);

  return (
    <group ref={group} {...props}>
      <primitive object={clonedScene} />
    </group>
  );
});

export default AvatarController;
