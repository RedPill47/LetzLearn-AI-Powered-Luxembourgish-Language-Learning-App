import { createClient } from "@/lib/supabase/server"
import { calculateStreak } from "@/lib/progress-tracking"

/**
 * API endpoint to fix corrupted streaks
 * This recalculates the streak based on last_study_date
 */
export async function POST(req: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get current stats
    const { data: stats } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (!stats) {
      return Response.json({ error: "Stats not found" }, { status: 404 })
    }

    // Recalculate streak from scratch based on last_study_date
    const { newStreak } = calculateStreak(stats.last_study_date, stats.current_streak || 0)

    // Update the streak
    const { error: updateError } = await supabase
      .from("user_stats")
      .update({
        current_streak: newStreak,
        longest_streak: Math.max(stats.longest_streak || 0, newStreak),
      })
      .eq("user_id", user.id)

    if (updateError) {
      console.error("Update error:", updateError)
      return Response.json({ error: "Failed to update streak" }, { status: 500 })
    }

    return Response.json({
      success: true,
      oldStreak: stats.current_streak,
      newStreak,
    })
  } catch (error) {
    console.error("Error fixing streak:", error)
    return Response.json({ error: "Internal error" }, { status: 500 })
  }
}

