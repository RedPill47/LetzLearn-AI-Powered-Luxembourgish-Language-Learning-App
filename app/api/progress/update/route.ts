import { createClient } from "@/lib/supabase/server"
import { calculateStreak } from "@/lib/progress-tracking"

export async function POST(req: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { type, increment = 1, correct = false, exerciseType } = await req.json()
  const parsedIncrement = Number(increment)
  const safeIncrement = Number.isFinite(parsedIncrement) ? parsedIncrement : 1
  const positiveIncrement = Math.max(0, safeIncrement)

  if (!type || !["word", "conversation", "quiz", "study_time", "speaking_exercise"].includes(type)) {
    return Response.json({ error: "Invalid type" }, { status: 400 })
  }

  try {
    // Get current stats
    let { data: stats } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", user.id)
      .single()

    // Create stats if they don't exist
    if (!stats) {
      const { data: newStats } = await supabase
        .from("user_stats")
        .insert({ user_id: user.id })
        .select()
        .single()
      stats = newStats
    }

    if (!stats) {
      return Response.json({ error: "Failed to get/create stats" }, { status: 500 })
    }

    const today = new Date().toISOString().split("T")[0]
    const updates: Record<string, any> = {}

    // Track if we should update streak (only for actual new activity)
    let shouldUpdateStreak = false

    // Update based on type
    if (type === "word") {
      // Count actual vocabulary words
      const { count } = await supabase
        .from("vocabulary_cards")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
      
      const newCount = count || 0
      const oldCount = stats.total_words_learned || 0
      
      // Only update streak if word count actually increased (new word added)
      if (newCount > oldCount) {
        shouldUpdateStreak = true
      }
      
      updates.total_words_learned = newCount
    } else if (type === "conversation") {
      // Count actual conversations
      const { count } = await supabase
        .from("chat_conversations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
      
      const newCount = count || 0
      const oldCount = stats.total_conversations || 0
      
      // Only update streak if conversation count actually increased (new conversation)
      if (newCount > oldCount) {
        shouldUpdateStreak = true
      }
      
      updates.total_conversations = newCount
    } else if (type === "quiz") {
      // Update quiz stats
      updates.total_quiz_questions = (stats.total_quiz_questions || 0) + positiveIncrement
      if (correct) {
        updates.total_quiz_correct = (stats.total_quiz_correct || 0) + positiveIncrement
      }
      // Quiz activity always counts as study activity
      shouldUpdateStreak = true
    } else if (type === "study_time") {
      // Update study time (minutes)
      updates.total_study_time_minutes = (stats.total_study_time_minutes || 0) + positiveIncrement
      // Study time always counts as study activity
      shouldUpdateStreak = true
    } else if (type === "speaking_exercise") {
      // Update speaking exercises count
      // Note: This requires adding total_speaking_exercises column to user_stats table
      // ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS total_speaking_exercises INTEGER DEFAULT 0;
      const currentCount = (stats as any).total_speaking_exercises || 0
      updates.total_speaking_exercises = currentCount + positiveIncrement
      // Speaking exercises count as study activity
      shouldUpdateStreak = true
      // Also track study time (estimate 3-5 minutes per exercise)
      const estimatedMinutes = exerciseType === "dialog" ? 5 : 3
      updates.total_study_time_minutes = (stats.total_study_time_minutes || 0) + estimatedMinutes
    }

    // Update streak and last study date (only for meaningful activities)
    if (shouldUpdateStreak) {
    const lastStudyDate = stats.last_study_date
    const { newStreak } = calculateStreak(lastStudyDate, stats.current_streak || 0)
    
    updates.current_streak = newStreak
    updates.last_study_date = today
    
    // Update longest streak if current is longer
    if (newStreak > (stats.longest_streak || 0)) {
      updates.longest_streak = newStreak
      }
    }

    // Update stats
    const { error: updateError } = await supabase
      .from("user_stats")
      .update(updates)
      .eq("user_id", user.id)

    if (updateError) {
      console.error("Update error:", updateError)
      return Response.json({ error: "Failed to update stats" }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error("Error updating stats:", error)
    return Response.json({ error: "Internal error" }, { status: 500 })
  }
}
