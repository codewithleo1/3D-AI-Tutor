import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { supabase } from "../lib/supabase"

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api"
const MAX_COURSES = 3

function formatDate(iso) {
  if (!iso) return "Never"
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  })
}

function ProgressBar({ value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ marginTop: "8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "12px", color: "#6B7280" }}>{value} topics done</span>
        <span style={{ fontSize: "12px", fontWeight: 700, color: "#7C3AED" }}>{pct}%</span>
      </div>
      <div style={{ background: "#E5E7EB", borderRadius: "4px", height: "6px" }}>
        <div style={{
          height: "6px", borderRadius: "4px",
          background: "linear-gradient(135deg, #7C3AED, #10B981)",
          width: `${pct}%`, transition: "width 0.4s ease"
        }} />
      </div>
    </div>
  )
}

export default function MyCoursesPage({ user, onContinue, onStartNew }) {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!user?.id) return
    axios.get(`${API}/courses/my`, { params: { user_id: user.id } })
      .then(res => setCourses(res.data.courses))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  async function handleDelete(courseId) {
    setDeleting(courseId)
    try {
      await axios.delete(`${API}/courses/${courseId}`, {
        params: { user_id: user.id }
      })
      setCourses(prev => prev.filter(c => c.id !== courseId))
    } catch {
      alert("Could not delete course. Please try again.")
    } finally {
      setDeleting(null)
      setConfirmDelete(null)
    }
  }

  const activeCourses = courses.filter(c => !c.is_completed)
  const completedCourses = courses.filter(c => c.is_completed)
  const canStartNew = activeCourses.length < MAX_COURSES

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "14px", color: "#6B7280" }}>
            {user?.user_metadata?.full_name || user?.email}
          </span>
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              window.location.href = "/"
            }}
            style={{
              fontSize: "13px", padding: "8px 16px", borderRadius: "10px",
              background: "#F3F4F6", color: "#6B7280",
              border: "1.5px solid #E5E7EB", cursor: "pointer", fontWeight: 600
            }}>
            Log out
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "48px 24px" }}>

        {/* Header */}
        <div style={{ marginBottom: "40px" }}>
          <h1 style={{
            fontSize: "40px", fontWeight: 800, color: "#111827",
            fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: "8px"
          }}>
            Welcome back, {user?.user_metadata?.full_name?.split(" ")[0] || "there"} 👋
          </h1>
          <p style={{ color: "#6B7280", fontSize: "16px" }}>
            {activeCourses.length === 0
              ? "Start your first course and begin learning with Miss Nova."
              : `You have ${activeCourses.length} active course${activeCourses.length > 1 ? "s" : ""}. Pick up where you left off.`}
          </p>
        </div>

        {/* Active courses */}
        {activeCourses.length > 0 && (
          <div style={{ marginBottom: "40px" }}>
            <h2 style={{
              fontSize: "18px", fontWeight: 700, color: "#111827",
              marginBottom: "16px", fontFamily: "Plus Jakarta Sans, sans-serif"
            }}>
              📚 Active Courses
            </h2>
            {activeCourses.map(course => (
              <div key={course.id} style={{
                background: "#F9FAFB", border: "1.5px solid #E5E7EB",
                borderRadius: "20px", padding: "24px", marginBottom: "16px",
                position: "relative"
              }}>
                {/* Delete confirm overlay */}
                {confirmDelete === course.id && (
                  <div style={{
                    position: "absolute", inset: 0, background: "rgba(255,255,255,0.95)",
                    borderRadius: "20px", display: "flex", alignItems: "center",
                    justifyContent: "center", flexDirection: "column", gap: "16px", zIndex: 2
                  }}>
                    <p style={{ fontWeight: 700, fontSize: "16px", color: "#111827" }}>
                      Delete this course?
                    </p>
                    <p style={{ fontSize: "14px", color: "#6B7280" }}>
                      Your progress will be lost permanently.
                    </p>
                    <div style={{ display: "flex", gap: "12px" }}>
                      <button
                        onClick={() => handleDelete(course.id)}
                        disabled={deleting === course.id}
                        style={{
                          padding: "10px 24px", borderRadius: "10px",
                          background: "#EF4444", color: "white",
                          border: "none", fontWeight: 700, cursor: "pointer"
                        }}>
                        {deleting === course.id ? "Deleting..." : "Yes, delete"}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        style={{
                          padding: "10px 24px", borderRadius: "10px",
                          background: "#F3F4F6", color: "#374151",
                          border: "1.5px solid #E5E7EB", fontWeight: 600, cursor: "pointer"
                        }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                      <span style={{
                        fontSize: "11px", fontWeight: 700, padding: "3px 10px",
                        borderRadius: "20px", color: "white",
                        background: "linear-gradient(135deg, #7C3AED, #10B981)"
                      }}>
                        {course.level || "Learner"}
                      </span>
                      <span style={{ fontSize: "12px", color: "#9CA3AF" }}>
                        Last studied: {formatDate(course.last_accessed)}
                      </span>
                    </div>
                    <h3 style={{
                      fontSize: "20px", fontWeight: 700, color: "#111827",
                      fontFamily: "Plus Jakarta Sans, sans-serif"
                    }}>
                      {course.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => setConfirmDelete(course.id)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "#D1D5DB", fontSize: "18px", padding: "4px",
                      flexShrink: 0, marginLeft: "12px"
                    }}
                    title="Delete course">
                    🗑
                  </button>
                </div>

                <ProgressBar value={course.completed_topics} max={30} />

                <button
                  onClick={() => onContinue(course)}
                  className="btn-primary"
                  style={{ marginTop: "16px", fontSize: "15px" }}>
                  Continue learning →
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Start new course */}
        <div style={{ marginBottom: "40px" }}>
          <h2 style={{
            fontSize: "18px", fontWeight: 700, color: "#111827",
            marginBottom: "16px", fontFamily: "Plus Jakarta Sans, sans-serif"
          }}>
            ➕ Start New Course
          </h2>
          {canStartNew ? (
            <button
              onClick={onStartNew}
              style={{
                width: "100%", padding: "24px", borderRadius: "20px",
                border: "2px dashed #C4B5FD", background: "#FAF5FF",
                cursor: "pointer", textAlign: "center", transition: "all 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#7C3AED"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "#C4B5FD"}
            >
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>✨</div>
              <p style={{ fontWeight: 700, color: "#7C3AED", fontSize: "16px", marginBottom: "4px" }}>
                Start a new course
              </p>
              <p style={{ color: "#9CA3AF", fontSize: "13px" }}>
                {MAX_COURSES - activeCourses.length} slot{MAX_COURSES - activeCourses.length !== 1 ? "s" : ""} available
              </p>
            </button>
          ) : (
            <div style={{
              padding: "24px", borderRadius: "20px",
              border: "1.5px solid #FED7AA", background: "#FFF7ED",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>⚠️</div>
              <p style={{ fontWeight: 700, color: "#92400E", fontSize: "16px", marginBottom: "4px" }}>
                You have {MAX_COURSES} active courses
              </p>
              <p style={{ color: "#78350F", fontSize: "13px" }}>
                Complete or delete a course to start a new one.
              </p>
            </div>
          )}
        </div>

        {/* Completed courses */}
        {completedCourses.length > 0 && (
          <div>
            <h2 style={{
              fontSize: "18px", fontWeight: 700, color: "#111827",
              marginBottom: "16px", fontFamily: "Plus Jakarta Sans, sans-serif"
            }}>
              🏆 Completed Courses
            </h2>
            {completedCourses.map(course => (
              <div key={course.id} style={{
                background: "#F0FDF4", border: "1.5px solid #BBF7D0",
                borderRadius: "20px", padding: "20px", marginBottom: "12px",
                display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#065F46" }}>
                    ✅ {course.title}
                  </h3>
                  <p style={{ fontSize: "12px", color: "#047857", marginTop: "4px" }}>
                    Completed · {formatDate(course.last_accessed)}
                  </p>
                </div>
                <button
                  onClick={() => onContinue(course)}
                  style={{
                    padding: "8px 16px", borderRadius: "10px",
                    background: "#10B981", color: "white",
                    border: "none", fontWeight: 600, fontSize: "13px",
                    cursor: "pointer"
                  }}>
                  Review →
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}