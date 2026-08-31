import { useState, useEffect, useRef } from "react"
import axios from "axios"
import Editor from "@monaco-editor/react"

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api"

// ── Pyodide code runner ──────────────────────────────────────
function useCodeRunner() {
  const pyodideRef = useRef(null)
  const loadingRef = useRef(false)
  const [pyReady, setPyReady] = useState(false)

  useEffect(() => {
    if (loadingRef.current || !window.loadPyodide) return
    loadingRef.current = true
    window.loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/" })
      .then(py => {
        pyodideRef.current = py
        setPyReady(true)
      })
      .catch(() => {})
  }, [])

  async function runCode(code) {
    if (!pyodideRef.current) return { output: "", error: "Python not ready yet. Try again in a moment." }
    try {
      let output = ""
      pyodideRef.current.setStdout({ batched: (s) => { output += s + "\n" } })
      pyodideRef.current.setStderr({ batched: (s) => { output += s + "\n" } })
      await pyodideRef.current.runPythonAsync(code)
      return { output: output.trim() || "(no output)", error: "" }
    } catch (err) {
      return { output: "", error: String(err) }
    }
  }

  return { runCode, pyReady }
}

async function fetchDiagram(mermaidCode) {
  try {
    const res = await fetch("https://kroki.io/mermaid/svg", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: mermaidCode,
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

function buildRoadmapOutline(course) {
  if (!course?.modules) return []
  return course.modules.map(mod => ({
    module: mod.title,
    topics: mod.topics.map(t => t.title),
  }))
}

function renderExplanation(text) {
  if (!text) return null
  return text.split("\n\n").map((para, i) => (
    <p key={i} style={{ marginBottom: "14px" }}>
      {para.replace(/_/g, "").replace(/\*\*/g, "").replace(/\*/g, "").replace(/`/g, "")}
    </p>
  ))
}

export default function TopicView({
  topic, module: mod, course, level, topicKey,
  onComplete, onSkip, onMoodChange, speak, stop, isSpeaking
}) {
    const subtopics = topic.subtopics || [topic.title]
    const totalSubtopics = subtopics.length
    const { runCode, pyReady } = useCodeRunner()
    const [codeOutputs, setCodeOutputs] = useState({})
    const [codeRunning, setCodeRunning] = useState({})
    const [confidenceGiven, setConfidenceGiven] = useState(false)
    const [savingConfidence, setSavingConfidence] = useState(false)

  const [currentSubtopicIdx, setCurrentSubtopicIdx] = useState(0)
  const [subtopicHistory, setSubtopicHistory] = useState([])
  const [teaching, setTeaching] = useState(null)
  const [messages, setMessages] = useState([])
  const [followUp, setFollowUp] = useState("")
  const [followUpLoading, setFollowUpLoading] = useState(false)
  const [practice, setPractice] = useState(null)
  const [practiceAnswer, setPracticeAnswer] = useState("")
  const [hintsShown, setHintsShown] = useState(0)
  const [showSolution, setShowSolution] = useState(false)
  const [practiceLoading, setPracticeLoading] = useState(false)
  const [quiz, setQuiz] = useState(null)
  const [answers, setAnswers] = useState({})
  const [quizLoading, setQuizLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState("")
  const [repair, setRepair] = useState(null)
  const [practiceEval, setPracticeEval] = useState(null)
  const [practiceEvalLoading, setPracticeEvalLoading] = useState(false)
  const [phase, setPhase] = useState("loading")
  const [diagramSvg, setDiagramSvg] = useState(null)

  // Reset everything when topic changes
  useEffect(() => {
    setCurrentSubtopicIdx(0)
    setSubtopicHistory([])
    setMessages([])
    setPracticeEval(null)
    setConfidenceGiven(false)
    loadTeaching(0, [])
  }, [topic.id])

 // Speak when new teaching arrives
  useEffect(() => {
    const text = teaching?.explanation || teaching?.answer || ""
    if (!text) return
    const timer = setTimeout(() => speak(text), 100)
    return () => clearTimeout(timer)
  }, [teaching])

    useEffect(() => {
    if (!teaching?.diagram) { setDiagramSvg(null); return }
    fetchDiagram(teaching.diagram.replace(/\\n/g, "\n")).then(setDiagramSvg)
  }, [teaching])

  // Avatar mood
  useEffect(() => {
    if (!onMoodChange) return
    if (phase === "loading") onMoodChange("thinking")
    else if (phase === "teaching") onMoodChange("explaining")
    else if (phase === "practice") onMoodChange("idle")
    else if (phase === "quiz") onMoodChange("quiz")
    else if (phase === "repair") onMoodChange("encouraging")
    else if (phase === "result") {
      onMoodChange(results?.ready_to_advance ? "happy" : "concerned")
    }
  }, [phase, results])

  async function loadTeaching(subtopicIdx, history) {
    setPhase("loading")
    setError("")
    setTeaching(null)

    const currentSubtopic = subtopics[subtopicIdx] || topic.title
    const roadmapOutline = buildRoadmapOutline(course)

    try {
      const res = await axios.post(`${API}/teach`, {
        topic_title: topic.title,
        topic_description: topic.description || "",
        module_title: mod.title,
        course_title: course.title,
        conversation_history: history,
        current_subtopic: currentSubtopic,
        subtopic_index: subtopicIdx,
        total_subtopics: totalSubtopics,
        roadmap_outline: roadmapOutline,
        all_subtopics: subtopics,
      })
      const data = res.data.response
      setTeaching(data)
      if (history.length === 0) {
        // Fresh subtopic — start new message thread
        setMessages([{ role: "nova", data }])
      } else {
        setMessages(prev => [...prev, { role: "nova", data }])
      }
      setPhase("teaching")
    } catch {
      setError("Miss Nova had trouble loading this topic. Please try again.")
      setPhase("teaching")
    }
  }

  async function handleFollowUp() {
    if (!followUp.trim()) return
    setFollowUpLoading(true)

    const userText = followUp
    setFollowUp("")

    const newHistory = [
      ...subtopicHistory,
      { role: "assistant", content: teaching?.explanation || teaching?.answer || "" },
      { role: "user", content: userText },
    ]
    setSubtopicHistory(newHistory)
    setMessages(prev => [...prev, { role: "user", text: userText }])

    const currentSubtopic = subtopics[currentSubtopicIdx] || topic.title
    const roadmapOutline = buildRoadmapOutline(course)

    try {
      const res = await axios.post(`${API}/teach`, {
        topic_title: topic.title,
        topic_description: topic.description || "",
        module_title: mod.title,
        course_title: course.title,
        conversation_history: newHistory,
        current_subtopic: currentSubtopic,
        subtopic_index: currentSubtopicIdx,
        total_subtopics: totalSubtopics,
        roadmap_outline: roadmapOutline,
        all_subtopics: subtopics,
      })
      const data = res.data.response
      setTeaching(data)
      setMessages(prev => [...prev, { role: "nova", data }])
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setFollowUpLoading(false)
    }
  }

  async function handleExplainDifferently() {
    setFollowUpLoading(true)
    const message = "Can you explain this differently? Use a different analogy or approach."

    const newHistory = [
      ...subtopicHistory,
      { role: "assistant", content: teaching?.explanation || teaching?.answer || "" },
      { role: "user", content: message },
    ]
    setSubtopicHistory(newHistory)
    setMessages(prev => [...prev, { role: "user", text: "Can you explain this differently?" }])

    const currentSubtopic = subtopics[currentSubtopicIdx] || topic.title
    const roadmapOutline = buildRoadmapOutline(course)

    try {
      const res = await axios.post(`${API}/teach`, {
        topic_title: topic.title,
        topic_description: topic.description || "",
        module_title: mod.title,
        course_title: course.title,
        conversation_history: newHistory,
        current_subtopic: currentSubtopic,
        subtopic_index: currentSubtopicIdx,
        total_subtopics: totalSubtopics,
        roadmap_outline: roadmapOutline,
        all_subtopics: subtopics,
      })
      const data = res.data.response
      setTeaching(data)
      setMessages(prev => [...prev, { role: "nova", data }])
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setFollowUpLoading(false)
    }
  }

  function nextSubtopic() {
    const nextIdx = currentSubtopicIdx + 1
    if (nextIdx >= totalSubtopics) {
      // All subtopics done — go to practice
      loadPractice()
    } else {
      setCurrentSubtopicIdx(nextIdx)
      setSubtopicHistory([])
      setMessages([])
      loadTeaching(nextIdx, [])
    }
  }

  async function loadPractice() {
    setPracticeLoading(true)
    setPracticeEval(null)
    setPhase("loading")
    try {
      const res = await axios.post(`${API}/practice`, {
        topic_title: topic.title,
        topic_description: topic.description || "",
        module_title: mod.title,
        course_title: course.title,
        level: level || "beginner",
      })
      setPractice(res.data.practice)
      setPracticeAnswer("")
      setHintsShown(0)
      setShowSolution(false)
      setPhase("practice")
    } catch {
      await loadQuiz()
    } finally {
      setPracticeLoading(false)
    }
  }

  async function submitPractice() {
    if (!practiceAnswer.trim()) return
    setPracticeEvalLoading(true)
    try {
      const res = await axios.post(`${API}/practice/evaluate`, {
        topic_title: topic.title,
        exercise: practice.exercise,
        expected_output: practice.expected_output || "",
        student_answer: practiceAnswer,
      })
      setPracticeEval(res.data.evaluation)
    } catch {
      setError("Couldn't evaluate your answer. You can still proceed to the quiz.")
    } finally {
      setPracticeEvalLoading(false)
    }
  }

  async function loadQuiz() {
    setPhase("loading")
    try {
      const res = await axios.post(`${API}/quiz/generate`, {
        topic_title: topic.title,
        topic_description: topic.description || "",
      })
      setQuiz(res.data.quiz)
      setAnswers({})
      setPhase("quiz")
    } catch {
      setError("Failed to load quiz. Please try again.")
      setPhase("teaching")
    }
  }

  async function handleSubmitQuiz() {
    setQuizLoading(true)
    const answerList = quiz.questions.map(q => ({
      question_id: q.id,
      answer: answers[q.id] || "",
    }))
    try {
      const res = await axios.post(`${API}/quiz/evaluate`, {
        topic_title: topic.title,
        questions: quiz.questions,
        answers: answerList,
      })
      setResults(res.data.results)
      setPhase("result")
    } catch {
      setError("Failed to evaluate quiz. Please try again.")
    } finally {
      setQuizLoading(false)
    }
  }

  async function loadRepair() {
    setPhase("loading")
    try {
      const res = await axios.post(`${API}/repair`, {
        topic_title: topic.title,
        failed_concepts: results.failed_concepts || [],
      })
      setRepair(res.data.repair)
      setPhase("repair")
    } catch (err) {
      setPhase("result")
      setError("Couldn't load repair: " + err.message)
    }
  }

  // Phase indicator
  const phases = ["teaching", "practice", "quiz", "result"]
  const phaseLabels = ["Learn", "Practice", "Quiz", "Result"]
  const displayPhase = phase === "repair" ? "result" : phase
  const currentPhaseIdx = phases.indexOf(displayPhase)

  return (
    <div style={{ maxWidth: "780px", margin: "0 auto", padding: "32px 24px" }}>

      {/* Topic header */}
      <div style={{ marginBottom: "24px" }}>
        <p style={{ fontSize: "12px", fontWeight: 700, color: "#7C3AED",
          letterSpacing: "1px", marginBottom: "6px" }}>
          {course.title} · {mod.title}
        </p>
        <h1 style={{ fontSize: "32px", fontWeight: 800, color: "#111827",
          marginBottom: "8px", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
          {topic.title}
        </h1>
        <p style={{ color: "#6B7280", fontSize: "15px" }}>{topic.description}</p>
      </div>

      {/* Phase indicator */}
      {phase !== "loading" && (
        <div style={{ display: "flex", alignItems: "center", marginBottom: "24px" }}>
          {phases.map((p, i) => (
            <div key={p} style={{ display: "flex", alignItems: "center", flex: 1 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                <div style={{
                  width: "28px", height: "28px", borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "12px", fontWeight: 700,
                  background: i < currentPhaseIdx ? "#10B981"
                    : i === currentPhaseIdx ? "#7C3AED" : "#E5E7EB",
                  color: i <= currentPhaseIdx ? "white" : "#9CA3AF",
                  transition: "all 0.3s"
                }}>
                  {i < currentPhaseIdx ? "✓" : i + 1}
                </div>
                <span style={{
                  fontSize: "11px", marginTop: "4px", fontWeight: 600,
                  color: i === currentPhaseIdx ? "#7C3AED"
                    : i < currentPhaseIdx ? "#10B981" : "#9CA3AF"
                }}>
                  {phaseLabels[i]}
                </span>
              </div>
              {i < phases.length - 1 && (
                <div style={{
                  height: "2px", flex: 1, marginBottom: "16px",
                  background: i < currentPhaseIdx ? "#10B981" : "#E5E7EB",
                  transition: "background 0.3s"
                }} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Subtopic progress bar — only in teaching phase */}
      {phase === "teaching" && totalSubtopics > 1 && (
        <div style={{
          background: "#F3F4F6", borderRadius: "12px",
          padding: "12px 16px", marginBottom: "20px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between",
            alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#7C3AED" }}>
              Subtopic {currentSubtopicIdx + 1} of {totalSubtopics}
            </span>
            <span style={{ fontSize: "12px", color: "#6B7280" }}>
              {subtopics[currentSubtopicIdx]}
            </span>
          </div>
          <div style={{ background: "#E5E7EB", borderRadius: "4px", height: "4px" }}>
            <div style={{
              height: "4px", borderRadius: "4px",
              background: "linear-gradient(135deg, #7C3AED, #10B981)",
              width: `${((currentSubtopicIdx + 1) / totalSubtopics) * 100}%`,
              transition: "width 0.4s ease"
            }} />
          </div>
          {/* Subtopic dots */}
          <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
            {subtopics.map((st, i) => (
              <div key={i} title={st} style={{
                flex: 1, height: "4px", borderRadius: "4px",
                background: i < currentSubtopicIdx ? "#10B981"
                  : i === currentSubtopicIdx ? "#7C3AED" : "#E5E7EB",
                transition: "background 0.3s"
              }} />
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {phase === "loading" && (
        <div style={{ textAlign: "center", padding: "64px 0" }}>
          <div style={{ fontSize: "48px", display: "inline-block" }}
            className="animate-spin">⚙️</div>
          <p style={{ color: "#6B7280", marginTop: "16px", fontSize: "16px" }}>
            Miss Nova is preparing...
          </p>
        </div>
      )}

      {/* ── TEACHING PHASE ── */}
      {phase === "teaching" && teaching && (
        <div>
          {messages.map((msg, idx) => (
            <div key={idx}>
              {msg.role === "nova" && (
                <div>
                  <div style={{
                    background: "#F9FAFB", border: "1.5px solid #E5E7EB",
                    borderRadius: "20px", padding: "28px", marginBottom: "16px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px",
                      marginBottom: "16px" }}>
                      <span style={{ fontSize: "28px" }}>👩‍🏫</span>
                      <span style={{ fontWeight: 700, color: "#111827", fontSize: "16px" }}>
                        Miss Nova
                      </span>
                      <button
                        onClick={() => isSpeaking
                          ? stop()
                          : speak((msg.data.explanation || msg.data.answer || "").replace(/_/g, ""))}
                        style={{
                          marginLeft: "auto",
                          background: isSpeaking ? "#EDE9FE" : "#F3F4F6",
                          border: `1.5px solid ${isSpeaking ? "#C4B5FD" : "#E5E7EB"}`,
                          borderRadius: "8px", padding: "4px 10px", cursor: "pointer",
                          fontSize: "14px", color: isSpeaking ? "#7C3AED" : "#6B7280"
                        }}>
                        {isSpeaking ? "🔊 Speaking..." : "🔈 Replay"}
                      </button>
                    </div>
                    <div style={{ color: "#374151", lineHeight: 1.8, fontSize: "15px" }}>
                      {renderExplanation(msg.data.explanation || msg.data.answer || "")}
                    </div>
                  </div>

                  {/* Diagram — only when Nova decides it helps */}
                  {msg.data.diagram && diagramSvg && (
                    <div style={{
                      background: "#F8FAFF", border: "1.5px solid #C4B5FD",
                      borderRadius: "20px", padding: "24px", marginBottom: "16px"
                    }}>
                      <p style={{ fontSize: "12px", fontWeight: 700, color: "#7C3AED",
                        letterSpacing: "1px", marginBottom: "16px" }}>
                        📊 DIAGRAM
                      </p>
                      <div
                        dangerouslySetInnerHTML={{ __html: diagramSvg }}
                        style={{ width: "100%", overflowX: "auto" }}
                      />
                    </div>
                  )}

                  {/* Analogy */}
                  {msg.data.example_text && (
                    <div style={{
                      background: "#EDE9FE", border: "1.5px solid #C4B5FD",
                      borderRadius: "20px", padding: "24px", marginBottom: "16px"
                    }}>
                      <p style={{ fontSize: "12px", fontWeight: 700, color: "#7C3AED",
                        letterSpacing: "1px", marginBottom: "10px" }}>
                        💡 ANALOGY
                      </p>
                      <p style={{ color: "#4C1D95", lineHeight: 1.7, fontSize: "15px" }}>
                        {msg.data.example_text}
                      </p>
                    </div>
                  )}

                  {/* Code */}
                  {msg.data.code && msg.data.code.trim() !== "" && (() => {
                    const codeKey = `${idx}`
                    const lang = msg.data.code_language || "python"
                    const codeVal = msg.data.code.replace(/\\n/g, "\n")
                    const out = codeOutputs[codeKey]
                    const running = codeRunning[codeKey]
                    const isPython = lang === "python"
                    return (
                      <div style={{ marginBottom: "16px", borderRadius: "16px",
                        overflow: "hidden", border: "1.5px solid #E5E7EB" }}>
                        <div style={{ background: "#1E1E1E", padding: "10px 16px",
                          display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ color: "#9CA3AF", fontSize: "12px", fontWeight: 600 }}>
                            {lang.toUpperCase()}
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ color: "#6B7280", fontSize: "11px" }}>
                              Miss Nova's example
                            </span>
                            {isPython && (
                              <button
                                onClick={async () => {
                                  setCodeRunning(prev => ({ ...prev, [codeKey]: true }))
                                  setCodeOutputs(prev => ({ ...prev, [codeKey]: null }))
                                  const result = await runCode(codeVal)
                                  setCodeOutputs(prev => ({ ...prev, [codeKey]: result }))
                                  setCodeRunning(prev => ({ ...prev, [codeKey]: false }))
                                }}
                                disabled={running || !pyReady}
                                style={{
                                  background: pyReady ? "#10B981" : "#6B7280",
                                  color: "white", border: "none", borderRadius: "6px",
                                  padding: "4px 12px", fontSize: "12px", fontWeight: 700,
                                  cursor: pyReady ? "pointer" : "not-allowed",
                                  opacity: running ? 0.6 : 1,
                                }}>
                                {running ? "Running..." : pyReady ? "▶ Run" : "Loading..."}
                              </button>
                            )}
                          </div>
                        </div>
                        <Editor
                          height="200px"
                          language={lang}
                          value={codeVal}
                          theme="vs-dark"
                          options={{
                            readOnly: true, minimap: { enabled: false },
                            fontSize: 14, lineNumbers: "on",
                            scrollBeyondLastLine: false, wordWrap: "on",
                          }}
                        />
                        {out && (
                          <div style={{
                            background: out.error ? "#1a0000" : "#0d1117",
                            padding: "12px 16px", fontFamily: "JetBrains Mono, monospace",
                            fontSize: "13px", lineHeight: 1.6, whiteSpace: "pre-wrap",
                            color: out.error ? "#FF6B6B" : "#A8FF78",
                            borderTop: "1px solid #333",
                          }}>
                            <span style={{ color: "#6B7280", fontSize: "11px",
                              display: "block", marginBottom: "4px" }}>
                              OUTPUT
                            </span>
                            {out.error || out.output}
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* Check in */}
                  {msg.data.check_in && (
                    <div style={{
                      background: "#F0FDF4", border: "1.5px solid #BBF7D0",
                      borderRadius: "16px", padding: "20px", marginBottom: "16px"
                    }}>
                      <p style={{ color: "#166534", fontSize: "15px" }}>
                        🤔 {msg.data.check_in}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {msg.role === "user" && (
                <div style={{ display: "flex", justifyContent: "flex-end",
                  marginBottom: "16px" }}>
                  <div style={{
                    background: "#7C3AED", color: "white",
                    borderRadius: "16px 16px 4px 16px",
                    padding: "12px 18px", maxWidth: "70%",
                    fontSize: "14px", lineHeight: 1.6
                  }}>
                    {msg.text}
                  </div>
                </div>
              )}
            </div>
          ))}

          {error && (
            <p style={{ color: "#EF4444", marginBottom: "16px" }}>{error}</p>
          )}

          {/* Action row */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
            <button
              onClick={handleExplainDifferently}
              disabled={followUpLoading}
              style={{
                padding: "10px 18px", borderRadius: "10px", fontWeight: 600,
                fontSize: "13px", background: "#EDE9FE", color: "#6D28D9",
                border: "1.5px solid #C4B5FD", cursor: "pointer",
                opacity: followUpLoading ? 0.5 : 1
              }}>
              🔄 Explain differently
            </button>
          </div>

          {/* Follow-up input */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            <input
              type="text"
              placeholder="Ask Miss Nova a question about this..."
              value={followUp}
              onChange={e => setFollowUp(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleFollowUp()}
              style={{
                flex: 1, padding: "12px 16px", borderRadius: "12px",
                border: "1.5px solid #E5E7EB", fontSize: "14px",
                color: "#111827", outline: "none", fontFamily: "Inter, sans-serif"
              }}
            />
            <button onClick={handleFollowUp}
              disabled={!followUp.trim() || followUpLoading}
              style={{
                padding: "12px 20px", borderRadius: "12px", border: "none",
                background: "#7C3AED", color: "white", fontWeight: 600,
                cursor: "pointer", fontSize: "14px",
                opacity: followUp.trim() ? 1 : 0.4
              }}>
              {followUpLoading ? "..." : "Ask"}
            </button>
          </div>

          {/* Confidence rating — last subtopic only */}
          {currentSubtopicIdx === totalSubtopics - 1 && !confidenceGiven && (
            <div style={{
              background: "#F9FAFB", border: "1.5px solid #E5E7EB",
              borderRadius: "16px", padding: "20px", marginBottom: "16px"
            }}>
              <p style={{ fontWeight: 700, color: "#111827", fontSize: "14px",
                marginBottom: "14px", textAlign: "center" }}>
                How confident do you feel about this topic?
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                {[
                  { label: "😕 Not sure", value: 1, color: "#EF4444", bg: "#FEF2F2", border: "#FECACA" },
                  { label: "🙂 Got it", value: 2, color: "#D97706", bg: "#FFF7ED", border: "#FED7AA" },
                  { label: "🚀 Nailed it", value: 3, color: "#059669", bg: "#F0FDF4", border: "#BBF7D0" },
                ].map(opt => (
                  <button
                    key={opt.value}
                    disabled={savingConfidence}
                    onClick={async () => {
                      setSavingConfidence(true)
                      const key = topicKey || `${topic.id}`
                      try {
                        await axios.post(`${API}/confidence/save`, {
                          user_id: window.__userId || "",
                          topic_key: key,
                          topic_title: topic.title,
                          confidence: opt.value,
                        })
                      } catch { /* silently fail */ }
                      setConfidenceGiven(true)
                      setSavingConfidence(false)
                      nextSubtopic()
                    }}
                    style={{
                      flex: 1, padding: "12px 8px", borderRadius: "12px",
                      border: `1.5px solid ${opt.border}`,
                      background: opt.bg, color: opt.color,
                      fontWeight: 700, fontSize: "13px", cursor: "pointer",
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subtopic navigation */}
          <div style={{ display: "flex", gap: "10px" }}>
            {(currentSubtopicIdx < totalSubtopics - 1 || confidenceGiven) && (
              <button
                className="btn-success"
                style={{ flex: 1, fontSize: "15px" }}
                onClick={nextSubtopic}
                disabled={followUpLoading}>
                {currentSubtopicIdx < totalSubtopics - 1
                  ? `Got it — Next: ${subtopics[currentSubtopicIdx + 1]} →`
                  : "I understand — Let's practice ✏️"}
              </button>
            )}
            <button onClick={onSkip} style={{
              padding: "14px 20px", borderRadius: "12px", fontWeight: 600,
              fontSize: "14px", background: "#F3F4F6", color: "#6B7280",
              border: "1.5px solid #E5E7EB", cursor: "pointer"
            }}>
              Skip topic
            </button>
          </div>
        </div>
      )}

      {/* ── PRACTICE PHASE ── */}
      {phase === "practice" && practice && (
        <div>
          <div style={{
            background: "#EDE9FE", border: "1.5px solid #C4B5FD",
            borderRadius: "20px", padding: "24px", marginBottom: "24px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px",
              marginBottom: "12px" }}>
              <span style={{ fontSize: "24px" }}>✏️</span>
              <span style={{ fontWeight: 700, color: "#4C1D95", fontSize: "16px" }}>
                Your turn — Try it yourself
              </span>
            </div>
            <p style={{ color: "#4C1D95", fontSize: "15px", lineHeight: 1.7 }}>
              {practice.exercise}
            </p>
            {practice.expected_output && (
              <p style={{ color: "#6D28D9", fontSize: "13px", marginTop: "10px",
                fontStyle: "italic" }}>
                Expected: {practice.expected_output}
              </p>
            )}
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#374151",
              display: "block", marginBottom: "8px" }}>
              Your answer:
            </label>
            <textarea
              placeholder="Write your answer or code here..."
              value={practiceAnswer}
              onChange={e => setPracticeAnswer(e.target.value)}
              rows={6}
              style={{
                width: "100%", padding: "14px 16px", borderRadius: "14px",
                border: "1.5px solid #E5E7EB", fontSize: "14px", color: "#111827",
                outline: "none", fontFamily: "JetBrains Mono, monospace",
                resize: "vertical", lineHeight: 1.6, background: "#F9FAFB"
              }}
            />
          </div>

          {/* Hints */}
          {practice.hints && hintsShown > 0 && (
            <div style={{ marginBottom: "12px" }}>
              {practice.hints.slice(0, hintsShown).map((hint, i) => (
                <div key={i} style={{
                  background: "#FFF7ED", border: "1.5px solid #FED7AA",
                  borderRadius: "12px", padding: "12px 16px", marginBottom: "8px",
                  display: "flex", gap: "10px"
                }}>
                  <span>💡</span>
                  <p style={{ color: "#92400E", fontSize: "14px", lineHeight: 1.6 }}>
                    <strong>Hint {i + 1}:</strong> {hint}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
            {practice.hints && hintsShown < practice.hints.length && (
              <button onClick={() => setHintsShown(h => h + 1)} style={{
                padding: "10px 18px", borderRadius: "10px", fontWeight: 600,
                fontSize: "13px", background: "#FFF7ED", color: "#92400E",
                border: "1.5px solid #FED7AA", cursor: "pointer"
              }}>
                💡 Show hint ({hintsShown}/{practice.hints.length})
              </button>
            )}
            <button onClick={() => setShowSolution(!showSolution)} style={{
              padding: "10px 18px", borderRadius: "10px", fontWeight: 600,
              fontSize: "13px", background: "#F3F4F6", color: "#6B7280",
              border: "1.5px solid #E5E7EB", cursor: "pointer"
            }}>
              {showSolution ? "Hide solution" : "See solution"}
            </button>
          </div>

          {showSolution && (
            <div style={{
              background: "#F0FDF4", border: "1.5px solid #BBF7D0",
              borderRadius: "16px", padding: "20px", marginBottom: "16px"
            }}>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "#065F46",
                letterSpacing: "1px", marginBottom: "10px" }}>
                ✅ SOLUTION
              </p>
              <p style={{ color: "#166534", fontSize: "14px", lineHeight: 1.7,
                fontFamily: "JetBrains Mono, monospace", whiteSpace: "pre-wrap" }}>
                {practice.solution}
              </p>
            </div>
          )}

          {practiceEval && (
            <div style={{
              background: practiceEval.passed ? "#F0FDF4" : "#FFF7ED",
              border: `1.5px solid ${practiceEval.passed ? "#BBF7D0" : "#FED7AA"}`,
              borderRadius: "16px", padding: "20px", marginBottom: "16px"
            }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <span style={{ fontSize: "20px" }}>
                  {practiceEval.score === "correct" ? "✅"
                    : practiceEval.score === "partial" ? "🟡" : "❌"}
                </span>
                <div>
                  <p style={{ fontWeight: 700, fontSize: "13px", marginBottom: "4px",
                    color: practiceEval.passed ? "#065F46" : "#92400E" }}>
                    {practiceEval.score === "correct" ? "Correct!"
                      : practiceEval.score === "partial" ? "Partially correct"
                      : "Not quite — here's why:"}
                  </p>
                  <p style={{ fontSize: "14px", lineHeight: 1.7,
                    color: practiceEval.passed ? "#166534" : "#78350F" }}>
                    {practiceEval.feedback}
                  </p>
                  {practiceEval.improvement && (
                    <p style={{ fontSize: "13px", marginTop: "8px",
                      color: "#6B7280", fontStyle: "italic" }}>
                      💡 {practiceEval.improvement}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
            {!practiceEval ? (
              <>
                <button className="btn-primary" style={{ flex: 1, fontSize: "15px" }}
                  onClick={submitPractice}
                  disabled={!practiceAnswer.trim() || practiceEvalLoading}>
                  {practiceEvalLoading ? "Miss Nova is checking..." : "Submit answer ✓"}
                </button>
                <button className="btn-success" style={{ flex: 1, fontSize: "15px" }}
                  onClick={loadQuiz}>
                  Skip to quiz →
                </button>
              </>
            ) : (
              <>
                <button className="btn-success" style={{ flex: 1, fontSize: "15px" }}
                  onClick={loadQuiz}>
                  Take the quiz 🧠
                </button>
                <button onClick={() => { setPracticeEval(null); setPracticeAnswer("") }}
                  style={{
                    padding: "14px 20px", borderRadius: "12px", fontWeight: 600,
                    fontSize: "14px", background: "#F3F4F6", color: "#6B7280",
                    border: "1.5px solid #E5E7EB", cursor: "pointer"
                  }}>
                  Try again
                </button>
              </>
            )}
            <button onClick={() => setPhase("teaching")} style={{
              padding: "14px 20px", borderRadius: "12px", fontWeight: 600,
              fontSize: "14px", background: "#F3F4F6", color: "#6B7280",
              border: "1.5px solid #E5E7EB", cursor: "pointer"
            }}>
              ← Re-read
            </button>
          </div>
        </div>
      )}

      {/* ── QUIZ PHASE ── */}
      {phase === "quiz" && quiz && (
        <div>
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{ fontSize: "48px", marginBottom: "8px" }}>🧠</div>
            <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#111827",
              fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              Quick Quiz
            </h2>
            <p style={{ color: "#6B7280", marginTop: "4px" }}>
              Answer 2 out of 3 correctly to advance.
            </p>
          </div>

          {quiz.questions.map((q, i) => (
            <div key={q.id} style={{
              background: "#F9FAFB", border: "1.5px solid #E5E7EB",
              borderRadius: "16px", padding: "24px", marginBottom: "16px"
            }}>
              <p style={{ fontWeight: 700, color: "#111827",
                marginBottom: "16px", fontSize: "15px" }}>
                Q{i + 1}. {q.question}
              </p>

              {q.type === "multiple_choice" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {Object.entries(q.options).map(([key, val]) => (
                    <button key={key}
                      onClick={() => setAnswers({ ...answers, [q.id]: key })}
                      style={{
                        textAlign: "left", padding: "12px 16px", borderRadius: "10px",
                        border: `1.5px solid ${answers[q.id] === key ? "#7C3AED" : "#E5E7EB"}`,
                        background: answers[q.id] === key ? "#EDE9FE" : "#FFFFFF",
                        cursor: "pointer", fontSize: "14px", color: "#111827",
                        fontFamily: "Inter, sans-serif"
                      }}>
                      <strong>{key.toUpperCase()}.</strong> {val}
                    </button>
                  ))}
                </div>
              )}

              {q.type === "fill_blank" && (
                <input type="text"
                  placeholder="Type your answer..."
                  value={answers[q.id] || ""}
                  onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                  style={{
                    width: "100%", padding: "12px 16px", borderRadius: "10px",
                    border: "1.5px solid #E5E7EB", fontSize: "14px",
                    color: "#111827", outline: "none", fontFamily: "Inter, sans-serif"
                  }}
                />
              )}

              {q.type === "open_ended" && (
                <textarea
                  placeholder="Write your answer here..."
                  value={answers[q.id] || ""}
                  onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                  rows={3}
                  style={{
                    width: "100%", padding: "12px 16px", borderRadius: "10px",
                    border: "1.5px solid #E5E7EB", fontSize: "14px",
                    color: "#111827", outline: "none", fontFamily: "Inter, sans-serif",
                    resize: "vertical"
                  }}
                />
              )}
            </div>
          ))}

          {error && <p style={{ color: "#EF4444", marginBottom: "16px" }}>{error}</p>}

          <button className="btn-primary"
            style={{ width: "100%", fontSize: "16px" }}
            onClick={handleSubmitQuiz}
            disabled={quizLoading ||
              Object.keys(answers).length < quiz.questions.length}>
            {quizLoading ? "Miss Nova is evaluating..." : "Submit answers →"}
          </button>
        </div>
      )}

      {/* ── REPAIR PHASE ── */}
      {phase === "repair" && repair && (
        <div>
          <div style={{
            background: "#FFF7ED", border: "1.5px solid #FED7AA",
            borderRadius: "20px", padding: "24px", marginBottom: "20px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px",
              marginBottom: "12px" }}>
              <span style={{ fontSize: "24px" }}>🔄</span>
              <span style={{ fontWeight: 700, color: "#92400E", fontSize: "16px" }}>
                Let's look at this differently
              </span>
            </div>
            <p style={{ color: "#78350F", fontSize: "14px", lineHeight: 1.6 }}>
              You got some questions wrong — that's completely normal. Miss Nova will
              re-explain just the parts you found tricky.
            </p>
          </div>

          <div style={{
            background: "#F9FAFB", border: "1.5px solid #E5E7EB",
            borderRadius: "20px", padding: "28px", marginBottom: "20px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px",
              marginBottom: "16px" }}>
              <span style={{ fontSize: "28px" }}>👩‍🏫</span>
              <span style={{ fontWeight: 700, color: "#111827", fontSize: "16px" }}>
                Miss Nova
              </span>
            </div>
            <div style={{ color: "#374151", lineHeight: 1.8, fontSize: "15px" }}>
              {renderExplanation(repair.explanation || "")}
            </div>
          </div>

          {repair.example_text && (
            <div style={{
              background: "#EDE9FE", border: "1.5px solid #C4B5FD",
              borderRadius: "20px", padding: "24px", marginBottom: "20px"
            }}>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "#7C3AED",
                letterSpacing: "1px", marginBottom: "10px" }}>
                💡 DIFFERENT ANGLE
              </p>
              <p style={{ color: "#4C1D95", lineHeight: 1.7, fontSize: "15px" }}>
                {repair.example_text}
              </p>
            </div>
          )}

          {repair.code && repair.code.trim() !== "" && (
            <div style={{ marginBottom: "20px", borderRadius: "16px",
              overflow: "hidden", border: "1.5px solid #E5E7EB" }}>
              <div style={{ background: "#1E1E1E", padding: "10px 16px",
                display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: "#9CA3AF", fontSize: "12px", fontWeight: 600 }}>
                  {repair.code_language?.toUpperCase() || "CODE"}
                </span>
                <span style={{ color: "#6B7280", fontSize: "11px" }}>Miss Nova's example</span>
              </div>
              <Editor
                height="180px"
                language={repair.code_language || "python"}
                value={repair.code.replace(/\\n/g, "\n")}
                theme="vs-dark"
                options={{
                  readOnly: true, minimap: { enabled: false },
                  fontSize: 14, lineNumbers: "on",
                  scrollBeyondLastLine: false, wordWrap: "on",
                }}
              />
            </div>
          )}

          {repair.check_in && (
            <div style={{
              background: "#F0FDF4", border: "1.5px solid #BBF7D0",
              borderRadius: "16px", padding: "20px", marginBottom: "24px"
            }}>
              <p style={{ color: "#166534", fontSize: "15px" }}>
                🤔 {repair.check_in}
              </p>
            </div>
          )}

          <div style={{ display: "flex", gap: "10px" }}>
            <button className="btn-success" style={{ flex: 1, fontSize: "15px" }}
              onClick={loadQuiz}>
              Ready — Retry the quiz 🧠
            </button>
            <button onClick={() => {
              setCurrentSubtopicIdx(0)
              setSubtopicHistory([])
              setMessages([])
              loadTeaching(0, [])
            }} style={{
              padding: "14px 20px", borderRadius: "12px", fontWeight: 600,
              fontSize: "14px", background: "#F3F4F6", color: "#6B7280",
              border: "1.5px solid #E5E7EB", cursor: "pointer"
            }}>
              Full re-study
            </button>
          </div>
        </div>
      )}

      {/* ── RESULT PHASE ── */}
      {phase === "result" && results && (
        <div>
          <div style={{
            textAlign: "center", padding: "32px", borderRadius: "20px",
            marginBottom: "24px",
            background: results.ready_to_advance ? "#D1FAE5" : "#FEF2F2",
            border: `1.5px solid ${results.ready_to_advance ? "#6EE7B7" : "#FECACA"}`
          }}>
            <div style={{ fontSize: "48px", marginBottom: "8px" }}>
              {results.ready_to_advance ? "🎉" : "💪"}
            </div>
            <h2 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "4px",
              color: results.ready_to_advance ? "#065F46" : "#991B1B",
              fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              {results.ready_to_advance ? "Great job!" : "Keep going!"}
            </h2>
            <p style={{ color: results.ready_to_advance ? "#047857" : "#B91C1C" }}>
              {results.score}/3 correct — {results.summary}
            </p>
          </div>

          {results.results.map((r, i) => (
            <div key={r.question_id} style={{
              background: "#F9FAFB",
              border: `1.5px solid ${r.passed ? "#BBF7D0" : "#FECACA"}`,
              borderRadius: "14px", padding: "16px", marginBottom: "12px"
            }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <span style={{ fontSize: "18px" }}>{r.passed ? "✅" : "❌"}</span>
                <div>
                  <p style={{ fontWeight: 600, fontSize: "13px", color: "#6B7280",
                    marginBottom: "4px" }}>Question {i + 1}</p>
                  <p style={{ color: "#374151", fontSize: "14px" }}>{r.feedback}</p>
                </div>
              </div>
            </div>
          ))}

          <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
            {results.ready_to_advance ? (
              <button className="btn-success"
                style={{ flex: 1, fontSize: "16px" }}
                onClick={onComplete}>
                Next topic →
              </button>
            ) : (
              <>
                <button className="btn-primary" style={{ flex: 1 }}
                  onClick={loadRepair}
                  disabled={!results.failed_concepts?.length}>
                  🔄 Re-study failed concepts
                </button>
                <button className="btn-success" style={{ flex: 1 }}
                  onClick={loadQuiz}>
                  Retry quiz
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}