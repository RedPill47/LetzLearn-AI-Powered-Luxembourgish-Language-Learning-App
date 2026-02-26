import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

// Server-side ElevenLabs client
// Only use this in API routes, not in client components
export function createElevenLabsClient() {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY environment variable is not set");
  }

  return new ElevenLabsClient({
    apiKey,
  });
}

// ElevenLabs configuration constants
export const ELEVENLABS_CONFIG = {
  // Model - using eleven_v3 as it's the only model that supports Luxembourgish (ltz)
  // Note: eleven_v3 auto-detects language, so we don't pass languageCode parameter
  model: "eleven_v3",

  // Luxembourgish voice IDs - will be populated after searching voice library
  // For now, using a multilingual voice that supports Luxembourgish
  voices: {
    // Default voice for Luxembourgish (to be configured)
    luxembourgish_default: process.env.ELEVENLABS_LUXEMBOURGISH_VOICE_ID || "",
    // Female voice option
    luxembourgish_female: process.env.ELEVENLABS_LUXEMBOURGISH_FEMALE_VOICE_ID || "",
    // Male voice option
    luxembourgish_male: process.env.ELEVENLABS_LUXEMBOURGISH_MALE_VOICE_ID || "",
  },

  // Voice settings for natural Luxembourgish pronunciation
  voiceSettings: {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.0,
    use_speaker_boost: true,
  },
} as const;

// Helper to get available voices supporting Luxembourgish
export async function getVoicesForLuxembourgish(client: ElevenLabsClient) {
  const voices = await client.voices.getAll();

  // Filter voices that likely support Luxembourgish
  // ElevenLabs multilingual voices generally support ltz
  return voices.voices?.filter(voice =>
    voice.labels?.language === "ltz" ||
    voice.labels?.accent === "luxembourgish" ||
    // Multilingual voices typically support many languages
    voice.name?.toLowerCase().includes("multilingual")
  ) || [];
}

// Convert audio stream to base64 for client-side playback
export async function streamToBase64(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  // Convert to base64
  return Buffer.from(combined).toString("base64");
}

// Types for API responses
export interface TTSResponse {
  audio: string; // Base64 encoded audio
  contentType: string;
}

export interface STTResponse {
  text: string;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
  language?: string;
}

export interface PronunciationFeedback {
  transcription: string;
  expected: string;
  accuracy: number; // 0-100 percentage
  feedback: string;
  wordByWord?: Array<{
    expected: string;
    spoken: string;
    correct: boolean;
  }>;
}
