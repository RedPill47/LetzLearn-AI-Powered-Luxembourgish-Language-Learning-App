/**
 * Spaced Repetition Algorithm (SM-2 inspired)
 * Calculates next review date based on performance
 */

export type MasteryLevel = "new" | "learning" | "reviewing" | "mastered"

export interface SpacedRepetitionData {
  mastery_level: MasteryLevel
  next_review_date: Date
  review_count: number
  ease_factor: number
  interval_days: number
  last_reviewed_at: Date | null
}

export interface ReviewResult {
  quality: number // 0-5: 0=complete blackout, 5=perfect response
  newData: SpacedRepetitionData
}

/**
 * Calculate next review date based on performance
 * Quality scale: 0-5
 * - 0-1: Complete blackout, reset
 * - 2-3: Incorrect, repeat soon
 * - 4-5: Correct, increase interval
 */
export function calculateNextReview(
  currentData: Partial<SpacedRepetitionData>,
  quality: number
): SpacedRepetitionData {
  const now = new Date()
  
  // Initialize defaults
  let mastery_level: MasteryLevel = currentData.mastery_level || "new"
  let review_count = currentData.review_count || 0
  let ease_factor = currentData.ease_factor || 2.5
  let interval_days = currentData.interval_days || 1

  // Quality 0-1: Complete blackout - reset to beginning
  if (quality <= 1) {
    mastery_level = "new"
    review_count = 0
    ease_factor = Math.max(1.3, ease_factor - 0.2)
    interval_days = 1
  }
  // Quality 2-3: Incorrect - repeat soon
  else if (quality <= 3) {
    if (mastery_level === "new") {
      mastery_level = "learning"
    } else if (mastery_level === "mastered") {
      mastery_level = "reviewing"
    }
    review_count += 1
    ease_factor = Math.max(1.3, ease_factor - 0.15)
    interval_days = Math.max(1, Math.floor(interval_days * 0.5))
  }
  // Quality 4-5: Correct - increase interval
  else {
    review_count += 1
    
    // Update ease factor (slight increase for correct answers)
    if (quality === 5) {
      ease_factor = Math.min(2.5, ease_factor + 0.1)
    }

    // Calculate new interval using SM-2 algorithm
    if (review_count === 1) {
      interval_days = 1
      mastery_level = "learning"
    } else if (review_count === 2) {
      interval_days = 3
      mastery_level = "learning"
    } else {
      interval_days = Math.floor(interval_days * ease_factor)
      if (interval_days >= 30) {
        mastery_level = "mastered"
      } else if (interval_days >= 7) {
        mastery_level = "reviewing"
      } else {
        mastery_level = "learning"
      }
    }
  }

  // Calculate next review date
  const next_review_date = new Date(now)
  next_review_date.setDate(next_review_date.getDate() + interval_days)

  return {
    mastery_level,
    next_review_date,
    review_count,
    ease_factor: Math.round(ease_factor * 100) / 100, // Round to 2 decimals
    interval_days,
    last_reviewed_at: now,
  }
}

/**
 * Get words due for review
 */
export function getWordsDueForReview(
  words: Array<{
    id: string
    next_review_date: string | Date | null
    mastery_level: MasteryLevel
  }>
): Array<{ id: string; mastery_level: MasteryLevel }> {
  const now = new Date()
  
  return words
    .filter((word) => {
      if (!word.next_review_date) return true // Never reviewed
      const reviewDate = new Date(word.next_review_date)
      return reviewDate <= now
    })
    .map((word) => ({
      id: word.id,
      mastery_level: word.mastery_level,
    }))
}

/**
 * Get mastery level display info
 */
export function getMasteryInfo(level: MasteryLevel) {
  const info = {
    new: { label: "New", color: "gray", icon: "🆕" },
    learning: { label: "Learning", color: "blue", icon: "📚" },
    reviewing: { label: "Reviewing", color: "yellow", icon: "🔄" },
    mastered: { label: "Mastered", color: "green", icon: "✅" },
  }
  return info[level]
}

