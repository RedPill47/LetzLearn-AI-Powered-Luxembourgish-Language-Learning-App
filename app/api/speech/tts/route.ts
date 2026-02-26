import { NextRequest, NextResponse } from "next/server";
import { createElevenLabsClient, ELEVENLABS_CONFIG, streamToBase64 } from "@/lib/elevenlabs/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voiceId, modelId } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text is required and must be a string" },
        { status: 400 }
      );
    }

    // Limit text length to prevent abuse
    if (text.length > 5000) {
      return NextResponse.json(
        { error: "Text exceeds maximum length of 5000 characters" },
        { status: 400 }
      );
    }

    const client = createElevenLabsClient();

    // Use provided voice or fall back to default Luxembourgish voice
    // If no voice is configured, use a known multilingual voice
    const selectedVoiceId = voiceId ||
      ELEVENLABS_CONFIG.voices.luxembourgish_default ||
      "21m00Tcm4TlvDq8ikWAM"; // Rachel - a good multilingual fallback

    // Always use eleven_v3 - the only model that supports Luxembourgish
    // Note: eleven_v3 auto-detects language, so we don't pass languageCode
    const selectedModelId = modelId || ELEVENLABS_CONFIG.model;

    // Generate speech with eleven_v3 (auto-detects Luxembourgish)
    const audioStream = await client.textToSpeech.convert(selectedVoiceId, {
      text,
      modelId: selectedModelId,
      voiceSettings: {
        stability: ELEVENLABS_CONFIG.voiceSettings.stability,
        similarityBoost: ELEVENLABS_CONFIG.voiceSettings.similarity_boost,
        style: ELEVENLABS_CONFIG.voiceSettings.style,
        useSpeakerBoost: ELEVENLABS_CONFIG.voiceSettings.use_speaker_boost,
      },
    });

    // Convert stream to base64
    const audioBase64 = await streamToBase64(audioStream);

    return NextResponse.json({
      audio: audioBase64,
      contentType: "audio/mpeg",
    });
  } catch (error) {
    console.error("TTS Error:", error);

    // Handle specific ElevenLabs errors
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
      if (error.message.includes("unsupported_language") || error.message.includes("language_code")) {
        return NextResponse.json(
          { error: "The selected model does not support the specified language code" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to generate speech" },
      { status: 500 }
    );
  }
}

// Also support streaming for larger texts
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const text = searchParams.get("text");
  const voiceId = searchParams.get("voiceId");

  if (!text) {
    return NextResponse.json(
      { error: "Text parameter is required" },
      { status: 400 }
    );
  }

  try {
    const client = createElevenLabsClient();

    const selectedVoiceId = voiceId ||
      ELEVENLABS_CONFIG.voices.luxembourgish_default ||
      "21m00Tcm4TlvDq8ikWAM";

    // Always use eleven_v3 - the only model that supports Luxembourgish
    // Note: eleven_v3 auto-detects language, so we don't pass languageCode
    const audioStream = await client.textToSpeech.stream(selectedVoiceId, {
      text: decodeURIComponent(text),
      modelId: ELEVENLABS_CONFIG.model,
      voiceSettings: {
        stability: ELEVENLABS_CONFIG.voiceSettings.stability,
        similarityBoost: ELEVENLABS_CONFIG.voiceSettings.similarity_boost,
      },
    });

    // Return streaming audio response
    return new Response(audioStream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("TTS Stream Error:", error);
    return NextResponse.json(
      { error: "Failed to stream speech" },
      { status: 500 }
    );
  }
}
