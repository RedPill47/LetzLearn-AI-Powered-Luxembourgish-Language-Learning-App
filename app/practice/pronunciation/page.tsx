"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trophy, RotateCcw, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PronunciationExercise } from "@/components/speech/pronunciation-exercise";
import { createClient } from "@/lib/supabase/client";

interface VocabularyWord {
  id: string;
  luxembourgish_word: string;
  english_translation: string;
}

// Default exercises for when there are no vocabulary words
const DEFAULT_EXERCISES = [
  { text: "Moien", translation: "Hello" },
  { text: "Wéi geet et?", translation: "How are you?" },
  { text: "Merci", translation: "Thank you" },
  { text: "Äddi", translation: "Goodbye" },
  { text: "Wann ech gelift", translation: "Please" },
  { text: "Ech verstinn net", translation: "I don't understand" },
  { text: "Wéi heescht Dir?", translation: "What is your name?" },
  { text: "Ech heeschen...", translation: "My name is..." },
  { text: "Et geet mir gutt", translation: "I'm doing well" },
  { text: "Keng Ursaach", translation: "You're welcome" },
];

export default function PronunciationPracticePage() {
  const router = useRouter();
  const [exercises, setExercises] = useState<Array<{ text: string; translation: string }>>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<Array<{ accuracy: number; attempts: number }>>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [useVocabulary, setUseVocabulary] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    loadExercises();
  }, [useVocabulary]);

  async function loadExercises() {
    setIsLoading(true);

    if (useVocabulary) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setExercises(DEFAULT_EXERCISES);
          setIsLoading(false);
          return;
        }

        // Get vocabulary words for practice
        const { data: words, error } = await supabase
          .from("vocabulary_cards")
          .select("id, luxembourgish_word, english_translation")
          .eq("user_id", user.id)
          .limit(10);

        if (error || !words || words.length === 0) {
          setExercises(DEFAULT_EXERCISES);
        } else {
          // Shuffle and use vocabulary
          const shuffled = [...words].sort(() => Math.random() - 0.5);
          setExercises(
            shuffled.map((w) => ({
              text: w.luxembourgish_word,
              translation: w.english_translation,
            }))
          );
        }
      } catch {
        setExercises(DEFAULT_EXERCISES);
      }
    } else {
      setExercises(DEFAULT_EXERCISES);
    }

    setCurrentIndex(0);
    setResults([]);
    setIsComplete(false);
    setIsLoading(false);
  }

  const handleComplete = async (result: { accuracy: number; attempts: number }) => {
    setResults((prev) => [...prev, result]);

    // Track speaking exercise when session is complete
    if (currentIndex === exercises.length - 1) {
      const { trackSpeakingExercise } = await import("@/lib/update-progress");
      await trackSpeakingExercise("pronunciation");
      setIsComplete(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    setResults((prev) => [...prev, { accuracy: 0, attempts: 0 }]);

    if (currentIndex < exercises.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsComplete(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setResults([]);
    setIsComplete(false);
  };

  const averageAccuracy =
    results.length > 0
      ? Math.round(results.reduce((a, b) => a + b.accuracy, 0) / results.length)
      : 0;

  const passedCount = results.filter((r) => r.accuracy >= 70).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading exercises...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/chat">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Pronunciation Practice</h1>
              <p className="text-sm text-muted-foreground">
                {useVocabulary ? "Practice your vocabulary" : "Common phrases"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUseVocabulary(!useVocabulary)}
            >
              {useVocabulary ? "Use Default Phrases" : "Use My Vocabulary"}
            </Button>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      {!isComplete && (
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Progress value={((currentIndex) / exercises.length) * 100} className="flex-1" />
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} / {exercises.length}
            </span>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="container mx-auto px-4 py-8 flex justify-center">
        {!isComplete ? (
          <PronunciationExercise
            key={currentIndex}
            text={exercises[currentIndex].text}
            translation={exercises[currentIndex].translation}
            onComplete={handleComplete}
            onSkip={handleSkip}
          />
        ) : (
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <Trophy className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
              <CardTitle className="text-2xl">Practice Complete!</CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-3xl font-bold text-primary">{averageAccuracy}%</p>
                  <p className="text-sm text-muted-foreground">Average</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-3xl font-bold text-green-500">{passedCount}</p>
                  <p className="text-sm text-muted-foreground">Passed</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-3xl font-bold">{exercises.length}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>

              {/* Individual results */}
              <div className="space-y-2">
                <h3 className="font-medium">Results</h3>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {exercises.map((exercise, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded bg-muted"
                    >
                      <span className="font-medium">{exercise.text}</span>
                      <span
                        className={
                          results[index]?.accuracy >= 70
                            ? "text-green-500"
                            : results[index]?.accuracy > 0
                            ? "text-orange-500"
                            : "text-muted-foreground"
                        }
                      >
                        {results[index]?.accuracy || 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleRestart} className="flex-1">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Practice Again
                </Button>
                <Link href="/practice/dialog" className="flex-1">
                  <Button className="w-full">
                    Try Dialog Practice
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
