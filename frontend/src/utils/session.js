export function getSessionId() {
  let id = localStorage.getItem("miss-nova-session-id")
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem("miss-nova-session-id", id)
  }
  return id
}