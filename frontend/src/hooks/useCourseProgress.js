import { useState, useCallback } from "react"

const STORAGE_KEY = "miss-nova-progress"

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

  const initProgress = useCallback((roadmap) => {
    const fresh = {
      roadmap,
      completedTopics: [],
      currentModule: 0,
      currentTopic: 0,
    }
    save(fresh)
    return fresh
  }, [])

  const loadProgress = useCallback(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return null
      const parsed = JSON.parse(saved)
      setProgress(parsed)
      return parsed
    } catch {
      return null
    }
  }, [])

  const markTopicComplete = useCallback((mi, ti, roadmap) => {
    const id = `${mi}-${ti}`
    const base = progress || { roadmap, completedTopics: [], currentModule: mi, currentTopic: ti }
    if (base.completedTopics.includes(id)) return

    // Advance location to next topic
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

    // Unlocked if previous topic is completed
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
  }, [progress])

  const clearProgress = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setProgress(null)
  }, [])

  return {
    progress,
    initProgress,
    loadProgress,
    markTopicComplete,
    setLocation,
    getTopicState,
    jumpToTopic,
    clearProgress,
  }
}