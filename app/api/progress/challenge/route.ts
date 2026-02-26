import { createClient } from "@/lib/supabase/server"

// Challenge templates - different challenges for different days
const CHALLENGE_TEMPLATES = [
  {
    name: "Balanced Learning",
    words_goal: 5,
    conversations_goal: 1,
    quiz_questions_goal: 10,
    speaking_exercises_goal: 1,
  },
  {
    name: "Vocabulary Focus",
    words_goal: 10,
    conversations_goal: 1,
    quiz_questions_goal: 5,
    speaking_exercises_goal: 1,
  },
  {
    name: "Conversation Master",
    words_goal: 3,
    conversations_goal: 3,
    quiz_questions_goal: 5,
    speaking_exercises_goal: 2,
  },
  {
    name: "Quiz Champion",
    words_goal: 5,
    conversations_goal: 1,
    quiz_questions_goal: 20,
    speaking_exercises_goal: 1,
  },
  {
    name: "Speaking Practice",
    words_goal: 5,
    conversations_goal: 1,
    quiz_questions_goal: 5,
    speaking_exercises_goal: 3,
  },
  {
    name: "Quick Practice",
    words_goal: 3,
    conversations_goal: 1,
    quiz_questions_goal: 5,
    speaking_exercises_goal: 1,
  },
  {
    name: "Intensive Study",
    words_goal: 15,
    conversations_goal: 2,
    quiz_questions_goal: 15,
    speaking_exercises_goal: 2,
  },
]

// Get challenge template based on day of week (ensures variety)
function getChallengeTemplate(date: Date): typeof CHALLENGE_TEMPLATES[0] {
  const dayOfWeek = date.getDay() // 0 = Sunday, 6 = Saturday
  // Use day of week to select template, cycling through them
  const templateIndex = dayOfWeek % CHALLENGE_TEMPLATES.length
  return CHALLENGE_TEMPLATES[templateIndex]
}

export async function GET(req: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const today = new Date()
  const todayStr = today.toISOString().split("T")[0]

  try {
    // Get or create today's challenge
    let { data: challenge, error } = await supabase
      .from("daily_challenges")
      .select("*")
      .eq("user_id", user.id)
      .eq("challenge_date", todayStr)
      .single()

    if (error && error.code === "PGRST116") {
      // Challenge doesn't exist, create it with today's template
      const template = getChallengeTemplate(today)
      const { data: newChallenge, error: createError } = await supabase
        .from("daily_challenges")
        .insert({
          user_id: user.id,
          challenge_date: todayStr,
          words_goal: template.words_goal,
          conversations_goal: template.conversations_goal,
          quiz_questions_goal: template.quiz_questions_goal,
          speaking_exercises_goal: template.speaking_exercises_goal,
        })
        .select()
        .single()

      if (createError) {
        return Response.json({ error: "Failed to create challenge" }, { status: 500 })
      }
      challenge = newChallenge
    } else if (error) {
      return Response.json({ error: "Failed to fetch challenge" }, { status: 500 })
    }

    return Response.json({ challenge })
  } catch (error) {
    console.error("Error fetching challenge:", error)
    return Response.json({ error: "Internal error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { type, increment = 1 } = await req.json()
  const today = new Date().toISOString().split("T")[0]

  if (!type || !["word", "conversation", "quiz", "speaking_exercise"].includes(type)) {
    return Response.json({ error: "Invalid type" }, { status: 400 })
  }

  try {
    // Get or create today's challenge
    let { data: challenge } = await supabase
      .from("daily_challenges")
      .select("*")
      .eq("user_id", user.id)
      .eq("challenge_date", today)
      .single()

    if (!challenge) {
      const { data: newChallenge } = await supabase
        .from("daily_challenges")
        .insert({
          user_id: user.id,
          challenge_date: today,
        })
        .select()
        .single()
      challenge = newChallenge
    }

    if (!challenge) {
      return Response.json({ error: "Failed to get/create challenge" }, { status: 500 })
    }

    const safeIncrement = Math.max(0, Number(increment) || 0)

    // Compute next totals using current values so completion works even when only one field is updated
    const nextWordsCompleted = Math.min(
      (challenge.words_completed || 0) + (type === "word" ? safeIncrement : 0),
      challenge.words_goal
    )
    const nextConversationsCompleted = Math.min(
      (challenge.conversations_completed || 0) + (type === "conversation" ? safeIncrement : 0),
      challenge.conversations_goal
    )
    const nextQuizCompleted = Math.min(
      (challenge.quiz_questions_completed || 0) + (type === "quiz" ? safeIncrement : 0),
      challenge.quiz_questions_goal
    )
    const nextSpeakingCompleted = Math.min(
      ((challenge as any).speaking_exercises_completed || 0) + (type === "speaking_exercise" ? safeIncrement : 0),
      (challenge as any).speaking_exercises_goal || 1
    )

    const updates: Record<string, number> = {
      words_completed: nextWordsCompleted,
      conversations_completed: nextConversationsCompleted,
      quiz_questions_completed: nextQuizCompleted,
      speaking_exercises_completed: nextSpeakingCompleted,
    }

    const completed =
      nextWordsCompleted >= challenge.words_goal &&
      nextConversationsCompleted >= challenge.conversations_goal &&
      nextQuizCompleted >= challenge.quiz_questions_goal &&
      nextSpeakingCompleted >= ((challenge as any).speaking_exercises_goal || 1)

    const { data: updated, error: updateError } = await supabase
      .from("daily_challenges")
      .update({
        ...updates,
        completed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", challenge.id)
      .select()
      .single()

    if (updateError) {
      return Response.json({ error: "Failed to update challenge" }, { status: 500 })
    }

    return Response.json({ challenge: updated })
  } catch (error) {
    console.error("Error updating challenge:", error)
    return Response.json({ error: "Internal error" }, { status: 500 })
  }
}
