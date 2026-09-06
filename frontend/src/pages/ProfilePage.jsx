import { useState, useEffect } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api"

function formatDate(iso) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  })
}

function timeAgo(iso) {
  if (!iso) return ""
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const VERB_LABELS = {
  completed: { label: "Completed", emoji: "✅" },
  progressed: { label: "Started", emoji: "▶️" },
  passed: { label: "Passed quiz", emoji: "🎉" },
  failed: { label: "Failed quiz", emoji: "💪" },
  answered: { label: "Answered", emoji: "💬" },
  skipped: { label: "Skipped", emoji: "⏭️" },
}

const CONFIDENCE_LABELS = {
  1: { label: "Not sure", emoji: "😕", color: "#EF4444", bg: "#FEF2F2", border: "#FECACA" },
  2: { label: "Got it", emoji: "🙂", color: "#D97706", bg: "#FFF7ED", border: "#FED7AA" },
  3: { label: "Nailed it", emoji: "🚀", color: "#059669", bg: "#F0FDF4", border: "#BBF7D0" },
}

function linkedInUrl(cert) {
  const year = new Date(cert.completed_at).getFullYear()
  const month = new Date(cert.completed_at).getMonth() + 1
  const certUrl = encodeURIComponent(`${window.location.origin}/verify?code=${cert.verify_code}`)
  const name = encodeURIComponent(cert.course_title)
  return `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${name}&organizationName=Miss+Nova&issueYear=${year}&issueMonth=${month}&certUrl=${certUrl}`
}

export default function ProfilePage({ user, onBack }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!user?.id) return
    axios.get(`${API}/profile`, { params: { user_id: user.id } })
      .then(res => setData(res.data))
      .catch(() => setError("Could not load profile. Please try again."))
      .finally(() => setLoading(false))
  }, [user])

  const initial = (user?.user_metadata?.full_name || user?.email || "?")[0].toUpperCase()
  const name = user?.user_metadata?.full_name || user?.email || "Learner"

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center",
      justifyContent: "center", height: "100vh" }}>
      <div style={{ fontSize: "48px" }} className="animate-spin">⚙️</div>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF" }}>

      {/* Nav */}
      <nav style={{
        borderBottom: "1px solid #F3F4F6", height: "60px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px", position: "sticky", top: 0, background: "white", zIndex: 10
      }}>
        <span className="text-2xl font-extrabold gradient-text">Miss Nova</span>
        <button onClick={onBack} style={{
          fontSize: "14px", padding: "8px 16px", borderRadius: "10px",
          background: "#F3F4F6", color: "#6B7280",
          border: "1.5px solid #E5E7EB", cursor: "pointer", fontWeight: 600
        }}>
          ← Back
        </button>
      </nav>

      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "48px 24px" }}>

        {error && (
          <p style={{ color: "#EF4444", marginBottom: "24px" }}>{error}</p>
        )}

        {/* ── HERO ── */}
        <div style={{
          display: "flex", alignItems: "center", gap: "24px",
          marginBottom: "40px", padding: "32px",
          background: "linear-gradient(135deg, #EDE9FE, #F0FDF4)",
          borderRadius: "24px", border: "1.5px solid #C4B5FD"
        }}>
          <div style={{
            width: "80px", height: "80px", borderRadius: "50%",
            background: "linear-gradient(135deg, #7C3AED, #10B981)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "32px", fontWeight: 800, color: "white", flexShrink: 0
          }}>
            {initial}
          </div>
          <div>
            <h1 style={{
              fontSize: "28px", fontWeight: 800, color: "#111827",
              fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: "4px"
            }}>
              {name}
            </h1>
            <p style={{ fontSize: "14px", color: "#6B7280", marginBottom: "4px" }}>
              {user?.email}
            </p>
            <p style={{ fontSize: "13px", color: "#9CA3AF" }}>
              Learning since {formatDate(data?.member_since)}
            </p>
          </div>
        </div>

        {/* ── STATS ROW ── */}
        {data && (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
            gap: "16px", marginBottom: "40px"
          }}>
            {[
              { label: "Topics Done", value: data.total_topics_completed, emoji: "📚" },
              { label: "Current Streak", value: `${data.streak.current} days`, emoji: "🔥" },
              { label: "Best Streak", value: `${data.streak.best} days`, emoji: "⚡" },
              { label: "Certificates", value: data.certificates.length, emoji: "🏆" },
            ].map(stat => (
              <div key={stat.label} style={{
                background: "#F9FAFB", border: "1.5px solid #E5E7EB",
                borderRadius: "16px", padding: "20px", textAlign: "center"
              }}>
                <div style={{ fontSize: "28px", marginBottom: "8px" }}>{stat.emoji}</div>
                <div style={{
                  fontSize: "24px", fontWeight: 800, color: "#111827",
                  fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: "4px"
                }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: "12px", color: "#6B7280", fontWeight: 600 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── CERTIFICATES ── */}
        {data && (
          <div style={{ marginBottom: "40px" }}>
            <h2 style={{
              fontSize: "18px", fontWeight: 700, color: "#111827",
              marginBottom: "16px", fontFamily: "Plus Jakarta Sans, sans-serif"
            }}>
              🏆 Certificates
            </h2>
            {data.certificates.length === 0 ? (
              <div style={{
                padding: "32px", borderRadius: "16px",
                background: "#F9FAFB", border: "1.5px solid #E5E7EB",
                textAlign: "center", color: "#9CA3AF", fontSize: "14px"
              }}>
                Complete a course to earn your first certificate!
              </div>
            ) : (
              data.certificates.map(cert => (
                <div key={cert.verify_code} style={{
                  background: "#F0FDF4", border: "1.5px solid #BBF7D0",
                  borderRadius: "16px", padding: "20px", marginBottom: "12px",
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center", gap: "16px", flexWrap: "wrap"
                }}>
                  <div>
                    <p style={{ fontWeight: 700, color: "#065F46", fontSize: "16px" }}>
                      ✅ {cert.course_title}
                    </p>
                    <p style={{ fontSize: "12px", color: "#047857", marginTop: "4px" }}>
                      Completed {formatDate(cert.completed_at)}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <a
                      href={`${window.location.origin}/verify?code=${cert.verify_code}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: "8px 16px", borderRadius: "10px",
                        background: "#10B981", color: "white",
                        fontWeight: 600, fontSize: "13px",
                        textDecoration: "none"
                      }}>
                      View →
                    </a>
                    <a
                      href={linkedInUrl(cert)}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: "8px 16px", borderRadius: "10px",
                        background: "#0A66C2", color: "white",
                        fontWeight: 600, fontSize: "13px",
                        textDecoration: "none"
                      }}>
                      LinkedIn
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── RECENT ACTIVITY ── */}
        {data && data.activity.length > 0 && (
          <div style={{ marginBottom: "40px" }}>
            <h2 style={{
              fontSize: "18px", fontWeight: 700, color: "#111827",
              marginBottom: "16px", fontFamily: "Plus Jakarta Sans, sans-serif"
            }}>
              📋 Recent Activity
            </h2>
            <div style={{
              background: "#F9FAFB", border: "1.5px solid #E5E7EB",
              borderRadius: "16px", overflow: "hidden"
            }}>
              {data.activity.map((event, i) => {
                const v = VERB_LABELS[event.verb] || { label: event.verb, emoji: "•" }
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: "14px",
                    padding: "14px 20px",
                    borderBottom: i < data.activity.length - 1
                      ? "1px solid #F3F4F6" : "none"
                  }}>
                    <span style={{ fontSize: "18px", flexShrink: 0 }}>{v.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: "14px", fontWeight: 600, color: "#111827",
                        whiteSpace: "nowrap", overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}>
                        {v.label} — {event.object_name}
                      </p>
                      {event.course && (
                        <p style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "2px" }}>
                          {event.course}
                        </p>
                      )}
                    </div>
                    <span style={{
                      fontSize: "12px", color: "#9CA3AF", flexShrink: 0
                    }}>
                      {timeAgo(event.timestamp)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── CONFIDENCE MAP ── */}
        {data && data.confidence.length > 0 && (
          <div style={{ marginBottom: "40px" }}>
            <h2 style={{
              fontSize: "18px", fontWeight: 700, color: "#111827",
              marginBottom: "16px", fontFamily: "Plus Jakarta Sans, sans-serif"
            }}>
              🧠 Topic Confidence
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {data.confidence.map(item => {
                const c = CONFIDENCE_LABELS[item.confidence] || CONFIDENCE_LABELS[1]
                return (
                  <div key={item.topic_key} style={{
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between", gap: "16px",
                    padding: "14px 20px", borderRadius: "14px",
                    background: c.bg, border: `1.5px solid ${c.border}`
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: "14px", fontWeight: 600, color: "#111827",
                        whiteSpace: "nowrap", overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}>
                        {item.topic_title}
                      </p>
                      <p style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>
                        Reviewed {formatDate(item.last_reviewed)}
                        {item.next_review && ` · Review due ${formatDate(item.next_review)}`}
                      </p>
                    </div>
                    <span style={{
                      fontSize: "13px", fontWeight: 700, color: c.color, flexShrink: 0
                    }}>
                      {c.emoji} {c.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}