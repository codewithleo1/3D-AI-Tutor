import { useState, useEffect } from "react"
import axios from "axios"
import Editor from "@monaco-editor/react"

const API = "http://127.0.0.1:8000/api"

export default function TopicView({ topic, module: mod, course, onComplete, onSkip }) {
  const [phase, setPhase] = useState("loading") // loading | teaching | quiz | result
  const [teaching, setTeaching] = useState(null)
  const [history, setHistory] = useState([])
  const [followUp, setFollowUp] = useState("")
  const [followUpLoading, setFollowUpLoading] = useState(false)
  const [quiz, setQuiz] = useState(null)
  const [answers, setAnswers] = useState({})
  const [quizLoading, setQuizLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState("")

  useEffect(() => {
    loadTeaching([])
  }, [topic.id])

  async function loadTeaching(conversationHistory) {
    setPhase("loading")
    setError("")
    try {
      const res = await axios.post(`${API}/teach`, {
        topic_title: topic.title,
        topic_description: topic.description || "",
        module_title: mod.title,
        course_title: course.title,
        conversation_history: conversationHistory,
      })
      const data = res.data.response

      if (data.type === "ready_for_quiz") {
        await loadQuiz()
      } else {
        setTeaching(data)
        setPhase("teaching")
      }
    } catch {
      setError("Miss Nova had trouble loading this topic. Please try again.")
      setPhase("teaching")
    }
  }

  async function handleFollowUp() {
    if (!followUp.trim()) return
    setFollowUpLoading(true)

    const newHistory = [
      ...history,
      { role: "assistant", content: JSON.stringify(teaching) },
      { role: "user", content: followUp },
    ]
    setHistory(newHistory)
    setFollowUp("")

    try {
      const res = await axios.post(`${API}/teach`, {
        topic_title: topic.title,
        topic_description: topic.description || "",
        module_title: mod.title,
        course_title: course.title,
        conversation_history: newHistory,
      })
      const data = res.data.response
      if (data.type === "ready_for_quiz") {
        await loadQuiz()
      } else {
        setTeaching(data)
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setFollowUpLoading(false)
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

  return (
    <div style={{ maxWidth: "780px", margin: "0 auto", padding: "32px 24px" }}>

      {/* Topic header */}
      <div style={{ marginBottom: "32px" }}>
        <p style={{ fontSize: "12px", fontWeight: 700, color: "#7C3AED", letterSpacing: "1px", marginBottom: "6px" }}>
          {course.title} · {mod.title}
        </p>
        <h1 style={{ fontSize: "32px", fontWeight: 800, color: "#111827", marginBottom: "8px",
          fontFamily: "Plus Jakarta Sans, sans-serif" }}>
          {topic.title}
        </h1>
        <p style={{ color: "#6B7280", fontSize: "15px" }}>{topic.description}</p>
      </div>

      {/* Loading */}
      {phase === "loading" && (
        <div style={{ textAlign: "center", padding: "64px 0" }}>
          <div style={{ fontSize: "48px", display: "inline-block" }} className="animate-spin">⚙️</div>
          <p style={{ color: "#6B7280", marginTop: "16px", fontSize: "16px" }}>Miss Nova is preparing...</p>
        </div>
      )}

      {/* Teaching phase */}
      {phase === "teaching" && teaching && (
        <div>
          {/* Explanation */}
          <div style={{
            background: "#F9FAFB", border: "1.5px solid #E5E7EB",
            borderRadius: "20px", padding: "28px", marginBottom: "20px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <span style={{ fontSize: "28px" }}>👩‍🏫</span>
              <span style={{ fontWeight: 700, color: "#111827", fontSize: "16px" }}>Miss Nova</span>
            </div>
            <p style={{ color: "#374151", lineHeight: 1.8, fontSize: "15px", whiteSpace: "pre-wrap" }}>
              {teaching.explanation}
            </p>
          </div>

          {/* Example / Analogy */}
          {teaching.example_text && (
            <div style={{
              background: "#EDE9FE", border: "1.5px solid #C4B5FD",
              borderRadius: "20px", padding: "24px", marginBottom: "20px"
            }}>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "#7C3AED",
                letterSpacing: "1px", marginBottom: "10px" }}>
                💡 EXAMPLE
              </p>
              <p style={{ color: "#4C1D95", lineHeight: 1.7, fontSize: "15px" }}>
                {teaching.example_text}
              </p>
            </div>
          )}

          {/* Code example */}
          {teaching.code && teaching.code.trim() !== "" && (
            <div style={{ marginBottom: "20px", borderRadius: "16px", overflow: "hidden",
              border: "1.5px solid #E5E7EB" }}>
              <div style={{ background: "#1E1E1E", padding: "10px 16px",
                display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: "#9CA3AF", fontSize: "12px", fontWeight: 600 }}>
                  {teaching.code_language?.toUpperCase() || "CODE"}
                </span>
                <span style={{ color: "#6B7280", fontSize: "11px" }}>Miss Nova's example</span>
              </div>
              <Editor
                height="200px"
                language={teaching.code_language || "python"}
                value={teaching.code.replace(/\\n/g, "\n")}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  wordWrap: "on",
                }}
              />
            </div>
          )}

          {/* Check in */}
          <div style={{
            background: "#F0FDF4", border: "1.5px solid #BBF7D0",
            borderRadius: "16px", padding: "20px", marginBottom: "24px"
          }}>
            <p style={{ color: "#166534", fontSize: "15px" }}>🤔 {teaching.check_in}</p>
          </div>

          {error && <p style={{ color: "#EF4444", marginBottom: "16px" }}>{error}</p>}

          {/* Follow up input */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
            <input
              type="text"
              placeholder="Ask Miss Nova a question..."
              value={followUp}
              onChange={e => setFollowUp(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleFollowUp()}
              style={{
                flex: 1, padding: "12px 16px", borderRadius: "12px",
                border: "1.5px solid #E5E7EB", fontSize: "14px",
                color: "#111827", outline: "none", fontFamily: "Inter, sans-serif"
              }}
            />
            <button
              onClick={handleFollowUp}
              disabled={!followUp.trim() || followUpLoading}
              style={{
                padding: "12px 20px", borderRadius: "12px", border: "none",
                background: "#7C3AED", color: "white", fontWeight: 600,
                cursor: "pointer", fontSize: "14px", opacity: followUp.trim() ? 1 : 0.4
              }}
            >
              {followUpLoading ? "..." : "Ask"}
            </button>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="btn-success" style={{ flex: 1 }} onClick={loadQuiz}>
              I understand — Take the quiz →
            </button>
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

      {/* Quiz phase */}
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
              <p style={{ fontWeight: 700, color: "#111827", marginBottom: "16px", fontSize: "15px" }}>
                Q{i + 1}. {q.question}
              </p>

              {/* Multiple choice */}
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

              {/* Fill in the blank */}
              {q.type === "fill_blank" && (
                <input
                  type="text"
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

              {/* Open ended */}
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

          <button
            className="btn-primary"
            style={{ width: "100%", fontSize: "16px" }}
            onClick={handleSubmitQuiz}
            disabled={quizLoading || Object.keys(answers).length < quiz.questions.length}
          >
            {quizLoading ? "Miss Nova is evaluating..." : "Submit answers →"}
          </button>
        </div>
      )}

      {/* Result phase */}
      {phase === "result" && results && (
        <div>
          {/* Score banner */}
          <div style={{
            textAlign: "center", padding: "32px", borderRadius: "20px", marginBottom: "24px",
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

          {/* Per-question feedback */}
          {results.results.map((r, i) => (
            <div key={r.question_id} style={{
              background: "#F9FAFB", border: `1.5px solid ${r.passed ? "#BBF7D0" : "#FECACA"}`,
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

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
            {results.ready_to_advance ? (
              <button className="btn-success" style={{ flex: 1, fontSize: "16px" }}
                onClick={onComplete}>
                Next topic →
              </button>
            ) : (
              <>
                <button className="btn-primary" style={{ flex: 1 }}
                  onClick={() => loadTeaching([])}>
                  Re-study topic
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