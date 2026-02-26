"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useState, useEffect } from "react"
import { Loader2, Sparkles } from "lucide-react"

interface VocabularyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedWord: string
  onSave: (data: {
    luxembourgish: string
    english: string
    notes: string
  }) => void
}

export function VocabularyDialog({ open, onOpenChange, selectedWord, onSave }: VocabularyDialogProps) {
  const [luxembourgish, setLuxembourgish] = useState("")
  const [english, setEnglish] = useState("")
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Fetch translation from AI when dialog opens
  useEffect(() => {
    if (open && selectedWord) {
      setLuxembourgish(selectedWord)
      setEnglish("")
      setNotes("")
      fetchTranslation(selectedWord)
    }
  }, [open, selectedWord])

  const fetchTranslation = async (text: string) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })

      if (response.ok) {
        const data = await response.json()
        setEnglish(data.translation || "")
        setNotes(data.note || "")
      }
    } catch (error) {
      console.error("Translation error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = () => {
    onSave({ luxembourgish, english, notes })
    setLuxembourgish("")
    setEnglish("")
    setNotes("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            Add to Vocabulary
          </DialogTitle>
          <DialogDescription>
            {isLoading ? "Getting translation from AI..." : "Save this word to your vocabulary list"}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="luxembourgish">Luxembourgish Word</Label>
            <Input
              id="luxembourgish"
              value={luxembourgish}
              onChange={(e) => setLuxembourgish(e.target.value)}
              placeholder="e.g., Moien"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="english" className="flex items-center gap-2">
              English Translation
              {isLoading && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
            </Label>
            <div className="relative">
              <Input
                id="english"
                value={english}
                onChange={(e) => setEnglish(e.target.value)}
                placeholder={isLoading ? "Translating..." : "e.g., Hello"}
                disabled={isLoading}
                className={isLoading ? "bg-gray-50" : ""}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes" className="flex items-center gap-2">
              Usage Notes
              {isLoading && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isLoading ? "Generating usage tips..." : "Add any notes about this word..."}
              rows={3}
              disabled={isLoading}
              className={isLoading ? "bg-gray-50" : ""}
            />
          </div>
          <Button
            onClick={handleSave}
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={!luxembourgish || !english || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "Save to Vocabulary"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
