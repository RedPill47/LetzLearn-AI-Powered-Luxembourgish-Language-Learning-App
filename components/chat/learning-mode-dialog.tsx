"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { MessageCircle, BookOpen, BookText, ArrowRight, Plus } from "lucide-react"

interface LearningModeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentMode: string
  hasMessages: boolean
  onSelectMode: (mode: string, startNewChat: boolean) => void
}

const MODES = [
  {
    id: "conversation",
    name: "Conversation Practice",
    description: "Practice natural conversations in Luxembourgish",
    icon: MessageCircle,
  },
  {
    id: "grammar",
    name: "Grammar Focus",
    description: "Learn grammar rules and sentence structure",
    icon: BookOpen,
  },
  {
    id: "vocabulary",
    name: "Vocabulary Builder",
    description: "Expand your Luxembourgish vocabulary",
    icon: BookText,
  },
]

export function LearningModeDialog({ 
  open, 
  onOpenChange, 
  currentMode, 
  hasMessages,
  onSelectMode 
}: LearningModeDialogProps) {
  const [selectedMode, setSelectedMode] = useState<string | null>(null)
  const [showOptions, setShowOptions] = useState(false)

  const handleModeClick = (modeId: string) => {
    if (modeId === currentMode) {
      // Already on this mode, just close
      onOpenChange(false)
      return
    }

    if (!hasMessages) {
      // No messages yet, just switch mode
      onSelectMode(modeId, false)
      onOpenChange(false)
      return
    }

    // Has messages and changing mode - show options
    setSelectedMode(modeId)
    setShowOptions(true)
  }

  const handleOptionSelect = (startNewChat: boolean) => {
    if (selectedMode) {
      onSelectMode(selectedMode, startNewChat)
    }
    setShowOptions(false)
    setSelectedMode(null)
    onOpenChange(false)
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      setShowOptions(false)
      setSelectedMode(null)
    }
    onOpenChange(open)
  }

  const selectedModeData = selectedMode ? MODES.find(m => m.id === selectedMode) : null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {!showOptions ? (
          <>
            <DialogHeader>
              <DialogTitle>Choose Learning Mode</DialogTitle>
              <DialogDescription>Select how you want to practice Luxembourgish</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              {MODES.map((mode) => {
                const Icon = mode.icon
                const isSelected = currentMode === mode.id
                return (
                  <Button
                    key={mode.id}
                    variant={isSelected ? "default" : "outline"}
                    className={`h-auto p-4 justify-start ${isSelected ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                    onClick={() => handleModeClick(mode.id)}
                  >
                    <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                    <div className="text-left">
                      <div className="font-semibold">{mode.name}</div>
                      <div className="text-xs opacity-90">{mode.description}</div>
                    </div>
                    {isSelected && (
                      <span className="ml-auto text-xs bg-white/20 px-2 py-0.5 rounded">Current</span>
                    )}
                  </Button>
                )
              })}
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Switch to {selectedModeData?.name}?</DialogTitle>
              <DialogDescription>
                Choose how you want to switch modes
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 mt-2">
              <Button
                variant="outline"
                className="h-auto p-4 justify-start hover:bg-blue-50 hover:border-blue-200"
                onClick={() => handleOptionSelect(false)}
              >
                <ArrowRight className="w-5 h-5 mr-3 flex-shrink-0 text-blue-600" />
                <div className="text-left">
                  <div className="font-semibold">Continue in this chat</div>
                  <div className="text-xs text-gray-500">
                    Keep your current conversation and switch the AI's focus
                  </div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="h-auto p-4 justify-start hover:bg-green-50 hover:border-green-200"
                onClick={() => handleOptionSelect(true)}
              >
                <Plus className="w-5 h-5 mr-3 flex-shrink-0 text-green-600" />
                <div className="text-left">
                  <div className="font-semibold">Start a new chat</div>
                  <div className="text-xs text-gray-500">
                    Create a fresh conversation (old one is saved in sidebar)
                  </div>
                </div>
              </Button>
              <Button
                variant="ghost"
                className="text-sm text-gray-500"
                onClick={() => setShowOptions(false)}
              >
                ← Back to modes
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
