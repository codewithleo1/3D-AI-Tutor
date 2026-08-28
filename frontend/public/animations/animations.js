// Download these from mixamo.com (apply each to the "X Bot" or "Y Bot"
// character, export as FBX -> "Without Skin", no need to re-apply to your
// own model). Drop the files in /public/animations/ using these names,
// or edit the paths below to match whatever you name them.
//
// inPlace: false keeps the Hips position track (use for animations that
// should move the character, e.g. walking). Default (true) strips it so
// gestures/talking/emotions don't shift Miss Nova's position on screen.

export const ANIMATION_CLIPS = [
  { name: 'Idle', file: '/animations/Idle.fbx' },
  { name: 'Talking', file: '/animations/Talking.fbx' },
  { name: 'GestureExplain', file: '/animations/Explaining.fbx' },
  { name: 'GesturePoint', file: '/animations/Pointing.fbx' },
  { name: 'Happy', file: '/animations/Happy_Idle.fbx' },
  { name: 'Thinking', file: '/animations/Thinking.fbx' },
];

// Which clips should loop continuously vs. play once and return to Idle.
export const ONE_SHOT_CLIPS = new Set(['GestureExplain', 'GesturePoint', 'Happy', 'Thinking']);
