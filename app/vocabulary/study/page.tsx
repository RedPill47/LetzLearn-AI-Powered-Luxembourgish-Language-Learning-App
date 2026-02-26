"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, RotateCcw, Shuffle, Check, X, ChevronLeft, ChevronRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { trackStudyTime } from "@/lib/update-progress"

interface VocabularyItem {
  id: string
  luxembourgish_word: string
  english_translation: string
  notes: string | null
}

export default function StudyPage() {
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [knownCards, setKnownCards] = useState<Set<string>>(new Set())
  const [practiceCards, setPracticeCards] = useState<Set<string>>(new Set())
  const [studyMode, setStudyMode] = useState<"all" | "practice">("all")
  const router = useRouter()
  const { toast } = useToast()
  const studyStartTime = useRef<number>(Date.now())
  const cardsViewed = useRef<Set<string>>(new Set())

  useEffect(() => {
    const loadVocabulary = async () => {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      const { data, error } = await supabase
        .from("vocabulary_cards")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load vocabulary",
          variant: "destructive",
        })
      } else if (data && data.length > 0) {
        setVocabulary(shuffleArray(data))
        // Track first card viewed
        if (data[0]) {
          cardsViewed.current.add(data[0].id)
        }
      }
      setIsLoading(false)
    }

    loadVocabulary()
    
    // Track study time when leaving the page
    return () => {
      const studyDurationMinutes = Math.floor((Date.now() - studyStartTime.current) / (1000 * 60))
      const cardsStudied = cardsViewed.current.size
      
      // Only track if user spent at least 1 minute or viewed at least 3 cards
      if (studyDurationMinutes >= 1 || cardsStudied >= 3) {
        // Estimate: at least 1 minute, or 0.5 minutes per card viewed
        const estimatedMinutes = Math.max(studyDurationMinutes, Math.ceil(cardsStudied * 0.5))
        trackStudyTime(estimatedMinutes).catch(console.error)
      }
    }
  }, [router, toast])

  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array]
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[newArray[i], newArray[j]] = [newArray[j], newArray[i]]
    }
    return newArray
  }

  const activeCards = studyMode === "practice" 
    ? vocabulary.filter(card => practiceCards.has(card.id))
    : vocabulary

  const currentCard = activeCards[currentIndex]
  const totalCards = activeCards.length
  const progress = totalCards > 0 ? ((knownCards.size / vocabulary.length) * 100).toFixed(0) : 0

  const handleNext = useCallback(() => {
    setIsFlipped(false)
    setTimeout(() => {
      setCurrentIndex((prev) => {
        const nextIndex = (prev + 1) % totalCards
        // Track that we've viewed this card
        if (activeCards[nextIndex]) {
          cardsViewed.current.add(activeCards[nextIndex].id)
        }
        return nextIndex
      })
    }, 150)
  }, [totalCards, activeCards])

  const handlePrevious = useCallback(() => {
    setIsFlipped(false)
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + totalCards) % totalCards)
    }, 150)
  }, [totalCards])

  const handleKnown = () => {
    if (currentCard) {
      setKnownCards((prev) => new Set(prev).add(currentCard.id))
      setPracticeCards((prev) => {
        const newSet = new Set(prev)
        newSet.delete(currentCard.id)
        return newSet
      })
    }
    handleNext()
  }

  const handlePractice = () => {
    if (currentCard) {
      setPracticeCards((prev) => new Set(prev).add(currentCard.id))
      setKnownCards((prev) => {
        const newSet = new Set(prev)
        newSet.delete(currentCard.id)
        return newSet
      })
    }
    handleNext()
  }

  const handleShuffle = () => {
    setVocabulary(shuffleArray(vocabulary))
    setCurrentIndex(0)
    setIsFlipped(false)
  }

  const handleReset = () => {
    setKnownCards(new Set())
    setPracticeCards(new Set())
    setCurrentIndex(0)
    setIsFlipped(false)
    setStudyMode("all")
    setVocabulary(shuffleArray(vocabulary))
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault()
        setIsFlipped((prev) => !prev)
      } else if (e.key === "ArrowRight") {
        handleNext()
      } else if (e.key === "ArrowLeft") {
        handlePrevious()
      } else if (e.key === "1" && isFlipped) {
        handleKnown()
      } else if (e.key === "2" && isFlipped) {
        handlePractice()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isFlipped, handleNext, handlePrevious])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-muted-foreground">Loading flashcards...</p>
      </div>
    )
  }

  if (vocabulary.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="border-b bg-white px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/vocabulary")}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Vocabulary
          </Button>
        </header>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No cards to study</h2>
          <p className="text-muted-foreground mb-6">Add some vocabulary first to start studying</p>
          <Button onClick={() => router.push("/vocabulary")} className="bg-blue-600 hover:bg-blue-700">
            Go to Vocabulary
          </Button>
        </div>
      </div>
    )
  }

  if (studyMode === "practice" && practiceCards.size === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="border-b bg-white px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/vocabulary")}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Vocabulary
          </Button>
        </header>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No cards to practice</h2>
          <p className="text-muted-foreground mb-6">Mark some cards as "Need Practice" first</p>
          <Button onClick={() => setStudyMode("all")} className="bg-blue-600 hover:bg-blue-700">
            Study All Cards
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50">
      {/* Header */}
      <header className="border-b bg-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/vocabulary")}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-2 h-8 bg-gradient-to-b from-red-500 via-white to-blue-400 rounded-sm" />
            <h1 className="text-xl font-bold text-blue-600">Flashcard Study</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleShuffle}>
            <Shuffle className="w-4 h-4 mr-1" />
            Shuffle
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b px-4 py-2">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">
              Card {currentIndex + 1} of {totalCards}
            </span>
            <span className="text-green-600 font-medium">{progress}% mastered</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex gap-4 mt-2 text-xs">
            <span className="text-green-600">✓ Known: {knownCards.size}</span>
            <span className="text-orange-600">↻ Practice: {practiceCards.size}</span>
            <button 
              className={`${studyMode === "practice" ? "text-blue-600 font-medium" : "text-gray-500"}`}
              onClick={() => setStudyMode(studyMode === "all" ? "practice" : "all")}
            >
              {studyMode === "practice" ? "Studying practice cards" : "Click to study practice cards only"}
            </button>
          </div>
        </div>
      </div>

      {/* Flashcard */}
      <main className="max-w-2xl mx-auto p-6">
        <div 
          className="perspective-1000 cursor-pointer"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div 
            className={`relative w-full min-h-[400px] transition-transform duration-500 transform-style-preserve-3d ${
              isFlipped ? "rotate-y-180" : ""
            }`}
            style={{
              transformStyle: "preserve-3d",
              transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            {/* Front of card */}
            <div 
              className="absolute w-full h-full backface-hidden"
              style={{ backfaceVisibility: "hidden" }}
            >
              <div className="bg-white rounded-2xl shadow-lg p-8 min-h-[400px] flex flex-col items-center justify-center border-2 border-blue-100">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-4">Luxembourgish</p>
                <p className="text-4xl font-bold text-blue-600 text-center mb-8">{currentCard?.luxembourgish_word}</p>
                <p className="text-sm text-muted-foreground">Click or press Space to reveal</p>
              </div>
            </div>

            {/* Back of card */}
            <div 
              className="absolute w-full h-full backface-hidden rotate-y-180"
              style={{ 
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
              }}
            >
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-lg p-8 min-h-[400px] flex flex-col items-center justify-center text-white">
                <p className="text-xs uppercase tracking-wide mb-4 opacity-80">English Translation</p>
                <p className="text-3xl font-bold text-center mb-6">{currentCard?.english_translation}</p>
                {currentCard?.notes && (
                  <div className="bg-white/10 rounded-lg p-4 mt-4 max-w-sm">
                    <p className="text-sm opacity-90 italic text-center">{currentCard.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 flex flex-col gap-4">
          {/* Navigation */}
          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" size="lg" onClick={handlePrevious}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="text-muted-foreground min-w-[100px] text-center">
              {currentIndex + 1} / {totalCards}
            </span>
            <Button variant="outline" size="lg" onClick={handleNext}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Rating buttons - only show when flipped */}
          {isFlipped && (
            <div className="flex items-center justify-center gap-4 animate-in fade-in duration-300">
              <Button 
                size="lg" 
                variant="outline"
                className="flex-1 max-w-[200px] border-orange-300 text-orange-600 hover:bg-orange-50"
                onClick={handlePractice}
              >
                <X className="w-5 h-5 mr-2" />
                Need Practice (2)
              </Button>
              <Button 
                size="lg" 
                className="flex-1 max-w-[200px] bg-green-600 hover:bg-green-700"
                onClick={handleKnown}
              >
                <Check className="w-5 h-5 mr-2" />
                Got It! (1)
              </Button>
            </div>
          )}
        </div>

        {/* Keyboard hints */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>Keyboard: <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Space</kbd> flip • <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">←</kbd> <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">→</kbd> navigate • <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">1</kbd> got it • <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">2</kbd> practice</p>
        </div>
      </main>
    </div>
  )
}

