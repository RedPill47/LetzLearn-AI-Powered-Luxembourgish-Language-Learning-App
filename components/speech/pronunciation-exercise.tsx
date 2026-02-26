"use client";

import { useState, useEffect } from "react";
import { Volume2, Mic, Check, X, RotateCcw, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { useSpeechToText } from "@/hooks/use-audio-recorder";
import { cn } from "@/lib/utils";

interface PronunciationExerciseProps {
  text: string; // The Luxembourgish text to pronounce
  translation?: string; // English translation
  onComplete?: (result: { accuracy: number; attempts: number }) => void;
  onSkip?: () => void;
  voiceId?: string;
  maxAttempts?: number;
  passThreshold?: number; // Accuracy percentage to pass (default 70)
}

type ExerciseState = "idle" | "listening" | "recording" | "processing" | "feedback";

export function PronunciationExercise({
  text,
  translation,
  onComplete,
  onSkip,
  voiceId,
  maxAttempts = 3,
  passThreshold = 70,
}: PronunciationExerciseProps) {
  const [state, setState] = useState<ExerciseState>("idle");
  const [attempts, setAttempts] = useState(0);
  const [bestAccuracy, setBestAccuracy] = useState(0);

  const tts = useTextToSpeech();
  const stt = useSpeechToText({ maxDuration: 30 });

  // Play reference audio
  const handleListen = async () => {
    setState("listening");
    await tts.speak(text, { voiceId });
    setState("idle");
  };

  // Start recording
  const handleStartRecording = async () => {
    setState("recording");
    await stt.startRecording();
  };

  // Stop recording and transcribe
  const handleStopRecording = async () => {
    setState("processing");
    await stt.stopRecording();
  };

  // Transcribe when audio is ready
  useEffect(() => {
    if (state === "processing" && stt.audioBlob && !stt.isTranscribing) {
      stt.transcribe(text);
    }
  }, [state, stt.audioBlob, stt.isTranscribing, text]);

  // Show feedback when transcription is ready
  useEffect(() => {
    if (state === "processing" && stt.pronunciationFeedback) {
      setState("feedback");
      setAttempts((prev) => prev + 1);

      if (stt.pronunciationFeedback.accuracy > bestAccuracy) {
        setBestAccuracy(stt.pronunciationFeedback.accuracy);
      }
    }
  }, [state, stt.pronunciationFeedback, bestAccuracy]);

  // Handle completion
  const handleComplete = () => {
    onComplete?.({ accuracy: bestAccuracy, attempts });
  };

  // Try again
  const handleTryAgain = () => {
    stt.resetRecording();
    setState("idle");
  };

  // Reset exercise
  const handleReset = () => {
    stt.resetRecording();
    setState("idle");
    setAttempts(0);
    setBestAccuracy(0);
  };

  const isPassed = bestAccuracy >= passThreshold;
  const canRetry = attempts < maxAttempts;

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="text-lg">Pronunciation Practice</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Text to pronounce */}
        <div className="text-center space-y-2">
          <p className="text-2xl font-medium text-primary">{text}</p>
          {translation && (
            <p className="text-muted-foreground">{translation}</p>
          )}
        </div>

        {/* Listen button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={handleListen}
            disabled={tts.isLoading || tts.isPlaying || state === "recording"}
            className="gap-2"
          >
            {tts.isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
            {tts.isPlaying ? "Playing..." : "Listen to pronunciation"}
          </Button>
        </div>

        {/* Recording controls */}
        <div className="flex justify-center">
          {state === "idle" || state === "listening" ? (
            <Button
              size="lg"
              onClick={handleStartRecording}
              disabled={state === "listening" || tts.isPlaying}
              className="gap-2 bg-red-500 hover:bg-red-600"
            >
              <Mic className="h-5 w-5" />
              Record your voice
            </Button>
          ) : state === "recording" ? (
            <Button
              size="lg"
              variant="destructive"
              onClick={handleStopRecording}
              className="gap-2 animate-pulse"
            >
              <div className="w-3 h-3 rounded-full bg-white" />
              Stop recording ({stt.recordingTime}s)
            </Button>
          ) : state === "processing" ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Analyzing pronunciation...
            </div>
          ) : null}
        </div>

        {/* Feedback */}
        {state === "feedback" && stt.pronunciationFeedback && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Accuracy score */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                {isPassed ? (
                  <Check className="h-8 w-8 text-green-500" />
                ) : (
                  <X className="h-8 w-8 text-orange-500" />
                )}
                <span
                  className={cn(
                    "text-4xl font-bold",
                    isPassed ? "text-green-500" : "text-orange-500"
                  )}
                >
                  {stt.pronunciationFeedback.accuracy}%
                </span>
              </div>
              <p className="text-muted-foreground">
                {stt.pronunciationFeedback.feedback}
              </p>
            </div>

            {/* Word by word feedback */}
            <div className="flex flex-wrap justify-center gap-2">
              {stt.pronunciationFeedback.wordByWord.map((word, index) => (
                <span
                  key={index}
                  className={cn(
                    "px-2 py-1 rounded text-sm",
                    word.correct
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                  )}
                  title={`Expected: ${word.expected}, Spoken: ${word.spoken}`}
                >
                  {word.expected}
                </span>
              ))}
            </div>

            {/* What was heard */}
            {stt.transcription && (
              <div className="text-center text-sm text-muted-foreground">
                <span className="font-medium">You said: </span>
                {stt.transcription}
              </div>
            )}

            {/* Attempts progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Attempts</span>
                <span>
                  {attempts} / {maxAttempts}
                </span>
              </div>
              <Progress value={(attempts / maxAttempts) * 100} />
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        {onSkip && (
          <Button variant="ghost" onClick={onSkip}>
            Skip
          </Button>
        )}

        <div className="flex gap-2 ml-auto">
          {state === "feedback" && (
            <>
              {canRetry && !isPassed && (
                <Button variant="outline" onClick={handleTryAgain}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Try again
                </Button>
              )}

              {(isPassed || !canRetry) && onComplete && (
                <Button onClick={handleComplete}>
                  Continue
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

// Compact inline pronunciation widget
interface InlinePronunciationProps {
  text: string;
  voiceId?: string;
  className?: string;
}

export function InlinePronunciation({
  text,
  voiceId,
  className,
}: InlinePronunciationProps) {
  const tts = useTextToSpeech();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => tts.speak(text, { voiceId })}
      disabled={tts.isLoading}
      className={cn("gap-1 h-auto py-0.5 px-1", className)}
    >
      {tts.isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Volume2 className="h-3 w-3" />
      )}
      <span className="text-xs">Listen</span>
    </Button>
  );
}
