"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { BookOpen, MessageCircle, BookText, Languages, Calendar, ShoppingBag, Home, Briefcase } from "lucide-react"

const TOPICS = [
  { id: "greetings", name: "Greetings & Farewells", icon: MessageCircle, description: "Learn how to say hello, goodbye, and basic greetings" },
  { id: "introductions", name: "Introductions", icon: Languages, description: "How to introduce yourself and ask about others" },
  { id: "numbers", name: "Numbers & Dates", icon: Calendar, description: "Learn numbers, dates, and time expressions" },
  { id: "shopping", name: "Shopping", icon: ShoppingBag, description: "Vocabulary and phrases for shopping" },
  { id: "work", name: "Work & Jobs", icon: Briefcase, description: "Workplace vocabulary and conversations" },
  { id: "home", name: "Home & Family", icon: Home, description: "Talking about home, family, and daily life" },
  { id: "grammar_basics", name: "Grammar Basics", icon: BookOpen, description: "Basic grammar rules and sentence structure" },
  { id: "vocabulary_common", name: "Common Vocabulary", icon: BookText, description: "Essential everyday words and phrases" },
]

interface TopicSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectTopic: (topic: string) => void
  currentTopic?: string | null
}

export function TopicSelector({ open, onOpenChange, onSelectTopic, currentTopic }: TopicSelectorProps) {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(currentTopic || null)

  const handleSelect = (topicId: string) => {
    setSelectedTopic(topicId)
  }

  const handleConfirm = () => {
    if (selectedTopic) {
      onSelectTopic(selectedTopic)
      onOpenChange(false)
    }
  }

  const handleSkip = () => {
    onSelectTopic("general")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose a Learning Topic</DialogTitle>
          <DialogDescription>
            Select a topic to focus on. The AI will fetch relevant learning materials for this topic and use them throughout the conversation.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-4 max-h-[400px] overflow-y-auto">
          {TOPICS.map((topic) => {
            const Icon = topic.icon
            const isSelected = selectedTopic === topic.id
            return (
              <button
                key={topic.id}
                onClick={() => handleSelect(topic.id)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  isSelected
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 mt-0.5 ${isSelected ? "text-blue-600" : "text-gray-600"}`} />
                  <div className="flex-1">
                    <h3 className={`font-semibold text-sm ${isSelected ? "text-blue-900" : "text-gray-900"}`}>
                      {topic.name}
                    </h3>
                    <p className={`text-xs mt-1 ${isSelected ? "text-blue-700" : "text-gray-600"}`}>
                      {topic.description}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <div className="flex gap-2 mt-6">
          <Button onClick={handleSkip} variant="outline" className="flex-1">
            Skip (General Topic)
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedTopic} className="flex-1">
            Start Learning
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

