"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { MessageCircle, BookOpen, BookText, Languages } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function HomePage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)
    }
    checkAuth()
  }, [])

  const goToChat = () => router.push("/chat")

  const checkAuthFresh = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const authed = !!user
    setIsAuthenticated(authed)
    return authed
  }

  const handleLoginClick = async () => {
    const authed = await checkAuthFresh()
    if (authed) {
      goToChat()
    } else {
      router.push("/auth/login")
    }
  }

  const handleStartClick = async () => {
    const authed = await checkAuthFresh()
    if (authed) {
      goToChat()
    } else {
      router.push("/auth/sign-up")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50">
      <nav className="border-b bg-white/80 backdrop-blur-sm px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-8 bg-gradient-to-b from-red-500 via-white to-blue-400 rounded-sm" />
            <h1 className="text-2xl font-bold text-blue-600">LetzLearn</h1>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={handleLoginClick}>
              Login
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleStartClick}>
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-4">
            Learn Luxembourgish
            <br />
            <span className="text-blue-600">The Fun Way</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Practice conversations, master grammar, and build your vocabulary with AI-powered tutoring designed for
            beginners.
          </p>
          <Button
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6"
            onClick={handleStartClick}
          >
            Start Learning Free
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <MessageCircle className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Conversation Practice</h3>
            <p className="text-muted-foreground">
              Chat naturally in Luxembourgish with AI guidance. Get instant corrections and keep the conversation
              flowing.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Grammar Mastery</h3>
            <p className="text-muted-foreground">
              Understand the rules that make Luxembourgish unique. Clear explanations with plenty of examples.
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <BookText className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Vocabulary Builder</h3>
            <p className="text-muted-foreground">
              Save words from conversations and practice with flashcards. Build your personal dictionary.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
          <Languages className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2">Designed for Beginners</h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            LetzLearn uses AI to provide encouraging, beginner-friendly instruction. Practice at your own pace with
            instant feedback and explanations in both English and Luxembourgish.
          </p>
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700" onClick={handleStartClick}>
            Start Your Journey
          </Button>
        </div>
      </main>

      <footer className="border-t bg-white/80 backdrop-blur-sm px-6 py-8 mt-16">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          <p>LetzLearn - Your AI-powered Luxembourgish tutor</p>
        </div>
      </footer>
    </div>
  )
}
