"use client"

import { Button } from "@/components/ui/button"
import { BookmarkPlus, Volume2, Loader2 } from "lucide-react"
import { useState, useMemo } from "react"
import { useTextToSpeech } from "@/hooks/use-text-to-speech"

interface MessageBubbleProps {
  role: "user" | "assistant"
  content: string
  translation?: string
  luxItUpMode?: boolean
  immersionStage?: number
  quizMode?: boolean
  onAddToVocabulary?: (word: string) => void
}

// Check if text looks like Luxembourgish (contains special characters or common Lux words)
function looksLuxembourgish(text: string): boolean {
  const luxIndicators = /[ëéäöüÄÖÜ]|^(Ech|Mir|Dir|Wéi|Moien|Äddi|Merci|geet|sinn|hunn|ass|fir|dat|déi|an|op|mat)\b/i
  return luxIndicators.test(text)
}

// Check if text looks like English translation
function looksEnglish(text: string): boolean {
  // More comprehensive English detection
  const englishIndicators = /^(I |I'm|You |You're|We |They |It |It's|The |A |An |How |What |This |That |Hello|Thank|Good |To |For |My |Your |Is |Are |Was |Were |Have |Has |Do |Does |Can |Could |Would |Should |Will )/i
  const hasEnglishWords = /\b(the|is|are|was|were|have|has|do|does|can|could|would|should|will|and|or|but|for|with|this|that|these|those|from|into|your|my|his|her|its|our|their|been|being|am|welcome|help|thank|please|hello|good|great|nice)\b/i
  
  // Text is English if it matches indicators OR has common English words AND doesn't look Luxembourgish
  return (englishIndicators.test(text) || hasEnglishWords.test(text)) && !looksLuxembourgish(text)
}

// Render a phrase card (Luxembourgish + translation)
function PhraseCard({ lux, eng, keyId, onSelect }: { lux: string; eng: string; keyId: number; onSelect?: (lux: string) => void }) {
  const { speak, isLoading, isPlaying } = useTextToSpeech()

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation()
    speak(lux)
  }

  // Fix formatting issues in translation text
  const formatTranslation = (text: string): string => {
    // Fix missing spaces after periods/before capital letters (e.g., "projectThat" -> "project. That")
    let formatted = text.replace(/([a-z])([A-Z])/g, '$1. $2')
    // Ensure spaces after punctuation
    formatted = formatted.replace(/([.!?])([A-Z])/g, '$1 $2')
    // Fix multiple spaces
    formatted = formatted.replace(/\s+/g, ' ').trim()
    return formatted
  }

  return (
    <div
      key={keyId}
      className="my-3 pl-3 border-l-2 border-blue-400 group cursor-pointer hover:bg-blue-50 rounded-r-lg transition-colors flex items-start justify-between"
      onClick={() => onSelect?.(lux)}
      title="Click to add to vocabulary"
    >
      <div className="flex-1">
        <div className="text-base font-medium text-gray-900">{lux}</div>
        <div className="text-sm text-gray-500">{formatTranslation(eng)}</div>
      </div>
      <button
        onClick={handleSpeak}
        disabled={isLoading}
        className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded transition-colors opacity-0 group-hover:opacity-100"
        title="Listen to pronunciation"
      >
        {isLoading || isPlaying ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
      </button>
    </div>
  )
}

// Parse and render formatted content
function FormattedContent({ content, onSelectPhrase }: { content: string; onSelectPhrase?: (lux: string) => void }) {
  const elements = useMemo(() => {
    const lines = content.split("\n")
    const result: React.ReactNode[] = []
    let i = 0

    while (i < lines.length) {
      const line = lines[i]
      const trimmed = line.trim()

      // Empty line = spacing
      if (!trimmed) {
        result.push(<div key={i} className="h-3" />)
        i++
        continue
      }

      // Check if line contains >>> phrase marker (may have commentary before it)
      if (trimmed.includes(">>>")) {
        // Split by >>> to find all phrase markers
        const segments = trimmed.split(/(>>>)/g)
        let currentSegment = ""
        let phraseIndex = 0
        
        for (let segIdx = 0; segIdx < segments.length; segIdx++) {
          const segment = segments[segIdx]
          
          if (segment === ">>>") {
            // This is a phrase marker - next segment is the phrase
            if (currentSegment.trim()) {
              // Render accumulated commentary
              result.push(
                <p key={`pre-commentary-${i}-${phraseIndex}`} className="text-sm text-gray-700 my-1 leading-relaxed">
                  {currentSegment.trim()}
                </p>
              )
              currentSegment = ""
            }
            
            // Get the phrase content (next segment)
            if (segIdx + 1 < segments.length) {
              const phraseContent = segments[segIdx + 1].trim()
              segIdx++ // Skip the phrase content segment
              
              if (phraseContent) {
                // Check for /// separator
                if (phraseContent.includes("///")) {
                  const phraseParts = phraseContent.split("///")
                  const lux = phraseParts[0].trim()
                  const engFull = phraseParts.slice(1).join("///").trim()
                  
                  if (lux && engFull) {
                    // Extract translation (first sentence) and commentary
                    let translation: string
                    let phraseCommentary: string | null = null
                    
                    const firstSentenceEnd = engFull.search(/[.!?]\s+/)
                    if (firstSentenceEnd > 0) {
                      translation = engFull.slice(0, firstSentenceEnd + 1).trim()
                      phraseCommentary = engFull.slice(firstSentenceEnd + 1).trim()
                    } else {
                      translation = engFull
                    }
                    
                    result.push(<PhraseCard key={`phrase-${i}-${phraseIndex}`} lux={lux} eng={translation} keyId={i * 100 + phraseIndex} onSelect={onSelectPhrase} />)
                    
                    if (phraseCommentary) {
                      let cleaned = phraseCommentary
                        .replace(/>>>\s*/g, '')
                        .replace(/\s*\/\/\/\s*/g, ' / ')
                        .trim()
                      
                      if (cleaned) {
                        result.push(
                          <p key={`post-commentary-${i}-${phraseIndex}`} className="text-sm text-gray-700 my-1 leading-relaxed">
                            {cleaned}
                          </p>
                        )
                      }
                    }
                  }
                } else {
                  // No /// separator - the phrase content might be:
                  // 1. Just Luxembourgish (ends with punctuation)
                  // 2. Luxembourgish followed by English (no separator)
                  // 3. Contains another >>> marker (phrase continues)
                  
                  // Check if there's another >>> in this content
                  if (phraseContent.includes(">>>")) {
                    // Split and take only the part before the next >>>
                    const beforeNextMarker = phraseContent.split(">>>")[0].trim()
                    if (beforeNextMarker) {
                      // Treat as Luxembourgish phrase
                      result.push(<PhraseCard key={`phrase-${i}-${phraseIndex}`} lux={beforeNextMarker} eng="" keyId={i * 100 + phraseIndex} onSelect={onSelectPhrase} />)
                    }
                  } else {
                    // Try to detect Luxembourgish vs English
                    const words = phraseContent.split(/\s+/)
                    let luxWords: string[] = []
                    let engWords: string[] = []
                    let foundEnglish = false
                    
                    for (const word of words) {
                      const cleanWord = word.replace(/[.,!?;:"]/g, '') // Remove punctuation for detection
                      
                      if (!foundEnglish && looksLuxembourgish(cleanWord)) {
                        luxWords.push(word) // Keep original word with punctuation
                      } else if (looksEnglish(cleanWord) || foundEnglish) {
                        foundEnglish = true
                        engWords.push(word)
                      } else if (luxWords.length > 0) {
                        // Ambiguous - if we already have Luxembourgish, continue with it
                        luxWords.push(word)
                      } else if (cleanWord.length > 0) {
                        // No clear match - if it looks like it could be English, treat as English
                        if (looksEnglish(cleanWord) || /^[A-Z]/.test(word)) {
                          engWords.push(word)
                        } else {
                          luxWords.push(word)
                        }
                      }
                    }
                    
                    const lux = luxWords.join(" ").trim()
                    const eng = engWords.join(" ").trim()
                    
                    if (lux) {
                      result.push(<PhraseCard key={`phrase-${i}-${phraseIndex}`} lux={lux} eng={eng} keyId={i * 100 + phraseIndex} onSelect={onSelectPhrase} />)
                    } else if (eng) {
                      // Only English found - treat as commentary
                      result.push(
                        <p key={`unparsed-${i}-${phraseIndex}`} className="text-sm text-gray-700 my-1 leading-relaxed">
                          {eng}
                        </p>
                      )
                    } else {
                      // Couldn't parse, render as regular text (cleaned)
                      let cleaned = phraseContent.replace(/>>>\s*/g, '').trim()
                      if (cleaned) {
                        result.push(
                          <p key={`unparsed-${i}-${phraseIndex}`} className="text-sm text-gray-700 my-1 leading-relaxed">
                            {cleaned}
                          </p>
                        )
                      }
                    }
                  }
                }
                phraseIndex++
              }
            }
          } else {
            // Regular text segment - accumulate for commentary
            currentSegment += segment
          }
        }
        
        // Render any remaining commentary
        if (currentSegment.trim()) {
          let cleaned = currentSegment.trim().replace(/>>>\s*/g, '')
          if (cleaned) {
            result.push(
              <p key={`final-commentary-${i}`} className="text-sm text-gray-700 my-1 leading-relaxed">
                {cleaned}
              </p>
            )
          }
        }
        
        i++
        continue
      }

      // Check for explicit /// separator on clean line (ideal format)
      const cleanLine = trimmed.startsWith(">>>") ? trimmed.slice(3).trim() : trimmed

      if (cleanLine.includes("///")) {
        const parts = cleanLine.split("///")
        const lux = parts[0].trim()
        const engFull = parts.slice(1).join("///").trim()
        
        if (lux && engFull) {
          // Extract only the direct translation (first sentence ending with . ! ?)
          let translation: string;
          let commentary: string | null = null;
          
          // Find the first sentence ending with punctuation followed by space
          const firstSentenceEnd = engFull.search(/[.!?]\s+/);
          
          if (firstSentenceEnd > 0) {
            translation = engFull.slice(0, firstSentenceEnd + 1).trim();
            commentary = engFull.slice(firstSentenceEnd + 1).trim();
          } else {
            // No clear sentence boundary, check for commentary starters
            const commentaryStarters = /\s+(That's|You can|Also|Try|Notice|Great|Perfect|This is|It's)/i;
            const commentaryMatch = engFull.match(commentaryStarters);
            if (commentaryMatch && commentaryMatch.index && commentaryMatch.index > 0) {
              translation = engFull.slice(0, commentaryMatch.index).trim();
              commentary = engFull.slice(commentaryMatch.index).trim();
            } else {
              translation = engFull;
            }
          }
          
          // Render the phrase card with just the translation
          result.push(<PhraseCard key={i} lux={lux} eng={translation} keyId={i} onSelect={onSelectPhrase} />)
          
          // If there's commentary, clean it up and render as regular text
          if (commentary) {
            let cleanedCommentary = commentary
              .replace(/>>>\s*/g, '')
              .replace(/\s*\/\/\/\s*/g, ' / ')
              .trim()
            
            result.push(
              <p key={`commentary-${i}`} className="text-sm text-gray-700 my-1 leading-relaxed">
                {cleanedCommentary}
              </p>
            )
          }
          
          i++
          continue
        }
      }

      // Check if this line + next line form a Lux/Eng pair
      const nextLine = lines[i + 1]?.trim()
      if (nextLine && looksLuxembourgish(cleanLine) && looksEnglish(nextLine)) {
        result.push(<PhraseCard key={i} lux={cleanLine} eng={nextLine} keyId={i} onSelect={onSelectPhrase} />)
        i += 2
        continue
      }

      // Theme header: THEME: Name
      if (trimmed.startsWith("THEME:")) {
        const themeName = trimmed.slice(6).trim()
        result.push(
          <div key={i} className="mt-4 mb-2 flex items-center gap-2">
            <span className="text-lg">📚</span>
            <span className="font-semibold text-gray-700">{themeName}</span>
          </div>
        )
        i++
        continue
      }

      // Vocabulary word: WORD: lux — english (note)
      if (trimmed.startsWith("WORD:")) {
        const wordPart = trimmed.slice(5).trim()
        const dashMatch = wordPart.match(/^(.+?)\s*—\s*(.+)$/)
        if (dashMatch) {
          const lux = dashMatch[1].trim()
          const eng = dashMatch[2].trim()
          result.push(
            <div key={i} className="flex items-baseline gap-3 my-1.5 py-1">
              <span className="font-medium text-gray-900 min-w-[120px]">{lux}</span>
              <span className="text-gray-400">→</span>
              <span className="text-gray-600">{eng}</span>
            </div>
          )
          i++
          continue
        }
      }

      // Table: TABLE: ... END_TABLE
      if (trimmed === "TABLE:") {
        const tableRows: string[][] = []
        i++
        while (i < lines.length && lines[i].trim() !== "END_TABLE") {
          const row = lines[i].trim()
          if (row.startsWith("|") && row.endsWith("|")) {
            const cells = row.split("|").filter(Boolean).map(s => s.trim())
            if (cells.length > 0 && !cells[0].match(/^-+$/)) {
              tableRows.push(cells)
            }
          }
          i++
        }
        i++ // Skip END_TABLE
        
        if (tableRows.length > 0) {
          result.push(
            <div key={`table-${i}`} className="my-3 rounded-lg overflow-hidden border border-gray-200">
              <table className="w-full text-sm">
                <tbody>
                  {tableRows.map((row, rowIdx) => (
                    <tr key={rowIdx} className={rowIdx % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                      {row.map((cell, cellIdx) => (
                        <td 
                          key={cellIdx} 
                          className={`px-4 py-2 ${
                            cellIdx === 0 ? "font-medium text-gray-500 w-16" : 
                            cellIdx === 1 ? "font-medium text-gray-900" : "text-gray-600"
                          }`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        continue
      }

      // Bullet points
      if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
        const bulletContent = trimmed.slice(2)
        result.push(
          <div key={i} className="flex gap-2 my-1 text-sm text-gray-700">
            <span className="text-blue-400">•</span>
            <span>{bulletContent}</span>
          </div>
        )
        i++
        continue
      }

      // Skip lines that are just ">>>" leftovers
      if (trimmed === ">>>" || trimmed === ">>>") {
        i++
        continue
      }

      // Regular text (but clean any remaining >>> prefix)
      let displayText = cleanLine || trimmed
      
      // Fix common formatting issues: missing spaces after periods/before capital letters
      // Pattern: word followed by capital letter (e.g., "projectThat" -> "project. That")
      displayText = displayText.replace(/([a-z])([A-Z])/g, '$1. $2')
      // Fix missing spaces after periods followed by capital letters
      displayText = displayText.replace(/([.!?])([A-Z])/g, '$1 $2')
      // Fix multiple spaces
      displayText = displayText.replace(/\s+/g, ' ').trim()
      
      result.push(
        <p key={i} className="text-sm text-gray-700 my-1 leading-relaxed">
          {displayText}
        </p>
      )
      i++
    }

    return result
  }, [content])

  return <>{elements}</>
}

// Extract Luxembourgish phrases from content for TTS
function extractLuxembourgishText(content: string): string {
  const lines = content.split("\n")
  const luxTexts: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Check for >>> prefix format
    const cleanLine = trimmed.startsWith(">>>") ? trimmed.slice(3).trim() : trimmed

    // Check for /// separator
    if (cleanLine.includes("///")) {
      const [lux] = cleanLine.split("///").map(s => s.trim())
      if (lux && looksLuxembourgish(lux)) {
        luxTexts.push(lux)
      }
    } else if (looksLuxembourgish(cleanLine)) {
      luxTexts.push(cleanLine)
    }
  }

  return luxTexts.join(". ")
}

export function MessageBubble({ role, content, translation, luxItUpMode, immersionStage, quizMode, onAddToVocabulary }: MessageBubbleProps) {
  const [selectedText, setSelectedText] = useState("")
  const { speak, isLoading, isPlaying, stop } = useTextToSpeech()

  // Extract Luxembourgish text for TTS
  const luxText = useMemo(() => extractLuxembourgishText(content), [content])

  const handleSpeakMessage = () => {
    if (isPlaying) {
      stop()
    } else if (luxText) {
      speak(luxText)
    }
  }

  const handleTextSelection = () => {
    // Disable text selection for vocabulary in quiz mode
    if (quizMode) return
    
    const selection = window.getSelection()
    const text = selection?.toString().trim()
    if (text) {
      setSelectedText(text)
    }
  }

  const handleAddToVocabulary = () => {
    if (selectedText && onAddToVocabulary) {
      onAddToVocabulary(selectedText)
      setSelectedText("")
      window.getSelection()?.removeAllRanges()
    }
  }

  const buildHint = (text: string) => {
    const words = text.split(/\s+/)
    if (words.length <= 6) {
      return words
        .map((w, idx) => (idx % 2 === 0 || w.length <= 3 ? w : "…"))
        .join(" ")
    }

    const revealPositions = new Set<number>([0, 1, words.length - 1])
    for (let i = 3; i < words.length - 1; i += 3) {
      revealPositions.add(i)
    }

    return words
      .map((w, idx) => {
        if (revealPositions.has(idx) || w.length <= 3) return w
        return "…"
      })
      .join(" ")
  }

  return (
    <div className={`flex ${role === "user" ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[80%] rounded-2xl px-5 py-4 relative group ${
          role === "user"
            ? "bg-blue-600 text-white"
            : "bg-white border border-gray-200 shadow-sm text-gray-900"
        }`}
      >
        {/* TTS button for assistant messages with Luxembourgish content */}
        {role === "assistant" && luxText && !quizMode && (
          <button
            onClick={handleSpeakMessage}
            disabled={isLoading}
            className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors opacity-0 group-hover:opacity-100"
            title={isPlaying ? "Stop" : "Listen to Luxembourgish"}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isPlaying ? (
              <Volume2 className="w-4 h-4 text-blue-600" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
        )}
        <div onMouseUp={handleTextSelection}>
          {role === "assistant" ? (
            quizMode ? (
              // Quiz mode: plain text, no vocabulary formatting
              <div className="text-sm leading-relaxed whitespace-pre-line">{content}</div>
            ) : (
              // Normal mode: rich formatting with vocabulary features
              <>
                <FormattedContent 
                  content={content} 
                  onSelectPhrase={(lux) => {
                    if (onAddToVocabulary) {
                      onAddToVocabulary(lux)
                    }
                  }}
                />
                {luxItUpMode && translation && translation.trim() && (
                  <div className="mt-3 text-xs text-gray-500">
                      <div className="inline-flex flex-col gap-1 rounded-lg px-3 py-2 bg-gray-100 border border-gray-200 group transition cursor-help">
                      {immersionStage === 2 && (
                        <span className="text-[10px] uppercase tracking-wide text-gray-400">
                          Lux It Up on — hover for partial hint
                        </span>
                      )}
                      <span className="text-[10px] uppercase tracking-wide text-gray-400">
                        {immersionStage === 0
                          ? "Translation"
                          : immersionStage === 1
                            ? "Hover to reveal translation"
                            : ""}
                      </span>
                      <span
                        className={`inline-block text-gray-700 transition ${
                          immersionStage === 0
                            ? ""
                            : immersionStage === 1
                              ? "blur-sm group-hover:blur-none"
                              : "opacity-0 group-hover:opacity-100"
                        }`}
                        title="Hover to reveal the English hint"
                      >
                        {immersionStage === 2 ? buildHint(translation) : translation}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )
          ) : (
            <div className="text-sm leading-relaxed">{content}</div>
          )}
        </div>
        {selectedText && role === "assistant" && !quizMode && (
          <Button 
            size="sm" 
            variant="ghost" 
            className="mt-3 h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 -ml-2" 
            onClick={handleAddToVocabulary}
          >
            <BookmarkPlus className="w-3 h-3 mr-1" />
            Add "{selectedText}" to vocabulary
          </Button>
        )}
      </div>
    </div>
  )
}
