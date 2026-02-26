"use client";

import { Mic, Square, Pause, Play, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { cn } from "@/lib/utils";

interface AudioRecorderProps {
  onRecordingComplete?: (blob: Blob) => void;
  maxDuration?: number;
  className?: string;
  showTimer?: boolean;
  size?: "sm" | "default" | "lg";
}

export function AudioRecorder({
  onRecordingComplete,
  maxDuration = 60,
  className,
  showTimer = true,
  size = "default",
}: AudioRecorderProps) {
  const {
    isRecording,
    isPaused,
    recordingTime,
    audioBlob,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    error,
  } = useAudioRecorder({ maxDuration });

  const handleStop = async () => {
    const blob = await stopRecording();
    if (blob && onRecordingComplete) {
      onRecordingComplete(blob);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const buttonSize = size === "sm" ? "sm" : size === "lg" ? "lg" : "default";
  const iconSize = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {!isRecording && !audioBlob && (
        <Button
          type="button"
          size={buttonSize}
          variant="default"
          onClick={startRecording}
          className="bg-red-500 hover:bg-red-600"
        >
          <Mic className={iconSize} />
          <span className="ml-2">Record</span>
        </Button>
      )}

      {isRecording && (
        <>
          <Button
            type="button"
            size={buttonSize}
            variant="destructive"
            onClick={handleStop}
          >
            <Square className={iconSize} />
            <span className="ml-2">Stop</span>
          </Button>

          <Button
            type="button"
            size={buttonSize}
            variant="outline"
            onClick={isPaused ? resumeRecording : pauseRecording}
          >
            {isPaused ? (
              <Play className={iconSize} />
            ) : (
              <Pause className={iconSize} />
            )}
          </Button>

          {showTimer && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md">
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse"
                )}
              />
              <span className="font-mono text-sm">
                {formatTime(recordingTime)} / {formatTime(maxDuration)}
              </span>
            </div>
          )}
        </>
      )}

      {audioBlob && !isRecording && (
        <>
          <audio
            src={URL.createObjectURL(audioBlob)}
            controls
            className="h-10"
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={resetRecording}
            title="Record again"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

// Compact record button for inline use
interface RecordButtonProps {
  isRecording: boolean;
  isPaused?: boolean;
  onStart: () => void;
  onStop: () => void;
  onPause?: () => void;
  onResume?: () => void;
  disabled?: boolean;
  size?: "sm" | "default" | "lg" | "icon";
  className?: string;
}

export function RecordButton({
  isRecording,
  isPaused,
  onStart,
  onStop,
  onPause,
  onResume,
  disabled,
  size = "icon",
  className,
}: RecordButtonProps) {
  const handleClick = () => {
    if (isRecording) {
      onStop();
    } else {
      onStart();
    }
  };

  return (
    <Button
      type="button"
      size={size}
      variant={isRecording ? "destructive" : "default"}
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        isRecording && "animate-pulse",
        className
      )}
    >
      {isRecording ? (
        <Square className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  );
}
