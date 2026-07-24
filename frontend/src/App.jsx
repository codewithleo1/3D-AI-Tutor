import { useState, useEffect, useRef } from "react"
import axios from "axios"
import TopicView from "./components/TopicView"
import { useCourseProgress } from "./hooks/useCourseProgress"
import Sidebar from "./components/Sidebar"
import Prerequisites from "./components/Prerequisites"

const API = "http://127.0.0.1:8000/api"

const LEVELS = [
  { label: "Complete beginner", desc: "Starting from zero" },
  { label: "Know the basics", desc: "Dabbled but need structure" },
  { label: "Intermediate", desc: "Know fundamentals, want to go deeper" },
  { label: "Advanced", desc: "Want to fill specific gaps" },
]

const OBJECTIVES = [
  { label: "Get a job", emoji: "💼", desc: "Land a role in this field" },
  { label: "Build a project", emoji: "🚀", desc: "Make something specific" },
  { label: "Academic study", emoji: "🎓", desc: "Exams or coursework" },
  { label: "Just curious", emoji: "✨", desc: "Explore and learn for fun" },
]

function SectionHeader({ number, title, completed, summary }) {
  return (
    <div className="flex items-start gap-4">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5"
        style={{ background: completed ? "#10B981" : "#7C3AED", color: "white" }}
      >
        {completed ? "✓" : number}
      </div>
      <div className="flex-1 text-left">
        <h2 className="text-lg font-bold" style={{ color: "#111827" }}>{title}</h2>
        {completed && summary && (
          <p className="text-sm mt-0.5" style={{ color: "#6B7280" }}>{summary}</p>
        )}
      </div>
      {completed && (
        <span className="text-xs font-medium px-2 py-1 rounded-full shrink-0"
          style={{ background: "#D1FAE5", color: "#065F46" }}>
          Edit
        </span>
      )}
    </div>
  )
}

export default function App() {
  const [goal, setGoal] = useState("")
  const [level, setLevel] = useState("")
  const [hours, setHours] = useState(5)
  const [objective, setObjective] = useState("")
  const [roadmap, setRoadmap] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [finalized, setFinalized] = useState(false)
  const [openSection, setOpenSection] = useState(1)
  const [showPrereqs, setShowPrereqs] = useState(false)

// Teaching mode state
  const [teaching, setTeaching] = useState(false)
  const [currentModuleIdx, setCurrentModuleIdx] = useState(0)
  const [currentTopicIdx, setCurrentTopicIdx] = useState(0)

  const {
    progress,
    initProgress,
    loadFromDb,
    markTopicComplete,
    setLocation,
    getTopicState,
    jumpToTopic,
    clearProgress,
  } = useCourseProgress()

  // Restore from localStorage on app load
  useEffect(() => {
    async function restoreProgress() {
      // 1. Try localStorage first (instant)
      if (progress?.roadmap) {
        setRoadmap(progress.roadmap)
        setCurrentModuleIdx(progress.currentModule)
        setCurrentTopicIdx(progress.currentTopic)
        setFinalized(true)
        setTeaching(true)
        return
      }
      // 2. Fall back to DB (same session ID, cleared localStorage)
      const saved = await loadFromDb()
      if (saved?.roadmap) {
        setRoadmap(saved.roadmap)
        setCurrentModuleIdx(saved.currentModule)
        setCurrentTopicIdx(saved.currentTopic)
        setFinalized(true)
        setTeaching(true)
      }
    }
    restoreProgress()
  }, [])

  const goalDone = goal.trim().length > 0 && openSection > 1
  const levelDone = level !== "" && openSection > 2
  const hoursDone = openSection > 3
  const objectiveDone = objective !== "" && openSection > 4

  const roadmapRef = useRef(null)

  useEffect(() => {
    if (roadmap && roadmapRef.current) {
      roadmapRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [roadmap])

  async function handleBuild() {
    setLoading(true)
    setError("")
    setRoadmap(null)
    setFinalized(false)
    try {
      const res = await axios.post(`${API}/roadmap`, {
        goal, level, hours_per_week: hours, objective,
      })
      setRoadmap(res.data.roadmap)
    } catch {
      setError("Something went wrong. Please try again.")
      setOpenSection(4)
    } finally {
      setLoading(false)
    }
  }

  function removeTopic(modIdx, topicIdx) {
    const updated = { ...roadmap }
    updated.modules[modIdx].topics = updated.modules[modIdx].topics.filter((_, i) => i !== topicIdx)
    setRoadmap({ ...updated })
  }

  function removeModule(modIdx) {
    const updated = { ...roadmap }
    updated.modules = updated.modules.filter((_, i) => i !== modIdx)
    setRoadmap({ ...updated })
  }

  function handleStartOver() {
    setGoal(""); setLevel(""); setHours(5); setObjective("")
    setRoadmap(null); setError(""); setFinalized(false)
    setOpenSection(1); setTeaching(false)
    setCurrentModuleIdx(0); setCurrentTopicIdx(0)
    clearProgress()
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function handleTopicComplete() {
    const mod = roadmap.modules[currentModuleIdx]
    const nextTopicIdx = currentTopicIdx + 1

    // Save completion to localStorage
    markTopicComplete(currentModuleIdx, currentTopicIdx, roadmap)

    if (nextTopicIdx < mod.topics.length) {
      setCurrentTopicIdx(nextTopicIdx)
    } else {
      const nextModuleIdx = currentModuleIdx + 1
      if (nextModuleIdx < roadmap.modules.length) {
        setCurrentModuleIdx(nextModuleIdx)
        setCurrentTopicIdx(0)
      } else {
        setTeaching(false)
        setFinalized(false)
        setRoadmap(null)
        clearProgress()
        alert("🎉 You completed the entire course! Amazing work.")
      }
    }
  }

  function handleTopicSkip() {
    handleTopicComplete()
  }

  // Total topics for progress bar
  const totalTopics = roadmap
    ? roadmap.modules.reduce((a, m) => a + m.topics.length, 0)
    : 0
  const completedTopics = roadmap
    ? roadmap.modules.slice(0, currentModuleIdx).reduce((a, m) => a + m.topics.length, 0) + currentTopicIdx
    : 0
  
  
  // ─── PREREQUISITES SCREEN ────────────────────────────────────
  if (showPrereqs && roadmap && !teaching) {
    return (
      <div className="min-h-screen" style={{ background: "#FFFFFF" }}>
        <nav style={{ borderBottom: "1px solid #F3F4F6", height: "60px" }}
          className="flex items-center justify-between px-8 sticky top-0 bg-white z-10">
          <span className="text-2xl font-extrabold gradient-text">Miss Nova</span>
          <button onClick={() => setShowPrereqs(false)} style={{
            fontSize: "14px", padding: "8px 16px", borderRadius: "10px",
            background: "#F3F4F6", color: "#6B7280", border: "1.5px solid #E5E7EB",
            cursor: "pointer", fontWeight: 600
          }}>
            ← Back
          </button>
        </nav>
        <Prerequisites
          roadmap={roadmap}
          goal={goal}
          level={level}
          onReady={() => {
            setShowPrereqs(false)
            setCurrentModuleIdx(0)
            setCurrentTopicIdx(0)
            setTeaching(true)
          }}
        />
      </div>
    )
  }

  // ─── TEACHING MODE ───────────────────────────────────────────
  if (teaching && roadmap) {
    const mod = roadmap.modules[currentModuleIdx]
    const topic = mod?.topics[currentTopicIdx]

    return (
      <div className="min-h-screen" style={{ background: "#FFFFFF" }}>

        {/* Nav */}
        <nav style={{ borderBottom: "1px solid #F3F4F6", height: "60px" }}
          className="flex items-center justify-between px-8 sticky top-0 bg-white z-10">
          <span className="text-2xl font-extrabold gradient-text">Miss Nova</span>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ fontSize: "13px", color: "#6B7280" }}>
              Topic {completedTopics + 1} of {totalTopics}
            </span>
            <button onClick={() => setTeaching(false)} style={{
              fontSize: "14px", padding: "8px 16px", borderRadius: "10px",
              background: "#F3F4F6", color: "#6B7280", border: "1.5px solid #E5E7EB",
              cursor: "pointer", fontWeight: 600
            }}>
              ← Roadmap
            </button>
          </div>
        </nav>

        {/* Progress bar */}
        <div style={{ background: "#F3F4F6", height: "4px" }}>
          <div style={{
            height: "4px",
            background: "linear-gradient(135deg, #7C3AED, #10B981)",
            width: `${totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0}%`,
            transition: "width 0.5s ease"
          }} />
        </div>

        {/* Sidebar + Content */}
        <div style={{ display: "flex" }}>
          <Sidebar
            roadmap={roadmap}
            currentModuleIdx={currentModuleIdx}
            currentTopicIdx={currentTopicIdx}
            getTopicState={getTopicState}
            onTopicSelect={(mi, ti) => {
              setCurrentModuleIdx(mi)
              setCurrentTopicIdx(ti)
              jumpToTopic(mi, ti)
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            {topic && (
              <TopicView
                topic={topic}
                module={mod}
                course={roadmap}
                level={level}
                onComplete={handleTopicComplete}
                onSkip={handleTopicSkip}
              />
            )}
          </div>
        </div>

      </div>
    )
  }

  // ─── MAIN ONBOARDING + ROADMAP MODE ──────────────────────────
  return (
    <div className="min-h-screen" style={{ background: "#FFFFFF" }}>

      {/* Nav */}
      <nav style={{ borderBottom: "1px solid #F3F4F6" }}
        className="flex items-center justify-between px-8 py-4 sticky top-0 bg-white z-10">
        <span className="text-2xl font-extrabold gradient-text">Miss Nova</span>
        <span className="text-sm font-medium px-3 py-1.5 rounded-full"
          style={{ background: "#F3F4F6", color: "#6B7280" }}>
          AI Learning Companion
        </span>
      </nav>

      <div style={{ maxWidth: "780px", margin: "0 auto", padding: "48px 24px" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{ fontSize: "72px", marginBottom: "20px" }}>👩‍🏫</div>
          <h1 style={{
            fontSize: "48px", fontWeight: 800, lineHeight: 1.2,
            color: "#111827", marginBottom: "16px",
            fontFamily: "Plus Jakarta Sans, sans-serif"
          }}>
            Learn anything<br />
            <span className="gradient-text">your way</span>
          </h1>
          <p style={{
            fontSize: "18px", color: "#6B7280", maxWidth: "480px",
            margin: "0 auto", lineHeight: 1.6
          }}>
            Answer 4 quick questions and Miss Nova will build a personalized learning roadmap just for you.
          </p>
        </div>

        {/* SECTION 1 — Goal */}
        <div
          className={`section-card mb-4 ${openSection === 1 ? "active" : goalDone ? "completed" : "locked"}`}
          onClick={() => goalDone && openSection !== 1 && setOpenSection(1)}
        >
          <SectionHeader number="1" title="What do you want to learn?"
            completed={goalDone} summary={goal} />
          {openSection === 1 && (
            <div className="mt-5">
              <input
                type="text"
                placeholder="e.g. Python, Machine Learning, Guitar, Excel..."
                value={goal}
                onChange={e => setGoal(e.target.value)}
                onKeyDown={e => e.key === "Enter" && goal.trim() && setOpenSection(2)}
                autoFocus
                style={{
                  width: "100%", padding: "14px 16px", borderRadius: "12px",
                  border: `1.5px solid ${goal ? "#7C3AED" : "#E5E7EB"}`,
                  fontSize: "16px", color: "#111827", outline: "none",
                  fontFamily: "Inter, sans-serif", marginBottom: "12px", display: "block"
                }}
              />
              <button className="btn-primary" style={{ width: "100%" }}
                onClick={() => setOpenSection(2)} disabled={!goal.trim()}>
                Continue →
              </button>
            </div>
          )}
        </div>

        {/* SECTION 2 — Level */}
        <div
          className={`section-card mb-4 ${openSection === 2 ? "active" : levelDone ? "completed" : openSection < 2 ? "locked" : ""}`}
          onClick={() => levelDone && openSection !== 2 && setOpenSection(2)}
        >
          <SectionHeader number="2" title="What's your current level?"
            completed={levelDone} summary={level} />
          {openSection === 2 && (
            <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {LEVELS.map(l => (
                <button key={l.label}
                  className={`option-btn ${level === l.label ? "selected" : ""}`}
                  onClick={() => { setLevel(l.label); setOpenSection(3) }}>
                  <p style={{ fontWeight: 600, fontSize: "14px", color: "#111827" }}>{l.label}</p>
                  <p style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>{l.desc}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 3 — Hours */}
        <div
          className={`section-card mb-4 ${openSection === 3 ? "active" : hoursDone ? "completed" : openSection < 3 ? "locked" : ""}`}
          onClick={() => hoursDone && openSection !== 3 && setOpenSection(3)}
        >
          <SectionHeader number="3" title="How many hours per week?"
            completed={hoursDone} summary={`${hours} hours per week`} />
          {openSection === 3 && (
            <div style={{ marginTop: "20px" }}>
              <div style={{ textAlign: "center", marginBottom: "16px" }}>
                <span className="gradient-text" style={{ fontSize: "64px", fontWeight: 800 }}>{hours}</span>
                <span style={{ fontSize: "16px", color: "#6B7280", marginLeft: "8px" }}>hrs / week</span>
              </div>
              <input type="range" min={1} max={20} value={hours}
                onChange={e => setHours(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#7C3AED", marginBottom: "4px" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#9CA3AF", marginBottom: "20px" }}>
                <span>1 hr</span><span>20 hrs</span>
              </div>
              <button className="btn-primary" style={{ width: "100%" }}
                onClick={() => setOpenSection(4)}>
                Continue →
              </button>
            </div>
          )}
        </div>

        {/* SECTION 4 — Objective */}
        <div
          className={`section-card mb-8 ${openSection === 4 ? "active" : objectiveDone ? "completed" : openSection < 4 ? "locked" : ""}`}
          onClick={() => objectiveDone && openSection !== 4 && setOpenSection(4)}
        >
          <SectionHeader number="4" title="What's your goal?"
            completed={objectiveDone} summary={objective} />
          {openSection === 4 && (
            <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {OBJECTIVES.map(o => (
                <button key={o.label}
                  className={`option-btn ${objective === o.label ? "selected" : ""}`}
                  onClick={() => setObjective(o.label)}>
                  <p style={{ fontWeight: 600, fontSize: "14px", color: "#111827" }}>
                    {o.emoji} {o.label}
                  </p>
                  <p style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>{o.desc}</p>
                </button>
              ))}
              {error && <p style={{ color: "#EF4444", fontSize: "14px", marginTop: "8px" }}>{error}</p>}
              <button className="btn-success" style={{ width: "100%", marginTop: "12px" }}
                onClick={() => { setOpenSection(5); handleBuild() }}
                disabled={!objective || loading}>
                {loading ? "Building your roadmap..." : "Build my roadmap ✨"}
              </button>
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{
            textAlign: "center", padding: "64px 24px", borderRadius: "20px",
            background: "#F9FAFB", border: "1.5px solid #E5E7EB", marginBottom: "32px"
          }}>
            <div style={{ fontSize: "48px", display: "inline-block" }} className="animate-spin">⚙️</div>
            <p style={{ fontSize: "20px", fontWeight: 700, color: "#111827", marginTop: "16px" }}>
              Building your roadmap...
            </p>
            <p style={{ fontSize: "14px", color: "#6B7280", marginTop: "4px" }}>
              Personalizing for <span style={{ color: "#7C3AED", fontWeight: 600 }}>{goal}</span>
            </p>
          </div>
        )}

        {/* Roadmap */}
        {roadmap && !loading && (
          <div ref={roadmapRef}>
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "2px", color: "#10B981", marginBottom: "8px" }}>
                YOUR PERSONALIZED ROADMAP
              </p>
              <h2 className="gradient-text" style={{
                fontSize: "40px", fontWeight: 800,
                fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: "8px"
              }}>
                {roadmap.title}
              </h2>
              <p style={{ color: "#6B7280" }}>
                ~{roadmap.estimated_hours} hours · {roadmap.modules.length} modules
              </p>
              {!finalized && (
                <p style={{
                  fontSize: "13px", marginTop: "12px", padding: "8px 16px",
                  borderRadius: "10px", display: "inline-block",
                  background: "#EDE9FE", color: "#6D28D9"
                }}>
                  ✏️ Remove any modules or topics you don't need, then finalize.
                </p>
              )}
            </div>

            {/* Editable modules */}
            {!finalized && roadmap.modules.map((mod, mi) => (
              <div key={mod.id} className="section-card" style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{
                      fontSize: "11px", fontWeight: 700, padding: "6px 12px",
                      borderRadius: "20px", color: "white", whiteSpace: "nowrap",
                      background: "linear-gradient(135deg, #7C3AED, #10B981)"
                    }}>
                      Module {mi + 1}
                    </span>
                    <div style={{ textAlign: "left" }}>
                      <p style={{ fontWeight: 700, color: "#111827" }}>{mod.title}</p>
                      <p style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>{mod.description}</p>
                    </div>
                  </div>
                  <button onClick={() => removeModule(mi)} style={{
                    fontSize: "12px", padding: "6px 12px", borderRadius: "8px",
                    color: "#EF4444", background: "#FEF2F2",
                    border: "1px solid #FECACA", cursor: "pointer", whiteSpace: "nowrap", fontWeight: 500
                  }}>
                    Remove
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {mod.topics.map((topic, ti) => (
                    <div key={topic.id} className="topic-row">
                      <span style={{
                        fontSize: "11px", fontWeight: 700, width: "24px", height: "24px",
                        borderRadius: "50%", display: "flex", alignItems: "center",
                        justifyContent: "center", flexShrink: 0,
                        background: "#EDE9FE", color: "#7C3AED"
                      }}>
                        {ti + 1}
                      </span>
                      <div style={{ flex: 1, textAlign: "left" }}>
                        <p style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>{topic.title}</p>
                        <p style={{ fontSize: "12px", color: "#6B7280" }}>{topic.description}</p>
                      </div>
                      <span style={{ fontSize: "12px", color: "#9CA3AF", flexShrink: 0 }}>
                        {topic.estimated_minutes}m
                      </span>
                      <button onClick={() => removeTopic(mi, ti)} style={{
                        fontSize: "12px", padding: "4px 8px", borderRadius: "6px",
                        color: "#EF4444", background: "#FEF2F2",
                        border: "1px solid #FECACA", cursor: "pointer", fontWeight: 500
                      }}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Finalized modules */}
            {finalized && roadmap.modules.map((mod, mi) => (
              <div key={mod.id} className="section-card"
                style={{ marginBottom: "16px", borderColor: "#D1FAE5" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                  <span style={{
                    fontSize: "11px", fontWeight: 700, padding: "6px 12px",
                    borderRadius: "20px", color: "white",
                    background: "linear-gradient(135deg, #7C3AED, #10B981)"
                  }}>
                    Module {mi + 1}
                  </span>
                  <div style={{ textAlign: "left" }}>
                    <p style={{ fontWeight: 700, color: "#111827" }}>{mod.title}</p>
                    <p style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px" }}>{mod.description}</p>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {mod.topics.map((topic, ti) => (
                    <div key={topic.id} className="topic-row">
                      <span style={{
                        fontSize: "11px", fontWeight: 700, width: "24px", height: "24px",
                        borderRadius: "50%", display: "flex", alignItems: "center",
                        justifyContent: "center", flexShrink: 0,
                        background: "#D1FAE5", color: "#065F46"
                      }}>
                        {ti + 1}
                      </span>
                      <div style={{ flex: 1, textAlign: "left" }}>
                        <p style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>{topic.title}</p>
                        <p style={{ fontSize: "12px", color: "#6B7280" }}>{topic.description}</p>
                      </div>
                      <span style={{ fontSize: "12px", color: "#9CA3AF" }}>
                        {topic.estimated_minutes}m
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
              {!finalized ? (
                <>
                  <button className="btn-success" style={{ flex: 1, fontSize: "16px" }}
                    onClick={async () => {
                      await initProgress(roadmap, goal, level)
                      setFinalized(true)
                    }}>
                    ✅ Finalize Roadmap
                  </button>
                  <button onClick={handleStartOver} style={{
                    padding: "14px 24px", borderRadius: "12px", fontWeight: 600,
                    fontSize: "14px", background: "#F3F4F6", color: "#6B7280",
                    border: "1.5px solid #E5E7EB", cursor: "pointer"
                  }}>
                    Start over
                  </button>
                </>
              ) : (
                <div style={{ width: "100%" }}>
                  <div style={{
                    textAlign: "center", padding: "32px", borderRadius: "20px",
                    background: "#D1FAE5", border: "1.5px solid #6EE7B7", marginBottom: "16px"
                  }}>
                    <div style={{ fontSize: "40px", marginBottom: "8px" }}>🎉</div>
                    <p style={{ fontWeight: 700, fontSize: "20px", color: "#065F46" }}>
                      Roadmap finalized!
                    </p>
                    <p style={{ fontSize: "14px", color: "#047857", marginTop: "4px" }}>
                      Miss Nova is ready to start teaching.
                    </p>
                    <button className="btn-primary" style={{ marginTop: "16px", fontSize: "16px" }}
                      onClick={() => setShowPrereqs(true)}>
                      Start learning →
                    </button>
                  </div>
                  <button onClick={handleStartOver} style={{
                    width: "100%", padding: "14px", borderRadius: "12px",
                    fontWeight: 600, fontSize: "14px", background: "#F3F4F6",
                    color: "#6B7280", border: "1.5px solid #E5E7EB", cursor: "pointer"
                  }}>
                    Start over
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}