"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, BookOpen, Sparkles } from "lucide-react"

interface Lesson {
  id: string
  title: string
  description: string
  difficulty: "beginner" | "intermediate" | "advanced"
}

interface LessonSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectLesson: (lessonId: string, lessonTitle: string) => void
}

export function LessonSelector({ open, onOpenChange, onSelectLesson }: LessonSelectorProps) {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [isLoading, setIsLoading] = useState(true) // Start with loading state
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      if (lessons.length === 0) {
        setIsLoading(true) // Ensure loading is true when dialog opens
        fetchLessons()
      } else {
        setIsLoading(false) // If we already have lessons, don't show loading
      }
    } else {
      // Reset when dialog closes
      setSelectedLesson(null)
    }
  }, [open, lessons.length])

  const fetchLessons = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/lessons/suggest", {
        method: "POST",
      })
      if (!response.ok) throw new Error("Failed to fetch lessons")
      const data = await response.json()
      setLessons(data.lessons || [])
    } catch (error) {
      console.error("Error fetching lessons:", error)
      // Keep empty array, will show error state
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = (lesson: Lesson) => {
    setSelectedLesson(lesson.id)
  }

  const handleConfirm = () => {
    if (selectedLesson) {
      const lesson = lessons.find((l) => l.id === selectedLesson)
      if (lesson) {
        onSelectLesson(lesson.id, lesson.title)
        onOpenChange(false)
      }
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-800 border-green-200"
      case "intermediate":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "advanced":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Which lesson would you like to focus on today?
          </DialogTitle>
          <DialogDescription>
            {isLoading 
              ? "I'm analyzing your learning materials and preparing personalized lesson suggestions..."
              : "I've prepared some lessons based on your learning materials. Choose one to get started!"}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
            <p className="text-sm font-medium text-gray-900 mb-2">Analyzing your learning materials...</p>
            <p className="text-xs text-muted-foreground text-center max-w-md">
              I'm reviewing the available content and preparing personalized lesson suggestions for you.
            </p>
            <div className="mt-4 flex gap-1">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        ) : lessons.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground mb-4">
              Unable to load lessons. Please try again.
            </p>
            <Button onClick={fetchLessons} variant="outline">
              Retry
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 mt-4">
              {lessons.map((lesson) => {
                const isSelected = selectedLesson === lesson.id
                return (
                  <button
                    key={lesson.id}
                    onClick={() => handleSelect(lesson)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 shadow-md"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <BookOpen
                        className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                          isSelected ? "text-blue-600" : "text-gray-600"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3
                            className={`font-semibold text-sm ${
                              isSelected ? "text-blue-900" : "text-gray-900"
                            }`}
                          >
                            {lesson.title}
                          </h3>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border ${getDifficultyColor(
                              lesson.difficulty
                            )}`}
                          >
                            {lesson.difficulty}
                          </span>
                        </div>
                        <p
                          className={`text-xs ${
                            isSelected ? "text-blue-700" : "text-gray-600"
                          }`}
                        >
                          {lesson.description}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="flex gap-2 mt-6">
              <Button onClick={handleConfirm} disabled={!selectedLesson} className="flex-1">
                Start Learning
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

