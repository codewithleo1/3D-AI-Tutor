import { useState } from "react"
import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api"
const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID

export default function PaymentGate({ user, courseTitle, onUnlock }) {
  const [promoCode, setPromoCode] = useState("")
  const [promoStatus, setPromoStatus] = useState(null)
  const [discount, setDiscount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [promoLoading, setPromoLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleValidatePromo() {
    if (!promoCode.trim()) return
    setPromoLoading(true)
    try {
      const res = await axios.post(`${API}/payments/validate-promo`, {
        code: promoCode
      })
      setPromoStatus(res.data)
      setDiscount(res.data.valid ? res.data.discount_percent : 0)
    } catch {
      setPromoStatus({ valid: false, message: "Could not validate code." })
    } finally {
      setPromoLoading(false)
    }
  }

  async function handlePay(usePromo = false) {
    setLoading(true)
    setError("")
    try {
      const res = await axios.post(`${API}/payments/create-order`, {
        user_id: user.id,
        user_email: user.email,
        promo_code: usePromo ? promoCode : "",
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
                promo_code: "",
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

  const features = [
    "Full course access",
    "All modules unlocked",
    "Practice exercises + quizzes",
    "Certificate on completion",
    "Lifetime access",
  ]

  const promoFeatures = [
    `Get ${discount || 100}% off with ${promoCode || "promo code"}`,
    "Same benefits as paid option",
    "Instant course access",
    "Certificate on completion",
  ]

  return (
    <div style={{ minHeight: "100vh", background: "#F5F3FF" }}>

      {/* Nav with progress steps */}
      <nav style={{
        background: "white", borderBottom: "1px solid #E5E7EB",
        padding: "16px 32px", display: "flex",
        alignItems: "center", justifyContent: "space-between"
      }}>
        <span style={{ fontSize: "22px", fontWeight: 800, color: "#7C3AED",
          fontFamily: "Plus Jakarta Sans, sans-serif" }}>
          Miss Nova
        </span>

        {/* Steps */}
        <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
          {/* Step 1 */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "50%",
              background: "#10B981", display: "flex", alignItems: "center",
              justifyContent: "center", color: "white", fontSize: "14px"
            }}>✓</div>
            <div>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "#111827", margin: 0 }}>
                Module 1
              </p>
              <p style={{ fontSize: "11px", color: "#10B981", margin: 0, fontWeight: 600 }}>
                Completed
              </p>
            </div>
          </div>

          <div style={{ width: "40px", height: "2px", background: "#7C3AED", margin: "0 8px" }} />

          {/* Step 2 */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "50%",
              background: "#7C3AED", display: "flex", alignItems: "center",
              justifyContent: "center", color: "white", fontSize: "14px", fontWeight: 700
            }}>2</div>
            <div>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "#111827", margin: 0 }}>
                Unlock Course
              </p>
              <p style={{ fontSize: "11px", color: "#6B7280", margin: 0 }}>
                Choose your access
              </p>
            </div>
          </div>

          <div style={{ width: "40px", height: "2px", background: "#E5E7EB", margin: "0 8px" }} />

          {/* Step 3 */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "50%",
              background: "#E5E7EB", display: "flex", alignItems: "center",
              justifyContent: "center", color: "#9CA3AF", fontSize: "14px", fontWeight: 700
            }}>3</div>
            <div>
              <p style={{ fontSize: "12px", fontWeight: 700, color: "#9CA3AF", margin: 0 }}>
                Start Learning
              </p>
              <p style={{ fontSize: "11px", color: "#9CA3AF", margin: 0 }}>
                Full access
              </p>
            </div>
          </div>
        </div>

        {/* Secure badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "20px" }}>🔒</span>
          <div>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#111827", margin: 0 }}>
              Secure Checkout
            </p>
            <p style={{ fontSize: "11px", color: "#6B7280", margin: 0 }}>
              Your data is safe with us
            </p>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <div style={{ maxWidth: "900px", margin: "48px auto", padding: "0 24px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1 style={{ fontSize: "36px", fontWeight: 800, color: "#111827",
            fontFamily: "Plus Jakarta Sans, sans-serif", marginBottom: "12px" }}>
            Unlock the Full Course
          </h1>
          <p style={{ fontSize: "16px", color: "#6B7280" }}>
            Great job completing Module 1! Choose an option below to continue your learning journey.
          </p>
        </div>

        {/* Two column cards */}
        <div style={{ display: "flex", gap: "24px", alignItems: "stretch" }}>

          {/* Left card — Pay */}
          <div style={{
            flex: 1, background: "white", borderRadius: "20px",
            border: "2px solid #7C3AED", padding: "32px",
            position: "relative", display: "flex", flexDirection: "column"
          }}>
            {/* Badge */}
            <div style={{
              position: "absolute", top: "-14px", left: "50%",
              transform: "translateX(-50%)",
              background: "#7C3AED", color: "white",
              padding: "4px 20px", borderRadius: "20px",
              fontSize: "12px", fontWeight: 700, letterSpacing: "1px",
              whiteSpace: "nowrap"
            }}>
              MOST POPULAR
            </div>

            {/* Price */}
            <div style={{ textAlign: "center", marginBottom: "24px", marginTop: "8px" }}>
              <div style={{
                width: "64px", height: "64px", borderRadius: "50%",
                background: "#7C3AED", display: "flex", alignItems: "center",
                justifyContent: "center", margin: "0 auto 16px",
                fontSize: "22px", fontWeight: 800, color: "white"
              }}>
                Rs.1
              </div>
              <h2 style={{ fontSize: "28px", fontWeight: 800, color: "#7C3AED",
                margin: "0 0 4px" }}>
                Pay Just Rs.1
              </h2>
              <p style={{ color: "#6B7280", fontSize: "14px", margin: 0 }}>
                Unlock full course access instantly
              </p>
            </div>

            {/* Features */}
            <div style={{ flex: 1, marginBottom: "24px" }}>
              {features.map((f, i) => (
                <div key={i} style={{ display: "flex", gap: "10px",
                  alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ color: "#10B981", fontSize: "16px", fontWeight: 700 }}>✓</span>
                  <span style={{ color: "#374151", fontSize: "14px" }}>{f}</span>
                </div>
              ))}
            </div>

            {/* Button */}
            <button
              onClick={() => handlePay(false)}
              disabled={loading}
              style={{
                width: "100%", padding: "16px", borderRadius: "12px",
                background: "#7C3AED", color: "white", fontWeight: 700,
                fontSize: "16px", border: "none", cursor: "pointer",
                marginBottom: "12px"
              }}>
              {loading ? "Processing..." : "Pay Rs.1 Now"}
            </button>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
              gap: "6px" }}>
              <span style={{ fontSize: "14px" }}>🔒</span>
              <span style={{ fontSize: "12px", color: "#9CA3AF" }}>
                Secure payment powered by Razorpay
              </span>
            </div>
          </div>

          {/* OR divider */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: "8px" }}>
            <div style={{ width: "1px", flex: 1, background: "#E5E7EB" }} />
            <div style={{
              width: "36px", height: "36px", borderRadius: "50%",
              border: "2px solid #E5E7EB", background: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "12px", fontWeight: 700, color: "#6B7280"
            }}>
              OR
            </div>
            <div style={{ width: "1px", flex: 1, background: "#E5E7EB" }} />
          </div>

          {/* Right card — Promo */}
          <div style={{
            flex: 1, background: "white", borderRadius: "20px",
            border: "2px solid #10B981", padding: "32px",
            position: "relative", display: "flex", flexDirection: "column"
          }}>
            {/* Badge */}
            <div style={{
              position: "absolute", top: "-14px", left: "50%",
              transform: "translateX(-50%)",
              background: "#10B981", color: "white",
              padding: "4px 20px", borderRadius: "20px",
              fontSize: "12px", fontWeight: 700, letterSpacing: "1px",
              whiteSpace: "nowrap"
            }}>
              BEST VALUE
            </div>

            <div style={{ textAlign: "center", marginBottom: "24px", marginTop: "8px" }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎟️</div>
              <h2 style={{ fontSize: "28px", fontWeight: 800, color: "#10B981",
                margin: "0 0 4px" }}>
                Use Promo Code
              </h2>
              <p style={{ color: "#6B7280", fontSize: "14px", margin: 0 }}>
                Have a promo code? Get instant access
              </p>
            </div>

            {/* Promo input */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <input
                  type="text"
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={e => setPromoCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && handleValidatePromo()}
                  style={{
                    flex: 1, padding: "12px 16px", borderRadius: "10px",
                    border: `1.5px solid ${promoStatus?.valid ? "#10B981" : "#E5E7EB"}`,
                    fontSize: "14px", color: "#111827", outline: "none",
                    fontFamily: "Inter, sans-serif", letterSpacing: "1px",
                    background: promoStatus?.valid ? "#F0FDF4" : "white"
                  }}
                />
                <button
                  onClick={handleValidatePromo}
                  disabled={promoLoading}
                  style={{
                    padding: "12px 20px", borderRadius: "10px",
                    background: "#10B981", color: "white", fontWeight: 700,
                    fontSize: "14px", border: "none", cursor: "pointer"
                  }}>
                  {promoLoading ? "..." : "Apply"}
                </button>
              </div>

              {promoStatus && (
                <div style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "8px 12px", borderRadius: "8px",
                  background: promoStatus.valid ? "#F0FDF4" : "#FEF2F2"
                }}>
                  <span>{promoStatus.valid ? "✓" : "✗"}</span>
                  <span style={{
                    fontSize: "13px", fontWeight: 600,
                    color: promoStatus.valid ? "#065F46" : "#991B1B"
                  }}>
                    {promoStatus.valid
                      ? `${promoCode} — Valid code`
                      : promoStatus.message}
                  </span>
                </div>
              )}
            </div>

            {/* Promo features */}
            <div style={{ flex: 1, marginBottom: "24px" }}>
              {promoFeatures.map((f, i) => (
                <div key={i} style={{ display: "flex", gap: "10px",
                  alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ color: "#10B981", fontSize: "16px", fontWeight: 700 }}>✓</span>
                  <span style={{ color: "#374151", fontSize: "14px" }}>{f}</span>
                </div>
              ))}
            </div>

            {error && (
              <p style={{ color: "#EF4444", fontSize: "13px", marginBottom: "12px" }}>
                {error}
              </p>
            )}

            {/* Promo unlock button */}
            <button
              onClick={() => handlePay(true)}
              disabled={!promoStatus?.valid || loading}
              style={{
                width: "100%", padding: "16px", borderRadius: "12px",
                background: promoStatus?.valid ? "white" : "#F9FAFB",
                color: promoStatus?.valid ? "#10B981" : "#9CA3AF",
                fontWeight: 700, fontSize: "16px",
                border: `2px solid ${promoStatus?.valid ? "#10B981" : "#E5E7EB"}`,
                cursor: promoStatus?.valid ? "pointer" : "not-allowed"
              }}>
              {loading ? "Processing..." : promoStatus?.valid
                ? `Unlock with ${promoCode}`
                : "Enter a valid promo code"}
            </button>
          </div>
        </div>

        {/* Trust badges */}
        <div style={{
          display: "flex", justifyContent: "center", gap: "48px",
          marginTop: "48px", padding: "32px",
          background: "white", borderRadius: "16px",
          border: "1px solid #E5E7EB"
        }}>
          {[
            { icon: "🔒", title: "100% Secure", desc: "Your payment information is protected" },
            { icon: "⚡", title: "Instant Access", desc: "Get immediate access after payment" },
            { icon: "🏆", title: "Money Back Guarantee", desc: "7-day money back guarantee" },
            { icon: "🎧", title: "24/7 Support", desc: "We're here to help you succeed" },
          ].map((b, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "28px", marginBottom: "8px" }}>{b.icon}</div>
              <p style={{ fontWeight: 700, color: "#111827", fontSize: "14px",
                margin: "0 0 4px" }}>{b.title}</p>
              <p style={{ color: "#6B7280", fontSize: "12px", margin: 0,
                maxWidth: "120px" }}>{b.desc}</p>
            </div>
          ))}
        </div>

        <p style={{ textAlign: "center", marginTop: "24px",
          fontSize: "14px", color: "#6B7280" }}>
          Already have access?{" "}
          <button onClick={onUnlock} style={{
            color: "#7C3AED", fontWeight: 600, background: "none",
            border: "none", cursor: "pointer", fontSize: "14px"
          }}>
            Sign in here
          </button>
        </p>
      </div>
    </div>
  )
}