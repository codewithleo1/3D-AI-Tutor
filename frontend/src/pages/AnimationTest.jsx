import React, { useRef, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import AvatarController from '../components/AvatarController'

const ANIMATIONS = [
  { name: 'Idle',           emoji: '😐', desc: 'Calm breathing sway — default state' },
  { name: 'Talking',        emoji: '🗣️', desc: 'Head + arm movement while speaking' },
  { name: 'GestureExplain', emoji: '🤚', desc: 'Right arm raises, open-hand explaining' },
  { name: 'GesturePoint',   emoji: '👉', desc: 'Arm extends forward, pointing' },
  { name: 'Happy',          emoji: '🎉', desc: 'Head bounce + arms lift — quiz pass' },
  { name: 'Thinking',       emoji: '🤔', desc: 'Head tilt + hand to chin — loading state' },
]

export default function AnimationTest() {
  const avatarRef = useRef()
  const [active, setActive] = React.useState('Idle')
  const [good, setGood] = React.useState([])
  const [bad, setBad] = React.useState([])

  function play(name) {
    setActive(name)
    console.log("avatarRef:", avatarRef.current)
    console.log("available:", avatarRef.current?.availableAnimations())
    avatarRef.current?.playAnimation(name)
  }

  function markGood(name) {
    setGood(prev => prev.includes(name) ? prev : [...prev, name])
    setBad(prev => prev.filter(n => n !== name))
  }

  function markBad(name) {
    setBad(prev => prev.includes(name) ? prev : [...prev, name])
    setGood(prev => prev.filter(n => n !== name))
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F9FAFB', fontFamily: 'Inter, sans-serif' }}>

      {/* Left — Nova */}
      <div style={{
        width: '420px', minWidth: '420px',
        height: '100vh',
        background: '#FFFFFF', borderRight: '1.5px solid #E5E7EB',
        display: 'flex', flexDirection: 'column'
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1.5px solid #E5E7EB',
          fontWeight: 700, fontSize: '16px', color: '#111827'
        }}>
          🎭 Nova Animation Preview
        </div>
        <div style={{ flex: 1, minHeight: 0, height: '70vh' }}>
          <Canvas
            camera={{ position: [0, 1.6, 3.5], fov: 45 }}
            style={{ width: '100%', height: '100%' }}
            gl={{ preserveDrawingBuffer: true }}
            frameloop="always"
          >
            <ambientLight intensity={1.05} />
            <directionalLight position={[2, 3, 4]} intensity={1.35} />
            <directionalLight position={[-2, 1, 2]} intensity={0.45} />
            <directionalLight position={[0, 2.5, -3]} intensity={0.9} color="#c7d2fe" />
            <OrbitControls target={[0, 1.6, 0]} enableZoom={false} enablePan={false} enableRotate={false} />
            <Suspense fallback={null}>
              <AvatarController
                ref={avatarRef}
                avatarUrl="/rpm_test_animated.glb"
                position={[0, 0, 0]}
                enableProceduralIdle={true}
              />
            </Suspense>
          </Canvas>
        </div>
        <div style={{
          padding: '16px 20px', borderTop: '1.5px solid #E5E7EB',
          textAlign: 'center'
        }}>
          <span style={{
            fontSize: '18px', fontWeight: 800, color: '#7C3AED',
            textTransform: 'uppercase', letterSpacing: '2px'
          }}>
            {active}
          </span>
        </div>
      </div>

      {/* Right — controls */}
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>
          Animation Test Lab
        </h1>
        <p style={{ color: '#6B7280', marginBottom: '32px' }}>
          Click each animation to preview on Nova. Mark good or bad.
        </p>

        {(good.length > 0 || bad.length > 0) && (
          <div style={{
            background: '#F0FDF4', border: '1.5px solid #BBF7D0',
            borderRadius: '12px', padding: '16px', marginBottom: '24px'
          }}>
            {good.length > 0 && (
              <p style={{ fontWeight: 700, color: '#065F46', marginBottom: '4px' }}>
                ✅ Approved: {good.join(', ')}
              </p>
            )}
            {bad.length > 0 && (
              <p style={{ fontWeight: 700, color: '#991B1B' }}>
                ❌ Rejected: {bad.join(', ')}
              </p>
            )}
          </div>
        )}

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '16px'
        }}>
          {ANIMATIONS.map(anim => {
            const isActive = active === anim.name
            const isGood = good.includes(anim.name)
            const isBad = bad.includes(anim.name)
            return (
              <div key={anim.name} style={{
                background: isActive ? '#EDE9FE' : '#FFFFFF',
                border: `1.5px solid ${isActive ? '#7C3AED' : isGood ? '#10B981' : isBad ? '#EF4444' : '#E5E7EB'}`,
                borderRadius: '16px', padding: '20px',
              }}>
                <button
                  onClick={() => play(anim.name)}
                  style={{
                    width: '100%', background: 'none', border: 'none',
                    cursor: 'pointer', textAlign: 'left', marginBottom: '12px', padding: 0
                  }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>{anim.emoji}</div>
                  <p style={{
                    fontWeight: 700, fontSize: '16px',
                    color: isActive ? '#7C3AED' : '#111827',
                    marginBottom: '4px'
                  }}>
                    {anim.name}
                  </p>
                  <p style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.4 }}>
                    {anim.desc}
                  </p>
                </button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => markGood(anim.name)} style={{
                    flex: 1, padding: '8px', borderRadius: '8px',
                    background: isGood ? '#D1FAE5' : '#F3F4F6',
                    border: `1px solid ${isGood ? '#10B981' : '#E5E7EB'}`,
                    cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                    color: isGood ? '#065F46' : '#6B7280'
                  }}>
                    ✅ Good
                  </button>
                  <button onClick={() => markBad(anim.name)} style={{
                    flex: 1, padding: '8px', borderRadius: '8px',
                    background: isBad ? '#FEE2E2' : '#F3F4F6',
                    border: `1px solid ${isBad ? '#EF4444' : '#E5E7EB'}`,
                    cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                    color: isBad ? '#991B1B' : '#6B7280'
                  }}>
                    ❌ Bad
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}