import { createClient } from "@/lib/supabase/server"
import { getWordsDueForReview } from "@/lib/spaced-repetition"

export async function GET(req: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { data: words, error } = await supabase
      .from("vocabulary_cards")
      .select("id, next_review_date, mastery_level")
      .eq("user_id", user.id)

    if (error) {
      return Response.json({ error: "Failed to fetch words" }, { status: 500 })
    }

    const dueWords = getWordsDueForReview(words || [])
    
    return Response.json({ count: dueWords.length, words: dueWords })
  } catch (error) {
    console.error("Error fetching due words:", error)
    return Response.json({ error: "Internal error" }, { status: 500 })
  }
}

