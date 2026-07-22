import { useState, useEffect } from "react"
import axios from "axios"

const API = "http://127.0.0.1:8000/api"

export default function Prerequisites({ roadmap, goal, level, onReady }) {
  const [prereqs, setPrereqs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [checkedTools, setCheckedTools] = useState({})
  const [useZeroInstall, setUseZeroInstall] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await axios.post(`${API}/prerequisites`, { goal, level })
        setPrereqs(res.data.prerequisites)
      } catch {
        setError("Couldn't load prerequisites. You can skip and start anyway.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function toggleTool(name) {
    setCheckedTools(prev => ({ ...prev, [name]: !prev[name] }))
  }

  const allToolsChecked = prereqs?.tools?.length === 0
    || useZeroInstall
    || prereqs?.tools?.every(t => checkedTools[t.name])

  if (loading) {
    return (
      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
        <div style={{ fontSize: "48px", display: "inline-block" }} className="animate-spin">⚙️</div>
        <p style={{ color: "#6B7280", marginTop: "16px", fontSize: "16px" }}>
          Miss Nova is preparing your setup guide...
        </p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", padding: "48px 24px" }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <div style={{ fontSize: "56px", marginBottom: "16px" }}>🛠️</div>
        <h1 style={{
          fontSize: "32px", fontWeight: 800, color: "#111827",
          fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: "8px"
        }}>
          Before we start
        </h1>
        <p style={{ color: "#6B7280", fontSize: "16px", lineHeight: 1.6 }}>
          Let's make sure you have everything ready to learn{" "}
          <span style={{ color: "#7C3AED", fontWeight: 600 }}>{goal}</span>.
        </p>
        {prereqs?.estimated_setup_minutes && (
          <span style={{
            display: "inline-block", marginTop: "12px",
            padding: "4px 14px", borderRadius: "20px",
            background: "#EDE9FE", color: "#6D28D9",
            fontSize: "13px", fontWeight: 600
          }}>
            ⏱ Setup takes ~{prereqs.estimated_setup_minutes} minutes
          </span>
        )}
      </div>

      {error && (
        <div style={{
          padding: "16px", borderRadius: "12px", marginBottom: "24px",
          background: "#FEF2F2", border: "1.5px solid #FECACA",
          color: "#991B1B", fontSize: "14px"
        }}>
          {error}
        </div>
      )}

      {prereqs && (
        <>
          {/* Intro */}
          <div style={{
            padding: "20px 24px", borderRadius: "16px", marginBottom: "24px",
            background: "#F0FDF4", border: "1.5px solid #BBF7D0"
          }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <span style={{ fontSize: "24px" }}>👩‍🏫</span>
              <p style={{ color: "#166534", fontSize: "15px", lineHeight: 1.7 }}>
                {prereqs.intro}
              </p>
            </div>
          </div>

          {/* Tools section */}
          {prereqs.has_tools && prereqs.tools?.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{
                fontSize: "16px", fontWeight: 700, color: "#111827",
                marginBottom: "12px", fontFamily: "Plus Jakarta Sans, sans-serif"
              }}>
                🔧 What to install
              </h2>

              {prereqs.tools.map((tool, i) => (
                <div key={i} style={{
                  background: "#F9FAFB", border: `1.5px solid ${checkedTools[tool.name] ? "#BBF7D0" : "#E5E7EB"}`,
                  borderRadius: "16px", padding: "20px", marginBottom: "12px",
                  transition: "border-color 0.2s"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div>
                      <p style={{ fontWeight: 700, color: "#111827", fontSize: "15px" }}>
                        {tool.name}
                      </p>
                      <p style={{ color: "#6B7280", fontSize: "13px", marginTop: "2px" }}>
                        {tool.purpose}
                      </p>
                    </div>
                    <a href={tool.install_url} target="_blank" rel="noreferrer"
                      style={{
                        padding: "6px 14px", borderRadius: "8px", fontSize: "13px",
                        fontWeight: 600, color: "white", background: "#7C3AED",
                        textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0,
                        marginLeft: "12px"
                      }}>
                      Download →
                    </a>
                  </div>

                  {/* Install steps */}
                  <ol style={{ paddingLeft: "20px", margin: "0 0 12px 0" }}>
                    {tool.install_steps.map((step, si) => (
                      <li key={si} style={{
                        color: "#374151", fontSize: "14px",
                        lineHeight: 1.6, marginBottom: "4px"
                      }}>
                        {step}
                      </li>
                    ))}
                  </ol>

                  {/* Verify command */}
                  {tool.verify_command && (
                    <div style={{
                      background: "#1E1E1E", borderRadius: "10px",
                      padding: "10px 16px", marginBottom: "12px",
                      display: "flex", alignItems: "center", gap: "10px"
                    }}>
                      <span style={{ color: "#10B981", fontSize: "13px", fontFamily: "JetBrains Mono, monospace" }}>
                        $ {tool.verify_command}
                      </span>
                      <span style={{ color: "#6B7280", fontSize: "12px" }}>
                        → should show: {tool.verify_expected}
                      </span>
                    </div>
                  )}

                  {/* Done checkbox */}
                  <button
                    onClick={() => toggleTool(tool.name)}
                    style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      border: "none", background: "none", cursor: "pointer",
                      padding: "0", fontSize: "14px", fontWeight: 600,
                      color: checkedTools[tool.name] ? "#059669" : "#7C3AED"
                    }}
                  >
                    <span style={{
                      width: "20px", height: "20px", borderRadius: "6px",
                      border: `2px solid ${checkedTools[tool.name] ? "#059669" : "#7C3AED"}`,
                      background: checkedTools[tool.name] ? "#059669" : "white",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "12px", color: "white", flexShrink: 0
                    }}>
                      {checkedTools[tool.name] ? "✓" : ""}
                    </span>
                    {checkedTools[tool.name] ? "Installed ✓" : "Mark as installed"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Zero install option */}
          {prereqs.zero_install_option && (
            <div style={{
              background: useZeroInstall ? "#EDE9FE" : "#F9FAFB",
              border: `1.5px solid ${useZeroInstall ? "#7C3AED" : "#E5E7EB"}`,
              borderRadius: "16px", padding: "20px", marginBottom: "24px",
              cursor: "pointer", transition: "all 0.2s"
            }}
              onClick={() => setUseZeroInstall(!useZeroInstall)}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <span style={{
                  width: "20px", height: "20px", borderRadius: "6px", flexShrink: 0, marginTop: "2px",
                  border: `2px solid ${useZeroInstall ? "#7C3AED" : "#D1D5DB"}`,
                  background: useZeroInstall ? "#7C3AED" : "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "12px", color: "white"
                }}>
                  {useZeroInstall ? "✓" : ""}
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, color: "#111827", fontSize: "15px", marginBottom: "4px" }}>
                    ⚡ No install? Use {prereqs.zero_install_option.name}
                  </p>
                  <p style={{ color: "#6B7280", fontSize: "13px", lineHeight: 1.6, marginBottom: "8px" }}>
                    {prereqs.zero_install_option.description}
                  </p>
                  <a href={prereqs.zero_install_option.url} target="_blank" rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{
                      color: "#7C3AED", fontSize: "13px", fontWeight: 600,
                      textDecoration: "none"
                    }}>
                    Open {prereqs.zero_install_option.name} →
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Prior knowledge */}
          {prereqs.prior_knowledge?.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <h2 style={{
                fontSize: "16px", fontWeight: 700, color: "#111827",
                marginBottom: "12px", fontFamily: "Plus Jakarta Sans, sans-serif"
              }}>
                📚 Good to know before starting
              </h2>
              <div style={{
                background: "#F9FAFB", border: "1.5px solid #E5E7EB",
                borderRadius: "16px", padding: "16px 20px"
              }}>
                {prereqs.prior_knowledge.map((item, i) => (
                  <div key={i} style={{
                    display: "flex", gap: "10px", alignItems: "flex-start",
                    marginBottom: i < prereqs.prior_knowledge.length - 1 ? "10px" : "0"
                  }}>
                    <span style={{ color: "#7C3AED", fontSize: "14px", marginTop: "1px" }}>→</span>
                    <p style={{ color: "#374151", fontSize: "14px", lineHeight: 1.6 }}>{item}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* First action */}
          {prereqs.first_action && (
            <div style={{
              padding: "16px 20px", borderRadius: "14px", marginBottom: "32px",
              background: "#EDE9FE", border: "1.5px solid #C4B5FD"
            }}>
              <p style={{ color: "#4C1D95", fontSize: "14px", fontWeight: 600 }}>
                👆 First step: <span style={{ fontWeight: 400 }}>{prereqs.first_action}</span>
              </p>
            </div>
          )}
        </>
      )}

      {/* CTA buttons */}
      <div style={{ display: "flex", gap: "12px" }}>
        <button
          className="btn-success"
          style={{ flex: 1, fontSize: "16px", opacity: allToolsChecked ? 1 : 0.5 }}
          onClick={onReady}
          disabled={!allToolsChecked}
        >
          ✅ I'm all set — Start learning →
        </button>
        <button
          onClick={onReady}
          style={{
            padding: "14px 20px", borderRadius: "12px", fontWeight: 600,
            fontSize: "14px", background: "#F3F4F6", color: "#6B7280",
            border: "1.5px solid #E5E7EB", cursor: "pointer", whiteSpace: "nowrap"
          }}
        >
          Skip setup
        </button>
      </div>

    </div>
  )
}