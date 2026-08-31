import axios from "axios"

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api"

export async function track(verb, object, result = {}, context = {}) {
  const user = window.__xapiUser || {}
  try {
    await axios.post(`${API}/xapi/statement`, {
      user_id: user.id || "",
      user_email: user.email || "",
      user_name: user.name || "",
      verb,
      object_type: object.type || "",
      object_id: object.id || "",
      object_name: object.name || "",
      result_success: result.success ?? null,
      result_completion: result.completion ?? null,
      result_duration_seconds: result.duration ?? null,
      result_score: result.score ?? null,
      context_course: context.course || "",
      context_module: context.module || "",
      context_subtopic: context.subtopic || "",
    })
  } catch {
    // Silently fail — never block the learner
  }
}