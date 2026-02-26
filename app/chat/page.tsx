"use client"

import { useEffect, useState, useRef, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { ChatHeader } from "@/components/chat/chat-header"
import { MessageBubble } from "@/components/chat/message-bubble"
import { LearningModeDialog } from "@/components/chat/learning-mode-dialog"
import { VocabularyDialog } from "@/components/chat/vocabulary-dialog"
import { ConversationSidebar } from "@/components/chat/conversation-sidebar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Loader2, RotateCcw, Target, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { trackWordAdded, trackConversation, trackQuizQuestion, trackStudyTime } from "@/lib/update-progress"
import { DailyChallenge } from "@/components/progress/daily-challenge"
import { TopicSelector } from "@/components/chat/topic-selector"
import { LessonSelector } from "@/components/chat/lesson-selector"

type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  translation?: string
}

type Conversation = {
  id: string
  title: string
  learning_mode: string
  updated_at: string
  message_preview?: string
}

type QuizPhase = "off" | "question" | "answer" | "feedback" | "next" | "summary"

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [learningMode, setLearningMode] = useState("conversation")
  const [currentTopic, setCurrentTopic] = useState<string | null>(null)
  const [currentLessonTitle, setCurrentLessonTitle] = useState<string | null>(null)
  const [showTopicSelector, setShowTopicSelector] = useState(false)
  const [showLessonSelector, setShowLessonSelector] = useState(false)
  const [luxItUpMode, setLuxItUpMode] = useState(false)
  const [quizMode, setQuizMode] = useState(false)
  const [quizDifficulty, setQuizDifficulty] = useState<number>(1)
  const [quizStartIndex, setQuizStartIndex] = useState<number | null>(null)
  const [showQuizSummary, setShowQuizSummary] = useState(false)
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 })
  const [quizStreak, setQuizStreak] = useState(0)
  const [showLearningModeDialog, setShowLearningModeDialog] = useState(false)
  const [showVocabularyDialog, setShowVocabularyDialog] = useState(false)
  const [selectedWord, setSelectedWord] = useState("")
  const [input, setInput] = useState("")
  const [userId, setUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [lastError, setLastError] = useState<{ message: string; retryable: boolean; failedMessage?: Message } | null>(null)
  const [isScrolled, setIsScrolled] = useState(false)
  const [showDailyChallenge, setShowDailyChallenge] = useState(true)
  const mainContentRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const processedQuizFeedbackIds = useRef<Set<string>>(new Set())
  const lastActivityRef = useRef<number>(Date.now())

  const looksLuxembourgish = (text: string) => /[ëéäöüÄÖÜ]|^(Ech|Mir|Dir|Wéi|Moien|Äddi|Merci|Wei|hues)\b/i.test(text)
  const looksEnglish = (text: string) => {
    const englishIndicators =
      /^(I |I'm|You |You're|We |They |It |It's|The |A |An |How |What |This |That |Hello|Thank|Good |To |For |My |Your |Is |Are |Was |Were |Have |Has |Do |Does |Can |Could |Would |Should |Will )/i
    const hasEnglishWords =
      /\b(the|is|are|was|were|have|has|do|does|can|could|would|should|will|and|or|but|for|with|this|that|these|those|from|into|your|my|his|her|its|our|their|been|being|am|welcome|help|thank|please|hello|good|great|nice)\b/i
    return (englishIndicators.test(text) || hasEnglishWords.test(text)) && !looksLuxembourgish(text)
  }

  const enforceLuxOnly = (text: string) => {
    const lines = text.split("\n")
    const kept: string[] = []

    for (const rawLine of lines) {
      const trimmed = rawLine.trim()
      if (!trimmed) {
        if (kept.length === 0 || kept[kept.length - 1] !== "") {
          kept.push("")
        }
        continue
      }

      const clean = trimmed.startsWith(">>>") ? trimmed.slice(3).trim() : trimmed

      if (clean.includes("///")) {
        const [luxPart] = clean.split("///")
        if (luxPart && looksLuxembourgish(luxPart)) {
          kept.push(luxPart.trim())
        }
        continue
      }

      if (looksEnglish(clean) && !looksLuxembourgish(clean)) {
        continue
      }

      kept.push(trimmed)
    }

    return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim()
  }

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load persisted Lux It Up preference
  useEffect(() => {
    const saved = localStorage.getItem("lux-it-up-mode")
    if (saved) {
      setLuxItUpMode(saved === "true")
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("lux-it-up-mode", luxItUpMode ? "true" : "false")
  }, [luxItUpMode])

  useEffect(() => {
    const savedQuiz = localStorage.getItem("quiz-mode")
    const savedDifficulty = localStorage.getItem("quiz-difficulty")
    if (savedQuiz) {
      setQuizMode(savedQuiz === "true")
    }
    if (savedDifficulty) {
      const parsed = Number(savedDifficulty)
      if (parsed >= 1 && parsed <= 3) {
        setQuizDifficulty(parsed)
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("quiz-mode", quizMode ? "true" : "false")
    localStorage.setItem("quiz-difficulty", quizDifficulty.toString())
  }, [quizMode, quizDifficulty])

  useEffect(() => {
    processedQuizFeedbackIds.current.clear()
  }, [quizStartIndex, quizMode])

  // Load all conversations for sidebar
  const loadConversations = useCallback(async (uid: string) => {
    const supabase = createClient()
    const { data: convs } = await supabase
      .from("chat_conversations")
      .select("id, title, learning_mode, updated_at")
      .eq("user_id", uid)
      .order("updated_at", { ascending: false })

    if (convs) {
      // Get first message preview for each conversation
      const convsWithPreview: Conversation[] = await Promise.all(
        convs.map(async (conv) => {
          try {
            const { data: messages, error } = await supabase
            .from("chat_messages")
            .select("content")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: true })
            .limit(1)

            // Handle errors gracefully - if RLS blocks or no messages, just skip preview
            if (error || !messages || messages.length === 0) {
          return {
            ...conv,
                message_preview: undefined,
              }
            }

            return {
              ...conv,
              message_preview: messages[0]?.content?.slice(0, 50) || undefined,
            }
          } catch (error) {
            // If query fails (e.g., RLS policy issue), just return conversation without preview
            console.warn("Failed to load message preview for conversation", conv.id, error)
            return {
              ...conv,
              message_preview: undefined,
            }
          }
        })
      )
      setConversations(convsWithPreview)
    }
  }, [])

  // Load messages for a specific conversation
  const loadConversationMessages = useCallback(async (convId: string) => {
    const supabase = createClient()
    const { data: existingMessages } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })

    if (existingMessages) {
      setMessages(
        existingMessages.map((msg) => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.content,
        }))
      )
    } else {
      setMessages([])
    }
  }, [])

  useEffect(() => {
    const initChat = async () => {
      const supabase = createClient()

      // Get user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }
      setUserId(user.id)

      // Load all conversations
      await loadConversations(user.id)

      // Get or create latest conversation
      const { data: existingConversations } = await supabase
        .from("chat_conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)

      if (existingConversations && existingConversations.length > 0) {
        const convId = existingConversations[0].id
        setConversationId(convId)
        setLearningMode(existingConversations[0].learning_mode)
        // Load topic and lesson title from localStorage if exists
        const savedTopic = localStorage.getItem(`topic-${convId}`)
        const savedLessonTitle = localStorage.getItem(`lesson-title-${convId}`)
        if (savedTopic) {
          setCurrentTopic(savedTopic)
          if (savedLessonTitle) {
            setCurrentLessonTitle(savedLessonTitle)
          }
        } else {
          // Show lesson selector if no topic set
          setShowLessonSelector(true)
        }
        await loadConversationMessages(convId)
      } else {
        // Create new conversation
        const { data: newConversation } = await supabase
          .from("chat_conversations")
          .insert({
            user_id: user.id,
            title: "New Conversation",
            learning_mode: "conversation", // Default to conversation mode
          })
          .select()
          .single()

        if (newConversation) {
          setConversationId(newConversation.id)
          await loadConversations(user.id)
          // Show lesson selector for new conversation
          setShowLessonSelector(true)
        }
      }
    }

    initChat()
  }, [router, loadConversations, loadConversationMessages]) // Only run once on mount - dependencies are stable

  useEffect(() => {
    if (quizMode) {
      if (quizStartIndex === null || (quizStartIndex === 0 && messages.length > 0)) {
        setQuizStartIndex(messages.length)
      }
    } else if (!quizMode && quizStartIndex !== null) {
      setQuizStartIndex(null)
    }
    if (!quizMode) {
      setShowQuizSummary(false)
    }
  }, [quizMode, messages.length, quizStartIndex])

  const getImmersionStage = (assistantIndex: number) => {
    if (assistantIndex <= 2) return 0 // show translation
    if (assistantIndex <= 5) return 1 // hover to reveal
    return 2 // mostly hidden, immersion up
  }

  const quizMessages = useMemo(() => {
    return quizStartIndex !== null ? messages.slice(quizStartIndex) : []
  }, [messages, quizStartIndex])

  const quizPhase: QuizPhase = useMemo(() => {
    if (!quizMode) return "off"
    if (showQuizSummary) return "summary"
    if (quizMessages.length === 0) return "question"
    
    const last = quizMessages[quizMessages.length - 1]
    
    // If loading, we're waiting for AI feedback
    if (isLoading) return "feedback"
    
    // If last message is assistant, check if it's a question or feedback
    if (last?.role === "assistant") {
      // Check if this assistant message contains feedback (starts with "Correct" or "Not quite")
      const content = last.content.toLowerCase().trim()
      const firstLine = content.split("\n")[0]
      const hasFeedback = 
        firstLine.startsWith("correct") ||
        firstLine.startsWith("not quite") ||
        firstLine.startsWith("incorrect") ||
        firstLine.match(/^(wrong|right|that's correct|that's not)/i)
      
      // If it has feedback, we're ready for next question
      if (hasFeedback) return "next"
      // Otherwise, it's a question waiting for user answer
      return "answer"
    }
    
    // If last message is user, we're waiting for AI feedback
    if (last?.role === "user") {
      return "feedback"
    }
    
    // Default to question if unclear
    return "question"
  }, [quizMode, quizMessages, isLoading, showQuizSummary])

  // Parse AI feedback to detect correct/incorrect answers
  const parseQuizFeedback = useCallback((content: string): "correct" | "incorrect" | null => {
    const lowerContent = content.toLowerCase().trim()
    const firstLine = lowerContent.split("\n")[0].trim()
    
    // Check for correct indicators (more patterns)
    if (
      firstLine.startsWith("correct") ||
      firstLine.includes("correct!") ||
      firstLine.includes("correct.") ||
      firstLine.match(/^correct[.!]/i) ||
      firstLine.match(/^(yes|right|that's correct|exactly|perfect|nailed it|well done)/i) ||
      lowerContent.includes("that is correct") ||
      lowerContent.includes("you're correct") ||
      lowerContent.includes("you are correct") ||
      lowerContent.includes("good job, that's right")
    ) {
      return "correct"
    }
    
    // Check for incorrect indicators (more patterns)
    if (
      firstLine.startsWith("not quite") ||
      firstLine.startsWith("incorrect") ||
      firstLine.includes("not quite.") ||
      firstLine.match(/^(wrong|no,|that's not|that's incorrect|not right|almost|close but)/i)
    ) {
      return "incorrect"
    }
    
    return null
  }, [])

  // Track quiz score and streak from AI feedback
  useEffect(() => {
    if (!quizMode || quizStartIndex === null) return

    // Get messages after quiz started (both user and assistant)
    const quizMessages = messages.slice(quizStartIndex)
    
    if (quizMessages.length === 0) return

    // Process messages in pairs: user answer -> assistant feedback
    let correctCount = 0
    let totalCount = 0
    let currentStreak = 0

    // Look for feedback patterns: find assistant messages that come after user messages
    for (let i = 1; i < quizMessages.length; i++) {
      const prevMessage = quizMessages[i - 1]
      const currentMessage = quizMessages[i]
      
      // If previous was user and current is assistant, check for feedback
      if (prevMessage.role === "user" && currentMessage.role === "assistant") {
        const feedback = parseQuizFeedback(currentMessage.content)
        
        if (feedback) {
          // Track quiz question progress (only once per question)
          const feedbackId = currentMessage.id
          if (feedbackId && !processedQuizFeedbackIds.current.has(feedbackId)) {
            void trackQuizQuestion(feedback === "correct")
            processedQuizFeedbackIds.current.add(feedbackId)
          }
          
          if (feedback === "correct") {
            correctCount++
            totalCount++
            currentStreak++
          } else if (feedback === "incorrect") {
            totalCount++
            currentStreak = 0
          }
        }
        // If no clear feedback detected, don't count it
      }
    }

    setQuizScore({ correct: correctCount, total: totalCount })
    setQuizStreak(currentStreak)
  }, [messages, quizMode, quizStartIndex, parseQuizFeedback])

  const quizStats = useMemo(() => {
    const assistantTurns = quizMessages.filter((m) => m.role === "assistant").length
    const userTurns = quizMessages.filter((m) => m.role === "user").length
    const completion =
      assistantTurns === 0 ? 0 : Math.min(100, Math.round((userTurns / assistantTurns) * 100))
    const accuracy = quizScore.total === 0 ? 0 : Math.round((quizScore.correct / quizScore.total) * 100)
    return { 
      assistantTurns, 
      userTurns, 
      completion,
      score: quizScore,
      accuracy,
      streak: quizStreak
    }
  }, [quizMessages, quizScore, quizStreak])

  const lastQuizAssistantMessage = useMemo(() => {
    const assistantOnly = quizMessages.filter((m) => m.role === "assistant")
    return assistantOnly[assistantOnly.length - 1]
  }, [quizMessages])

  const quizStatusCopy = useMemo(() => {
    switch (quizPhase) {
      case "question":
        return "AI will open with the next quiz question."
      case "answer":
        return "Answer the question in Luxembourgish; the AI will grade you."
      case "feedback":
        return "Waiting for AI feedback and corrections."
      case "next":
        return "Ready for the next question."
      case "summary":
        return "Review your quiz stats and weak spots."
      default:
        return ""
    }
  }, [quizPhase])

  const quizStages: Array<{ key: Exclude<QuizPhase, "off" | "summary">; label: string }> = [
    { key: "question", label: "Question" },
    { key: "answer", label: "Answer" },
    { key: "feedback", label: "Feedback" },
    { key: "next", label: "Next" },
  ]

  const handleSend = useCallback(async (forcedContent?: string) => {
    const contentToSend = forcedContent !== undefined ? forcedContent : input
    if (!contentToSend.trim() || !conversationId || isLoading) return

    if (luxItUpMode && looksLuxembourgish(contentToSend)) {
      toast({
        title: "Try English here",
        description: "Lux It Up is on — type your prompt in English and we'll reply in Luxembourgish.",
        variant: "default",
      })
      // Still proceed to keep flow smooth
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: contentToSend.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    if (forcedContent === undefined) {
      setInput("")
    }
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
          conversationId,
          learningMode,
          luxItUpMode,
          quizMode,
          quizDifficulty,
          quizPhase,
          topic: currentTopic || "general", // Include topic for RAG caching
        }),
      })

      if (!response.ok) {
        // Try to parse error response
        let errorMessage = "Failed to send message"
        let retryable = true
        
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
          retryable = errorData.retryable !== false
        } catch {
          // If response isn't JSON, use status-based messages
          if (response.status === 401) {
            errorMessage = "Authentication failed. Please log in again."
            retryable = false
          } else if (response.status === 429) {
            errorMessage = "Too many requests. Please wait a moment."
            retryable = true
          } else if (response.status === 503) {
            errorMessage = "Service temporarily unavailable. Please try again."
            retryable = true
          } else if (response.status >= 500) {
            errorMessage = "Server error. Please try again."
            retryable = true
          } else {
            errorMessage = "Failed to send message. Please try again."
            retryable = true
          }
        }
        
        // Remove the user message and assistant placeholder on error
        setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id && msg.id !== assistantMessageId))
        
        // Store error for retry
        setLastError({ message: errorMessage, retryable, failedMessage: userMessage })
        
        throw new Error(errorMessage)
      }
      
      // Clear any previous errors on success
      setLastError(null)

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error("No reader available")
      }

      // Create assistant message placeholder
      const assistantMessageId = (Date.now() + 1).toString()
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
      }
      setMessages((prev) => [...prev, assistantMessage])

      let fullContent = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.content) {
                fullContent += data.content
                const displayContent = luxItUpMode ? enforceLuxOnly(fullContent) : fullContent

                setMessages((prev) => {
                  const newMessages = [...prev]
                  newMessages[newMessages.length - 1] = {
                    ...newMessages[newMessages.length - 1],
                    content: displayContent,
                  }
                  return newMessages
                })
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      const finalContent = luxItUpMode ? enforceLuxOnly(fullContent) : fullContent

      // Ensure final sanitized content is in state
      setMessages((prev) => {
        const newMessages = [...prev]
        if (newMessages[newMessages.length - 1]?.role === "assistant") {
          newMessages[newMessages.length - 1] = {
            ...newMessages[newMessages.length - 1],
            content: finalContent,
          }
        }
        return newMessages
      })

      if (luxItUpMode && finalContent.trim()) {
        try {
          const translationResponse = await fetch("/api/translate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ text: finalContent }),
          })
          if (translationResponse.ok) {
            const translationData = await translationResponse.json()
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId ? { ...msg, translation: translationData.translation || "" } : msg,
              ),
            )
          }
        } catch (error) {
          console.error("Translation fetch error:", error)
        }
      }

      // Update conversations list (to refresh preview and timestamp)
      if (userId) {
        await loadConversations(userId)
      }

      // Track conversation progress (only on first message exchange)
      if (messages.length === 0) {
        await trackConversation()
      }

      // Track study time: estimate 2-3 minutes per message exchange (user + assistant)
      // This is more reliable than the interval-based tracking
      await trackStudyTime(2)

      // Track quiz question if in quiz mode
      if (quizMode && messages.length > 0) {
        // Check if this was a quiz answer (user message after assistant question)
        const lastAssistantMessage = messages.filter(m => m.role === "assistant").pop()
        if (lastAssistantMessage) {
          // We'll track when feedback is received
        }
      }

      // Auto-generate title after first exchange (2 messages = user + assistant)
      const updatedMessages = [...messages, userMessage, { id: assistantMessageId, role: "assistant" as const, content: finalContent }]
      const currentConv = conversations.find(c => c.id === conversationId)
      if (
        updatedMessages.length >= 2 &&
        conversationId &&
        currentConv?.title === "New Conversation"
      ) {
        try {
          const titleResponse = await fetch("/api/generate-title", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversationId,
              messages: updatedMessages.slice(0, 4).map(m => ({ role: m.role, content: m.content })),
            }),
          })
          if (titleResponse.ok && userId) {
            await loadConversations(userId)
          }
        } catch (error) {
          console.error("Title generation error:", error)
        }
      }
    } catch (error) {
      console.error("Chat error:", error)
      
      // Get error message
      let errorMessage = "Failed to send message. Please try again."
      let retryable = true
      
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage
        
        // Detect network errors
        if (error.message.includes("fetch") || error.message.includes("network") || error.message.includes("Failed to fetch")) {
          errorMessage = "Network error. Please check your internet connection."
          retryable = true
        } else if (error.message.includes("timeout")) {
          errorMessage = "Request timed out. Please try again."
          retryable = true
        }
      }
      
      // Only show toast if we haven't already set lastError (to avoid duplicate messages)
      if (!lastError) {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
          duration: 5000,
        })
      }
    } finally {
      setIsLoading(false)
    }
  }, [input, conversationId, isLoading, luxItUpMode, messages, learningMode, quizMode, quizDifficulty, quizPhase, toast, userId, loadConversations, conversations, currentTopic])

  const handleAddToVocabulary = (word: string) => {
    setSelectedWord(word)
    setShowVocabularyDialog(true)
  }

  const handleToggleQuizMode = (value: boolean) => {
    setQuizMode(value)
    setShowQuizSummary(false)
    if (value) {
      setQuizStartIndex(messages.length)
      setQuizScore({ correct: 0, total: 0 })
      setQuizStreak(0)
    } else {
      setQuizStartIndex(null)
      setQuizScore({ correct: 0, total: 0 })
      setQuizStreak(0)
    }
  }

  const handleQuizKickoff = useCallback(() => {
    handleSend(
      `Start a Luxembourgish quiz session for me at difficulty level ${quizDifficulty}. Greet me briefly and ask your first question now.`,
    )
  }, [handleSend, quizDifficulty])

  const handleDifficultyChange = (level: number) => {
    setQuizDifficulty(level)
  }

  const handleNextQuizQuestion = useCallback(() => {
    handleSend(
      `Keep quiz mode going at difficulty level ${quizDifficulty}. Give quick feedback on my last answer then ask the next question.`,
    )
  }, [handleSend, quizDifficulty])

  const toggleQuizSummary = () => {
    setShowQuizSummary((prev) => !prev)
  }

  const handleSaveVocabulary = async (data: {
    luxembourgish: string
    english: string
    notes: string
  }) => {
    if (!userId || !conversationId) return

    const supabase = createClient()
    const { error } = await supabase.from("vocabulary_cards").insert({
      user_id: userId,
      luxembourgish_word: data.luxembourgish,
      english_translation: data.english,
      notes: data.notes,
      conversation_id: conversationId,
    })

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save vocabulary word",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success",
        description: "Word added to your vocabulary!",
      })
      // Track progress
      await trackWordAdded()
    }
  }

  const handleLearningModeChange = async (mode: string, startNewChat: boolean) => {
    if (!userId) return

    const supabase = createClient()

    if (startNewChat) {
      // Create new conversation with new mode
      const { data: newConversation } = await supabase
        .from("chat_conversations")
        .insert({
          user_id: userId,
          title: "New Conversation",
          learning_mode: mode,
        })
        .select()
        .single()

      if (newConversation) {
        setConversationId(newConversation.id)
        setMessages([])
        setLearningMode(mode)
        await loadConversations(userId)
        // Reset quiz mode when starting new chat
        setQuizMode(false)
        setQuizStartIndex(null)
        setQuizScore({ correct: 0, total: 0 })
        setQuizStreak(0)
      }
    } else {
      // Update current conversation's mode
      if (conversationId) {
        await supabase
          .from("chat_conversations")
          .update({ learning_mode: mode })
          .eq("id", conversationId)

        setLearningMode(mode)
        await loadConversations(userId)
      }
    }
  }

  const handleSelectConversation = async (convId: string) => {
    if (convId === conversationId) {
      setSidebarOpen(false)
      return
    }

    const supabase = createClient()
    const { data: conv, error } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("id", convId)
      .eq("user_id", userId || "")
      .single()

    if (error) {
      console.error("Error loading conversation:", error)
      return
    }

    if (conv) {
      setConversationId(conv.id)
      setLearningMode(conv.learning_mode || "conversation")
      await loadConversationMessages(convId)
      // Reset quiz state when switching conversations
      setQuizMode(false)
      setLuxItUpMode(false)
      setQuizStartIndex(null)
      setShowQuizSummary(false)
      setQuizScore({ correct: 0, total: 0 })
      setQuizStreak(0)
      setSidebarOpen(false)
    }
  }

  const handleNewConversation = async () => {
    if (!userId) return

    const supabase = createClient()
    const { data: newConversation } = await supabase
      .from("chat_conversations")
      .insert({
        user_id: userId,
        title: "New Conversation",
        learning_mode: "conversation", // Always start with conversation mode
      })
      .select()
      .single()

    if (newConversation) {
      setConversationId(newConversation.id)
      setMessages([])
      await loadConversations(userId)
      // Reset all modes to defaults
      setLearningMode("conversation")
      setCurrentTopic(null) // Reset topic - will show lesson selector
      setCurrentLessonTitle(null)
      setQuizMode(false)
      setLuxItUpMode(false)
      setQuizStartIndex(null)
      setQuizScore({ correct: 0, total: 0 })
      setQuizStreak(0)
      setSidebarOpen(false)
      // Clear localStorage for modes
      localStorage.removeItem("quiz-mode")
      localStorage.removeItem("lux-it-up-mode")
      // Show lesson selector for new conversation
      setShowLessonSelector(true)
    }
  }

  const handleDeleteConversation = async (convId: string) => {
    if (!userId) return

    const supabase = createClient()
    
    // Delete messages first (foreign key constraint)
    await supabase
      .from("chat_messages")
      .delete()
      .eq("conversation_id", convId)
    
    // Delete conversation
    await supabase
      .from("chat_conversations")
      .delete()
      .eq("id", convId)

    // Refresh conversations
    await loadConversations(userId)

    // If deleted current conversation, switch to first available
    if (convId === conversationId) {
      const remaining = conversations.filter(c => c.id !== convId)
      if (remaining.length > 0) {
        await handleSelectConversation(remaining[0].id)
      } else {
        await handleNewConversation()
      }
    }
  }

  useEffect(() => {
    if (quizMode && quizPhase === "question" && conversationId && !isLoading && quizStartIndex !== null && quizMessages.length === 0) {
      handleQuizKickoff()
    }
  }, [quizMode, quizPhase, conversationId, isLoading, quizStartIndex, quizMessages.length, handleQuizKickoff])

  // Lightweight study time tracking: count active minutes while the chat page is focused/recently used
  useEffect(() => {
    if (!userId) return

    const markActivity = () => {
      lastActivityRef.current = Date.now()
    }

    const activityEvents = ["mousemove", "keydown", "click", "touchstart", "scroll"]
    activityEvents.forEach((event) => window.addEventListener(event, markActivity))

    const interval = setInterval(() => {
      const now = Date.now()
      const recentlyActive = now - lastActivityRef.current < 2 * 60 * 1000 // 2 minutes
      if (document.visibilityState === "visible" && recentlyActive) {
        void trackStudyTime(1)
      }
    }, 60 * 1000) // every minute

    return () => {
      clearInterval(interval)
      activityEvents.forEach((event) => window.removeEventListener(event, markActivity))
    }
  }, [userId])

  // Track scroll position to show/hide fixed widgets
  useEffect(() => {
    const handleScroll = () => {
      if (mainContentRef.current) {
        const scrollTop = mainContentRef.current.scrollTop
        setIsScrolled(scrollTop > 100) // Show fixed widgets after scrolling 100px
      }
    }

    const mainElement = mainContentRef.current
    if (mainElement) {
      mainElement.addEventListener("scroll", handleScroll)
      return () => mainElement.removeEventListener("scroll", handleScroll)
    }
  }, [])

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <ConversationSidebar
        conversations={conversations}
        currentConversationId={conversationId}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
      />

      <div className={`flex flex-col h-full transition-all duration-300 ${sidebarOpen ? "md:ml-72" : "md:ml-16"} ml-0`}>
        <ChatHeader
          learningMode={learningMode}
          onOpenLearningMode={() => setShowLearningModeDialog(true)}
          onSelectLearningMode={(mode) => handleLearningModeChange(mode, false)}
          luxItUpEnabled={luxItUpMode}
          onToggleLuxItUp={setLuxItUpMode}
          quizModeEnabled={quizMode}
          quizDifficulty={quizDifficulty}
          onToggleQuizMode={handleToggleQuizMode}
          onDifficultyChange={handleDifficultyChange}
          onNewConversation={handleNewConversation}
        />

        <main ref={mainContentRef} className="flex-1 overflow-y-auto p-4 relative">
          {/* Fixed Daily Challenge in top right corner - shown when toggled */}
          {showDailyChallenge && (
            <div className="fixed top-20 right-4 z-30 w-72 hidden md:block">
              <div className="mb-2">
                <DailyChallenge />
                </div>
              {/* Toggle button for Daily Challenge - positioned below the box */}
              <button
                onClick={() => setShowDailyChallenge(false)}
                className="w-full mt-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                title="Hide Daily Challenge"
              >
                <X className="w-4 h-4" />
                Hide Challenge
              </button>
              </div>
            )}
            
          {/* Toggle button for Daily Challenge - shown when closed */}
          {!showDailyChallenge && (
            <button
              onClick={() => setShowDailyChallenge(true)}
              className="fixed top-20 right-4 z-30 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center gap-2 transition-all hidden md:flex"
              title="Show Daily Challenge"
            >
              <Target className="w-4 h-4" />
              <span className="text-sm font-medium">Daily Challenge</span>
            </button>
          )}

          <div className="max-w-3xl mx-auto">
            
            {quizMode && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 shadow-sm">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-emerald-800">Quiz mode</div>
                      <div className="text-xs text-emerald-700">{quizStatusCopy}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] uppercase tracking-wide text-emerald-700">Level</span>
                      {[1, 2, 3].map((level) => (
                        <Button
                          key={level}
                          size="sm"
                          variant={quizDifficulty === level ? "default" : "ghost"}
                          className={`h-8 px-3 text-xs ${
                            quizDifficulty === level
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "text-emerald-700 hover:bg-emerald-100"
                          }`}
                          onClick={() => handleDifficultyChange(level)}
                        >
                          {level}
                        </Button>
                      ))}
                      <Button
                        variant={showQuizSummary ? "default" : "outline"}
                        size="sm"
                        className="h-8 text-xs"
                        onClick={toggleQuizSummary}
                      >
                        {showQuizSummary ? "Hide summary" : "Show summary"}
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {quizStages.map((stage) => {
                      const currentStageIndex = quizStages.findIndex((s) => s.key === quizPhase)
                      const stageIndex = quizStages.findIndex((s) => s.key === stage.key)
                      const isActive = quizPhase === stage.key
                      const isCompleted = currentStageIndex !== -1 && stageIndex < currentStageIndex
                      const isUpcoming = currentStageIndex !== -1 && stageIndex > currentStageIndex
                      
                      return (
                        <div
                          key={stage.key}
                          className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                            isActive
                              ? "border-emerald-500 bg-white text-emerald-800 shadow-sm"
                              : isCompleted
                                ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                                : "border-emerald-100 bg-white/60 text-emerald-600"
                          }`}
                        >
                          <span className="font-semibold">{stage.label}</span>
                          {isActive && (
                            <span className="text-[10px] uppercase tracking-wide text-emerald-600">
                              Now
                            </span>
                          )}
                          {isCompleted && (
                            <span className="text-[10px] uppercase tracking-wide text-emerald-600">
                              ✓
                            </span>
                          )}
                          {isUpcoming && (
                            <span className="text-[10px] uppercase tracking-wide text-emerald-500">
                              Up next
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-emerald-800">
                    <div className="rounded-lg border border-emerald-100 bg-white/80 px-3 py-2">
                      <div className="text-[11px] uppercase text-emerald-600">Score</div>
                      <div className="text-sm font-semibold">
                        {quizStats.score.correct}/{quizStats.score.total}
                      </div>
                    </div>
                    <div className="rounded-lg border border-emerald-100 bg-white/80 px-3 py-2">
                      <div className="text-[11px] uppercase text-emerald-600">Accuracy</div>
                      <div className="text-sm font-semibold">{quizStats.accuracy}%</div>
                    </div>
                    <div className="rounded-lg border border-emerald-100 bg-white/80 px-3 py-2">
                      <div className="text-[11px] uppercase text-emerald-600">Streak</div>
                      <div className="text-sm font-semibold">
                        {quizStats.streak > 0 ? `🔥 ${quizStats.streak}` : "0"}
                      </div>
                    </div>
                    <div className="rounded-lg border border-emerald-100 bg-white/80 px-3 py-2">
                      <div className="text-[11px] uppercase text-emerald-600">Questions</div>
                      <div className="text-sm font-semibold">{quizStats.assistantTurns}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={quizPhase === "question" ? handleQuizKickoff : handleNextQuizQuestion}
                      disabled={quizPhase === "feedback" || isLoading}
                    >
                      {quizPhase === "question" ? "Start quiz" : "Next question"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setInput("Kann ech w.e.g. en Hiweis kréien?")}
                      disabled={isLoading}
                    >
                      Ask for a hint
                    </Button>
                  </div>
                  {showQuizSummary && (
                    <div className="rounded-lg border border-emerald-200 bg-white px-3 py-3 text-sm text-emerald-900">
                      <div className="mb-1 font-semibold text-emerald-800">Session summary</div>
                      <div className="text-xs text-emerald-700">
                        Track how many turns you've done and what to focus on next. Ask the AI for tailored drills if
                        something feels hard.
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2">
                          <div className="text-[11px] uppercase text-emerald-600">Current level</div>
                          <div className="text-sm font-semibold text-emerald-800">Level {quizDifficulty}</div>
                          <div className="text-xs text-emerald-700">
                            {quizDifficulty === 1
                              ? "Short phrases, translations, gentle hints."
                              : quizDifficulty === 2
                                ? "Full sentences, fill-in-the-blank, light grammar pushes."
                                : "Multi-step answers, tense shifts, and nuance checks."}
                          </div>
                        </div>
                        <div className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2">
                          <div className="text-[11px] uppercase text-emerald-600">Progress</div>
                          <div className="text-sm font-semibold text-emerald-800">
                            {quizStats.score.correct}/{quizStats.score.total} correct • {quizStats.accuracy}% accuracy
                          </div>
                          <div className="text-xs text-emerald-700">
                            {quizStats.streak > 0 ? `🔥 ${quizStats.streak} streak! Keep it up!` : "Answer correctly to start a streak."}
                          </div>
                        </div>
                      </div>
                      {lastQuizAssistantMessage && (
                        <div className="mt-3 rounded-md border border-emerald-100 bg-white px-3 py-2">
                          <div className="text-[11px] uppercase text-emerald-600">Last AI feedback</div>
                          <div className="mt-1 whitespace-pre-line text-gray-800">{lastQuizAssistantMessage.content}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            {luxItUpMode && (
              <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                Lux It Up is on: type in English, get Luxembourgish replies. We'll hide translations more as you keep
                chatting—hover the hint to check yourself.
              </div>
            )}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Moien! Welcome to LetzLearn</h2>
                <p className="text-muted-foreground mb-6">
                  {currentLessonTitle 
                    ? `Ready to learn: ${currentLessonTitle}`
                    : "Choose a lesson to start your learning journey"}
                </p>
                {!currentTopic && (
                  <Button
                    onClick={() => setShowLessonSelector(true)}
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6 mb-6"
                  >
                    Start Learning
                  </Button>
                )}
                {currentLessonTitle && (
                  <div className="mt-4 p-4 rounded-lg border border-blue-200 bg-blue-50 max-w-md">
                    <p className="text-sm text-blue-900">
                      <strong>Current Lesson:</strong> {currentLessonTitle}
                    </p>
                    <p className="text-xs text-blue-700 mt-2">
                      Start chatting to begin learning!
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full max-w-4xl mt-8">
                  <button
                    className="p-4 border rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-colors text-left"
                    onClick={async () => {
                      // Set conversation mode for greeting practice
                      await handleLearningModeChange("conversation", false)
                      setInput("Moien! Wéi geet et?")
                    }}
                  >
                    <div className="font-semibold text-sm mb-1">Greeting Practice</div>
                    <div className="text-xs text-muted-foreground">Say hello in Luxembourgish</div>
                  </button>
                  <button
                    className="p-4 border rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-colors text-left"
                    onClick={async () => {
                      // Set grammar mode for grammar help
                      await handleLearningModeChange("grammar", false)
                      setInput("Can you teach me basic Luxembourgish grammar?")
                    }}
                  >
                    <div className="font-semibold text-sm mb-1">Grammar Help</div>
                    <div className="text-xs text-muted-foreground">Learn the basics</div>
                  </button>
                  <button
                    className="p-4 border rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-colors text-left"
                    onClick={async () => {
                      // Set vocabulary mode for common phrases
                      await handleLearningModeChange("vocabulary", false)
                      setInput("What are common Luxembourgish phrases?")
                    }}
                  >
                    <div className="font-semibold text-sm mb-1">Common Phrases</div>
                    <div className="text-xs text-muted-foreground">Everyday vocabulary</div>
                  </button>
                  <button
                    className="p-4 border rounded-lg hover:border-purple-600 hover:bg-purple-50 transition-colors text-left"
                    onClick={() => {
                      // Enable quiz mode
                      handleToggleQuizMode(true)
                      setInput("Start a quiz")
                    }}
                  >
                    <div className="font-semibold text-sm mb-1">Quiz Mode</div>
                    <div className="text-xs text-muted-foreground">Test your knowledge</div>
                  </button>
                  <button
                    className="p-4 border rounded-lg hover:border-green-600 hover:bg-green-50 transition-colors text-left"
                    onClick={() => {
                      // Enable Lux It Up mode
                      setLuxItUpMode(true)
                      setInput("Let's practice Luxembourgish!")
                    }}
                  >
                    <div className="font-semibold text-sm mb-1">Lux It Up</div>
                    <div className="text-xs text-muted-foreground">AI responds in Luxembourgish</div>
                  </button>
                </div>
              </div>
            )}

            {messages.map((message) => {
              let immersionStage: number | undefined
              if (luxItUpMode && message.role === "assistant") {
                const assistantIndex =
                  messages
                    .filter((m) => m.role === "assistant")
                    .findIndex((m) => m.id === message.id) + 1
                immersionStage = getImmersionStage(assistantIndex)
              }

              return (
                <MessageBubble
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  translation={message.translation}
                  luxItUpMode={luxItUpMode}
                  immersionStage={immersionStage}
                  quizMode={quizMode}
                  onAddToVocabulary={message.role === "assistant" && !quizMode ? handleAddToVocabulary : undefined}
                />
              )
            })}

            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start mb-4">
                <div className="bg-gray-100 rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                </div>
              </div>
            )}
            
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </main>

        <div className="border-t bg-white p-4">
          {lastError && lastError.retryable && (
            <div className="max-w-3xl mx-auto mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-red-800 font-medium">Error: {lastError.message}</p>
              </div>
              <Button
                onClick={() => {
                  if (lastError.failedMessage) {
                    setInput(lastError.failedMessage.content)
                    setLastError(null)
                    // Small delay to ensure state is updated
                    setTimeout(() => handleSend(), 100)
                  }
                }}
                variant="outline"
                size="sm"
                className="ml-3 border-red-300 text-red-700 hover:bg-red-100"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          )}
          <div className="max-w-3xl mx-auto flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder={
                quizMode
                  ? "Answer the quiz question here. (Press Enter to send)"
                  : luxItUpMode
                    ? "Type in English. We'll answer in Luxembourgish. (Press Enter to send)"
                    : "Type your message... (Press Enter to send)"
              }
              className="flex-1 min-h-[52px] max-h-[200px] resize-none py-3"
              disabled={isLoading}
            />
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="bg-blue-600 hover:bg-blue-700 h-[52px] w-[52px] p-0 flex items-center justify-center flex-shrink-0"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      <LearningModeDialog
        open={showLearningModeDialog}
        onOpenChange={setShowLearningModeDialog}
        currentMode={learningMode}
        hasMessages={messages.length > 0}
        onSelectMode={handleLearningModeChange}
      />

      <LessonSelector
        open={showLessonSelector}
        onOpenChange={setShowLessonSelector}
        onSelectLesson={(lessonId, lessonTitle) => {
          setCurrentTopic(lessonId)
          setCurrentLessonTitle(lessonTitle)
          if (conversationId) {
            localStorage.setItem(`topic-${conversationId}`, lessonId)
            localStorage.setItem(`lesson-title-${conversationId}`, lessonTitle)
          }
        }}
      />

      <TopicSelector
        open={showTopicSelector}
        onOpenChange={setShowTopicSelector}
        onSelectTopic={(topic) => {
          setCurrentTopic(topic)
          if (conversationId) {
            localStorage.setItem(`topic-${conversationId}`, topic)
          }
        }}
        currentTopic={currentTopic}
      />

      <VocabularyDialog
        open={showVocabularyDialog}
        onOpenChange={setShowVocabularyDialog}
        selectedWord={selectedWord}
        onSave={handleSaveVocabulary}
      />
    </div>
  )
}
