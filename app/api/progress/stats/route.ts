import { createClient } from "@/lib/supabase/server"
import { calculateStreak } from "@/lib/progress-tracking"

export async function GET(req: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get or create user stats
    let { data: stats, error } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (error && error.code === "PGRST116") {
      // Stats don't exist, create them
      const { data: newStats, error: createError } = await supabase
        .from("user_stats")
        .insert({ user_id: user.id })
        .select()
        .single()

      if (createError) {
        return Response.json({ error: "Failed to create stats" }, { status: 500 })
      }
      stats = newStats
    } else if (error) {
      return Response.json({ error: "Failed to fetch stats" }, { status: 500 })
    }

    // Auto-fix corrupted streaks
    if (stats) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const lastDate = stats.last_study_date ? new Date(stats.last_study_date) : null
      
      if (lastDate) {
        lastDate.setHours(0, 0, 0, 0)
        const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
        const maxReasonableStreak = daysDiff + 1
        
        // If streak is clearly wrong (more than 5 days higher than possible), fix it
        if (stats.current_streak > maxReasonableStreak + 5) {
          const { newStreak } = calculateStreak(stats.last_study_date, stats.current_streak)
          
          // Update the corrupted streak
          await supabase
            .from("user_stats")
            .update({
              current_streak: newStreak,
              longest_streak: Math.max(stats.longest_streak || 0, newStreak),
            })
            .eq("user_id", user.id)
          
          // Update stats object for response
          stats.current_streak = newStreak
          if (newStreak > (stats.longest_streak || 0)) {
            stats.longest_streak = newStreak
          }
        }
      }
    }

    // Calculate actual counts from database (more accurate than stored values)
    const { count: wordCount } = await supabase
      .from("vocabulary_cards")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)

    const { count: conversationCount } = await supabase
      .from("chat_conversations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)

    // Calculate study time from actual activity if stored time is 0 or seems too low
    // Estimate: 5 minutes per conversation + 1 minute per word + 2 minutes per quiz question
    let calculatedStudyTime = stats?.total_study_time_minutes || 0
    
    if (calculatedStudyTime === 0 || calculatedStudyTime < 5) {
      // Estimate based on activity
      const estimatedFromConversations = (conversationCount || 0) * 5
      const estimatedFromWords = (wordCount || 0) * 1
      const estimatedFromQuiz = (stats?.total_quiz_questions || 0) * 2
      const estimatedTotal = estimatedFromConversations + estimatedFromWords + estimatedFromQuiz
      
      // If we have activity but no recorded time, use the estimate
      if (estimatedTotal > 0 && calculatedStudyTime === 0) {
        calculatedStudyTime = estimatedTotal
        
        // Update the database with the estimated time
        await supabase
          .from("user_stats")
          .update({ total_study_time_minutes: calculatedStudyTime })
          .eq("user_id", user.id)
      } else if (estimatedTotal > calculatedStudyTime) {
        // If estimate is higher than recorded, use the higher value
        calculatedStudyTime = estimatedTotal
        
        // Update the database
        await supabase
          .from("user_stats")
          .update({ total_study_time_minutes: calculatedStudyTime })
          .eq("user_id", user.id)
      }
    }

    // Get vocabulary mastery breakdown
    const { data: vocabulary } = await supabase
      .from("vocabulary_cards")
      .select("mastery_level")
      .eq("user_id", user.id)

    const masteryBreakdown = {
      new: vocabulary?.filter((v) => v.mastery_level === "new").length || 0,
      learning: vocabulary?.filter((v) => v.mastery_level === "learning").length || 0,
      reviewing: vocabulary?.filter((v) => v.mastery_level === "reviewing").length || 0,
      mastered: vocabulary?.filter((v) => v.mastery_level === "mastered").length || 0,
    }

    // Return stats with calculated values (use stored values for quiz stats and streak)
    return Response.json({
      stats: {
        total_words_learned: wordCount || 0,
        total_conversations: conversationCount || 0,
        total_quiz_questions: stats?.total_quiz_questions || 0,
        total_quiz_correct: stats?.total_quiz_correct || 0,
        total_study_time_minutes: calculatedStudyTime,
        total_speaking_exercises: (stats as any)?.total_speaking_exercises || 0,
        current_streak: stats?.current_streak || 0,
        longest_streak: stats?.longest_streak || 0,
        last_study_date: stats?.last_study_date || null,
      },
      masteryBreakdown,
    })
  } catch (error) {
    console.error("Error fetching stats:", error)
    return Response.json({ error: "Internal error" }, { status: 500 })
  }
}

