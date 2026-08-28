import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import AvatarController from './AvatarController';

// Drop-in example of how a chat/lesson component would drive Miss Nova.
export default function MissNovaScene() {
  const avatarRef = useRef();

  // Example: TTS via browser speechSynthesis, routed through an <audio>-like
  // element so useLipSync can analyse it. Simplest path for a first pass;
  // swap for ElevenLabs/Azure audio + speakWithVisemes() later for
  // frame-accurate mouth shapes.
  const handleSpeak = async (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    // For amplitude-based lip sync you generally want an actual <audio>
    // element (e.g. a TTS mp3 URL) rather than speechSynthesis directly,
    // since speechSynthesis doesn't expose an AnalyserNode-friendly stream.
    // If your TTS backend returns an audio URL, do this instead:
    //
    // const audioEl = new Audio(ttsAudioUrl);
    // avatarRef.current.speak(audioEl);
    // audioEl.play();

    window.speechSynthesis.speak(utterance);
    avatarRef.current.playAnimation('Talking');
    utterance.onend = () => avatarRef.current.playAnimation('Idle');
  };

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <Canvas camera={{ position: [0, 1.5, 2.5], fov: 35 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 4, 2]} intensity={1.2} />
        <Environment preset="studio" />

        <AvatarController ref={avatarRef} avatarUrl="/models/rpm_test.glb" position={[0, -1.6, 0]} />

        <OrbitControls target={[0, 1, 0]} minDistance={1.5} maxDistance={4} />
      </Canvas>

      <div style={{ position: 'absolute', bottom: 20, left: 20, display: 'flex', gap: 8 }}>
        <button onClick={() => avatarRef.current.playAnimation('GestureExplain')}>Explain</button>
        <button onClick={() => avatarRef.current.playAnimation('GesturePoint')}>Point</button>
        <button onClick={() => avatarRef.current.playAnimation('Happy')}>Happy</button>
        <button onClick={() => avatarRef.current.playAnimation('Thinking')}>Thinking</button>
        <button onClick={() => handleSpeak('Great job! Let\u2019s move on to the next topic.')}>Speak</button>
      </div>
    </div>
  );
}
