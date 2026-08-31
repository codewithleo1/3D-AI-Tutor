import { useState, useEffect } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api"

export default function Sidebar({
  roadmap,
  currentModuleIdx,
  currentTopicIdx,
  getTopicState,
  onTopicSelect,
  isOpen,
  onClose,
  userId,
}) {
  const [expandedModules, setExpandedModules] = useState({})
  const [streak, setStreak] = useState({ current_streak: 0, best_streak: 0 })

  useEffect(() => {
    setExpandedModules(prev => ({ ...prev, [currentModuleIdx]: true }))
  }, [currentModuleIdx])

  const [dueTopics, setDueTopics] = useState([])

  useEffect(() => {
    if (!userId) return
    axios.get(`${API}/confidence/due`, { params: { user_id: userId } })
      .then(res => setDueTopics(res.data.due?.map(d => d.topic_key) || []))
      .catch(() => {})
  }, [userId])

  function toggleModule(mi) {
    setExpandedModules(prev => ({ ...prev, [mi]: !prev[mi] }))
  }

  const totalTopics = roadmap.modules.reduce((a, m) => a + m.topics.length, 0)
  const completedCount = roadmap.modules.reduce((a, m, mi) =>
    a + m.topics.filter((_, ti) => getTopicState(mi, ti) === "completed").length, 0)

  const sidebarContent = (
    <div style={{
      width: "280px",
      minWidth: "280px",
      borderRight: "1.5px solid #F3F4F6",
      height: "100%",
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      background: "#FFFFFF",
    }}>

      {/* Close button — mobile only */}
      <div className="sidebar-close-btn"
        style={{ justifyContent: "flex-end", padding: "12px 16px 0" }}>
        <button onClick={onClose} style={{
          background: "#F3F4F6", border: "none", borderRadius: "8px",
          padding: "6px 12px", cursor: "pointer", fontSize: "16px",
          color: "#6B7280", fontWeight: 700,
        }}>
          ✕
        </button>
      </div>

      {/* Module + topic list */}
      <div style={{ flex: 1, padding: "8px 0" }}>
        {roadmap.modules.map((mod, mi) => {
          const isExpanded = expandedModules[mi] ?? false
          const modCompleted = mod.topics.every((_, ti) =>
            getTopicState(mi, ti) === "completed")

          return (
            <div key={mod.id} style={{ marginBottom: "4px" }}>

              {/* Module header */}
              <button onClick={() => toggleModule(mi)} style={{
                width: "100%", textAlign: "left",
                padding: "10px 16px", border: "none",
                background: "none", cursor: "pointer",
                display: "flex", alignItems: "center", gap: "8px",
              }}>
                <span style={{
                  fontSize: "10px", fontWeight: 700,
                  padding: "2px 8px", borderRadius: "20px",
                  color: "white", whiteSpace: "nowrap", flexShrink: 0,
                  background: modCompleted
                    ? "#10B981"
                    : "linear-gradient(135deg, #7C3AED, #10B981)",
                }}>
                  M{mi + 1}
                </span>
                <span style={{
                  fontSize: "13px", fontWeight: 600,
                  color: "#111827", flex: 1, textAlign: "left", lineHeight: 1.3,
                }}>
                  {mod.title}
                </span>
                <span style={{ fontSize: "11px", color: "#9CA3AF", flexShrink: 0 }}>
                  {isExpanded ? "▲" : "▼"}
                </span>
              </button>

              {/* Topics */}
              {isExpanded && (
                <div style={{ paddingBottom: "8px" }}>
                  {mod.topics.map((topic, ti) => {
                    const state = getTopicState(mi, ti)
                    const isCurrent = mi === currentModuleIdx && ti === currentTopicIdx
                    const isClickable = state === "completed" || state === "current" || state === "unlocked"

                    return (
                      <div key={topic.id}>
                        <button
                          onClick={() => {
                            if (isClickable) {
                              onTopicSelect(mi, ti)
                              onClose()
                            }
                          }}
                          title={state === "locked" ? "Complete previous topic first" : ""}
                          style={{
                            width: "100%", textAlign: "left",
                            padding: "8px 16px 8px 28px",
                            border: "none", background: "none",
                            cursor: isClickable ? "pointer" : "not-allowed",
                            display: "flex", alignItems: "flex-start", gap: "8px",
                            borderLeft: isCurrent ? "3px solid #7C3AED" : "3px solid transparent",
                            backgroundColor: isCurrent ? "#FAF5FF" : "transparent",
                            opacity: state === "locked" ? 0.4 : 1,
                            transition: "all 0.15s ease",
                          }}
                          onMouseEnter={e => {
                            if (isClickable && !isCurrent)
                              e.currentTarget.style.backgroundColor = "#F9FAFB"
                          }}
                          onMouseLeave={e => {
                            if (!isCurrent)
                              e.currentTarget.style.backgroundColor = "transparent"
                          }}
                        >
                          <span style={{ fontSize: "13px", flexShrink: 0, marginTop: "1px" }}>
                            {state === "completed" ? "✅" :
                             state === "current"   ? "▶" :
                             state === "unlocked"  ? "○" : "🔒"}
                          </span>
                          <div style={{ flex: 1 }}>
                            <p style={{
                              fontSize: "13px", fontWeight: isCurrent ? 600 : 400,
                              color: isCurrent ? "#7C3AED" : state === "completed" ? "#374151" : "#6B7280",
                              lineHeight: 1.4,
                            }}>
                              {topic.title}
                              {dueTopics.includes(`${mi}-${ti}`) && (
                                <span style={{
                                  marginLeft: "6px", fontSize: "10px", fontWeight: 700,
                                  background: "#FFF7ED", color: "#EA580C",
                                  border: "1px solid #FED7AA", borderRadius: "6px",
                                  padding: "1px 6px",
                                }}>
                                  🔁 Review
                                </span>
                              )}
                            </p>
                            <p style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "2px" }}>
                              {topic.estimated_minutes}m
                            </p>
                          </div>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Bottom stats */}
      <div style={{
        padding: "12px 16px", borderTop: "1.5px solid #F3F4F6",
        fontSize: "12px", color: "#6B7280",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span>✅ {completedCount} of {totalTopics} done</span>
          <span style={{ color: "#7C3AED", fontWeight: 600 }}>
            {Math.round((completedCount / totalTopics) * 100)}%
          </span>
        </div>
        <div style={{
          display: "flex", justifyContent: "space-between",
          padding: "8px 12px", borderRadius: "10px",
          background: streak.current_streak > 0 ? "#FFF7ED" : "#F9FAFB",
          border: `1px solid ${streak.current_streak > 0 ? "#FED7AA" : "#E5E7EB"}`,
        }}>
          <span style={{ fontWeight: 600, color: streak.current_streak > 0 ? "#EA580C" : "#9CA3AF" }}>
            🔥 {streak.current_streak} day streak
          </span>
          <span style={{ color: "#9CA3AF" }}>
            Best: {streak.best_streak}
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop — sticky sidebar */}
      <div className="sidebar-desktop" style={{
        position: "sticky",
        top: "60px",
        height: "calc(100vh - 60px)",
      }}>
        {sidebarContent}
      </div>

      {/* Mobile — overlay + slide-in drawer */}
      {isOpen && (
        <div onClick={onClose} style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.4)",
          zIndex: 40,
        }} />
      )}
      <div className="sidebar-mobile" style={{
        position: "fixed",
        top: 0, left: 0,
        height: "100vh",
        zIndex: 50,
        transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.25s ease",
      }}>
        {sidebarContent}
      </div>
    </>
  )
}