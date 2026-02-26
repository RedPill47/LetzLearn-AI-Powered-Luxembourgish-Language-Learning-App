"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Target, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface DailyChallenge {
  words_goal: number
  words_completed: number
  conversations_goal: number
  conversations_completed: number
  quiz_questions_goal: number
  quiz_questions_completed: number
  speaking_exercises_goal: number
  speaking_exercises_completed: number
  completed: boolean
}

export function DailyChallenge() {
  const router = useRouter()
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadChallenge()
  }, [])

  const loadChallenge = async () => {
    try {
      const response = await fetch("/api/progress/challenge")
      if (response.ok) {
        const data = await response.json()
        setChallenge(data.challenge)
      }
    } catch (error) {
      console.error("Error loading challenge:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !challenge) {
    return null
  }

  const wordsProgress = (challenge.words_completed / challenge.words_goal) * 100
  const conversationsProgress = (challenge.conversations_completed / challenge.conversations_goal) * 100
  const quizProgress = (challenge.quiz_questions_completed / challenge.quiz_questions_goal) * 100
  const speakingProgress = (challenge.speaking_exercises_completed / challenge.speaking_exercises_goal) * 100
  const overallProgress = ((wordsProgress + conversationsProgress + quizProgress + speakingProgress) / 4)

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardContent className="px-2 pt-1 pb-1">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-900">Daily Challenge</span>
            {challenge.completed && (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-100 hover:text-blue-900"
            onClick={() => router.push("/progress")}
          >
            View Progress
          </Button>
        </div>

        <div className="space-y-1">
          <div>
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span className="text-gray-600">Words: {challenge.words_completed}/{challenge.words_goal}</span>
              <span className="text-gray-500">{Math.round(wordsProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, wordsProgress)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span className="text-gray-600">Conversations: {challenge.conversations_completed}/{challenge.conversations_goal}</span>
              <span className="text-gray-500">{Math.round(conversationsProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-purple-600 h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, conversationsProgress)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span className="text-gray-600">Quiz Questions: {challenge.quiz_questions_completed}/{challenge.quiz_questions_goal}</span>
              <span className="text-gray-500">{Math.round(quizProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-emerald-600 h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, quizProgress)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span className="text-gray-600">Speaking: {challenge.speaking_exercises_completed}/{challenge.speaking_exercises_goal}</span>
              <span className="text-gray-500">{Math.round(speakingProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-pink-600 h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, speakingProgress)}%` }}
              />
            </div>
          </div>
        </div>

        {challenge.completed && (
          <div className="mt-1.5 pt-1.5 border-t border-blue-200">
            <div className="text-xs text-center text-green-700 font-semibold">
              🎉 Challenge Complete!
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

