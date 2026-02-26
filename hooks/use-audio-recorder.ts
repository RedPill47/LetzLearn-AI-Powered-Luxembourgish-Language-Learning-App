"use client";

import { useState, useCallback, useRef } from "react";

interface UseAudioRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  audioBlob: Blob | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  resetRecording: () => void;
  error: string | null;
}

interface AudioRecorderOptions {
  maxDuration?: number; // Maximum recording duration in seconds
  mimeType?: string;
}

export function useAudioRecorder(
  options: AudioRecorderOptions = {}
): UseAudioRecorderReturn {
  const { maxDuration = 60, mimeType = "audio/webm;codecs=opus" } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    chunksRef.current = [];

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      streamRef.current = stream;

      // Determine best supported MIME type
      let selectedMimeType = mimeType;
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        const fallbackTypes = [
          "audio/webm",
          "audio/ogg",
          "audio/mp4",
        ];
        selectedMimeType = fallbackTypes.find(type =>
          MediaRecorder.isTypeSupported(type)
        ) || "";
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType || undefined,
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: selectedMimeType || "audio/webm",
        });
        setAudioBlob(blob);
        cleanup();
      };

      mediaRecorder.onerror = () => {
        setError("Recording failed");
        cleanup();
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setIsPaused(false);
      startTimeRef.current = Date.now();

      // Start timer
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordingTime(elapsed);

        // Auto-stop at max duration
        if (elapsed >= maxDuration) {
          stopRecording();
        }
      }, 1000);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          setError("Microphone access denied. Please allow microphone access.");
        } else if (err.name === "NotFoundError") {
          setError("No microphone found. Please connect a microphone.");
        } else {
          setError(`Failed to start recording: ${err.message}`);
        }
      } else {
        setError("Failed to start recording");
      }
    }
  }, [mimeType, maxDuration, cleanup]);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && isRecording) {
        const mediaRecorder = mediaRecorderRef.current;

        mediaRecorder.onstop = () => {
          const mimeType = mediaRecorder.mimeType || "audio/webm";
          const blob = new Blob(chunksRef.current, { type: mimeType });
          setAudioBlob(blob);
          setIsRecording(false);
          setIsPaused(false);
          cleanup();
          resolve(blob);
        };

        mediaRecorder.stop();
      } else {
        resolve(null);
      }
    });
  }, [isRecording, cleanup]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [isRecording, isPaused]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      startTimeRef.current = Date.now() - recordingTime * 1000;
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setRecordingTime(elapsed);
        if (elapsed >= maxDuration) {
          stopRecording();
        }
      }, 1000);
    }
  }, [isRecording, isPaused, recordingTime, maxDuration, stopRecording]);

  const resetRecording = useCallback(() => {
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
    }
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    setAudioBlob(null);
    setError(null);
    chunksRef.current = [];
    cleanup();
  }, [isRecording, cleanup]);

  return {
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
  };
}

// Helper hook for speech-to-text with recording
interface UseSTTReturn extends UseAudioRecorderReturn {
  transcription: string | null;
  isTranscribing: boolean;
  pronunciationFeedback: {
    accuracy: number;
    feedback: string;
    wordByWord: Array<{
      expected: string;
      spoken: string;
      correct: boolean;
    }>;
  } | null;
  transcribe: (expectedText?: string) => Promise<void>;
}

export function useSpeechToText(
  options: AudioRecorderOptions = {}
): UseSTTReturn {
  const {
    isRecording,
    isPaused,
    recordingTime,
    audioBlob,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording: baseResetRecording,
    error,
  } = useAudioRecorder(options);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [pronunciationFeedback, setPronunciationFeedback] = useState<{
    accuracy: number;
    feedback: string;
    wordByWord: Array<{
      expected: string;
      spoken: string;
      correct: boolean;
    }>;
  } | null>(null);

  const transcribe = useCallback(
    async (expectedText?: string) => {
      if (!audioBlob) {
        return;
      }

      setIsTranscribing(true);
      setTranscription(null);
      setPronunciationFeedback(null);

      try {
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");
        if (expectedText) {
          formData.append("expectedText", expectedText);
        }

        const response = await fetch("/api/speech/stt", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Transcription failed");
        }

        const data = await response.json();
        setTranscription(data.text);
        if (data.pronunciationFeedback) {
          setPronunciationFeedback(data.pronunciationFeedback);
        }
      } catch (err) {
        console.error("Transcription error:", err);
      } finally {
        setIsTranscribing(false);
      }
    },
    [audioBlob]
  );

  const resetRecording = useCallback(() => {
    baseResetRecording();
    setTranscription(null);
    setPronunciationFeedback(null);
    setIsTranscribing(false);
  }, [baseResetRecording]);

  return {
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
    transcription,
    isTranscribing,
    pronunciationFeedback,
    transcribe,
  };
}
