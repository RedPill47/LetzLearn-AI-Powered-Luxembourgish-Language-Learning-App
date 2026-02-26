import { NextRequest, NextResponse } from "next/server";
import { createElevenLabsClient } from "@/lib/elevenlabs/client";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;
    const expectedText = formData.get("expectedText") as string | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "Audio file is required" },
        { status: 400 }
      );
    }

    // Validate file size (max 25MB)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Audio file exceeds maximum size of 25MB" },
        { status: 400 }
      );
    }

    const client = createElevenLabsClient();

    // Convert File to Blob for the API
    const audioBlob = new Blob([await audioFile.arrayBuffer()], {
      type: audioFile.type || "audio/webm",
    });

    // Create a File object for the ElevenLabs API
    const file = new File([audioBlob], audioFile.name || "audio.webm", {
      type: audioFile.type || "audio/webm",
    });

    // Transcribe audio using Scribe
    const transcription = await client.speechToText.convert({
      file,
      modelId: "scribe_v1",
      // Request word-level timestamps for pronunciation analysis
      timestampsGranularity: "word",
      // Hint the language for better accuracy
      languageCode: "ltz",
    });

    // Handle different response types
    const text = "text" in transcription ? transcription.text : "";
    const words = "words" in transcription ? transcription.words : undefined;
    const languageCode = "languageCode" in transcription ? transcription.languageCode : undefined;

    const result: {
      text: string;
      words?: Array<{
        word: string;
        start: number;
        end: number;
        confidence?: number;
      }>;
      language?: string;
      pronunciationFeedback?: {
        accuracy: number;
        feedback: string;
        wordByWord: Array<{
          expected: string;
          spoken: string;
          correct: boolean;
        }>;
      };
    } = {
      text: text || "",
      words: words?.map((w) => ({
        word: w.text,
        start: w.start ?? 0,
        end: w.end ?? 0,
        confidence: undefined,
      })),
      language: languageCode,
    };

    // If expected text is provided, compute pronunciation feedback
    if (expectedText && result.text) {
      result.pronunciationFeedback = computePronunciationFeedback(
        expectedText,
        result.text
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("STT Error:", error);

    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        return NextResponse.json(
          { error: "ElevenLabs API key not configured" },
          { status: 500 }
        );
      }
      if (error.message.includes("quota") || error.message.includes("limit")) {
        return NextResponse.json(
          { error: "ElevenLabs quota exceeded" },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to transcribe speech" },
      { status: 500 }
    );
  }
}

// Compute pronunciation feedback by comparing expected vs. transcribed text
function computePronunciationFeedback(
  expected: string,
  spoken: string
): {
  accuracy: number;
  feedback: string;
  wordByWord: Array<{
    expected: string;
    spoken: string;
    correct: boolean;
  }>;
} {
  // Normalize texts for comparison
  const normalizeText = (text: string) =>
    text
      .toLowerCase()
      .replace(/[.,!?;:'"]/g, "")
      .trim();

  const expectedNorm = normalizeText(expected);
  const spokenNorm = normalizeText(spoken);

  const expectedWords = expectedNorm.split(/\s+/).filter(Boolean);
  const spokenWords = spokenNorm.split(/\s+/).filter(Boolean);

  // Word-by-word comparison using Levenshtein-like matching
  const wordByWord: Array<{
    expected: string;
    spoken: string;
    correct: boolean;
  }> = [];

  let correctCount = 0;

  // Simple alignment - match words sequentially
  const maxLen = Math.max(expectedWords.length, spokenWords.length);

  for (let i = 0; i < maxLen; i++) {
    const exp = expectedWords[i] || "";
    const spk = spokenWords[i] || "";

    // Check if words match (allowing for minor variations)
    const isCorrect =
      exp === spk ||
      levenshteinDistance(exp, spk) <= Math.floor(exp.length * 0.3);

    if (isCorrect && exp) correctCount++;

    wordByWord.push({
      expected: expectedWords[i] || "(missing)",
      spoken: spokenWords[i] || "(not spoken)",
      correct: isCorrect,
    });
  }

  // Calculate accuracy percentage
  const accuracy =
    expectedWords.length > 0
      ? Math.round((correctCount / expectedWords.length) * 100)
      : 0;

  // Generate feedback based on accuracy
  let feedback: string;
  if (accuracy >= 90) {
    feedback = "Excellent! Your pronunciation is very clear.";
  } else if (accuracy >= 70) {
    feedback = "Good effort! A few words could use some practice.";
  } else if (accuracy >= 50) {
    feedback = "Keep practicing! Focus on the highlighted words.";
  } else {
    feedback = "Try listening to the reference audio again and practice slowly.";
  }

  return {
    accuracy,
    feedback,
    wordByWord,
  };
}

// Simple Levenshtein distance for fuzzy matching
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}
