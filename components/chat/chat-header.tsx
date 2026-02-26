"use client"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  LogOut,
  Settings2,
  MessageCircle,
  BookOpen,
  BookText,
  Zap,
  GraduationCap,
  ChevronDown,
  TrendingUp,
  Mic,
  MessagesSquare,
  User,
  UserCircle
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

interface ChatHeaderProps {
  learningMode: string
  onOpenLearningMode: () => void
  onSelectLearningMode: (mode: string) => void
  luxItUpEnabled: boolean
  onToggleLuxItUp: (value: boolean) => void
  quizModeEnabled: boolean
  quizDifficulty: number
  onToggleQuizMode: (value: boolean) => void
  onDifficultyChange: (level: number) => void
  onNewConversation: () => void
}

const LEARNING_MODES = [
  { 
    id: "conversation", 
    name: "Conversation", 
    icon: MessageCircle,
    description: "Practice natural dialogues and everyday phrases"
  },
  { 
    id: "grammar", 
    name: "Grammar", 
    icon: BookOpen,
    description: "Learn sentence structure, verbs, and rules"
  },
  { 
    id: "vocabulary", 
    name: "Vocabulary", 
    icon: BookText,
    description: "Build your word bank with themed lessons"
  },
]

export function ChatHeader({
  learningMode,
  onSelectLearningMode,
  luxItUpEnabled,
  onToggleLuxItUp,
  quizModeEnabled,
  quizDifficulty,
  onToggleQuizMode,
  onDifficultyChange,
  onNewConversation,
}: ChatHeaderProps) {
  const router = useRouter()
  const [modeOpen, setModeOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email || null)
        
        // Try to get display name from profiles table first
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single()
        
        // Fallback to user_metadata or email username
        const name = profile?.display_name || 
                     user.user_metadata?.display_name ||
                     user.user_metadata?.full_name || 
                     user.user_metadata?.name || 
                     user.email?.split("@")[0] || 
                     null
        setUserName(name)
      }
    }
    loadUser()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  const currentMode = LEARNING_MODES.find(m => m.id === learningMode) || LEARNING_MODES[0]
  const CurrentModeIcon = currentMode.icon

  const getStatusBadge = () => {
    const badges = []
    if (quizModeEnabled) badges.push("Quiz")
    if (luxItUpEnabled) badges.push("Lux It Up")
    return badges.length > 0 ? badges.join(" + ") : null
  }

  const statusBadge = getStatusBadge()

  return (
    <header className="border-b bg-white px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2 overflow-x-auto">
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        {/* Logo */}
        <button
          type="button"
          onClick={() => router.push("/")}
          className="flex items-center gap-1 sm:gap-2 rounded-md px-1 py-0.5 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 flex-shrink-0"
          aria-label="Back to homepage"
        >
          <div className="w-2 h-6 sm:h-8 bg-gradient-to-b from-red-500 via-white to-blue-400 rounded-sm" />
          <h1 className="text-lg sm:text-xl font-bold text-blue-600 hidden sm:block">LetzLearn</h1>
        </button>

        {/* Mode Settings Popover */}
        <Popover open={modeOpen} onOpenChange={setModeOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs bg-white gap-1 sm:gap-1.5 h-8 px-2 sm:px-3 flex-shrink-0">
              <Settings2 className="w-4 h-4 flex-shrink-0" />
              <CurrentModeIcon className="w-3.5 h-3.5 hidden xs:block flex-shrink-0" />
              <span className="hidden sm:inline">{currentMode.name}</span>
              {statusBadge && (
                <span className="hidden lg:inline text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                  {statusBadge}
                </span>
              )}
              <ChevronDown className="w-3 h-3 opacity-50 flex-shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-0">
            {/* WHAT TO LEARN Section - Exclusive selection */}
            <div className="p-4 border-b bg-gray-50/50">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">📚</span>
                <div>
                  <div className="text-xs font-semibold text-gray-900">What to Learn</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Choose one focus area</div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {LEARNING_MODES.map((mode) => {
                  const Icon = mode.icon
                  const isActive = learningMode === mode.id
                  return (
                    <button
                      key={mode.id}
                      onClick={() => {
                        onSelectLearningMode(mode.id)
                        setModeOpen(false)
                      }}
                      className={`flex items-start gap-3 p-3 rounded-lg text-left transition-all ${
                        isActive 
                          ? "bg-blue-600 text-white shadow-sm" 
                          : "hover:bg-white border border-gray-200"
                      }`}
                    >
                      {/* Radio button indicator */}
                      <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isActive 
                          ? "border-white" 
                          : "border-gray-300"
                      }`}>
                        {isActive && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <div className={`p-1.5 rounded-md flex-shrink-0 ${
                        isActive ? "bg-blue-500" : "bg-gray-100"
                      }`}>
                        <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-gray-600"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-semibold ${isActive ? "text-white" : "text-gray-900"}`}>
                          {mode.name}
                        </div>
                        <div className={`text-xs mt-0.5 leading-relaxed ${isActive ? "text-blue-100" : "text-gray-500"}`}>
                          {mode.description}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* HOW TO PRACTICE Section - Optional modifiers */}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🎯</span>
                <div>
                  <div className="text-xs font-semibold text-gray-900">How to Practice</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Optional - can combine both</div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {/* Quiz Mode */}
                <div className={`p-3 rounded-lg border transition-colors ${
                  quizModeEnabled 
                    ? "bg-emerald-50 border-emerald-200" 
                    : "bg-white border-gray-200"
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 flex-1">
                      {/* Checkbox indicator */}
                      <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        quizModeEnabled 
                          ? "bg-emerald-600 border-emerald-600" 
                          : "border-gray-300 bg-white"
                      }`}>
                        {quizModeEnabled && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex items-start gap-2 flex-1">
                        <GraduationCap className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          quizModeEnabled ? "text-emerald-600" : "text-gray-400"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-semibold ${
                            quizModeEnabled ? "text-emerald-900" : "text-gray-700"
                          }`}>
                            Quiz Mode
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            AI asks questions and grades your answers
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant={quizModeEnabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => onToggleQuizMode(!quizModeEnabled)}
                      className={`h-7 text-xs flex-shrink-0 ${
                        quizModeEnabled ? "bg-emerald-600 hover:bg-emerald-700" : ""
                      }`}
                    >
                      {quizModeEnabled ? "On" : "Off"}
                    </Button>
                  </div>
                  {quizModeEnabled && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-emerald-200">
                      <span className="text-xs text-emerald-700 font-medium">Difficulty:</span>
                      <div className="flex gap-1">
                        {[1, 2, 3].map((level) => (
                          <Button
                            key={level}
                            variant={quizDifficulty === level ? "default" : "ghost"}
                            size="sm"
                            onClick={() => onDifficultyChange(level)}
                            className={`h-6 w-7 text-xs ${
                              quizDifficulty === level
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                            }`}
                          >
                            {level}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Lux It Up */}
                <div className={`p-3 rounded-lg border transition-colors ${
                  luxItUpEnabled 
                    ? "bg-blue-50 border-blue-200" 
                    : "bg-white border-gray-200"
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 flex-1">
                      {/* Checkbox indicator */}
                      <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        luxItUpEnabled 
                          ? "bg-blue-600 border-blue-600" 
                          : "border-gray-300 bg-white"
                      }`}>
                        {luxItUpEnabled && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex items-start gap-2 flex-1">
                        <Zap className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          luxItUpEnabled ? "text-blue-600" : "text-gray-400"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-semibold ${
                            luxItUpEnabled ? "text-blue-900" : "text-gray-700"
                          }`}>
                            Lux It Up
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            AI responds only in Luxembourgish
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant={luxItUpEnabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => onToggleLuxItUp(!luxItUpEnabled)}
                      className={`h-7 text-xs flex-shrink-0 ${
                        luxItUpEnabled ? "bg-blue-600 hover:bg-blue-700" : ""
                      }`}
                    >
                      {luxItUpEnabled ? "On" : "Off"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        {/* Practice dropdown */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 px-2 sm:px-3 flex-shrink-0 gap-1"
            >
              <Mic className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Practice</span>
              <ChevronDown className="w-3 h-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-2">
            <div className="space-y-1">
              <button
                onClick={() => router.push("/practice/pronunciation")}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left hover:bg-gray-100 transition-colors"
              >
                <div className="p-1.5 bg-blue-100 rounded-md">
                  <Mic className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm font-medium">Pronunciation</div>
                  <div className="text-xs text-gray-500">Practice speaking</div>
                </div>
              </button>
              <button
                onClick={() => router.push("/practice/dialog")}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left hover:bg-gray-100 transition-colors"
              >
                <div className="p-1.5 bg-purple-100 rounded-md">
                  <MessagesSquare className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm font-medium">Dialog Practice</div>
                  <div className="text-xs text-gray-500">Conversation scenarios</div>
                </div>
              </button>
            </div>
          </PopoverContent>
        </Popover>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/progress")}
          className="text-xs h-8 px-2 sm:px-3 flex-shrink-0"
        >
          <TrendingUp className="w-4 h-4 flex-shrink-0" />
          <span className="hidden sm:inline">Progress</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/vocabulary")}
          className="text-xs bg-white h-8 px-2 sm:px-3"
        >
          <BookText className="w-4 h-4 flex-shrink-0" />
          <span className="hidden sm:inline ml-1">My Words</span>
        </Button>
        
        {/* Profile Section */}
        <Popover open={profileOpen} onOpenChange={setProfileOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <UserCircle className="w-5 h-5 text-gray-600" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="end">
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {userName ? `Moien, ${userName}` : "Moien!"}
                  </p>
                  {userEmail && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">{userEmail}</p>
                  )}
                </div>
              </div>
              <div className="border-t pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="w-full justify-start text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
        </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  )
}
