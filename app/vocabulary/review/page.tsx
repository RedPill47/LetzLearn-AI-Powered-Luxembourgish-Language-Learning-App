"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, CheckCircle2, XCircle, RotateCcw } from "lucide-react"
import { getMasteryInfo, type MasteryLevel } from "@/lib/spaced-repetition"
import { useToast } from "@/hooks/use-toast"
import { trackStudyTime, trackQuizQuestion } from "@/lib/update-progress"

interface ReviewWord {
  id: string
  luxembourgish_word: string
  english_translation: string
  notes: string | null
  mastery_level: MasteryLevel
}

export default function ReviewPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [words, setWords] = useState<ReviewWord[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState(false)

  useEffect(() => {
    loadWords()
  }, [])

  const loadWords = async () => {
    try {
      const response = await fetch("/api/vocabulary/due")
      if (response.ok) {
        const data = await response.json()
        if (data.words && data.words.length > 0) {
          // Fetch full word details
          const wordIds = data.words.map((w: { id: string }) => w.id).join(",")
          const detailsResponse = await fetch(`/api/vocabulary?ids=${wordIds}`)
          if (detailsResponse.ok) {
            const wordsData = await detailsResponse.json()
            setWords(wordsData)
          }
        }
      }
    } catch (error) {
      console.error("Error loading words:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (quality: number) => {
    if (currentIndex >= words.length) return

    const word = words[currentIndex]
    setReviewing(true)

    try {
      const response = await fetch("/api/vocabulary/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wordId: word.id, quality }),
      })

      if (response.ok) {
        // Track quiz question (review is like a quiz)
        // Quality 5 = correct (easy), quality 3 = partial (hard), quality 0 = incorrect (forgot)
        const isCorrect = quality >= 3
        await trackQuizQuestion(isCorrect)
        
        // Move to next word or finish
        if (currentIndex < words.length - 1) {
          setCurrentIndex(currentIndex + 1)
          setShowAnswer(false)
        } else {
          // Track study time when review session is completed
          // Estimate: 1-2 minutes per word reviewed
          const estimatedMinutes = Math.max(1, Math.ceil(words.length * 1.5))
          await trackStudyTime(estimatedMinutes)
          
          toast({
            title: "Review Complete!",
            description: "Great job reviewing your vocabulary!",
          })
          router.push("/vocabulary")
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save review",
        variant: "destructive",
      })
    } finally {
      setReviewing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (words.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto p-6">
          <Button variant="ghost" size="sm" onClick={() => router.push("/vocabulary")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Vocabulary
          </Button>
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">All caught up!</h2>
              <p className="text-gray-600 mb-6">
                You don't have any words due for review right now. Great job staying on top of your vocabulary!
              </p>
              <Button onClick={() => router.push("/vocabulary")}>Go to Vocabulary</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const currentWord = words[currentIndex]
  const masteryInfo = getMasteryInfo(currentWord.mastery_level)
  const progress = ((currentIndex + 1) / words.length) * 100

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/vocabulary")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Vocabulary
        </Button>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>
              Word {currentIndex + 1} of {words.length}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Word Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">{currentWord.luxembourgish_word}</CardTitle>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  masteryInfo.color === "gray"
                    ? "bg-gray-100 text-gray-700"
                    : masteryInfo.color === "blue"
                      ? "bg-blue-100 text-blue-700"
                      : masteryInfo.color === "yellow"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                }`}
              >
                {masteryInfo.icon} {masteryInfo.label}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {!showAnswer ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-6">Do you remember what this means?</p>
                <Button onClick={() => setShowAnswer(true)} size="lg">
                  Show Answer
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center py-4">
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {currentWord.english_translation}
                  </div>
                  {currentWord.notes && (
                    <div className="text-sm text-gray-600 mt-2">{currentWord.notes}</div>
                  )}
                </div>

                <div className="border-t pt-6">
                  <p className="text-sm text-gray-600 mb-4 text-center">
                    How well did you remember this word?
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      className="h-20 flex flex-col"
                      onClick={() => handleReview(0)}
                      disabled={reviewing}
                    >
                      <XCircle className="w-5 h-5 mb-1 text-red-500" />
                      <span className="text-xs">Forgot</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-20 flex flex-col"
                      onClick={() => handleReview(3)}
                      disabled={reviewing}
                    >
                      <RotateCcw className="w-5 h-5 mb-1 text-yellow-500" />
                      <span className="text-xs">Hard</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-20 flex flex-col"
                      onClick={() => handleReview(5)}
                      disabled={reviewing}
                    >
                      <CheckCircle2 className="w-5 h-5 mb-1 text-green-500" />
                      <span className="text-xs">Easy</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

