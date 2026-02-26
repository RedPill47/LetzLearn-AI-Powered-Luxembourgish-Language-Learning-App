import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { conversationId, messages } = await req.json()

  if (!conversationId || !messages || messages.length < 2) {
    return new Response("Invalid request", { status: 400 })
  }

  // Get first few messages to generate title
  // Clean message content to remove formatting markers
  const cleanMessage = (content: string): string => {
    return content
      .replace(/^>>>\s*/gm, '') // Remove >>> at start of lines
      .replace(/^\/\/\/\s*/gm, '') // Remove /// at start of lines
      .replace(/\s*\/\/\/.*$/gm, '') // Remove /// and everything after on same line
      .replace(/\s*>>>.*$/gm, '') // Remove >>> and everything after on same line
      .trim()
  }

  const contextMessages = messages.slice(0, 4).map((m: { role: string; content: string }) => {
    const cleanedContent = cleanMessage(m.content)
    return `${m.role}: ${cleanedContent.slice(0, 200)}`
  }).join("\n")

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `Generate a very short title (3-6 words max) for this Luxembourgish learning conversation. 
The title should capture the main topic or activity.

CRITICAL RULES:
- Return ONLY the title text, nothing else
- NO formatting markers (no >>>, no ///, no quotes, no punctuation at the end)
- NO special characters or symbols
- Just plain text words separated by spaces
- Examples: "Greetings Practice", "Food Vocabulary", "Grammar Verb Conjugation", "Numbers Quiz", "Daily Phrases"

Return ONLY the clean title text.`,
          },
          {
            role: "user",
            content: contextMessages,
          },
        ],
        max_tokens: 20,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      console.error("Groq API error:", await response.text())
      return new Response("Failed to generate title", { status: 500 })
    }

    const data = await response.json()
    let title = data.choices[0]?.message?.content?.trim() || "New Conversation"
    
    // Clean the title to remove any formatting markers that might have slipped through
    title = title
      .replace(/^>>>\s*/, '') // Remove >>> at start
      .replace(/^\/\/\/\s*/, '') // Remove /// at start
      .replace(/\s*\/\/\/.*$/, '') // Remove /// and everything after
      .replace(/\s*>>>.*$/, '') // Remove >>> and everything after
      .replace(/^["']|["']$/g, '') // Remove quotes
      .replace(/[.,;:!?]+$/, '') // Remove trailing punctuation
      .trim()
    
    // Fallback if title is empty or too short
    if (!title || title.length < 2) {
      title = "New Conversation"
    }
    
    // Limit title length
    if (title.length > 50) {
      title = title.slice(0, 47) + "..."
    }

    // Update the conversation title in the database
    const { error } = await supabase
      .from("chat_conversations")
      .update({ title })
      .eq("id", conversationId)
      .eq("user_id", user.id)

    if (error) {
      console.error("Database update error:", error)
      return new Response("Failed to update title", { status: 500 })
    }

    return Response.json({ title })
  } catch (error) {
    console.error("Title generation error:", error)
    return new Response("Internal error", { status: 500 })
  }
}

