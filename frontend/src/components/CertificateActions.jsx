import { useState } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api"

export default function CertificateActions({ user, roadmap }) {
  const [loading, setLoading] = useState(false)
  const [verifyCode, setVerifyCode] = useState("")
  const [displayId, setDisplayId] = useState("")
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")

  const studentName = user?.user_metadata?.full_name || user?.email || "Student"
  const courseTitle = roadmap?.title || "Miss Nova Course"
  const estimatedHours = roadmap?.estimated_hours || 0

  async function handleDownload() {
    setLoading(true)
    setError("")
    try {
      const res = await axios.post(
        `${API}/certificate/generate`,
        {
          user_id: user.id,
          student_name: studentName,
          course_title: courseTitle,
          estimated_hours: estimatedHours,
        },
        { responseType: "blob" }
      )

      // Extract verify code from headers
      const code = res.headers["x-verify-code"] || ""
      const dId = res.headers["x-display-id"] || ""
      setVerifyCode(code)
      setDisplayId(dId)

      // Trigger PDF download
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", "MissNova_Certificate.pdf")
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      setError("Could not generate certificate. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  function handleLinkedIn() {
    const verifyUrl = `${window.location.origin}/verify?code=${verifyCode}`
    const completionDate = new Date()
    const params = new URLSearchParams({
      startTask: "CERTIFICATION_NAME",
      name: courseTitle,
      organizationName: "Miss Nova AI",
      issueYear: completionDate.getFullYear(),
      issueMonth: completionDate.getMonth() + 1,
      certUrl: verifyUrl,
    })
    window.open(`https://www.linkedin.com/profile/add?${params.toString()}`, "_blank")
  }

  function handleCopy() {
    const verifyUrl = `${window.location.origin}/verify?code=${verifyCode}`
    navigator.clipboard.writeText(verifyUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ marginBottom: "24px" }}>
      {/* Download button — always shown first */}
      <button
        onClick={handleDownload}
        disabled={loading}
        style={{
          width: "100%", padding: "16px", borderRadius: "14px",
          background: "linear-gradient(135deg, #7C3AED, #10B981)",
          color: "white", fontWeight: 700, fontSize: "16px",
          border: "none", cursor: loading ? "not-allowed" : "pointer",
          marginBottom: "12px", opacity: loading ? 0.7 : 1,
          fontFamily: "Plus Jakarta Sans, sans-serif",
        }}
      >
        {loading ? "⚙️ Generating certificate..." : "🏆 Download Certificate"}
      </button>

      {error && (
        <p style={{ color: "#EF4444", fontSize: "14px", marginBottom: "12px" }}>
          {error}
        </p>
      )}

      {/* LinkedIn + Copy — shown after certificate is generated */}
      {verifyCode && (
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={handleLinkedIn}
            style={{
              flex: 1, padding: "12px", borderRadius: "12px",
              background: "#0A66C2", color: "white",
              fontWeight: 600, fontSize: "14px",
              border: "none", cursor: "pointer",
            }}
          >
            in Add to LinkedIn
          </button>
          <button
            onClick={handleCopy}
            style={{
              flex: 1, padding: "12px", borderRadius: "12px",
              background: copied ? "#D1FAE5" : "#F3F4F6",
              color: copied ? "#065F46" : "#374151",
              fontWeight: 600, fontSize: "14px",
              border: "1.5px solid #E5E7EB", cursor: "pointer",
            }}
          >
            {copied ? "✅ Copied!" : "🔗 Copy verify link"}
          </button>
        </div>
      )}

      {verifyCode && (
        <p style={{
          fontSize: "12px", color: "#9CA3AF",
          textAlign: "center", marginTop: "10px"
        }}>
          Certificate ID: {displayId}
        </p>
      )}
    </div>
  )
}