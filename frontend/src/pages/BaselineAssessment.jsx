import { useState, useEffect } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api"

export default function BaselineAssessment({ goal, level, onComplete, onSkip }) {
  const [phase, setPhase] = useState("loading") // loading | questions | results
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [results, setResults] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [currentQ, setCurrentQ] = useState(0)

  useEffect(() => {
    loadQuestions()
  }, [])

  async function loadQuestions() {
    setPhase("loading")
    try {
      const res = await axios.post(`${API}/baseline/generate`, {
        goal,
        level,
      })
      setQuestions(res.data.assessment.questions)
      setPhase("questions")
    } catch {
      setError("Couldn't load assessment. You can skip it and start learning.")
      setPhase("questions")
    }
  }

  async function handleSubmit() {
    if (Object.keys(answers).length < questions.length) return
    setSubmitting(true)
    try {
      const res = await axios.post(`${API}/baseline/evaluate`, {
        goal,
        questions,
        answers,
      })
      setResults(res.data.result)
      setPhase("results")
    } catch {
      setError("Couldn't evaluate. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  function handleAnswer(questionId, answer) {
    const newAnswers = { ...answers, [String(questionId)]: answer }
    setAnswers(newAnswers)
    // Auto advance to next question after 400ms
    if (currentQ < questions.length - 1) {
      setTimeout(() => setCurrentQ(q => q + 1), 400)
    }
  }

  const progress = questions.length > 0
    ? (Object.keys(answers).length / questions.length) * 100
    : 0

  return (
    <div className="min-h-screen" style={{ background: "#F5F3FF" }}>

      {/* Nav */}
      <nav style={{
        background: "white", borderBottom: "1px solid #E5E7EB",
        padding: "16px 32px", display: "flex",
        alignItems: "center", justifyContent: "space-between"
      }}>
        <span style={{ fontSize: "22px", fontWeight: 800, color: "#7C3AED",
          fontFamily: "Plus Jakarta Sans, sans-serif" }}>
          Miss Nova
        </span>
        <button onClick={onSkip} style={{
          fontSize: "14px", padding: "8px 16px", borderRadius: "10px",
          background: "#F3F4F6", color: "#6B7280", border: "1.5px solid #E5E7EB",
          cursor: "pointer", fontWeight: 600
        }}>
          Skip assessment
        </button>
      </nav>

      <div style={{ maxWidth: "680px", margin: "48px auto", padding: "0 24px" }}>

        {/* Header */}
        {phase !== "results" && (
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <div style={{ fontSize: "56px", marginBottom: "16px" }}>🎯</div>
            <h1 style={{ fontSize: "32px", fontWeight: 800, color: "#111827",
              fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: "8px" }}>
              Quick Knowledge Check
            </h1>
            <p style={{ color: "#6B7280", fontSize: "16px" }}>
              5 questions to personalize your {goal} learning journey.
              No pressure — just helps Miss Nova teach you better.
            </p>
          </div>
        )}

        {/* Loading */}
        {phase === "loading" && (
          <div style={{ textAlign: "center", padding: "64px 0" }}>
            <div style={{ fontSize: "48px", display: "inline-block" }}
              className="animate-spin">⚙️</div>
            <p style={{ color: "#6B7280", marginTop: "16px" }}>
              Miss Nova is preparing your assessment...
            </p>
          </div>
        )}

        {/* Questions */}
        {phase === "questions" && questions.length > 0 && (
          <div>
            {/* Progress bar */}
            <div style={{ marginBottom: "32px" }}>
              <div style={{ display: "flex", justifyContent: "space-between",
                marginBottom: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#7C3AED" }}>
                  Question {currentQ + 1} of {questions.length}
                </span>
                <span style={{ fontSize: "13px", color: "#6B7280" }}>
                  {Object.keys(answers).length} answered
                </span>
              </div>
              <div style={{ background: "#E5E7EB", borderRadius: "4px", height: "6px" }}>
                <div style={{
                  height: "6px", borderRadius: "4px",
                  background: "linear-gradient(135deg, #7C3AED, #10B981)",
                  width: `${progress}%`,
                  transition: "width 0.4s ease"
                }} />
              </div>
              {/* Question dots */}
              <div style={{ display: "flex", gap: "8px", marginTop: "12px",
                justifyContent: "center" }}>
                {questions.map((_, i) => (
                  <button key={i} onClick={() => setCurrentQ(i)} style={{
                    width: "32px", height: "32px", borderRadius: "50%",
                    border: "2px solid",
                    borderColor: answers[String(i + 1)] ? "#10B981"
                      : i === currentQ ? "#7C3AED" : "#E5E7EB",
                    background: answers[String(i + 1)] ? "#10B981"
                      : i === currentQ ? "#EDE9FE" : "white",
                    color: answers[String(i + 1)] ? "white"
                      : i === currentQ ? "#7C3AED" : "#9CA3AF",
                    fontSize: "13px", fontWeight: 700, cursor: "pointer"
                  }}>
                    {answers[String(i + 1)] ? "✓" : i + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Current question */}
            {questions[currentQ] && (
              <div style={{
                background: "white", borderRadius: "20px",
                border: "1.5px solid #E5E7EB", padding: "32px",
                marginBottom: "24px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px",
                  marginBottom: "24px" }}>
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "50%",
                    background: "#7C3AED", color: "white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: "16px", flexShrink: 0
                  }}>
                    {currentQ + 1}
                  </div>
                  <p style={{ fontSize: "18px", fontWeight: 600, color: "#111827",
                    lineHeight: 1.5, margin: 0 }}>
                    {questions[currentQ].question}
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {Object.entries(questions[currentQ].options).map(([key, val]) => {
                    const isSelected = answers[String(questions[currentQ].id)] === key
                    return (
                      <button key={key}
                        onClick={() => handleAnswer(questions[currentQ].id, key)}
                        style={{
                          textAlign: "left", padding: "16px 20px",
                          borderRadius: "12px", cursor: "pointer",
                          border: `2px solid ${isSelected ? "#7C3AED" : "#E5E7EB"}`,
                          background: isSelected ? "#EDE9FE" : "white",
                          display: "flex", alignItems: "center", gap: "12px",
                          transition: "all 0.2s"
                        }}>
                        <span style={{
                          width: "28px", height: "28px", borderRadius: "50%",
                          border: `2px solid ${isSelected ? "#7C3AED" : "#D1D5DB"}`,
                          background: isSelected ? "#7C3AED" : "white",
                          color: isSelected ? "white" : "#6B7280",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "12px", fontWeight: 700, flexShrink: 0
                        }}>
                          {key.toUpperCase()}
                        </span>
                        <span style={{ fontSize: "15px", color: "#374151" }}>{val}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
              {currentQ > 0 && (
                <button onClick={() => setCurrentQ(q => q - 1)} style={{
                  padding: "12px 20px", borderRadius: "12px", fontWeight: 600,
                  fontSize: "14px", background: "#F3F4F6", color: "#6B7280",
                  border: "1.5px solid #E5E7EB", cursor: "pointer"
                }}>
                  ← Previous
                </button>
              )}
              {currentQ < questions.length - 1 && (
                <button onClick={() => setCurrentQ(q => q + 1)} style={{
                  padding: "12px 20px", borderRadius: "12px", fontWeight: 600,
                  fontSize: "14px", background: "#EDE9FE", color: "#7C3AED",
                  border: "1.5px solid #C4B5FD", cursor: "pointer",
                  marginLeft: "auto"
                }}>
                  Next →
                </button>
              )}
            </div>

            {error && (
              <p style={{ color: "#EF4444", fontSize: "14px",
                marginBottom: "16px" }}>{error}</p>
            )}

            {/* Submit */}
            {Object.keys(answers).length === questions.length && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  width: "100%", padding: "16px", borderRadius: "14px",
                  background: "linear-gradient(135deg, #7C3AED, #10B981)",
                  color: "white", fontWeight: 700, fontSize: "16px",
                  border: "none", cursor: "pointer"
                }}>
                {submitting ? "Miss Nova is analysing..." : "Submit Assessment →"}
              </button>
            )}
          </div>
        )}

        {/* Results */}
        {phase === "results" && results && (
          <div>
            {/* Score banner */}
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <div style={{ fontSize: "56px", marginBottom: "16px" }}>
                {results.score >= 4 ? "🌟" : results.score >= 3 ? "👍" : "📚"}
              </div>
              <h1 style={{ fontSize: "32px", fontWeight: 800, color: "#111827",
                fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: "8px" }}>
                {results.score >= 4 ? "Impressive!" : results.score >= 3 ? "Good foundation!" : "Great starting point!"}
              </h1>
              <p style={{ color: "#6B7280", fontSize: "16px", marginBottom: "24px" }}>
                {results.message}
              </p>
            </div>

            {/* Score card */}
            <div style={{
              background: "linear-gradient(135deg, #EDE9FE, #F0FDF4)",
              border: "1.5px solid #C4B5FD", borderRadius: "20px",
              padding: "32px", marginBottom: "24px", textAlign: "center"
            }}>
              <div style={{ display: "flex", alignItems: "center",
                justifyContent: "center", gap: "24px" }}>
                <div>
                  <p style={{ fontSize: "56px", fontWeight: 800, color: "#7C3AED",
                    margin: 0, lineHeight: 1 }}>
                    {results.score}/{results.total}
                  </p>
                  <p style={{ color: "#6B7280", fontSize: "14px", marginTop: "4px" }}>
                    correct answers
                  </p>
                </div>
                <div style={{ width: "1px", height: "60px", background: "#C4B5FD" }} />
                <div>
                  <p style={{ fontSize: "24px", fontWeight: 800,
                    color: "#10B981", margin: 0, textTransform: "capitalize" }}>
                    {results.recommended_level}
                  </p>
                  <p style={{ color: "#6B7280", fontSize: "14px", marginTop: "4px" }}>
                    recommended level
                  </p>
                </div>
                {results.skip_modules > 0 && (
                  <>
                    <div style={{ width: "1px", height: "60px", background: "#C4B5FD" }} />
                    <div>
                      <p style={{ fontSize: "24px", fontWeight: 800,
                        color: "#7C3AED", margin: 0 }}>
                        +{results.skip_modules}
                      </p>
                      <p style={{ color: "#6B7280", fontSize: "14px", marginTop: "4px" }}>
                        modules skipped
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Per question results */}
            <div style={{ marginBottom: "32px" }}>
              <p style={{ fontWeight: 700, color: "#111827", marginBottom: "16px",
                fontSize: "16px" }}>
                Question breakdown:
              </p>
              {results.results.map((r, i) => (
                <div key={i} style={{
                  background: "white", borderRadius: "14px",
                  border: `1.5px solid ${r.passed ? "#BBF7D0" : "#FECACA"}`,
                  padding: "16px 20px", marginBottom: "10px",
                  display: "flex", gap: "12px", alignItems: "flex-start"
                }}>
                  <span style={{ fontSize: "18px", flexShrink: 0 }}>
                    {r.passed ? "✅" : "❌"}
                  </span>
                  <div>
                    <p style={{ fontWeight: 600, color: "#111827",
                      fontSize: "14px", marginBottom: "4px" }}>
                      Q{i + 1}. {r.question}
                    </p>
                    {!r.passed && (
                      <p style={{ fontSize: "13px", color: "#6B7280" }}>
                        Correct: <strong style={{ color: "#10B981" }}>
                          {r.correct_answer.toUpperCase()}
                        </strong> — {r.explanation}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={() => onComplete(results)}
              style={{
                width: "100%", padding: "18px", borderRadius: "14px",
                background: "linear-gradient(135deg, #7C3AED, #10B981)",
                color: "white", fontWeight: 700, fontSize: "17px",
                border: "none", cursor: "pointer"
              }}>
              {results.skip_modules > 0
                ? `Start learning (skipping ${results.skip_modules} intro module${results.skip_modules > 1 ? "s" : ""}) →`
                : "Start learning with Miss Nova →"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}