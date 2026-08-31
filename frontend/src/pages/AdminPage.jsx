import { useState, useEffect } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api"

const VERB_EMOJI = {
  launched: "🚀",
  progressed: "▶",
  completed: "✅",
  skipped: "⏭",
  passed: "🎉",
  failed: "❌",
  answered: "💬",
  rated: "⭐",
}

function formatDuration(seconds) {
  if (!seconds) return "—"
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

function formatDate(iso) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
  })
}

export default function AdminPage() {
  const [password, setPassword] = useState("")
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState("")
  const [dashboard, setDashboard] = useState(null)
  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState("dashboard") // dashboard | students | timeline

  async function handleLogin() {
    setLoading(true)
    setAuthError("")
    try {
      const res = await axios.get(`${API}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${password}` }
      })
      setDashboard(res.data)
      setAuthed(true)
      loadStudents(password)
    } catch {
      setAuthError("Wrong password. Try again.")
    } finally {
      setLoading(false)
    }
  }

  async function loadStudents(pwd) {
    const res = await axios.get(`${API}/admin/students`, {
      headers: { Authorization: `Bearer ${pwd || password}` }
    })
    setStudents(res.data.students)
  }

  async function loadTimeline(student) {
    setSelectedStudent(student)
    setView("timeline")
    const res = await axios.get(`${API}/admin/student/${student.user_id}`, {
      headers: { Authorization: `Bearer ${password}` }
    })
    setTimeline(res.data.timeline)
  }

  if (!authed) {
    return (
      <div style={{
        minHeight: "100vh", background: "#0F0A1E",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <div style={{
          background: "#1A1030", border: "1px solid rgba(167,139,250,0.3)",
          borderRadius: "20px", padding: "48px", width: "360px", textAlign: "center"
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔐</div>
          <h1 style={{ color: "white", fontSize: "24px", fontWeight: 800, marginBottom: "8px" }}>
            Miss Nova Admin
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", marginBottom: "32px" }}>
            Enter admin password to continue
          </p>
          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{
              width: "100%", padding: "12px 16px", borderRadius: "10px",
              border: "1px solid rgba(167,139,250,0.3)", background: "#0F0A1E",
              color: "white", fontSize: "15px", outline: "none",
              marginBottom: "12px", fontFamily: "Inter, sans-serif"
            }}
          />
          {authError && (
            <p style={{ color: "#FF6B6B", fontSize: "13px", marginBottom: "12px" }}>
              {authError}
            </p>
          )}
          <button
            onClick={handleLogin}
            disabled={loading || !password}
            style={{
              width: "100%", padding: "12px", borderRadius: "10px",
              background: "linear-gradient(135deg, #7C3AED, #10B981)",
              color: "white", fontWeight: 700, fontSize: "15px",
              border: "none", cursor: "pointer"
            }}>
            {loading ? "Checking..." : "Enter →"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0F0A1E", color: "white" }}>
      {/* Nav */}
      <nav style={{
        borderBottom: "1px solid rgba(167,139,250,0.2)",
        padding: "16px 32px", display: "flex", alignItems: "center",
        justifyContent: "space-between"
      }}>
        <span style={{ fontSize: "20px", fontWeight: 800, background: "linear-gradient(135deg, #A78BFA, #10B981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Miss Nova Admin
        </span>
        <div style={{ display: "flex", gap: "12px" }}>
          {["dashboard", "students"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "8px 16px", borderRadius: "8px", border: "none",
              background: view === v ? "rgba(124,58,237,0.3)" : "transparent",
              color: view === v ? "#A78BFA" : "rgba(255,255,255,0.5)",
              fontWeight: 600, fontSize: "13px", cursor: "pointer",
              textTransform: "capitalize"
            }}>
              {v === "dashboard" ? "📊 Dashboard" : "👥 Students"}
            </button>
          ))}
        </div>
      </nav>

      <div style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto" }}>

        {/* ── DASHBOARD VIEW ── */}
        {view === "dashboard" && dashboard && (
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "24px" }}>
              Overview
            </h2>

            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "32px" }}>
              {[
                { label: "Total Students", value: dashboard.total_students, emoji: "👥" },
                { label: "Active (7 days)", value: dashboard.active_students_7d, emoji: "🔥" },
                { label: "Certificates", value: dashboard.certificates_issued, emoji: "🏆" },
                { label: "Quiz Pass Rate", value: `${dashboard.quiz_pass_rate}%`, emoji: "🎯" },
                { label: "Avg Topic Time", value: formatDuration(dashboard.avg_topic_time_seconds), emoji: "⏱" },
                { label: "Skip Rate", value: `${dashboard.skip_rate}%`, emoji: "⏭" },
              ].map(stat => (
                <div key={stat.label} style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(167,139,250,0.2)",
                  borderRadius: "16px", padding: "20px"
                }}>
                  <div style={{ fontSize: "28px", marginBottom: "8px" }}>{stat.emoji}</div>
                  <div style={{ fontSize: "28px", fontWeight: 800, color: "#A78BFA" }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Top courses */}
            {dashboard.top_courses?.length > 0 && (
              <div style={{ marginBottom: "32px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px", color: "rgba(255,255,255,0.7)" }}>
                  🎓 Top Courses
                </h3>
                {dashboard.top_courses.map((c, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", padding: "12px 16px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(167,139,250,0.15)",
                    borderRadius: "10px", marginBottom: "8px"
                  }}>
                    <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "14px" }}>
                      {i + 1}. {c.course}
                    </span>
                    <span style={{ color: "#A78BFA", fontWeight: 700, fontSize: "13px" }}>
                      {c.learners} learner{c.learners !== 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Verb breakdown */}
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px", color: "rgba(255,255,255,0.7)" }}>
                📋 Activity Breakdown
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px" }}>
                {Object.entries(dashboard.verb_counts || {}).map(([verb, count]) => (
                  <div key={verb} style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(167,139,250,0.15)",
                    borderRadius: "10px", padding: "12px 16px",
                    display: "flex", justifyContent: "space-between"
                  }}>
                    <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px" }}>
                      {VERB_EMOJI[verb] || "•"} {verb}
                    </span>
                    <span style={{ color: "#A78BFA", fontWeight: 700, fontSize: "13px" }}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STUDENTS VIEW ── */}
        {view === "students" && (
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "24px" }}>
              All Students
            </h2>
            {students.length === 0 ? (
              <p style={{ color: "rgba(255,255,255,0.4)" }}>No students yet.</p>
            ) : (
              students.map(s => (
                <div key={s.user_id} style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(167,139,250,0.2)",
                  borderRadius: "16px", padding: "20px", marginBottom: "12px",
                  cursor: "pointer", transition: "border-color 0.2s"
                }}
                  onClick={() => loadTimeline(s)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(167,139,250,0.5)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(167,139,250,0.2)"}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: "16px", color: "white", marginBottom: "2px" }}>
                        {s.user_name || "Anonymous"}
                      </p>
                      <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>
                        {s.user_email}
                      </p>
                    </div>
                    <span style={{
                      fontSize: "12px", padding: "4px 10px", borderRadius: "20px",
                      background: "rgba(124,58,237,0.2)", color: "#A78BFA", fontWeight: 600
                    }}>
                      View Journey →
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                    {[
                      { label: "Topics done", value: s.topics_completed },
                      { label: "Skipped", value: s.topics_skipped },
                      { label: "Quizzes passed", value: s.quizzes_passed },
                      { label: "Quizzes failed", value: s.quizzes_failed },
                      { label: "Total time", value: `${s.total_minutes}m` },
                      { label: "Last active", value: formatDate(s.last_seen) },
                    ].map(stat => (
                      <div key={stat.label}>
                        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginBottom: "2px" }}>
                          {stat.label}
                        </p>
                        <p style={{ fontSize: "14px", fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>
                          {stat.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── TIMELINE VIEW ── */}
        {view === "timeline" && selectedStudent && (
          <div>
            <button onClick={() => setView("students")} style={{
              background: "none", border: "none", color: "#A78BFA",
              fontWeight: 600, fontSize: "14px", cursor: "pointer",
              marginBottom: "20px", padding: "0"
            }}>
              ← Back to students
            </button>
            <h2 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "4px" }}>
              {selectedStudent.user_name || "Anonymous"}
            </h2>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "14px", marginBottom: "24px" }}>
              {selectedStudent.user_email} · {timeline.length} events recorded
            </p>

            {timeline.length === 0 ? (
              <p style={{ color: "rgba(255,255,255,0.4)" }}>No events yet.</p>
            ) : (
              <div style={{ position: "relative" }}>
                <div style={{
                  position: "absolute", left: "20px", top: 0, bottom: 0,
                  width: "2px", background: "rgba(167,139,250,0.2)"
                }} />
                {timeline.map((event, i) => (
                  <div key={event.id} style={{
                    display: "flex", gap: "16px", marginBottom: "12px",
                    paddingLeft: "8px"
                  }}>
                    <div style={{
                      width: "24px", height: "24px", borderRadius: "50%",
                      background: event.result_success === false ? "#3D1010"
                        : event.verb === "completed" || event.verb === "passed" ? "#0D2E1E"
                        : "#1A1030",
                      border: `2px solid ${
                        event.result_success === false ? "#EF4444"
                        : event.verb === "completed" || event.verb === "passed" ? "#10B981"
                        : "rgba(167,139,250,0.4)"
                      }`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "10px", flexShrink: 0, zIndex: 1, position: "relative"
                    }}>
                      {VERB_EMOJI[event.verb] || "•"}
                    </div>
                    <div style={{
                      flex: 1, background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(167,139,250,0.1)",
                      borderRadius: "10px", padding: "10px 14px"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <span style={{
                            fontSize: "11px", fontWeight: 700, color: "#A78BFA",
                            textTransform: "uppercase", letterSpacing: "1px"
                          }}>
                            {event.verb}
                          </span>
                          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px", marginTop: "2px" }}>
                            {event.object_name}
                          </p>
                          {event.context_module && (
                            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px", marginTop: "2px" }}>
                              {event.context_module}
                              {event.context_subtopic ? ` · ${event.context_subtopic}` : ""}
                            </p>
                          )}
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "12px" }}>
                          {event.result_duration_seconds && (
                            <p style={{ fontSize: "12px", color: "#10B981", fontWeight: 600 }}>
                              ⏱ {formatDuration(event.result_duration_seconds)}
                            </p>
                          )}
                          {event.result_score !== null && event.result_score !== undefined && (
                            <p style={{ fontSize: "12px", color: "#A78BFA" }}>
                              Score: {event.result_score}/3
                            </p>
                          )}
                          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", marginTop: "4px" }}>
                            {formatDate(event.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}