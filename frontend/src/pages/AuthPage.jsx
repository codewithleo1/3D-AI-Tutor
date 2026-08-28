import { useState } from "react"
import { supabase } from "../lib/supabase"

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState("login") // login | signup
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  async function handleSubmit() {
    setLoading(true)
    setError("")
    setMessage("")

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } }
      })
      if (error) {
        setError(error.message)
      } else {
        setMessage("Check your email to confirm your account, then log in.")
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        setError(error.message)
      } else {
        onAuth(data.user)
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen" style={{ background: "#FFFFFF" }}>
      <nav style={{ borderBottom: "1px solid #F3F4F6", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="text-2xl font-extrabold gradient-text">Miss Nova</span>
      </nav>

      <div style={{ maxWidth: "440px", margin: "80px auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ fontSize: "56px", marginBottom: "16px" }}>👩‍🏫</div>
          <h1 style={{ fontSize: "32px", fontWeight: 800, color: "#111827",
            fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            {mode === "login" ? "Welcome back" : "Get started"}
          </h1>
          <p style={{ color: "#6B7280", marginTop: "8px" }}>
            {mode === "login"
              ? "Log in to continue learning with Miss Nova"
              : "Create your account to start learning"}
          </p>
        </div>

        <div style={{
          background: "#F9FAFB", border: "1.5px solid #E5E7EB",
          borderRadius: "20px", padding: "32px"
        }}>
          {mode === "signup" && (
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "13px", fontWeight: 600,
                color: "#374151", display: "block", marginBottom: "6px" }}>
                Full name
              </label>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: "12px",
                  border: "1.5px solid #E5E7EB", fontSize: "15px",
                  color: "#111827", outline: "none", fontFamily: "Inter, sans-serif"
                }}
              />
              <p style={{ fontSize: "12px", color: "#7C3AED", marginTop: "6px", fontWeight: 500 }}>
                🏆 This name will appear on your certificate of completion
              </p>
            </div>
          )}

          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "13px", fontWeight: 600,
              color: "#374151", display: "block", marginBottom: "6px" }}>
              Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              style={{
                width: "100%", padding: "12px 16px", borderRadius: "12px",
                border: "1.5px solid #E5E7EB", fontSize: "15px",
                color: "#111827", outline: "none", fontFamily: "Inter, sans-serif"
              }}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{ fontSize: "13px", fontWeight: 600,
              color: "#374151", display: "block", marginBottom: "6px" }}>
              Password
            </label>
            <input
              type="password"
              placeholder="Min 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              style={{
                width: "100%", padding: "12px 16px", borderRadius: "12px",
                border: "1.5px solid #E5E7EB", fontSize: "15px",
                color: "#111827", outline: "none", fontFamily: "Inter, sans-serif"
              }}
            />
          </div>

          {error && (
            <p style={{ color: "#EF4444", fontSize: "14px",
              marginBottom: "16px" }}>{error}</p>
          )}
          {message && (
            <p style={{ color: "#10B981", fontSize: "14px",
              marginBottom: "16px" }}>{message}</p>
          )}

          <button
            className="btn-primary"
            style={{ width: "100%", fontSize: "16px" }}
            onClick={handleSubmit}
            disabled={loading || !email || !password}>
            {loading
              ? "Please wait..."
              : mode === "login" ? "Log in →" : "Create account →"}
          </button>

          <p style={{ textAlign: "center", marginTop: "20px",
            fontSize: "14px", color: "#6B7280" }}>
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setMessage("") }}
              style={{ color: "#7C3AED", fontWeight: 600,
                background: "none", border: "none", cursor: "pointer" }}>
              {mode === "login" ? "Sign up" : "Log in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}