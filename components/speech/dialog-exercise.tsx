"use client";

import { useState, useEffect, useRef } from "react";
import { Volume2, Mic, User, Bot, Check, X, Loader2, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { useSpeechToText } from "@/hooks/use-audio-recorder";
import { cn } from "@/lib/utils";

interface DialogLine {
  speaker: "ai" | "user";
  text: string;
  translation?: string;
}

interface DialogExerciseProps {
  title: string;
  description?: string;
  lines: DialogLine[];
  onComplete?: (result: { score: number; totalLines: number }) => void;
  onSkip?: () => void;
  aiVoiceId?: string;
  passThreshold?: number;
}

type LineState = "pending" | "playing" | "recording" | "processing" | "passed" | "failed";

export function DialogExercise({
  title,
  description,
  lines,
  onComplete,
  onSkip,
  aiVoiceId,
  passThreshold = 60,
}: DialogExerciseProps) {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [lineStates, setLineStates] = useState<LineState[]>(
    lines.map(() => "pending")
  );
  const [lineScores, setLineScores] = useState<number[]>(lines.map(() => 0));
  const [showTranslation, setShowTranslation] = useState(false);
  const isProcessingRef = useRef(false);

  const tts = useTextToSpeech();
  const stt = useSpeechToText({ maxDuration: 30 });

  const currentLine = lines[currentLineIndex];
  const isComplete = currentLineIndex >= lines.length;
  const totalScore = lineScores.reduce((a, b) => a + b, 0);
  const averageScore = lines.length > 0 ? Math.round(totalScore / lines.length) : 0;

  // Auto-play AI lines
  useEffect(() => {
    if (
      currentLine?.speaker === "ai" && 
      lineStates[currentLineIndex] === "pending" && 
      !tts.isPlaying && 
      !isProcessingRef.current
    ) {
      handlePlayAILine();
    }
  }, [currentLineIndex, currentLine?.speaker, lineStates[currentLineIndex], tts.isPlaying]);

  // Handle transcription result
  useEffect(() => {
    if (lineStates[currentLineIndex] === "processing") {
      // If transcription is complete (not transcribing) and we have feedback
      if (!stt.isTranscribing && stt.pronunciationFeedback) {
      const accuracy = stt.pronunciationFeedback.accuracy;
      const passed = accuracy >= passThreshold;

      setLineScores((prev) => {
        const updated = [...prev];
        updated[currentLineIndex] = accuracy;
        return updated;
      });

      setLineStates((prev) => {
        const updated = [...prev];
        updated[currentLineIndex] = passed ? "passed" : "failed";
        return updated;
      });
    }
      // If transcription is complete but no feedback (error or no expected text)
      else if (!stt.isTranscribing && stt.transcription) {
        // Still mark as processed, but with lower score
        setLineScores((prev) => {
          const updated = [...prev];
          updated[currentLineIndex] = 50; // Default score if no feedback
          return updated;
        });

        setLineStates((prev) => {
          const updated = [...prev];
          updated[currentLineIndex] = "failed"; // Mark as failed if no proper feedback
          return updated;
        });
      }
    }
  }, [stt.pronunciationFeedback, stt.isTranscribing, stt.transcription, currentLineIndex, passThreshold]);

  // Timeout for processing state (in case transcription hangs)
  useEffect(() => {
    if (lineStates[currentLineIndex] === "processing") {
      const timeout = setTimeout(() => {
        // If still processing after 10 seconds, mark as failed
        if (lineStates[currentLineIndex] === "processing") {
          setLineScores((prev) => {
            const updated = [...prev];
            updated[currentLineIndex] = 0;
            return updated;
          });
          setLineStates((prev) => {
            const updated = [...prev];
            updated[currentLineIndex] = "failed";
            return updated;
          });
        }
      }, 10000); // 10 second timeout

      return () => clearTimeout(timeout);
    }
  }, [lineStates[currentLineIndex], currentLineIndex]);

  const handlePlayAILine = async () => {
    // Prevent multiple calls
    if (lineStates[currentLineIndex] !== "pending" || tts.isPlaying || isProcessingRef.current) {
      return;
    }

    isProcessingRef.current = true;

    setLineStates((prev) => {
      const updated = [...prev];
      updated[currentLineIndex] = "playing";
      return updated;
    });

    await tts.speak(currentLine.text, { voiceId: aiVoiceId });

    setLineStates((prev) => {
      const updated = [...prev];
      updated[currentLineIndex] = "passed";
      return updated;
    });

    // Advance to next line after AI line finishes
    // If next is AI, auto-advance. If next is user, advance but wait for user to speak
    const nextIndex = currentLineIndex + 1;
    if (nextIndex < lines.length) {
      const nextLine = lines[nextIndex];
      // Always advance to show the next line
      // If next line is AI, it will auto-play. If user, they'll see the Speak button
    setTimeout(() => {
        isProcessingRef.current = false;
        setCurrentLineIndex(nextIndex);
        // Ensure the next line state is "pending" if it's a user line
        if (nextLine.speaker === "user") {
          setLineStates((prev) => {
            const updated = [...prev];
            if (updated[nextIndex] !== "pending") {
              updated[nextIndex] = "pending";
            }
            return updated;
          });
      }
      }, 1000); // Wait 1 second before advancing
    } else {
      // No more lines
      isProcessingRef.current = false;
    }
  };

  const handleStartRecording = async () => {
    stt.resetRecording();
    setLineStates((prev) => {
      const updated = [...prev];
      updated[currentLineIndex] = "recording";
      return updated;
    });
    await stt.startRecording();
  };

  const handleStopRecording = async () => {
    setLineStates((prev) => {
      const updated = [...prev];
      updated[currentLineIndex] = "processing";
      return updated;
    });
    
    try {
    await stt.stopRecording();
      // Transcribe after stopping - wait a bit for blob to be ready
      setTimeout(async () => {
        try {
          await stt.transcribe(currentLine.text);
        } catch (error) {
          console.error("Transcription error:", error);
          // If transcription fails, mark as failed
          setLineScores((prev) => {
            const updated = [...prev];
            updated[currentLineIndex] = 0;
            return updated;
          });
          setLineStates((prev) => {
            const updated = [...prev];
            updated[currentLineIndex] = "failed";
            return updated;
          });
        }
      }, 200); // Slightly longer delay to ensure blob is ready
    } catch (error) {
      console.error("Stop recording error:", error);
      // If stopping fails, reset to pending
      setLineStates((prev) => {
        const updated = [...prev];
        updated[currentLineIndex] = "pending";
        return updated;
      });
    }
  };

  const handleNextLine = () => {
    stt.resetRecording();
    if (currentLineIndex < lines.length - 1) {
      setCurrentLineIndex((prev) => prev + 1);
    } else {
      // Dialog complete
      onComplete?.({
        score: averageScore,
        totalLines: lines.filter((l) => l.speaker === "user").length,
      });
    }
  };

  const handleRetryLine = () => {
    stt.resetRecording();
    setLineStates((prev) => {
      const updated = [...prev];
      updated[currentLineIndex] = "pending";
      return updated;
    });
  };

  const handleRestart = () => {
    stt.resetRecording();
    setCurrentLineIndex(0);
    setLineStates(lines.map(() => "pending"));
    setLineScores(lines.map(() => 0));
  };

  const userLines = lines.filter((l) => l.speaker === "user").length;
  const completedUserLines = lineStates.filter(
    (s, i) => lines[i].speaker === "user" && (s === "passed" || s === "failed")
  ).length;

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <span className="text-sm font-normal text-muted-foreground">
            {completedUserLines} / {userLines} lines
          </span>
        </CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress */}
        <Progress value={(currentLineIndex / lines.length) * 100} />

        {/* Dialog lines */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {lines.map((line, index) => {
            const state = lineStates[index];
            const score = lineScores[index];
            const isCurrent = index === currentLineIndex;
            const isUserLine = line.speaker === "user";

            return (
              <div
                key={index}
                className={cn(
                  "flex gap-2.5 items-start transition-all",
                  index > currentLineIndex && "opacity-50"
                )}
              >
                {/* Speaker icon */}
                <div
                  className={cn(
                    "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5",
                    isUserLine
                      ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400"
                      : "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400"
                  )}
                >
                  {isUserLine ? (
                    <User className="h-3.5 w-3.5" />
                  ) : (
                    <Bot className="h-3.5 w-3.5" />
                  )}
                </div>

                {/* Line content */}
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "inline-block px-3 py-2 rounded-md max-w-full",
                    isCurrent 
                      ? isUserLine
                        ? "bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800"
                        : "bg-purple-50 border border-purple-200 dark:bg-purple-950 dark:border-purple-800"
                      : "bg-gray-50 dark:bg-gray-900",
                    state === "passed" && "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800",
                    state === "failed" && "bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800"
                  )}>
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={cn(
                          "text-sm font-medium break-words",
                          state === "passed" && "text-green-700 dark:text-green-300",
                          state === "failed" && "text-orange-700 dark:text-orange-300",
                          !state || state === "pending" ? (isUserLine ? "text-blue-900 dark:text-blue-100" : "text-purple-900 dark:text-purple-100") : "text-gray-900 dark:text-gray-100"
                      )}
                    >
                      {line.text}
                    </p>

                    {/* Status indicator */}
                    {state === "passed" && (
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    )}
                    {state === "failed" && (
                        <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5">
                        {score}%
                      </span>
                    )}
                    {state === "playing" && (
                        <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0 mt-0.5" />
                    )}
                    {state === "recording" && (
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0 mt-1" />
                    )}
                    {state === "processing" && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground flex-shrink-0 mt-0.5" />
                    )}
                  </div>

                  {/* Translation */}
                  {line.translation && showTranslation && (
                      <p className="text-xs text-muted-foreground mt-1.5 pt-1.5 border-t border-gray-200 dark:border-gray-700">
                      {line.translation}
                    </p>
                  )}

                  {/* What was heard (for failed lines) */}
                  {state === "failed" && isCurrent && stt.transcription && (
                      <p className="text-xs text-muted-foreground mt-1.5 pt-1.5 border-t border-gray-200 dark:border-gray-700 italic">
                      You said: {stt.transcription}
                    </p>
                  )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current line controls */}
        {!isComplete && currentLine && (
          <div className="flex justify-center gap-3 pt-4 border-t">
            {currentLine.speaker === "ai" ? (
              <Button
                variant="outline"
                onClick={handlePlayAILine}
                disabled={tts.isPlaying || lineStates[currentLineIndex] === "playing"}
              >
                <Volume2 className="h-4 w-4 mr-2" />
                {tts.isPlaying ? "Playing..." : "Replay"}
              </Button>
            ) : (
              <>
                {/* Show Speak button for user lines when pending or in an unknown state */}
                {(lineStates[currentLineIndex] === "pending" || 
                  lineStates[currentLineIndex] === undefined ||
                  (!["recording", "processing", "passed", "failed"].includes(lineStates[currentLineIndex] || ""))) && (
                  <>
                    <Button variant="outline" onClick={() => tts.speak(currentLine.text)}>
                      <Volume2 className="h-4 w-4 mr-2" />
                      Listen first
                    </Button>
                    <Button onClick={handleStartRecording} className="bg-red-500 hover:bg-red-600">
                      <Mic className="h-4 w-4 mr-2" />
                      Speak
                    </Button>
                  </>
                )}

                {lineStates[currentLineIndex] === "recording" && (
                  <Button variant="destructive" onClick={handleStopRecording} className="animate-pulse">
                    <div className="w-3 h-3 rounded-full bg-white mr-2" />
                    Stop ({stt.recordingTime}s)
                  </Button>
                )}

                {lineStates[currentLineIndex] === "processing" && (
                  <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Analyzing...
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Cancel processing and mark as failed
                        stt.resetRecording();
                        setLineScores((prev) => {
                          const updated = [...prev];
                          updated[currentLineIndex] = 0;
                          return updated;
                        });
                        setLineStates((prev) => {
                          const updated = [...prev];
                          updated[currentLineIndex] = "failed";
                          return updated;
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                {(lineStates[currentLineIndex] === "passed" || lineStates[currentLineIndex] === "failed") && (
                  <>
                    <Button variant="outline" onClick={handleRetryLine}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                    <Button onClick={handleNextLine}>
                      {currentLineIndex < lines.length - 1 ? "Next" : "Finish"}
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Completion */}
        {isComplete && (
          <div className="text-center py-6 space-y-4">
            <div className="text-6xl">
              {averageScore >= 80 ? "🎉" : averageScore >= 60 ? "👍" : "💪"}
            </div>
            <div>
              <p className="text-2xl font-bold">Dialog Complete!</p>
              <p className="text-muted-foreground">
                Average score: {averageScore}%
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={handleRestart}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Practice Again
              </Button>
              {onComplete && (
                <Button onClick={() => onComplete({ score: averageScore, totalLines: userLines })}>
                  Continue
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowTranslation(!showTranslation)}
        >
          {showTranslation ? "Hide" : "Show"} translations
        </Button>

        {onSkip && !isComplete && (
          <Button variant="ghost" size="sm" onClick={onSkip}>
            Skip dialog
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
