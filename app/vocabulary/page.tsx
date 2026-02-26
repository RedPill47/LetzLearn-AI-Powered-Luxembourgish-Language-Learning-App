"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { VocabularyCard } from "@/components/vocabulary/vocabulary-card"
import { ArrowLeft, Plus, GraduationCap, Target, TrendingUp, FileText, FileSpreadsheet } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { VocabularyDialog } from "@/components/chat/vocabulary-dialog"
import { exportToCSV, exportToPDF } from "@/lib/export-vocabulary"

interface VocabularyItem {
  id: string
  luxembourgish_word: string
  english_translation: string
  notes: string | null
  created_at: string
}

export default function VocabularyPage() {
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [dueCount, setDueCount] = useState(0)
  const router = useRouter()
  const { toast } = useToast()

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
      setUserId(user.id)

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
      } else {
        setVocabulary(data || [])
      }
      setIsLoading(false)
    }

    const loadDueCount = async () => {
      try {
        const response = await fetch("/api/vocabulary/due")
        if (response.ok) {
          const data = await response.json()
          setDueCount(data.count || 0)
        }
      } catch (error) {
        console.error("Error loading due count:", error)
      }
    }

    loadVocabulary()
    loadDueCount()
  }, [router, toast])

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase.from("vocabulary_cards").delete().eq("id", id)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete word",
        variant: "destructive",
      })
    } else {
      setVocabulary(vocabulary.filter((item) => item.id !== id))
      toast({
        title: "Success",
        description: "Word removed from vocabulary",
      })
    }
  }

  const handleEdit = async (id: string, data: { luxembourgish: string; english: string; notes: string }) => {
    const supabase = createClient()
    const { error } = await supabase
      .from("vocabulary_cards")
      .update({
        luxembourgish_word: data.luxembourgish,
        english_translation: data.english,
        notes: data.notes || null,
      })
      .eq("id", id)

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update word",
        variant: "destructive",
      })
    } else {
      setVocabulary(
        vocabulary.map((item) =>
          item.id === id
            ? {
                ...item,
                luxembourgish_word: data.luxembourgish,
                english_translation: data.english,
                notes: data.notes || null,
              }
            : item,
        ),
      )
      toast({
        title: "Success",
        description: "Word updated successfully",
      })
    }
  }

  const handleAdd = async (data: {
    luxembourgish: string
    english: string
    notes: string
  }) => {
    if (!userId) return

    const supabase = createClient()
    const { data: newCard, error } = await supabase
      .from("vocabulary_cards")
      .insert({
        user_id: userId,
        luxembourgish_word: data.luxembourgish,
        english_translation: data.english,
        notes: data.notes || null,
      })
      .select()
      .single()

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add word",
        variant: "destructive",
      })
    } else {
      setVocabulary([newCard, ...vocabulary])
      toast({
        title: "Success",
        description: "Word added to vocabulary",
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/chat")}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Chat
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-2 h-8 bg-gradient-to-b from-red-500 via-white to-blue-400 rounded-sm" />
            <h1 className="text-xl font-bold text-blue-600">My Vocabulary</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => router.push("/progress")} variant="ghost" size="sm">
            <TrendingUp className="w-4 h-4 mr-1" />
            Progress
          </Button>
          {vocabulary.length > 0 && (
            <>
              {dueCount > 0 && (
                <Button
                  onClick={() => router.push("/vocabulary/review")}
                  variant="default"
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Target className="w-4 h-4 mr-1" />
                  Review ({dueCount})
                </Button>
              )}
              <Button onClick={() => router.push("/vocabulary/study")} variant="outline" className="border-blue-300 text-blue-600 hover:bg-blue-50">
                <GraduationCap className="w-4 h-4 mr-1" />
                Study
              </Button>
              <Button
                onClick={() => {
                  exportToCSV(vocabulary)
                  toast({
                    title: "Success",
                    description: "Vocabulary exported to CSV",
                  })
                }}
                variant="outline"
                className="border-green-300 text-green-700 hover:bg-green-50"
                size="sm"
              >
                <FileSpreadsheet className="w-4 h-4 mr-1" />
                CSV
              </Button>
              <Button
                onClick={() => {
                  exportToPDF(vocabulary)
                  toast({
                    title: "Success",
                    description: "Vocabulary exported to PDF",
                  })
                }}
                variant="outline"
                className="border-green-300 text-green-700 hover:bg-green-50"
                size="sm"
              >
                <FileText className="w-4 h-4 mr-1" />
                PDF
              </Button>
            </>
          )}
          <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-1" />
            Add Word
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading vocabulary...</p>
          </div>
        ) : vocabulary.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No vocabulary yet</h2>
            <p className="text-muted-foreground mb-6">Start adding words from your conversations or manually</p>
            <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-1" />
              Add Your First Word
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-sm text-muted-foreground">
                {vocabulary.length} word{vocabulary.length !== 1 ? "s" : ""} in your vocabulary
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vocabulary.map((item) => (
                <VocabularyCard
                  key={item.id}
                  id={item.id}
                  luxembourgish={item.luxembourgish_word}
                  english={item.english_translation}
                  notes={item.notes || undefined}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          </>
        )}
      </main>

      <VocabularyDialog open={showAddDialog} onOpenChange={setShowAddDialog} selectedWord="" onSave={handleAdd} />
    </div>
  )
}
