import { createClient } from "@/lib/supabase/server"

export async function GET(req: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get daily challenges for the last 7 days (for weekly rhythm)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const startDate = sevenDaysAgo.toISOString().split("T")[0]

    const { data: dailyChallenges } = await supabase
      .from("daily_challenges")
      .select("*")
      .eq("user_id", user.id)
      .gte("challenge_date", startDate)
      .order("challenge_date", { ascending: true })

    // Get conversations with timestamps for hourly analysis
    const { data: conversations } = await supabase
      .from("chat_conversations")
      .select("created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100)

    // Get vocabulary cards with timestamps and review data
    const { data: vocabulary } = await supabase
      .from("vocabulary_cards")
      .select("created_at, mastery_level, last_reviewed_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    // Build weekly rhythm data (last 7 days)
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const weeklyRhythm: Array<{
      day: string
      words: number
      minutes: number
      accuracy: number
      conversations: number
    }> = []

    // Initialize with zeros for all 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split("T")[0]
      const dayName = daysOfWeek[date.getDay()]

      // Find challenge for this day
      const challenge = dailyChallenges?.find((c) => c.challenge_date === dateStr)

      // Count words added on this day
      const wordsOnDay = vocabulary?.filter((v) => {
        const vocabDate = v.created_at ? new Date(v.created_at).toISOString().split("T")[0] : null
        return vocabDate === dateStr
      }).length || 0

      // Count words reviewed on this day
      const wordsReviewedOnDay = vocabulary?.filter((v: any) => {
        if (!v.last_reviewed_at) return false
        const reviewDate = new Date(v.last_reviewed_at).toISOString().split("T")[0]
        return reviewDate === dateStr
      }).length || 0

      // Count conversations on this day
      const conversationsOnDay = conversations?.filter((c) => {
        const convDate = c.created_at ? new Date(c.created_at).toISOString().split("T")[0] : null
        return convDate === dateStr
      }).length || 0

      // Estimate study time:
      // - 5 minutes per conversation
      // - 1 minute per word added
      // - 1.5 minutes per word reviewed (review sessions)
      const estimatedMinutes = conversationsOnDay * 5 + wordsOnDay * 1 + wordsReviewedOnDay * 1.5

      // Calculate accuracy for this day
      // Since we don't have per-day quiz history, use overall accuracy if there's quiz activity
      // For days with quiz activity, show overall accuracy; otherwise 0
      let accuracy = 0
      if (challenge?.quiz_questions_completed && challenge.quiz_questions_completed > 0) {
        // Get overall accuracy from stats
        const { data: userStats } = await supabase
          .from("user_stats")
          .select("total_quiz_questions, total_quiz_correct")
          .eq("user_id", user.id)
          .single()
        
        if (userStats && userStats.total_quiz_questions > 0) {
          accuracy = Math.round((userStats.total_quiz_correct / userStats.total_quiz_questions) * 100)
        } else {
          // Fallback: if we have quiz activity but no stats yet, estimate
          accuracy = 85
        }
      }

      weeklyRhythm.push({
        day: dayName,
        words: wordsOnDay,
        minutes: estimatedMinutes,
        accuracy: Math.round(accuracy),
        conversations: conversationsOnDay,
      })
    }

    // Build hourly focus data (last 30 days)
    const hourlyFocus: Array<{ hour: string; pace: number }> = []
    const hourLabels = [
      "6a",
      "8a",
      "10a",
      "12p",
      "2p",
      "4p",
      "6p",
      "8p",
      "10p",
    ]
    const hourRanges = [
      [6, 8],
      [8, 10],
      [10, 12],
      [12, 14],
      [14, 16],
      [16, 18],
      [18, 20],
      [20, 22],
      [22, 24],
    ]

    for (let i = 0; i < hourLabels.length; i++) {
      const [startHour, endHour] = hourRanges[i]
      const activitiesInRange = conversations?.filter((c) => {
        if (!c.created_at) return false
        const hour = new Date(c.created_at).getHours()
        return hour >= startHour && hour < endHour
      }).length || 0

      // Pace = activities per 10 minutes (normalized)
      const pace = Math.min(10, Math.max(0, (activitiesInRange / 30) * 10))

      hourlyFocus.push({
        hour: hourLabels[i],
        pace: Math.round(pace * 10) / 10,
      })
    }

    // Calculate activity mix
    const totalWords = vocabulary?.length || 0
    const totalConversations = conversations?.length || 0
    // Get quiz questions from stats
    const { data: stats } = await supabase
      .from("user_stats")
      .select("total_quiz_questions")
      .eq("user_id", user.id)
      .single()

    const totalQuiz = stats?.total_quiz_questions || 0

    // Normalize to percentages for display
    const maxValue = Math.max(totalWords, totalConversations, totalQuiz, 1)
    const activityMix = [
      {
        label: "Words captured",
        value: Math.round((totalWords / maxValue) * 100),
        actual: totalWords,
      },
      {
        label: "Conversations",
        value: Math.round((totalConversations / maxValue) * 100),
        actual: totalConversations,
      },
      {
        label: "Quiz answers",
        value: Math.round((totalQuiz / maxValue) * 100),
        actual: totalQuiz,
      },
    ]

    return Response.json({
      weeklyRhythm,
      hourlyFocus,
      activityMix,
    })
  } catch (error) {
    console.error("Error fetching history:", error)
    return Response.json({ error: "Internal error" }, { status: 500 })
  }
}

