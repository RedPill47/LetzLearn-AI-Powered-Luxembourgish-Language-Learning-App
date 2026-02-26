import { createClient } from "@/lib/supabase/server"
import { calculateNextReview } from "@/lib/spaced-repetition"

export async function POST(req: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { wordId, quality } = await req.json()

  if (!wordId || quality === undefined || quality < 0 || quality > 5) {
    return Response.json({ error: "Invalid request" }, { status: 400 })
  }

  try {
    // Get current word data
    const { data: word, error: fetchError } = await supabase
      .from("vocabulary_cards")
      .select("*")
      .eq("id", wordId)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !word) {
      return Response.json({ error: "Word not found" }, { status: 404 })
    }

    // Calculate new spaced repetition data
    const newData = calculateNextReview(
      {
        mastery_level: word.mastery_level || "new",
        review_count: word.review_count || 0,
        ease_factor: word.ease_factor || 2.5,
        interval_days: word.interval_days || 1,
        last_reviewed_at: word.last_reviewed_at ? new Date(word.last_reviewed_at) : null,
      },
      quality
    )

    // Update word in database
    const { error: updateError } = await supabase
      .from("vocabulary_cards")
      .update({
        mastery_level: newData.mastery_level,
        next_review_date: newData.next_review_date.toISOString(),
        review_count: newData.review_count,
        ease_factor: newData.ease_factor,
        interval_days: newData.interval_days,
        last_reviewed_at: newData.last_reviewed_at?.toISOString() || new Date().toISOString(),
      })
      .eq("id", wordId)
      .eq("user_id", user.id)

    if (updateError) {
      console.error("Update error:", updateError)
      return Response.json({ error: "Failed to update word" }, { status: 500 })
    }

    // Note: User stats are updated via the progress tracking system
    // No need to update here as review doesn't add new words

    return Response.json({ success: true, data: newData })
  } catch (error) {
    console.error("Review error:", error)
    return Response.json({ error: "Internal error" }, { status: 500 })
  }
}

