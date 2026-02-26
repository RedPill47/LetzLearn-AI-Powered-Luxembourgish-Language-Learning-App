"use client";

import { useState, useCallback, useRef } from "react";

interface TTSOptions {
  voiceId?: string;
  modelId?: string;
}

interface UseTTSReturn {
  speak: (text: string, options?: TTSOptions) => Promise<void>;
  stop: () => void;
  isLoading: boolean;
  isPlaying: boolean;
  error: string | null;
}

export function useTextToSpeech(): UseTTSReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const speak = useCallback(
    async (text: string, options?: TTSOptions) => {
      // Stop any current playback
      stop();
      setError(null);
      setIsLoading(true);

      try {
        const response = await fetch("/api/speech/tts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            voiceId: options?.voiceId,
            modelId: options?.modelId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to generate speech");
        }

        const data = await response.json();

        // Convert base64 to audio blob
        const audioBytes = atob(data.audio);
        const audioArray = new Uint8Array(audioBytes.length);
        for (let i = 0; i < audioBytes.length; i++) {
          audioArray[i] = audioBytes.charCodeAt(i);
        }
        const audioBlob = new Blob([audioArray], { type: data.contentType });
        const audioUrl = URL.createObjectURL(audioBlob);

        // Create and play audio
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
        };

        audio.onerror = () => {
          setError("Failed to play audio");
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
        };

        setIsLoading(false);
        setIsPlaying(true);
        await audio.play();
      } catch (err) {
        setIsLoading(false);
        setIsPlaying(false);
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    },
    [stop]
  );

  return {
    speak,
    stop,
    isLoading,
    isPlaying,
    error,
  };
}

// Hook for streaming TTS (for longer texts)
export function useStreamingTTS(): UseTTSReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const stop = useCallback(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch {
        // Ignore errors when stopping
      }
      sourceRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const speak = useCallback(
    async (text: string, options?: TTSOptions) => {
      stop();
      setError(null);
      setIsLoading(true);

      try {
        const params = new URLSearchParams({
          text: encodeURIComponent(text),
        });
        if (options?.voiceId) {
          params.set("voiceId", options.voiceId);
        }

        const response = await fetch(`/api/speech/tts?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Failed to stream speech");
        }

        const arrayBuffer = await response.arrayBuffer();

        // Initialize audio context if needed
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
        }

        const audioContext = audioContextRef.current;
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        sourceRef.current = source;

        source.onended = () => {
          setIsPlaying(false);
        };

        setIsLoading(false);
        setIsPlaying(true);
        source.start(0);
      } catch (err) {
        setIsLoading(false);
        setIsPlaying(false);
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    },
    [stop]
  );

  return {
    speak,
    stop,
    isLoading,
    isPlaying,
    error,
  };
}
