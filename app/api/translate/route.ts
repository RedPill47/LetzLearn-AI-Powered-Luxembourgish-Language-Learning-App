import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { text } = await req.json()

  if (!text || typeof text !== "string") {
    return Response.json({ error: "No text provided" }, { status: 400 })
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are a Luxembourgish-English translator. Translate the given text.

RULES:
- Respond with ONLY a JSON object, nothing else before or after
- Format: {"translation": "...", "note": "..."}
- Translation: the English meaning (or Luxembourgish if input is English)
- Note: one short sentence about usage (max 15 words)
- No explanations, no alternatives, no extra text

Example input: "Merci"
Example output: {"translation": "Thank you", "note": "Common polite expression used in all situations."}`,
          },
          {
            role: "user",
            content: text,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    })

    if (!response.ok) {
      console.error("Groq API error:", await response.text())
      return Response.json({ error: "AI service error" }, { status: 500 })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ""

    // Extract JSON from the response (AI sometimes adds extra text)
    const extractJson = (text: string): { translation: string; note: string } | null => {
      // Try to find JSON object in the text
      const jsonMatch = text.match(/\{[\s\S]*?"translation"[\s\S]*?"note"[\s\S]*?\}/)
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0])
          return {
            translation: String(parsed.translation || "").trim(),
            note: String(parsed.note || "").trim(),
          }
        } catch {
          // JSON found but malformed
        }
      }
      
      // Try direct parse
      try {
        const parsed = JSON.parse(text.trim())
        return {
          translation: String(parsed.translation || "").trim(),
          note: String(parsed.note || "").trim(),
        }
      } catch {
        // Not valid JSON
      }
      
      return null
    }

    const extracted = extractJson(content)
    
    if (extracted) {
      return Response.json(extracted)
    }
    
    // Fallback: treat the whole content as translation
    return Response.json({
      translation: content.slice(0, 200).trim(),
      note: "",
    })
  } catch (error) {
    console.error("Translation error:", error)
    return Response.json({ error: "Translation failed" }, { status: 500 })
  }
}

