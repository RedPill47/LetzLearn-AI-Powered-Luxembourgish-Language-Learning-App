"use client";

import { Volume2, VolumeX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { cn } from "@/lib/utils";

interface SpeakButtonProps {
  text: string;
  voiceId?: string;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "default" | "ghost" | "outline" | "secondary";
  className?: string;
  showLabel?: boolean;
}

export function SpeakButton({
  text,
  voiceId,
  size = "icon",
  variant = "ghost",
  className,
  showLabel = false,
}: SpeakButtonProps) {
  const { speak, stop, isLoading, isPlaying, error } = useTextToSpeech();

  const handleClick = async () => {
    if (isPlaying) {
      stop();
    } else {
      await speak(text, { voiceId });
    }
  };

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        "transition-colors",
        isPlaying && "text-primary",
        error && "text-destructive",
        className
      )}
      title={error || (isPlaying ? "Stop" : "Listen")}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isPlaying ? (
        <VolumeX className="h-4 w-4" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
      {showLabel && (
        <span className="ml-2">
          {isLoading ? "Loading..." : isPlaying ? "Stop" : "Listen"}
        </span>
      )}
    </Button>
  );
}
