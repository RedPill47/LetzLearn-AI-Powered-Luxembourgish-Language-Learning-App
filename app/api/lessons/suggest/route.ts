import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const maxDuration = 30

export async function POST(req: Request) {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get all available content from ChromaDB to suggest lessons
    const { getRAGContext } = await import("@/lib/rag/chromadb")
    
    console.log("📚 Fetching learning materials for lesson suggestions...")
    
    // Query for general content to get an overview of available lessons
    const generalContext = await getRAGContext("general", 10, true) // Force refresh to get diverse content
    
    console.log("🤖 Generating lesson suggestions from content...")
    
    // Use AI to extract lesson suggestions from the content
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are a Luxembourgish language learning assistant. Based on the learning materials provided, suggest 6-8 specific lessons that would be good for a beginner to focus on today.

Format your response as a JSON array of lesson objects, each with:
- id: a short identifier (lowercase, underscores, e.g., "greetings_basics")
- title: a clear, engaging lesson title (e.g., "Greetings and Farewells")
- description: a brief description of what the student will learn (1-2 sentences)
- difficulty: "beginner" or "intermediate"

Example format:
[
  {
    "id": "greetings_basics",
    "title": "Greetings and Farewells",
    "description": "Learn how to say hello, goodbye, and basic greetings in Luxembourgish. Practice common phrases like 'Moien', 'Äddi', and 'Gudde Moien'.",
    "difficulty": "beginner"
  }
]

Return ONLY the JSON array, no other text.`,
          },
          {
            role: "user",
            content: `Based on these learning materials, suggest 6-8 lessons for today:

${generalContext}

Return a JSON array of lesson suggestions.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    })

    if (!groqResponse.ok) {
      throw new Error("Failed to get lesson suggestions")
    }

    const data = await groqResponse.json()
    const content = data.choices[0]?.message?.content || "[]"
    
    console.log("✅ Received lesson suggestions from AI")
    
    // Parse JSON response
    let lessons
    try {
      // Extract JSON from response (handle cases where AI adds extra text)
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        lessons = JSON.parse(jsonMatch[0])
      } else {
        lessons = JSON.parse(content)
      }
      console.log(`📝 Parsed ${lessons.length} lesson suggestions`)
    } catch (error) {
      console.error("Failed to parse lesson suggestions:", error)
      // Fallback to default lessons
      lessons = [
        {
          id: "greetings_basics",
          title: "Greetings and Farewells",
          description: "Learn how to say hello, goodbye, and basic greetings in Luxembourgish.",
          difficulty: "beginner",
        },
        {
          id: "introductions",
          title: "Introducing Yourself",
          description: "Learn how to introduce yourself and ask about others in Luxembourgish.",
          difficulty: "beginner",
        },
        {
          id: "numbers_dates",
          title: "Numbers and Dates",
          description: "Master numbers, dates, and time expressions in Luxembourgish.",
          difficulty: "beginner",
        },
      ]
    }

    return NextResponse.json({ lessons })
  } catch (error) {
    console.error("Error generating lesson suggestions:", error)
    // Return fallback lessons
    return NextResponse.json({
      lessons: [
        {
          id: "greetings_basics",
          title: "Greetings and Farewells",
          description: "Learn how to say hello, goodbye, and basic greetings in Luxembourgish.",
          difficulty: "beginner",
        },
        {
          id: "introductions",
          title: "Introducing Yourself",
          description: "Learn how to introduce yourself and ask about others in Luxembourgish.",
          difficulty: "beginner",
        },
        {
          id: "numbers_dates",
          title: "Numbers and Dates",
          description: "Master numbers, dates, and time expressions in Luxembourgish.",
          difficulty: "beginner",
        },
        {
          id: "shopping",
          title: "Shopping and Stores",
          description: "Learn vocabulary and phrases for shopping in Luxembourgish.",
          difficulty: "beginner",
        },
        {
          id: "work_professions",
          title: "Work and Professions",
          description: "Learn how to talk about work, jobs, and professions in Luxembourgish.",
          difficulty: "intermediate",
        },
        {
          id: "daily_routine",
          title: "Daily Routine",
          description: "Learn how to describe your daily activities and routines in Luxembourgish.",
          difficulty: "beginner",
        },
      ],
    })
  }
}

