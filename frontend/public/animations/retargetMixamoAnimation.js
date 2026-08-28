import * as THREE from 'three';

/**
 * Mixamo FBX exports name every track like "mixamorigHips.position" or
 * "mixamorig:Hips.quaternion" depending on the exporter/version. Ready
 * Player Me avatars (and this rpm_test.glb) use the bare bone name
 * instead ("Hips", "Spine", "LeftArm", ...), so we strip the prefix to
 * make each track target the matching bone on the RPM skeleton.
 *
 * @param {THREE.AnimationClip} sourceClip - clip loaded from a Mixamo FBX
 * @param {string} newName - name to give the retargeted clip
 * @param {object} options
 * @param {boolean} options.stripHipPosition - drop the Hips position track
 *   so the avatar doesn't slide/root-motion away from its standing spot.
 *   Set to false for clips that are meant to move the character (e.g. a
 *   walk cycle for a full scene, rather than a stationary tutor).
 */
export function retargetMixamoClip(sourceClip, newName, { stripHipPosition = true } = {}) {
  if (!sourceClip) {
    console.warn(`retargetMixamoClip: no source clip found for "${newName}" — check the FBX file/path.`);
    return new THREE.AnimationClip(newName, 0, []);
  }

  const tracks = sourceClip.tracks
    .map((track) => {
      const cloned = track.clone();
      cloned.name = cloned.name.replace(/^mixamorig:?/, '');
      return cloned;
    })
    .filter((track) => !(stripHipPosition && track.name === 'Hips.position'));

  return new THREE.AnimationClip(newName, sourceClip.duration, tracks);
}
