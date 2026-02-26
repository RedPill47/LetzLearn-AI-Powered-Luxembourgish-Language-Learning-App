import { createClient } from "@/lib/supabase/server"

export async function GET(req: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const ids = searchParams.get("ids")

  try {
    let query = supabase
      .from("vocabulary_cards")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (ids) {
      const idArray = ids.split(",").filter(Boolean)
      query = query.in("id", idArray)
    }

    const { data: words, error } = await query

    if (error) {
      return Response.json({ error: "Failed to fetch words" }, { status: 500 })
    }

    return Response.json(words || [])
  } catch (error) {
    console.error("Error fetching vocabulary:", error)
    return Response.json({ error: "Internal error" }, { status: 500 })
  }
}

