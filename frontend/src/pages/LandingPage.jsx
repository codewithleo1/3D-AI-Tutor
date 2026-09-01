import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import AuthPage from "./AuthPage"
import Avatar from "../components/Avatar"
import { useSpeech } from "../hooks/useSpeech"

export default function LandingPage() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [showAuth, setShowAuth] = useState(false)
  const [stats, setStats] = useState({ students: 0, certificates: 0 })
  const { speak, stop, isSpeaking, currentViseme } = useSpeech()
  const [showAvatar, setShowAvatar] = useState(false)
  const [avatarMood, setAvatarMood] = useState("idle")
  
  useEffect(() => {
    // Load avatar after 2 seconds then speak
    const timer = setTimeout(() => {
      setShowAvatar(true)
      setAvatarMood("explaining")
      setTimeout(() => {
        speak("Hi! I'm Miss Nova, your personal AI tutor. I'll build you a custom learning roadmap and teach you every topic one on one. Ready to start?")
      }, 1000)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // If already logged in, go straight to app
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/app")
      } else {
        setChecking(false)
      }
    })
  }, [])

  useEffect(() => {
    // Load public stats
    const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api"
    fetch(`${API}/stats`)
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(() => {})
  }, [])

  if (checking) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div style={{ fontSize: "48px" }} className="animate-spin">⚙️</div>
    </div>
  )

  if (showAuth) return (
    <AuthPage onAuth={() => navigate("/app")} />
  )

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF" }}>

      {/* Nav */}
      <nav style={{
        padding: "16px 40px", display: "flex", alignItems: "center",
        justifyContent: "space-between", borderBottom: "1px solid #F3F4F6",
        position: "sticky", top: 0, background: "white", zIndex: 10
      }}>
        <span style={{ fontSize: "24px", fontWeight: 800 }} className="gradient-text">
          Miss Nova
        </span>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <a href="/admin" style={{
            padding: "10px 20px", borderRadius: "10px", fontWeight: 600,
            fontSize: "14px", background: "#F3F4F6", color: "#6B7280",
            border: "1.5px solid #E5E7EB", cursor: "pointer",
            textDecoration: "none"
          }}>
            🔐 Admin
          </a>
          <button
            onClick={() => setShowAuth(true)}
            style={{
              padding: "10px 20px", borderRadius: "10px", fontWeight: 600,
              fontSize: "14px", background: "#F3F4F6", color: "#374151",
              border: "1.5px solid #E5E7EB", cursor: "pointer"
            }}>
            Log in
          </button>
          <button
            onClick={() => setShowAuth(true)}
            className="btn-primary"
            style={{ fontSize: "14px" }}>
            Start free →
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{
        maxWidth: "900px", margin: "0 auto", padding: "80px 24px 60px",
        textAlign: "center"
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          padding: "6px 16px", borderRadius: "20px", marginBottom: "24px",
          background: "#EDE9FE", border: "1px solid #C4B5FD"
        }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#6D28D9", letterSpacing: "1px" }}>
            🤖 AI-POWERED LEARNING
          </span>
        </div>

        <h1 style={{
          fontSize: "64px", fontWeight: 800, lineHeight: 1.1,
          color: "#111827", marginBottom: "24px",
          fontFamily: "Plus Jakarta Sans, sans-serif"
        }}>
          Learn anything with your<br />
          <span className="gradient-text">personal AI tutor</span>
        </h1>

        <p style={{
          fontSize: "20px", color: "#6B7280", maxWidth: "600px",
          margin: "0 auto 40px", lineHeight: 1.7
        }}>
          Miss Nova builds a personalized learning roadmap for you, then teaches
          every topic one-on-one — with a 3D avatar, voice, quizzes, and certificates.
        </p>

        <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => setShowAuth(true)}
            className="btn-success"
            style={{ fontSize: "18px", padding: "16px 40px" }}>
            Start learning free →
          </button>
          <button
            onClick={() => setShowAuth(true)}
            style={{
              fontSize: "16px", padding: "16px 32px", borderRadius: "14px",
              background: "#F9FAFB", color: "#374151", fontWeight: 600,
              border: "1.5px solid #E5E7EB", cursor: "pointer"
            }}>
            Log in to continue
          </button>
        </div>

        {/* Stats */}
        {(stats.students > 0 || stats.certificates > 0) && (
          <div style={{
            display: "flex", gap: "40px", justifyContent: "center",
            marginTop: "48px"
          }}>
            {[
              { value: stats.students, label: "Learners" },
              { value: stats.certificates, label: "Certificates issued" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <p style={{
                  fontSize: "36px", fontWeight: 800,
                  background: "linear-gradient(135deg, #7C3AED, #10B981)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
                }}>
                  {s.value}+
                </p>
                <p style={{ fontSize: "14px", color: "#6B7280" }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Avatar preview */}
      <div style={{
        background: "linear-gradient(135deg, #F5F3FF, #F0FDF4)",
        padding: "60px 24px", textAlign: "center",
        borderTop: "1px solid #F3F4F6", borderBottom: "1px solid #F3F4F6"
      }}>
        <p style={{ fontSize: "12px", fontWeight: 700, color: "#7C3AED",
          letterSpacing: "2px", marginBottom: "16px" }}>
          MEET YOUR TUTOR
        </p>
        <h2 style={{
          fontSize: "40px", fontWeight: 800, color: "#111827",
          fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: "8px"
        }}>
          Say hello to Miss Nova 👩‍🏫
        </h2>
        <p style={{ color: "#6B7280", fontSize: "16px", marginBottom: "40px" }}>
          A 3D AI tutor who explains, listens, quizzes, and adapts to you
        </p>
        <div style={{
          width: "280px", height: "380px", margin: "0 auto",
          background: "white", borderRadius: "24px",
          border: "2px solid #EDE9FE",
          boxShadow: "0 20px 60px rgba(124,58,237,0.15)",
          overflow: "hidden", position: "relative",
          transition: "all 0.5s ease"
        }}>
          {!showAvatar ? (
            <div style={{
              display: "flex", alignItems: "center",
              justifyContent: "center", height: "100%",
              fontSize: "80px"
            }}>
              👩‍🏫
            </div>
          ) : (
            <div style={{
              width: "100%", height: "100%",
              opacity: showAvatar ? 1 : 0,
              transition: "opacity 0.8s ease"
            }}>
              <Avatar
                mood={avatarMood}
                isSpeaking={isSpeaking}
                currentViseme={currentViseme}
              />
            </div>
          )}
        </div>

        {/* Speaking indicator */}
        {showAvatar && (
          <div style={{ marginTop: "20px", minHeight: "40px" }}>
            {isSpeaking ? (
              <div style={{
                display: "inline-flex", alignItems: "center", gap: "8px",
                padding: "8px 20px", borderRadius: "20px",
                background: "#EDE9FE", border: "1px solid #C4B5FD"
              }}>
                <div style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  background: "#7C3AED", animation: "pulse 1s infinite"
                }} />
                <span style={{ fontSize: "14px", color: "#6D28D9", fontWeight: 600 }}>
                  Miss Nova is speaking...
                </span>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAvatarMood("explaining")
                  speak("Hi! I'm Miss Nova, your personal AI tutor. I'll build you a custom learning roadmap and teach you every topic one on one. Ready to start?")
                }}
                style={{
                  padding: "8px 20px", borderRadius: "20px",
                  background: "#F3F4F6", border: "1.5px solid #E5E7EB",
                  color: "#6B7280", fontWeight: 600, fontSize: "14px",
                  cursor: "pointer"
                }}>
                🔈 Hear from Miss Nova
              </button>
            )}
          </div>
        )}
      </div>

      {/* Features */}
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "80px 24px" }}>
        <p style={{ fontSize: "12px", fontWeight: 700, color: "#7C3AED",
          letterSpacing: "2px", marginBottom: "16px", textAlign: "center" }}>
          EVERYTHING YOU NEED
        </p>
        <h2 style={{
          fontSize: "40px", fontWeight: 800, color: "#111827",
          fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: "48px",
          textAlign: "center"
        }}>
          Not just another course platform
        </h2>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "24px"
        }}>
          {[
            {
              emoji: "🗺️",
              title: "Personalized Roadmap",
              desc: "Answer 4 questions and get a custom curriculum built just for your goal, level, and schedule."
            },
            {
              emoji: "👩‍🏫",
              title: "3D Avatar Tutor",
              desc: "Miss Nova explains every concept with voice, animations, analogies, and live diagrams."
            },
            {
              emoji: "🧠",
              title: "Quiz + Repair System",
              desc: "After each topic, Nova quizzes you. Failed a concept? She re-teaches it from a different angle."
            },
            {
              emoji: "🏆",
              title: "Verified Certificates",
              desc: "Earn a certificate on completion with a QR code. Add it to LinkedIn with one click."
            },
            {
              emoji: "🔥",
              title: "Streak + Spaced Repetition",
              desc: "Build daily habits with streak tracking. Nova reminds you to review topics before you forget."
            },
            {
              emoji: "▶",
              title: "Live Code Runner",
              desc: "Run Python code examples right inside the lesson — no setup needed, powered by Pyodide."
            },
          ].map(f => (
            <div key={f.title} style={{
              background: "#F9FAFB", border: "1.5px solid #E5E7EB",
              borderRadius: "20px", padding: "28px"
            }}>
              <div style={{ fontSize: "36px", marginBottom: "16px" }}>{f.emoji}</div>
              <h3 style={{
                fontSize: "18px", fontWeight: 700, color: "#111827",
                marginBottom: "8px", fontFamily: "Plus Jakarta Sans, sans-serif"
              }}>
                {f.title}
              </h3>
              <p style={{ color: "#6B7280", fontSize: "14px", lineHeight: 1.7 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div style={{
        background: "#F9FAFB", borderTop: "1px solid #F3F4F6",
        borderBottom: "1px solid #F3F4F6", padding: "80px 24px"
      }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: "12px", fontWeight: 700, color: "#7C3AED",
            letterSpacing: "2px", marginBottom: "16px" }}>
            HOW IT WORKS
          </p>
          <h2 style={{
            fontSize: "40px", fontWeight: 800, color: "#111827",
            fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: "48px"
          }}>
            From zero to certified in 3 steps
          </h2>
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", justifyContent: "center" }}>
            {[
              { step: "1", title: "Tell Nova your goal", desc: "Answer 4 quick questions about what you want to learn, your level, and how much time you have." },
              { step: "2", title: "Get your roadmap", desc: "Nova generates a personalized curriculum with modules, topics, and subtopics — tailored to you." },
              { step: "3", title: "Learn with Nova", desc: "Nova teaches each subtopic with voice and visuals, quizzes you, and adapts based on your performance." },
            ].map(s => (
              <div key={s.step} style={{
                flex: "1", minWidth: "200px", textAlign: "center"
              }}>
                <div style={{
                  width: "48px", height: "48px", borderRadius: "50%",
                  background: "linear-gradient(135deg, #7C3AED, #10B981)",
                  color: "white", fontWeight: 800, fontSize: "20px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 16px"
                }}>
                  {s.step}
                </div>
                <h3 style={{
                  fontSize: "18px", fontWeight: 700, color: "#111827",
                  marginBottom: "8px", fontFamily: "Plus Jakarta Sans, sans-serif"
                }}>
                  {s.title}
                </h3>
                <p style={{ color: "#6B7280", fontSize: "14px", lineHeight: 1.7 }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div style={{ padding: "80px 24px", textAlign: "center" }}>
        <h2 style={{
          fontSize: "48px", fontWeight: 800, color: "#111827",
          fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: "16px"
        }}>
          Ready to start learning?
        </h2>
        <p style={{ color: "#6B7280", fontSize: "18px", marginBottom: "40px" }}>
          Free to start. No credit card required.
        </p>
        <button
          onClick={() => setShowAuth(true)}
          className="btn-success"
          style={{ fontSize: "18px", padding: "18px 48px" }}>
          Start learning with Miss Nova →
        </button>
      </div>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid #F3F4F6", padding: "24px 40px",
        display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        <span style={{ fontSize: "14px", color: "#9CA3AF" }}>
          © 2026 Miss Nova — AI Learning Platform
        </span>
        <a href="/admin" style={{
          fontSize: "12px", color: "#D1D5DB",
          textDecoration: "none", fontWeight: 500
        }}>
          Admin
        </a>
      </footer>

    </div>
  )
}