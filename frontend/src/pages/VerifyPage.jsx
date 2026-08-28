import { useState, useEffect } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api"

export default function VerifyPage() {
  const [cert, setCert] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code")
    if (!code) {
      setError("No certificate code provided.")
      setLoading(false)
      return
    }
    axios.get(`${API}/certificate/verify`, { params: { code } })
      .then(res => {
        if (res.data.valid) setCert(res.data.certificate)
        else setError("Certificate not found or invalid.")
      })
      .catch(() => setError("Could not verify certificate. Please try again."))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div style={{ fontSize: "48px" }} className="animate-spin">⚙️</div>
    </div>
  )

  if (error) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: "16px" }}>
      <div style={{ fontSize: "48px" }}>❌</div>
      <p style={{ fontSize: "20px", fontWeight: 700, color: "#111827" }}>Invalid Certificate</p>
      <p style={{ color: "#6B7280" }}>{error}</p>
    </div>
  )

  return (
    <div style={{ minHeight: "100vh", background: "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ background: "white", borderRadius: "24px", padding: "48px", maxWidth: "560px", width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(124,58,237,0.15)", border: "2px solid #EDE9FE" }}>
        <div style={{ fontSize: "48px", marginBottom: "8px" }}>🏆</div>
        <p style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "3px", color: "#7C3AED", marginBottom: "8px" }}>CERTIFICATE VERIFIED</p>
        <h1 style={{ fontSize: "32px", fontWeight: 800, color: "#111827", fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: "8px" }}>
          {cert.student_name}
        </h1>
        <p style={{ color: "#6B7280", marginBottom: "24px" }}>has successfully completed</p>
        <div style={{ background: "linear-gradient(135deg, #7C3AED, #10B981)", borderRadius: "16px", padding: "20px", marginBottom: "24px" }}>
          <p style={{ color: "white", fontWeight: 800, fontSize: "20px" }}>{cert.course_title}</p>
        </div>
        <p style={{ color: "#6B7280", fontSize: "14px", marginBottom: "8px" }}>
          Completed on {new Date(cert.completed_at).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
        </p>
        <p style={{ color: "#9CA3AF", fontSize: "12px" }}>Certificate ID: {cert.verify_code}</p>
        <div style={{ marginTop: "24px", padding: "12px", background: "#F0FDF4", borderRadius: "12px", border: "1px solid #BBF7D0" }}>
          <p style={{ color: "#065F46", fontSize: "13px", fontWeight: 600 }}>✅ This certificate is authentic and verified by Miss Nova</p>
        </div>
      </div>
    </div>
  )
}