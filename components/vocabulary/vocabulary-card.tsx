"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, Edit, Volume2, Loader2 } from "lucide-react"
import { useState } from "react"
import { useTextToSpeech } from "@/hooks/use-text-to-speech"

interface VocabularyCardProps {
  id: string
  luxembourgish: string
  english: string
  notes?: string
  onDelete: (id: string) => void
  onEdit: (id: string, data: { luxembourgish: string; english: string; notes: string }) => void
}

export function VocabularyCard({ id, luxembourgish, english, notes, onDelete, onEdit }: VocabularyCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editLuxembourgish, setEditLuxembourgish] = useState(luxembourgish)
  const [editEnglish, setEditEnglish] = useState(english)
  const [editNotes, setEditNotes] = useState(notes || "")
  const { speak, isLoading, isPlaying } = useTextToSpeech()

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation()
    speak(luxembourgish)
  }

  const handleSave = () => {
    onEdit(id, {
      luxembourgish: editLuxembourgish,
      english: editEnglish,
      notes: editNotes,
    })
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <Card className="p-4">
        <div className="flex flex-col gap-3">
          <input
            className="text-lg font-semibold border rounded px-2 py-1"
            value={editLuxembourgish}
            onChange={(e) => setEditLuxembourgish(e.target.value)}
            placeholder="Luxembourgish word"
          />
          <input
            className="text-muted-foreground border rounded px-2 py-1"
            value={editEnglish}
            onChange={(e) => setEditEnglish(e.target.value)}
            placeholder="English translation"
          />
          <textarea
            className="text-sm border rounded px-2 py-1 resize-none"
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} className="flex-1">
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card
      className="p-6 cursor-pointer hover:shadow-lg transition-shadow relative"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div className="absolute top-2 right-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSpeak}
          disabled={isLoading}
          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
          title="Listen to pronunciation"
        >
          {isLoading || isPlaying ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)} className="h-8 w-8 p-0">
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDelete(id)}
          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {!isFlipped ? (
        <div className="flex flex-col items-center justify-center min-h-[120px] text-center">
          <p className="text-2xl font-bold text-blue-600 mb-2">{luxembourgish}</p>
          <p className="text-xs text-muted-foreground">Click to reveal translation</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[120px] text-center">
          <p className="text-xl text-muted-foreground mb-2">{english}</p>
          {notes && <p className="text-sm text-muted-foreground italic border-t pt-2 mt-2">{notes}</p>}
          <p className="text-xs text-muted-foreground mt-2">Click to flip back</p>
        </div>
      )}
    </Card>
  )
}
