/**
 * Progress tracking utilities
 */

export interface UserStats {
  total_words_learned: number
  total_conversations: number
  total_quiz_questions: number
  total_quiz_correct: number
  total_study_time_minutes: number
  current_streak: number
  longest_streak: number
  last_study_date: string | null
}

export interface DailyChallenge {
  words_goal: number
  words_completed: number
  conversations_goal: number
  conversations_completed: number
  quiz_questions_goal: number
  quiz_questions_completed: number
  completed: boolean
}

/**
 * Calculate quiz accuracy percentage
 */
export function calculateQuizAccuracy(stats: UserStats): number {
  if (stats.total_quiz_questions === 0) return 0
  return Math.round((stats.total_quiz_correct / stats.total_quiz_questions) * 100)
}

/**
 * Check if user studied today
 */
export function studiedToday(lastStudyDate: string | null): boolean {
  if (!lastStudyDate) return false
  const today = new Date().toISOString().split("T")[0]
  return lastStudyDate === today
}

/**
 * Calculate streak (consecutive days with study activity)
 * This calculates the streak based on actual consecutive days from last_study_date
 */
export function calculateStreak(
  lastStudyDate: string | null,
  currentStreak: number
): { newStreak: number; streakBroken: boolean } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // If no previous study date, this is day 1
  if (!lastStudyDate) {
    return { newStreak: 1, streakBroken: false }
  }

  const lastDate = new Date(lastStudyDate)
  lastDate.setHours(0, 0, 0, 0)
  
  const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

  // Safety check: if streak is unreasonably high compared to actual date difference, it's corrupted
  // The streak can't be more than daysDiff + 1 (if we studied every day since last_study_date)
  // Reset it based on actual date difference
  const maxReasonableStreak = daysDiff + 1
  if (currentStreak > maxReasonableStreak + 5) {
    // Streak is clearly wrong (more than 5 days higher than possible), recalculate from scratch
    if (daysDiff === 0) {
      return { newStreak: 1, streakBroken: false }
    } else if (daysDiff === 1) {
      return { newStreak: 2, streakBroken: false }
    } else {
      return { newStreak: 1, streakBroken: true }
    }
  }

  // If studied today (same day), keep the current streak (don't increment)
  if (daysDiff === 0) {
    // If streak is 0, set it to 1 (studying today)
    if (currentStreak === 0) {
      return { newStreak: 1, streakBroken: false }
    }
    return { newStreak: currentStreak, streakBroken: false }
  }
  
  // If studied yesterday (1 day ago), continue the streak
  if (daysDiff === 1) {
    // The streak should be: days since first study day
    // If we studied yesterday and today, that's 2 days minimum
    // If current streak is less than 2, set it to 2
    // Otherwise, increment it (but cap it reasonably)
    if (currentStreak === 0) {
      return { newStreak: 2, streakBroken: false }
    }
    // Only increment if it's reasonable (not already too high)
    if (currentStreak < daysDiff + 10) {
    return { newStreak: currentStreak + 1, streakBroken: false }
    } else {
      // Streak seems too high, recalculate
      return { newStreak: daysDiff + 1, streakBroken: false }
    }
  }
  
  // Streak broken (more than 1 day gap), reset to 1 (today)
  return { newStreak: 1, streakBroken: daysDiff > 1 }
}

/**
 * Update daily challenge progress
 */
export function updateChallengeProgress(
  challenge: DailyChallenge,
  type: "word" | "conversation" | "quiz",
  increment: number = 1
): DailyChallenge {
  const updated = { ...challenge }
  
  switch (type) {
    case "word":
      updated.words_completed = Math.min(
        challenge.words_completed + increment,
        challenge.words_goal
      )
      break
    case "conversation":
      updated.conversations_completed = Math.min(
        challenge.conversations_completed + increment,
        challenge.conversations_goal
      )
      break
    case "quiz":
      updated.quiz_questions_completed = Math.min(
        challenge.quiz_questions_completed + increment,
        challenge.quiz_questions_goal
      )
      break
  }

  // Check if all goals are completed
  updated.completed =
    updated.words_completed >= updated.words_goal &&
    updated.conversations_completed >= updated.conversations_goal &&
    updated.quiz_questions_completed >= updated.quiz_questions_goal

  return updated
}

