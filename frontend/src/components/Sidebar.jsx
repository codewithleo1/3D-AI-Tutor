import { useState, useEffect } from "react"

export default function Sidebar({
  roadmap,
  currentModuleIdx,
  currentTopicIdx,
  getTopicState,
  onTopicSelect,
}) {
  const [expandedModules, setExpandedModules] = useState({})

  // Auto-expand the current module on load
  useEffect(() => {
    setExpandedModules(prev => ({ ...prev, [currentModuleIdx]: true }))
  }, [currentModuleIdx])

  function toggleModule(mi) {
    setExpandedModules(prev => ({ ...prev, [mi]: !prev[mi] }))
  }

  const totalTopics = roadmap.modules.reduce((a, m) => a + m.topics.length, 0)
  const completedCount = roadmap.modules.reduce((a, m, mi) =>
    a + m.topics.filter((_, ti) => getTopicState(mi, ti) === "completed").length, 0)

  return (
    <div style={{
      width: "280px",
      minWidth: "280px",
      borderRight: "1.5px solid #F3F4F6",
      height: "calc(100vh - 60px)",
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      position: "sticky",
      top: "60px",
    }}>

      {/* Module + topic list */}
      <div style={{ flex: 1, padding: "16px 0" }}>
        {roadmap.modules.map((mod, mi) => {
          const isExpanded = expandedModules[mi] ?? false
          const modCompleted = mod.topics.every((_, ti) =>
            getTopicState(mi, ti) === "completed")

          return (
            <div key={mod.id} style={{ marginBottom: "4px" }}>

              {/* Module header */}
              <button
                onClick={() => toggleModule(mi)}
                style={{
                  width: "100%", textAlign: "left",
                  padding: "10px 16px", border: "none",
                  background: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "8px",
                }}
              >
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
                  color: "#111827", flex: 1, textAlign: "left",
                  lineHeight: 1.3,
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
                      <div key={topic.id} style={{ position: "relative" }}>
                        <button
                          onClick={() => isClickable && onTopicSelect(mi, ti)}
                          title={state === "locked" ? "Complete previous topic first" : ""}
                          style={{
                            width: "100%", textAlign: "left",
                            padding: "8px 16px 8px 28px",
                            border: "none", background: "none",
                            cursor: isClickable ? "pointer" : "not-allowed",
                            display: "flex", alignItems: "flex-start", gap: "8px",
                            borderLeft: isCurrent
                              ? "3px solid #7C3AED"
                              : "3px solid transparent",
                            backgroundColor: isCurrent ? "#FAF5FF" : "transparent",
                            opacity: state === "locked" ? 0.4 : 1,
                            transition: "all 0.15s ease",
                          }}
                          onMouseEnter={e => {
                            if (isClickable && !isCurrent) {
                              e.currentTarget.style.backgroundColor = "#F9FAFB"
                            }
                          }}
                          onMouseLeave={e => {
                            if (!isCurrent) {
                              e.currentTarget.style.backgroundColor = "transparent"
                            }
                          }}
                        >
                          {/* State icon */}
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
                              textDecoration: state === "completed" ? "none" : "none",
                            }}>
                              {topic.title}
                            </p>
                            <p style={{
                              fontSize: "11px", color: "#9CA3AF",
                              marginTop: "2px",
                            }}>
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
        padding: "12px 16px",
        borderTop: "1.5px solid #F3F4F6",
        fontSize: "12px", color: "#6B7280",
        display: "flex", justifyContent: "space-between",
      }}>
        <span>✅ {completedCount} of {totalTopics} done</span>
        <span style={{ color: "#7C3AED", fontWeight: 600 }}>
          {Math.round((completedCount / totalTopics) * 100)}%
        </span>
      </div>
    </div>
  )
}