"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, TrendingUp, BookOpen, MessageCircle, GraduationCap, Clock, Flame, Target, Mic } from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { calculateQuizAccuracy } from "@/lib/progress-tracking"

interface UserStats {
  total_words_learned: number
  total_conversations: number
  total_quiz_questions: number
  total_quiz_correct: number
  total_study_time_minutes: number
  total_speaking_exercises: number
  current_streak: number
  longest_streak: number
  last_study_date: string | null
}

interface MasteryBreakdown {
  new: number
  learning: number
  reviewing: number
  mastered: number
}

export default function ProgressPage() {
  const router = useRouter()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [masteryBreakdown, setMasteryBreakdown] = useState<MasteryBreakdown | null>(null)
  const [weeklyRhythm, setWeeklyRhythm] = useState<Array<{
    day: string
    words: number
    minutes: number
    accuracy: number
    conversations: number
  }> | null>(null)
  const [hourlyFocus, setHourlyFocus] = useState<Array<{ hour: string; pace: number }> | null>(null)
  const [activityMix, setActivityMix] = useState<Array<{
    label: string
    value: number
    actual: number
  }> | null>(null)
  const [loading, setLoading] = useState(true)

  // Mock data as fallback when there's no real data
  const mockWeeklyRhythm = [
    { day: "Mon", words: 18, minutes: 32, accuracy: 92, conversations: 3 },
    { day: "Tue", words: 22, minutes: 38, accuracy: 94, conversations: 4 },
    { day: "Wed", words: 16, minutes: 28, accuracy: 89, conversations: 3 },
    { day: "Thu", words: 24, minutes: 41, accuracy: 93, conversations: 4 },
    { day: "Fri", words: 29, minutes: 52, accuracy: 96, conversations: 5 },
    { day: "Sat", words: 20, minutes: 34, accuracy: 88, conversations: 3 },
    { day: "Sun", words: 14, minutes: 26, accuracy: 86, conversations: 2 },
  ]

  const mockHourlyFocus = [
    { hour: "6a", pace: 2 },
    { hour: "8a", pace: 6 },
    { hour: "10a", pace: 9 },
    { hour: "12p", pace: 7 },
    { hour: "2p", pace: 5 },
    { hour: "4p", pace: 8 },
    { hour: "6p", pace: 10 },
    { hour: "8p", pace: 7 },
    { hour: "10p", pace: 3 },
  ]

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Load stats
        const statsResponse = await fetch("/api/progress/stats")
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setStats(statsData.stats)
          setMasteryBreakdown(statsData.masteryBreakdown)
      }

        // Load historical data
        const historyResponse = await fetch("/api/progress/history")
        if (historyResponse.ok) {
          const historyData = await historyResponse.json()
          setWeeklyRhythm(historyData.weeklyRhythm)
          setHourlyFocus(historyData.hourlyFocus)
          setActivityMix(historyData.activityMix)
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [])

  // Use real data if available, otherwise fall back to mock
  const displayWeeklyRhythm = weeklyRhythm && weeklyRhythm.some(d => d.words > 0 || d.conversations > 0)
    ? weeklyRhythm
    : mockWeeklyRhythm
  const displayHourlyFocus = hourlyFocus && hourlyFocus.some(h => h.pace > 0)
    ? hourlyFocus
    : mockHourlyFocus
  const hasRealData = weeklyRhythm && weeklyRhythm.some(d => d.words > 0 || d.conversations > 0)

  const weeklyWords = displayWeeklyRhythm.reduce((total, day) => total + day.words, 0)
  const weeklyMinutes = displayWeeklyRhythm.reduce((total, day) => total + day.minutes, 0)
  const averageAccuracy = displayWeeklyRhythm.length > 0
    ? Math.round(
        displayWeeklyRhythm.reduce((total, day) => total + day.accuracy, 0) / displayWeeklyRhythm.length
      )
    : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  const accuracy = stats ? calculateQuizAccuracy(stats) : 0
  const totalWords = masteryBreakdown
    ? masteryBreakdown.new +
      masteryBreakdown.learning +
      masteryBreakdown.reviewing +
      masteryBreakdown.mastered
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/chat")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Chat
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Progress Dashboard</h1>
        </div>

        {/* Streak Card */}
        {stats && (
          <div className="mb-6">
            <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-100 rounded-full">
                      <Flame className="w-8 h-8 text-orange-600" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Current Streak</div>
                      <div className="text-4xl font-bold text-orange-600">{stats.current_streak} days</div>
                      {stats.longest_streak > stats.current_streak && (
                        <div className="text-xs text-gray-500 mt-1">
                          Best: {stats.longest_streak} days
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Keep it up!</div>
                    <div className="text-lg font-semibold text-gray-800">
                      {stats.current_streak > 0 ? "🔥 On fire!" : "Start your streak today"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Words Learned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <div className="text-3xl font-bold">{stats?.total_words_learned || 0}</div>
              </div>
              {masteryBreakdown && (
                <div className="text-xs text-gray-500 mt-2">
                  {masteryBreakdown.mastered} mastered
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Conversations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-purple-600" />
                <div className="text-3xl font-bold">{stats?.total_conversations || 0}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Quiz Accuracy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-600" />
                <div className="text-3xl font-bold">{accuracy}%</div>
              </div>
              {stats && stats.total_quiz_questions > 0 && (
                <div className="text-xs text-gray-500 mt-2">
                  {stats.total_quiz_correct}/{stats.total_quiz_questions} correct
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Speaking Exercises</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-pink-600" />
                <div className="text-3xl font-bold">{stats?.total_speaking_exercises || 0}</div>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Pronunciation & Dialog
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Study Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <div className="text-3xl font-bold">
                  {stats?.total_study_time_minutes
                    ? (stats.total_study_time_minutes / 60).toFixed(1)
                    : "0.0"}
                </div>
                <div className="text-sm text-gray-500">hrs</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mastery Breakdown */}
        {masteryBreakdown && totalWords > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Vocabulary Mastery</CardTitle>
              <CardDescription>Track your progress through different mastery levels</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">{masteryBreakdown.new}</div>
                  <div className="text-sm text-gray-500 mt-1">🆕 New</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{masteryBreakdown.learning}</div>
                  <div className="text-sm text-blue-600 mt-1">📚 Learning</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{masteryBreakdown.reviewing}</div>
                  <div className="text-sm text-yellow-600 mt-1">🔄 Reviewing</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{masteryBreakdown.mastered}</div>
                  <div className="text-sm text-green-600 mt-1">✅ Mastered</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Overall Progress</span>
                  <span>
                    {Math.round(
                      ((masteryBreakdown.learning +
                        masteryBreakdown.reviewing +
                        masteryBreakdown.mastered) /
                        totalWords) *
                        100
                    )}
                    %
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${
                        ((masteryBreakdown.learning +
                          masteryBreakdown.reviewing +
                          masteryBreakdown.mastered) /
                          totalWords) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trends & Visuals */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-600" />
                Learning rhythm
              </h2>
              <p className="text-sm text-gray-500">
                {hasRealData
                  ? "Your learning activity over the past week"
                  : "Mock data to visualize your flow. Real trends appear once you start studying."}
              </p>
            </div>
            {!hasRealData && (
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
              Mock data
            </span>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <Card className="relative overflow-hidden xl:col-span-2 border-amber-100 bg-gradient-to-br from-amber-50 via-white to-amber-100 shadow-lg">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-200/40 blur-3xl" />
              <CardHeader>
                <CardTitle className="text-gray-900">Weekly momentum</CardTitle>
                <CardDescription>Words learned, study minutes, and accuracy across the week</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={displayWeeklyRhythm} margin={{ left: -10, right: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorWords" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                          </linearGradient>
                          <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.55} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis dataKey="day" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} />
                        <Tooltip
                          cursor={{ stroke: "#94a3b8", strokeDasharray: "4 4" }}
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            borderRadius: "12px",
                            border: "1px solid #1f2937",
                            color: "#f8fafc",
                            boxShadow: "0 20px 60px rgba(15,23,42,0.35)",
                          }}
                          labelStyle={{ color: "#cbd5e1" }}
                        />
                        <Area
                          type="monotone"
                          dataKey="words"
                          stroke="#f59e0b"
                          fillOpacity={1}
                          fill="url(#colorWords)"
                          strokeWidth={3}
                          dot={{ stroke: "#f59e0b", strokeWidth: 2, r: 3, fill: "white" }}
                          activeDot={{ r: 5 }}
                          name="Words"
                        />
                        <Area
                          type="monotone"
                          dataKey="minutes"
                          stroke="#6366f1"
                          fillOpacity={1}
                          fill="url(#colorMinutes)"
                          strokeWidth={3}
                          dot={{ stroke: "#6366f1", strokeWidth: 2, r: 3, fill: "white" }}
                          activeDot={{ r: 5 }}
                          name="Minutes"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="bg-white/70 backdrop-blur rounded-xl border border-amber-100 shadow-sm p-4 flex flex-col gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-amber-700">This week</div>
                      <div className="text-3xl font-bold text-gray-900">{weeklyWords}</div>
                      <div className="text-xs text-gray-500">words learned</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Focused minutes</div>
                      <div className="text-xl font-semibold text-gray-900">{weeklyMinutes}m</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 rounded-full bg-gradient-to-r from-amber-400 to-amber-600" />
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{averageAccuracy}%</div>
                        <div className="text-xs text-gray-500">avg quiz accuracy</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800 text-slate-50 shadow-xl overflow-hidden">
              <CardHeader>
                <CardTitle className="text-slate-50">Accuracy trend</CardTitle>
                <CardDescription className="text-slate-300">
                  Rolling accuracy across the last seven sessions
                </CardDescription>
              </CardHeader>
              <CardContent className="h-72 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={displayWeeklyRhythm}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                      dataKey="day"
                      stroke="#94a3b8"
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      tickMargin={8}
                    />
                    <YAxis domain={[80, 100]} stroke="#94a3b8" tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ stroke: "#475569", strokeDasharray: "4 4" }}
                      contentStyle={{
                        backgroundColor: "#0b1220",
                        borderRadius: "12px",
                        border: "1px solid #1e293b",
                        color: "#e2e8f0",
                        boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
                      }}
                      labelStyle={{ color: "#cbd5e1" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="accuracy"
                      stroke="#fbbf24"
                      strokeWidth={3}
                      dot={{ r: 3, strokeWidth: 2, stroke: "#fbbf24", fill: "#0b1220" }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      name="Quiz accuracy"
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2">
                    <div className="text-slate-400">Highest day</div>
                    <div className="font-semibold text-slate-50">
                      {displayWeeklyRhythm.length > 0
                        ? `${Math.max(...displayWeeklyRhythm.map((d) => d.accuracy))}% accuracy`
                        : "N/A"}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2">
                    <div className="text-slate-400">Consistency</div>
                    <div className="font-semibold text-slate-50">
                      {displayWeeklyRhythm.length > 0
                        ? `${Math.min(...displayWeeklyRhythm.map((d) => d.accuracy))}% - ${Math.max(...displayWeeklyRhythm.map((d) => d.accuracy))}%`
                        : "N/A"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 border-slate-200 shadow-lg">
              <CardHeader>
                <CardTitle className="text-gray-900">Hourly focus</CardTitle>
                <CardDescription>When you tend to study the most (mocked from recent activity)</CardDescription>
              </CardHeader>
              <CardContent className="h-72 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={displayHourlyFocus} barSize={18}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="hour" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ fill: "rgba(245, 158, 11, 0.08)" }}
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderRadius: "12px",
                        border: "1px solid #1f2937",
                        color: "#f8fafc",
                        boxShadow: "0 20px 60px rgba(15,23,42,0.35)",
                      }}
                      labelStyle={{ color: "#cbd5e1" }}
                    />
                    <Bar
                      dataKey="pace"
                      radius={[6, 6, 0, 0]}
                      fill="url(#hourlyFill)"
                      name="Words per 10 min"
                    />
                    <defs>
                      <linearGradient id="hourlyFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.15} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-lg">
              <CardHeader>
                <CardTitle className="text-gray-900">Activity mix</CardTitle>
                <CardDescription>Relative weight of words, conversations, and quiz checks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(activityMix || [
                  { label: "Words captured", value: 0, actual: 0 },
                  { label: "Conversations", value: 0, actual: 0 },
                  { label: "Quiz answers", value: 0, actual: 0 },
                ]).map((item, index) => {
                  const colors = ["bg-amber-500", "bg-indigo-500", "bg-emerald-500"]
                  return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                      <span>{item.label}</span>
                        <span className="font-semibold text-gray-900">{item.actual || item.value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                      <div
                          className={`${colors[index]} h-2 rounded-full`}
                        style={{ width: `${Math.min(100, item.value)}%` }}
                      />
                    </div>
                  </div>
                  )
                })}
                {!hasRealData && (
                <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-800">
                  Real history will replace these mock numbers after your next learning session.
                </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            variant="outline"
            className="h-auto p-4 flex flex-col items-start"
            onClick={() => router.push("/vocabulary")}
          >
            <BookOpen className="w-5 h-5 mb-2" />
            <div className="font-semibold">Review Vocabulary</div>
            <div className="text-xs text-gray-500">Practice your saved words</div>
          </Button>
          <Button
            variant="outline"
            className="h-auto p-4 flex flex-col items-start"
            onClick={() => router.push("/vocabulary/review")}
          >
            <Target className="w-5 h-5 mb-2" />
            <div className="font-semibold">Spaced Repetition</div>
            <div className="text-xs text-gray-500">Review words due today</div>
          </Button>
          <Button
            variant="outline"
            className="h-auto p-4 flex flex-col items-start"
            onClick={() => router.push("/chat")}
          >
            <MessageCircle className="w-5 h-5 mb-2" />
            <div className="font-semibold">Start Learning</div>
            <div className="text-xs text-gray-500">Continue your practice</div>
          </Button>
        </div>
      </div>
    </div>
  )
}
