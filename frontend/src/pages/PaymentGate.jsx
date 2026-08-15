import { useState } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api"
const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID

export default function PaymentGate({ user, courseTitle, onUnlock }) {
  const [promoCode, setPromoCode] = useState("")
  const [promoStatus, setPromoStatus] = useState(null)
  const [discount, setDiscount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleValidatePromo() {
    if (!promoCode.trim()) return
    try {
      const res = await axios.post(`${API}/payments/validate-promo`, {
        code: promoCode
      })
      setPromoStatus(res.data)
      setDiscount(res.data.valid ? res.data.discount_percent : 0)
    } catch {
      setPromoStatus({ valid: false, message: "Could not validate code." })
    }
  }

  async function handlePay() {
    setLoading(true)
    setError("")
    try {
      const res = await axios.post(`${API}/payments/create-order`, {
        user_id: user.id,
        user_email: user.email,
        promo_code: promoCode,
      })

      if (res.data.free) {
        onUnlock()
        return
      }

      const script = document.createElement("script")
      script.src = "https://checkout.razorpay.com/v1/checkout.js"
      document.body.appendChild(script)
      script.onload = () => {
        const options = {
          key: RAZORPAY_KEY,
          amount: res.data.amount,
          currency: "INR",
          name: "Miss Nova",
          description: courseTitle,
          order_id: res.data.order_id,
          prefill: { email: user.email },
          theme: { color: "#7C3AED" },
          handler: async function(response) {
            try {
              await axios.post(`${API}/payments/verify`, {
                user_id: user.id,
                user_email: user.email,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amount_paid: res.data.amount,
                promo_code: promoCode,
              })
              onUnlock()
            } catch {
              setError("Payment verification failed. Please contact support.")
              setLoading(false)
            }
          },
        }
        const rzp = new window.Razorpay(options)
        rzp.open()
        setLoading(false)
      }
    } catch {
      setError("Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "#FFFFFF" }}>
      <nav style={{ borderBottom: "1px solid #F3F4F6", padding: "16px 32px" }}>
        <span className="text-2xl font-extrabold gradient-text">Miss Nova</span>
      </nav>

      <div style={{ maxWidth: "500px", margin: "80px auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ fontSize: "56px", marginBottom: "16px" }}>🎓</div>
          <h1 style={{ fontSize: "32px", fontWeight: 800, color: "#111827",
            fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            Unlock the full course
          </h1>
          <p style={{ color: "#6B7280", marginTop: "8px", fontSize: "16px" }}>
            You completed Module 1 — great work! Continue with Miss Nova.
          </p>
        </div>

        <div style={{
          background: "linear-gradient(135deg, #EDE9FE, #F0FDF4)",
          border: "1.5px solid #C4B5FD", borderRadius: "20px",
          padding: "32px", marginBottom: "24px", textAlign: "center"
        }}>
          <p style={{ fontSize: "14px", color: "#6B7280", marginBottom: "8px" }}>
            Full course access
          </p>
          <div style={{ display: "flex", alignItems: "center",
            justifyContent: "center", gap: "12px" }}>
            {discount > 0 && (
              <span style={{ fontSize: "24px", color: "#9CA3AF",
                textDecoration: "line-through" }}>Rs.1</span>
            )}
            <span style={{ fontSize: "48px", fontWeight: 800, color: "#7C3AED" }}>
              {discount === 100 ? "FREE" : "Rs.1"}
            </span>
          </div>
          {discount > 0 && (
            <span style={{
              display: "inline-block", marginTop: "8px",
              background: "#D1FAE5", color: "#065F46",
              padding: "4px 12px", borderRadius: "20px",
              fontSize: "13px", fontWeight: 600
            }}>
              {discount}% off applied!
            </span>
          )}
        </div>

        <div style={{
          background: "#F9FAFB", border: "1.5px solid #E5E7EB",
          borderRadius: "16px", padding: "20px", marginBottom: "24px"
        }}>
          <p style={{ fontWeight: 700, color: "#111827",
            marginBottom: "12px", fontSize: "14px" }}>What you get:</p>
          {[
            "All modules unlocked",
            "Miss Nova teaches every topic",
            "Practice exercises + quizzes",
            "Quiz repair when you fail",
            "Certificate on completion"
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: "8px",
              alignItems: "center", marginBottom: "8px" }}>
              <span style={{ color: "#10B981" }}>✓</span>
              <span style={{ color: "#374151", fontSize: "14px" }}>{item}</span>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ fontSize: "13px", fontWeight: 600,
            color: "#374151", display: "block", marginBottom: "8px" }}>
            Have a promo code?
          </label>
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="text"
              placeholder="e.g. MISSNOVA100"
              value={promoCode}
              onChange={e => setPromoCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && handleValidatePromo()}
              style={{
                flex: 1, padding: "12px 16px", borderRadius: "12px",
                border: `1.5px solid ${promoStatus?.valid ? "#10B981" : "#E5E7EB"}`,
                fontSize: "14px", color: "#111827", outline: "none",
                fontFamily: "Inter, sans-serif", letterSpacing: "1px"
              }}
            />
            <button onClick={handleValidatePromo} style={{
              padding: "12px 20px", borderRadius: "12px", fontWeight: 600,
              fontSize: "14px", background: "#EDE9FE", color: "#7C3AED",
              border: "1.5px solid #C4B5FD", cursor: "pointer"
            }}>
              Apply
            </button>
          </div>
          {promoStatus && (
            <p style={{ marginTop: "8px", fontSize: "13px",
              color: promoStatus.valid ? "#10B981" : "#EF4444" }}>
              {promoStatus.message}
            </p>
          )}
        </div>

        {error && (
          <p style={{ color: "#EF4444", fontSize: "14px",
            marginBottom: "16px" }}>{error}</p>
        )}

        <button className="btn-primary"
          style={{ width: "100%", fontSize: "16px" }}
          onClick={handlePay}
          disabled={loading}>
          {loading ? "Processing..." : discount === 100
            ? "Unlock for FREE" : "Pay Rs.1 and unlock"}
        </button>

        <p style={{ textAlign: "center", marginTop: "16px",
          fontSize: "12px", color: "#9CA3AF" }}>
          Secure payment · Instant access
        </p>
      </div>
    </div>
  )
}