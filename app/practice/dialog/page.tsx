"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Mic, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DialogExercise } from "@/components/speech/dialog-exercise";

// Pre-defined dialog scenarios
const DIALOG_SCENARIOS = [
  {
    id: "greeting",
    title: "Meeting Someone New",
    description: "Practice basic greetings and introductions",
    difficulty: "beginner",
    lines: [
      { speaker: "ai" as const, text: "Moien! Wéi geet et?", translation: "Hello! How are you?" },
      { speaker: "user" as const, text: "Et geet mir gutt, merci.", translation: "I'm doing well, thank you." },
      { speaker: "ai" as const, text: "Wéi heescht Dir?", translation: "What is your name?" },
      { speaker: "user" as const, text: "Ech heeschen Anna.", translation: "My name is Anna." },
      { speaker: "ai" as const, text: "Freeëm Iech kennenzeléieren!", translation: "Nice to meet you!" },
      { speaker: "user" as const, text: "Ech och!", translation: "Me too!" },
    ],
  },
  {
    id: "cafe",
    title: "At the Café",
    description: "Order drinks and food at a café",
    difficulty: "beginner",
    lines: [
      { speaker: "ai" as const, text: "Gudde Moien! Wat hätt Dir gär?", translation: "Good morning! What would you like?" },
      { speaker: "user" as const, text: "Ech hätt gär e Kaffi, wann ech gelift.", translation: "I would like a coffee, please." },
      { speaker: "ai" as const, text: "Mat Mëllech an Zocker?", translation: "With milk and sugar?" },
      { speaker: "user" as const, text: "Jo, mat Mëllech awer ouni Zocker.", translation: "Yes, with milk but without sugar." },
      { speaker: "ai" as const, text: "Dat mécht zwee Euro fofzeg.", translation: "That will be two fifty." },
      { speaker: "user" as const, text: "Hei, merci!", translation: "Here you go, thank you!" },
    ],
  },
  {
    id: "directions",
    title: "Asking for Directions",
    description: "Learn to ask and understand directions",
    difficulty: "intermediate",
    lines: [
      { speaker: "user" as const, text: "Entschëllegt, kënnt Dir mir hëllefen?", translation: "Excuse me, can you help me?" },
      { speaker: "ai" as const, text: "Jo, natierlech. Wat sicht Dir?", translation: "Yes, of course. What are you looking for?" },
      { speaker: "user" as const, text: "Wou ass d'Gare?", translation: "Where is the train station?" },
      { speaker: "ai" as const, text: "Gitt riets an dann lénks.", translation: "Go right and then left." },
      { speaker: "user" as const, text: "Ass et wäit?", translation: "Is it far?" },
      { speaker: "ai" as const, text: "Nee, just fënnef Minutten.", translation: "No, just five minutes." },
      { speaker: "user" as const, text: "Villmools Merci!", translation: "Thank you very much!" },
    ],
  },
  {
    id: "shopping",
    title: "At the Market",
    description: "Practice shopping at a local market",
    difficulty: "intermediate",
    lines: [
      { speaker: "ai" as const, text: "Gudde Mëtteg! Kann ech Iech hëllefen?", translation: "Good afternoon! Can I help you?" },
      { speaker: "user" as const, text: "Jo, ech hätt gär e Kilo Äppel.", translation: "Yes, I would like a kilo of apples." },
      { speaker: "ai" as const, text: "Hei sinn se. Soss nach eppes?", translation: "Here they are. Anything else?" },
      { speaker: "user" as const, text: "Hutt Dir Brout?", translation: "Do you have bread?" },
      { speaker: "ai" as const, text: "Jo, et ass frësch gebacken.", translation: "Yes, it's freshly baked." },
      { speaker: "user" as const, text: "Perfekt! Wéivill kascht dat?", translation: "Perfect! How much does that cost?" },
      { speaker: "ai" as const, text: "Zesumme fënnef Euro.", translation: "Together five euros." },
    ],
  },
  {
    id: "weather",
    title: "Talking About Weather",
    description: "Discuss the weather in Luxembourgish",
    difficulty: "beginner",
    lines: [
      { speaker: "ai" as const, text: "Wéi ass d'Wieder haut?", translation: "How is the weather today?" },
      { speaker: "user" as const, text: "Et ass schéi Wieder.", translation: "It's nice weather." },
      { speaker: "ai" as const, text: "Reent et?", translation: "Is it raining?" },
      { speaker: "user" as const, text: "Nee, d'Sonn schéngt.", translation: "No, the sun is shining." },
      { speaker: "ai" as const, text: "Ass et kal oder waarm?", translation: "Is it cold or warm?" },
      { speaker: "user" as const, text: "Et ass e bësse kal.", translation: "It's a bit cold." },
    ],
  },
];

export default function DialogPracticePage() {
  const [selectedScenario, setSelectedScenario] = useState<typeof DIALOG_SCENARIOS[0] | null>(null);
  const [completedScenarios, setCompletedScenarios] = useState<Set<string>>(new Set());

  const handleComplete = async (result: { score: number; totalLines: number }) => {
    // Track speaking exercise completion
    const { trackSpeakingExercise } = await import("@/lib/update-progress");
    await trackSpeakingExercise("dialog");
    
    if (selectedScenario) {
      setCompletedScenarios((prev) => new Set([...prev, selectedScenario.id]));
    }
    setSelectedScenario(null);
  };

  const handleSkip = () => {
    setSelectedScenario(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href={selectedScenario ? "#" : "/chat"}>
            <Button
              variant="ghost"
              size="icon"
              onClick={selectedScenario ? () => setSelectedScenario(null) : undefined}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">
              {selectedScenario ? selectedScenario.title : "Dialog Practice"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {selectedScenario
                ? selectedScenario.description
                : "Practice conversations in Luxembourgish"}
            </p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {!selectedScenario ? (
          <div className="max-w-4xl mx-auto">
            {/* Info card */}
            <Card className="mb-8 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-0">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <MessageSquare className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold mb-1">How it works</h2>
                    <p className="text-muted-foreground">
                      Practice real conversations in Luxembourgish. The AI will speak their lines,
                      and you&apos;ll speak yours. Your pronunciation will be analyzed and scored.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Scenario cards */}
            <div className="grid gap-4 md:grid-cols-2">
              {DIALOG_SCENARIOS.map((scenario) => {
                const isCompleted = completedScenarios.has(scenario.id);
                const userLines = scenario.lines.filter((l) => l.speaker === "user").length;

                return (
                  <Card
                    key={scenario.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedScenario(scenario)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {scenario.title}
                            {isCompleted && (
                              <span className="text-green-500 text-sm">✓</span>
                            )}
                          </CardTitle>
                          <CardDescription>{scenario.description}</CardDescription>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="capitalize px-2 py-0.5 bg-muted rounded">
                          {scenario.difficulty}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mic className="h-4 w-4" />
                          {userLines} lines to speak
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Link to pronunciation practice */}
            <div className="mt-8 text-center">
              <Link href="/practice/pronunciation">
                <Button variant="outline">
                  Or try Pronunciation Practice
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <DialogExercise
              title={selectedScenario.title}
              description={selectedScenario.description}
              lines={selectedScenario.lines}
              onComplete={handleComplete}
              onSkip={handleSkip}
            />
          </div>
        )}
      </main>
    </div>
  );
}
