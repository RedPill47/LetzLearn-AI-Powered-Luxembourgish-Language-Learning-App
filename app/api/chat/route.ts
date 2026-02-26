import { createClient } from "@/lib/supabase/server"
import { getQuizPrompt, getSystemPrompt } from "@/lib/ai/luxembourgish-prompts"

export const maxDuration = 30

export async function POST(req: Request) {
  const supabase = await createClient()

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body
  try {
    body = await req.json()
  } catch (error) {
    return Response.json({ error: "Invalid request body", code: 400, retryable: false }, { status: 400 })
  }

  const {
    messages,
    conversationId,
    learningMode,
    luxItUpMode,
    quizMode,
    quizDifficulty,
    quizPhase,
    topic, // Topic for RAG context (cached per topic)
    forceRefreshRAG, // Force refresh RAG cache
  }: {
    messages: Array<{ role: string; content: string }>
    conversationId: string
    learningMode: string
    luxItUpMode?: boolean
    quizMode?: boolean
    quizDifficulty?: number
    quizPhase?: string
    topic?: string
    forceRefreshRAG?: boolean
  } = body

  // Input validation
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "Messages array is required and cannot be empty", code: 400, retryable: false }, { status: 400 })
  }

  if (!conversationId || typeof conversationId !== "string") {
    return Response.json({ error: "Valid conversation ID is required", code: 400, retryable: false }, { status: 400 })
  }

  if (!learningMode || typeof learningMode !== "string") {
    return Response.json({ error: "Valid learning mode is required", code: 400, retryable: false }, { status: 400 })
  }

  // Validate message structure
  for (const msg of messages) {
    if (!msg.role || !msg.content || typeof msg.content !== "string") {
      return Response.json({ error: "Invalid message format", code: 400, retryable: false }, { status: 400 })
    }
    if (msg.content.length > 10000) {
      return Response.json({ error: "Message too long (max 10,000 characters)", code: 400, retryable: false }, { status: 400 })
    }
  }

  // Get RAG context (cached per topic, only queries when topic changes)
  let ragContext = ""
  if (topic && !quizMode) {
    // Only use RAG in non-quiz mode
    try {
      const { getRAGContext } = await import("@/lib/rag/chromadb")
      ragContext = await getRAGContext(topic, 5, forceRefreshRAG || false)
      if (ragContext) {
        ragContext = `\n\nRelevant context from learning materials for "${topic}":\n${ragContext}`
      }
    } catch (error) {
      console.warn("RAG context unavailable, continuing without it:", error)
    }
  }

  // Build system prompt
  let systemPrompt: string
  if (quizMode) {
    // Quiz mode uses its own dedicated prompt (no >>> formatting)
    // Quiz adapts to the selected learning mode (conversation, grammar, vocabulary)
    const safeDifficulty = Math.min(3, Math.max(1, Number(quizDifficulty) || 1))
    systemPrompt = `You are a Luxembourgish language quiz master. You help beginners learn through quick, engaging quizzes.

${getQuizPrompt(safeDifficulty, learningMode, luxItUpMode)}

Current quiz phase: ${quizPhase || "question"}.`
  } else {
    // Normal conversation/grammar/vocabulary mode
    systemPrompt = getSystemPrompt(learningMode)

    if (luxItUpMode) {
      systemPrompt += `

LUX IT UP MODE - CRITICAL RULES:
You MUST respond ONLY in Luxembourgish. This is non-negotiable.

ABSOLUTE RULES:
1. ZERO English words allowed in your response - not even one word
2. NO translations, NO explanations in English, NO English follow-up questions
3. Write EVERYTHING in Luxembourgish only
4. If you want to ask "how was your day?" - write it in Luxembourgish: "Wéi war däin Dag?"
5. The UI automatically provides translations - you must NOT include them

WRONG (includes English):
"Mir sinn fro! We're happy to see you!"

CORRECT (Luxembourgish only):
"Mir sinn fro, dech ze gesinn! Wéi war däin Dag?"

Keep responses beginner-friendly with simple Luxembourgish. Add follow-up questions IN LUXEMBOURGISH to keep the conversation going.`
    }
  }

  // Add RAG context if available
  if (ragContext) {
    systemPrompt += ragContext
  }

  // Format messages for Groq API
  const groqMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
  ]

  try {
    // Call Groq API directly
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: groqMessages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: true,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = "AI service error"
      let statusCode = 500

      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.error?.message || errorData.message || errorMessage
        
        // Handle specific error types
        if (response.status === 401) {
          errorMessage = "API authentication failed. Please check your API key."
          statusCode = 401
        } else if (response.status === 429) {
          errorMessage = "Rate limit exceeded. Please wait a moment and try again."
          statusCode = 429
        } else if (response.status === 503) {
          errorMessage = "AI service is temporarily unavailable. Please try again in a moment."
          statusCode = 503
        } else if (response.status >= 500) {
          errorMessage = "AI service error. Please try again in a moment."
        }
      } catch (e) {
        // If error response isn't JSON, use the text or default message
        if (errorText) {
          console.error("Groq API error (non-JSON):", errorText)
        }
      }

      console.error("Groq API error:", errorMessage)
      return Response.json({ 
        error: errorMessage,
        code: statusCode,
        retryable: statusCode !== 401 // Can retry unless it's auth error
      }, { status: statusCode })
    }

    // Create a transform stream to handle the SSE response
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        let fullAssistantMessage = ""

        if (!reader) {
          controller.close()
          return
        }

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value)
            const lines = chunk.split("\n")

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6)
                if (data === "[DONE]") continue

                try {
                  const parsed = JSON.parse(data)
                  const content = parsed.choices?.[0]?.delta?.content
                  if (content) {
                    fullAssistantMessage += content
                    // Send the chunk to the client
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`))
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }

          // Save messages to database after streaming completes
          const lastUserMessage = messages[messages.length - 1]
          if (lastUserMessage) {
            await supabase.from("chat_messages").insert({
              conversation_id: conversationId,
              user_id: user.id,
              role: "user",
              content: lastUserMessage.content,
            })
          }

          // Save assistant message
          await supabase.from("chat_messages").insert({
            conversation_id: conversationId,
            user_id: user.id,
            role: "assistant",
            content: fullAssistantMessage,
          })

          // Update conversation timestamp
          await supabase
            .from("chat_conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", conversationId)

          controller.close()
        } catch (error) {
          console.error("Stream error:", error)
          controller.error(error)
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("Chat API error:", error)
    
    let errorMessage = "Failed to process chat request"
    let retryable = true

    if (error instanceof Error) {
      if (error.message.includes("fetch") || error.message.includes("network")) {
        errorMessage = "Network error. Please check your internet connection and try again."
      } else if (error.message.includes("timeout")) {
        errorMessage = "Request timed out. Please try again."
      } else if (error.message.includes("ENOTFOUND") || error.message.includes("ECONNREFUSED")) {
        errorMessage = "Cannot connect to AI service. Please try again in a moment."
      } else {
        errorMessage = error.message || errorMessage
      }
    }

    return Response.json({ 
      error: errorMessage,
      code: 500,
      retryable
    }, { status: 500 })
  }
}
