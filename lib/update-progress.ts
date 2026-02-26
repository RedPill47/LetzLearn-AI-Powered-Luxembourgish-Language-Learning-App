/**
 * Utility functions to update progress tracking
 */

/**
 * Update progress when a word is added to vocabulary
 */
export async function trackWordAdded() {
  try {
    // Update daily challenge
    const challengeRes = await fetch("/api/progress/challenge", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "word", increment: 1 }),
    })
    // Update user stats
    const statsRes = await fetch("/api/progress/update", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "word" }),
    })
    if (!challengeRes.ok || !statsRes.ok) {
      console.warn("Progress tracking (word) failed", { challengeStatus: challengeRes.status, statsStatus: statsRes.status })
    }
  } catch (error) {
    console.error("Error tracking word added:", error)
  }
}

/**
 * Update progress when a conversation is created/updated
 */
export async function trackConversation() {
  try {
    // Update daily challenge
    const challengeRes = await fetch("/api/progress/challenge", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "conversation", increment: 1 }),
    })
    // Update user stats
    const statsRes = await fetch("/api/progress/update", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "conversation" }),
    })
    if (!challengeRes.ok || !statsRes.ok) {
      console.warn("Progress tracking (conversation) failed", { challengeStatus: challengeRes.status, statsStatus: statsRes.status })
    }
  } catch (error) {
    console.error("Error tracking conversation:", error)
  }
}

/**
 * Update progress when a quiz question is answered
 */
export async function trackQuizQuestion(correct: boolean) {
  try {
    // Update daily challenge
    const challengeRes = await fetch("/api/progress/challenge", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "quiz", increment: 1 }),
    })
    // Update user stats
    const statsRes = await fetch("/api/progress/update", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "quiz", increment: 1, correct }),
    })
    if (!challengeRes.ok || !statsRes.ok) {
      console.warn("Progress tracking (quiz) failed", { challengeStatus: challengeRes.status, statsStatus: statsRes.status })
    }
  } catch (error) {
    console.error("Error tracking quiz question:", error)
  }
}

/**
 * Increment study time (in minutes)
 */
export async function trackStudyTime(minutes: number = 1) {
  try {
    const res = await fetch("/api/progress/update", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "study_time", increment: minutes }),
    })
    if (!res.ok) {
      console.warn("Progress tracking (study time) failed", { status: res.status })
    }
  } catch (error) {
    console.error("Error tracking study time:", error)
  }
}

/**
 * Track speaking exercise completion (pronunciation or dialog)
 */
export async function trackSpeakingExercise(exerciseType: "pronunciation" | "dialog" = "pronunciation") {
  try {
    // Update user stats
    const statsRes = await fetch("/api/progress/update", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "speaking_exercise", increment: 1, exerciseType }),
    })
    
    // Update daily challenge
    const challengeRes = await fetch("/api/progress/challenge", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "speaking_exercise", increment: 1 }),
    })
    
    if (!statsRes.ok || !challengeRes.ok) {
      console.warn("Progress tracking (speaking exercise) failed", { 
        statsStatus: statsRes.status, 
        challengeStatus: challengeRes.status 
      })
    }
  } catch (error) {
    console.error("Error tracking speaking exercise:", error)
  }
}

/**
 * Update user stats and streak
 */
export async function updateUserStats() {
  try {
    // This will be handled by database triggers or a separate API
    // For now, we'll update via the challenge endpoint which can trigger stats updates
    const today = new Date().toISOString().split("T")[0]
    
    // Check if we need to update streak
    const response = await fetch("/api/progress/stats")
    if (response.ok) {
      const data = await response.json()
      const lastStudyDate = data.stats?.last_study_date
      
      if (lastStudyDate !== today) {
        // Update last study date and streak
        // This should be done via a separate API endpoint
      }
    }
  } catch (error) {
    console.error("Error updating user stats:", error)
  }
}
