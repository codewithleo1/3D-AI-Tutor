import { useState, useCallback } from "react"
import axios from "axios"

const STORAGE_KEY = "miss-nova-progress"
const API = "http://127.0.0.1:8000/api"

export function useCourseProgress() {
  const [progress, setProgress] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    setProgress(data)
  }

  async function syncToDb(data) {
    if (!data?.courseId || !data?.sessionId) return
    try {
      await axios.post(`${API}/progress/save`, {
        session_id: data.sessionId,
        course_id: data.courseId,
        completed_topics: data.completedTopics,
        current_module: data.currentModule,
        current_topic: data.currentTopic,
      })
    } catch {
      // Silently fail — localStorage is the source of truth
    }
  }

  const loadFromDb = useCallback(async () => {
    const sessionId = localStorage.getItem("miss-nova-session-id")
    if (!sessionId) return null
    try {
      const res = await axios.post(`${API}/progress/load`, {
        session_id: sessionId,
      })
      if (!res.data.progress) return null
      const p = res.data.progress
      const restored = {
        roadmap: p.roadmap,
        sessionId,
        courseId: p.course_id,
        completedTopics: p.completed_topics || [],
        currentModule: p.current_module,
        currentTopic: p.current_topic,
      }
      save(restored)
      return restored
    } catch {
      return null
    }
  }, [])

  const initProgress = useCallback(async (roadmap, goal, level) => {
    let sessionId = null
    let courseId = null

    try {
      const res = await axios.post(`${API}/progress/save-course`, {
        goal: goal || "",
        level: level || "",
        roadmap,
      })
      sessionId = res.data.session_id
      courseId = res.data.course_id
    } catch {
      sessionId = crypto.randomUUID()
      courseId = crypto.randomUUID()
    }

    const fresh = {
      roadmap,
      sessionId,
      courseId,
      completedTopics: [],
      currentModule: 0,
      currentTopic: 0,
    }
    save(fresh)
    return fresh
  }, [])

  const markTopicComplete = useCallback((mi, ti, roadmap) => {
    const id = `${mi}-${ti}`
    const base = progress || {
      roadmap, sessionId: null, courseId: null,
      completedTopics: [], currentModule: mi, currentTopic: ti,
    }
    if (base.completedTopics.includes(id)) return

    const mod = roadmap.modules[mi]
    let nextMi = mi
    let nextTi = ti + 1
    if (nextTi >= mod.topics.length) {
      nextMi = mi + 1
      nextTi = 0
    }

    const updated = {
      ...base,
      roadmap,
      completedTopics: [...base.completedTopics, id],
      currentModule: nextMi < roadmap.modules.length ? nextMi : mi,
      currentTopic: nextMi < roadmap.modules.length ? nextTi : ti,
    }
    save(updated)
    syncToDb(updated)
  }, [progress])

  const setLocation = useCallback((mi, ti) => {
    if (!progress) return
    const updated = { ...progress, currentModule: mi, currentTopic: ti }
    save(updated)
  }, [progress])

  const getTopicState = useCallback((mi, ti) => {
    if (!progress) return "locked"
    const id = `${mi}-${ti}`
    const currentId = `${progress.currentModule}-${progress.currentTopic}`

    if (progress.completedTopics.includes(id)) return "completed"
    if (id === currentId) return "current"

    const prevId = ti === 0
      ? (mi === 0 ? null : (() => {
          const prevMod = progress.roadmap?.modules[mi - 1]
          return prevMod ? `${mi - 1}-${prevMod.topics.length - 1}` : null
        })())
      : `${mi}-${ti - 1}`

    if (prevId === null || progress.completedTopics.includes(prevId)) return "unlocked"
    return "locked"
  }, [progress])

  const jumpToTopic = useCallback((mi, ti) => {
    if (!progress) return
    const updated = { ...progress, currentModule: mi, currentTopic: ti }
    save(updated)
    syncToDb(updated)
  }, [progress])

  const clearProgress = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setProgress(null)
  }, [])

  return {
    progress,
    initProgress,
    loadFromDb,
    markTopicComplete,
    setLocation,
    getTopicState,
    jumpToTopic,
    clearProgress,
  }
}