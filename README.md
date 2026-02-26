# LetzLearn

An AI-powered language learning application for practicing Luxembourgish. Built as a university project for a Generative AI class.

## Overview

LetzLearn is an interactive web application that helps users learn Luxembourgish through AI-powered conversations, vocabulary management, progress tracking, and speech practice. The app provides multiple learning modes, spaced repetition for vocabulary, daily challenges, and comprehensive progress analytics.

## Features

### 🤖 AI-Powered Learning
- **Groq Llama 3.3 70B Model**: Intelligent, context-aware responses
- **Real-time Streaming**: Instant AI responses with streaming text
- **RAG (Retrieval Augmented Generation)**: AI fetches relevant course materials for accurate answers
- **Multi-mode Support**: Different learning modes optimized for various learning goals

### 💬 Interactive Chat Interface
- **Conversation History**: All conversations saved and accessible via sidebar
- **Multiple Conversations**: Create and manage multiple conversation sessions
- **Message Translations**: Automatic translations for Luxembourgish text
- **Vocabulary Saving**: Save words directly from chat messages
- **Responsive Design**: Works seamlessly on desktop and mobile devices

### 📚 Learning Modes

#### 1. **Conversation Mode** 💬
Practice natural, everyday conversations in Luxembourgish.

- **How to use**: Select "Conversation" from the learning mode selector in the chat header
- **Best for**: Practicing real-world dialogues, greetings, and casual conversations
- **Features**: 
  - AI responds naturally in Luxembourgish
  - Real-time corrections and suggestions
  - Context-aware responses based on conversation history

#### 2. **Grammar Mode** 📖
Learn Luxembourgish grammar rules, sentence structure, and verb conjugations.

- **How to use**: Select "Grammar" from the learning mode selector
- **Best for**: Understanding sentence structure, verb forms, and grammatical rules
- **Features**:
  - Detailed grammar explanations
  - Examples with translations
  - Practice exercises for grammar concepts

#### 3. **Vocabulary Mode** 📝
Build your Luxembourgish vocabulary through themed word groups and lessons.

- **How to use**: Select "Vocabulary" from the learning mode selector
- **Best for**: Learning new words, expanding vocabulary, and thematic learning
- **Features**:
  - Themed vocabulary lessons
  - Word definitions and usage examples
  - Integration with vocabulary management system

#### 4. **Quiz Mode** 🎯
Test your knowledge with interactive quizzes.

- **How to use**: Click the "Quiz Mode" toggle in the chat header or select "Quiz Mode" from the initial conversation screen
- **Best for**: Testing comprehension, practicing recall, and identifying knowledge gaps
- **Features**:
  - Adjustable difficulty levels (1-5)
  - Multiple question types
  - Real-time feedback and scoring
  - Quiz summaries with performance metrics
  - Tracks quiz accuracy for progress analytics

#### 5. **Lux It Up Mode** 🇱🇺
Immerse yourself in Luxembourgish - the AI responds only in Luxembourgish.

- **How to use**: Click the "Lux It Up" toggle in the chat header or select "Lux It Up" from the initial conversation screen
- **Best for**: Advanced learners who want full immersion practice
- **Features**:
  - AI responses exclusively in Luxembourgish
  - No English translations (full immersion)
  - Helps develop natural language understanding

### 📖 Vocabulary Management

#### Vocabulary Study
- **Location**: `/vocabulary/study`
- **Features**:
  - Flashcard-style study interface
  - View all saved vocabulary words
  - See Luxembourgish word, English translation, and notes
  - Tracks study time automatically

#### Vocabulary Review (Spaced Repetition)
- **Location**: `/vocabulary/review`
- **Features**:
  - Scientifically-proven spaced repetition algorithm (SM-2 inspired)
  - Review words based on mastery level and next review date
  - Quality-based feedback (0-5 scale):
    - **0-1**: Complete blackout - word resets to beginning
    - **2-3**: Incorrect - word reviewed again soon
    - **4-5**: Correct - review interval increases
  - Mastery levels: New → Learning → Reviewing → Mastered
  - Automatic scheduling based on performance
  - Tracks review activity for progress analytics

#### Vocabulary List
- **Location**: `/vocabulary`
- **Features**:
  - View all saved vocabulary cards
  - Filter by mastery level (new, learning, reviewing, mastered)
  - Search and organize vocabulary
  - Export vocabulary (CSV/PDF support)

### 🎯 Daily Challenges

- **Location**: Fixed widget in top-right corner of chat interface
- **Features**:
  - **Dynamic Challenges**: Different challenge templates each day (7 unique templates that rotate)
  - **Challenge Types**:
    - **Balanced Learning**: 5 words, 1 conversation, 10 quiz, 1 speaking
    - **Vocabulary Focus**: 10 words, 1 conversation, 5 quiz, 1 speaking
    - **Conversation Master**: 3 words, 3 conversations, 5 quiz, 2 speaking
    - **Quiz Champion**: 5 words, 1 conversation, 20 quiz, 1 speaking
    - **Speaking Practice**: 5 words, 1 conversation, 5 quiz, 3 speaking
    - **Quick Practice**: 3 words, 1 conversation, 5 quiz, 1 speaking
    - **Intensive Study**: 15 words, 2 conversations, 15 quiz, 2 speaking
  - **Four Activity Types**: Words learned, conversations, quiz questions, and speaking exercises
  - Progress tracking with visual indicators for each activity
  - Completion rewards and motivation
  - Automatically tracks progress from all activities
  - Toggle visibility with the target icon button
  - Challenges rotate based on day of week for variety

### 📊 Progress Dashboard

- **Location**: `/progress`
- **Features**:
  - **Overall Statistics**:
    - Total words learned
    - Total conversations
    - Quiz questions answered and accuracy
    - **Speaking exercises completed** (pronunciation and dialog practice)
    - Total study time (hours)
    - Current and longest streak
  - **Vocabulary Mastery Breakdown**:
    - Words by mastery level (new, learning, reviewing, mastered)
    - Visual pie chart representation
  - **Weekly Rhythm Chart**:
    - Words learned per day (last 7 days)
    - Study time per day
    - Quiz accuracy per day
    - Conversations per day
    - Includes vocabulary review activity
  - **Hourly Focus Chart**:
    - Activity distribution by hour of day
    - Identifies peak learning times
  - **Activity Mix Chart**:
    - Relative percentages of different activities
    - Words, conversations, quiz questions, and speaking exercises

### 🎤 Speech Practice

#### Pronunciation Practice
- **Location**: `/practice/pronunciation`
- **Features**:
  - Practice pronunciation of Luxembourgish words
  - Uses your saved vocabulary or default exercises
  - Speech-to-text recognition
  - Accuracy feedback and scoring
  - Multiple attempts per word
  - Progress tracking

#### Dialog Practice
- **Location**: `/practice/dialog`
- **Features**:
  - Interactive dialog scenarios (greetings, café, directions, shopping)
  - Role-playing with AI
  - Practice both speaking and listening
  - Pre-defined scenarios for common situations
  - Difficulty levels (beginner, intermediate, advanced)

### 🔊 Text-to-Speech (TTS)

- **Integration**: ElevenLabs API with `eleven_v3` model
- **Features**:
  - High-quality Luxembourgish pronunciation
  - Auto-detects language (no manual language code needed)
  - Click speaker icon on any Luxembourgish text to hear pronunciation
  - Available in chat messages and vocabulary cards
  - Multiple voice options (configurable via environment variables)

### 🎙️ Speech-to-Text (STT)

- **Integration**: Browser Web Speech API
- **Features**:
  - Real-time speech recognition
  - Used in pronunciation and dialog practice
  - Accuracy feedback
  - Supports Luxembourgish language recognition

### 🔐 User Authentication

- **Provider**: Supabase Auth
- **Features**:
  - Secure email/password authentication
  - User profiles with display names
  - Session management
  - Protected routes and API endpoints
  - Row Level Security (RLS) for data privacy

### 💾 Data Persistence

- **Database**: PostgreSQL via Supabase
- **Stored Data**:
  - User profiles
  - Conversation history
  - Chat messages
  - Vocabulary cards with spaced repetition data
  - User statistics and progress
  - Daily challenges
- **Security**: All data protected with Row Level Security (RLS)

## Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling
- **shadcn/ui** - Component library
- **Radix UI** - Accessible component primitives
- **Recharts** - Data visualization for progress dashboard
- **Lucide React** - Icon library

### Backend & Services
- **Supabase** - Authentication & PostgreSQL database
- **Groq API** - AI chat completions (llama-3.3-70b-versatile)
- **ElevenLabs API** - Text-to-Speech (eleven_v3 model)
- **Vercel AI SDK** - Streaming AI responses
- **Web Speech API** - Speech-to-text recognition

### Key Libraries
- `react-hook-form` + `zod` - Form validation
- `sonner` - Toast notifications
- `next-themes` - Theme management

## Prerequisites

Before running this project, you need:

1. **Node.js** (v18 or higher) and **pnpm** installed
2. **Python 3.11 or 3.12** - Required for ChromaDB RAG system
3. **Supabase account** - [Sign up here](https://supabase.com)
4. **Groq API key** - [Get one here](https://console.groq.com)
5. **ElevenLabs API key** (optional, for TTS) - [Get one here](https://elevenlabs.io)

## Quick Setup (3 Steps)

### 1. Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd letz-learn-app

# Install Node.js AND Python dependencies
pnpm setup
```

**Note**: This installs both Node.js packages and Python dependencies (ChromaDB, sentence-transformers, etc.) in a virtual environment.

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local and add your API keys
```

**Required API Keys** (see `.env.example` for details):
- **Supabase**: Get from [Supabase Dashboard](https://app.supabase.com) → Settings → API
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Groq**: Get from [Groq Console](https://console.groq.com) → API Keys
  - `GROQ_API_KEY`
- **ElevenLabs** (optional): Get from [ElevenLabs](https://elevenlabs.io) → Profile → API Keys
  - `ELEVENLABS_API_KEY`

### 3. Set Up the Database

Run the SQL scripts in your **Supabase SQL editor** (in order):

1. `scripts/001_create_tables.sql` - Create base tables
2. `scripts/002_profile_trigger.sql` - Profile auto-creation trigger
3. `scripts/003_add_progress_features.sql` - Progress tracking
4. `scripts/004_add_speaking_exercises.sql` - Speaking exercises
5. `scripts/005_update_daily_challenges.sql` - Dynamic daily challenges

**Configure Supabase Authentication:**
- Go to Authentication → Providers → Enable Email provider
- Go to Authentication → URL Configuration → Add `http://localhost:3000/**`

### 4. Run the Application

```bash
pnpm dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

**RAG System Setup**: The repository includes pre-embedded ChromaDB vector storage in the `data/` directory. This means:
- ✅ RAG (course materials) works immediately - no embedding needed
- ✅ No model download on first run
- ✅ Teacher/evaluator can test RAG features instantly

If RAG data is missing or you need to re-embed:
1. On first chat, the system will download an embedding model (~500MB-1GB)
2. This takes 1-2 minutes and may timeout once
3. Simply refresh and try again - the model will be cached

## Troubleshooting

### Python Dependencies Not Installing

If `pnpm setup` fails with Python errors:

```bash
# Install Python dependencies manually
python3.12 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### RAG System Timeout on First Run

The first RAG query downloads a large embedding model. If it times out:
1. Wait 2-3 minutes for the download to complete in the background
2. Refresh the page and try again
3. The model will be cached at `~/.cache/huggingface/`

### ChromaDB Errors

If you see "ChromaDB not installed" errors:
```bash
source .venv/bin/activate
pip install chromadb sentence-transformers "numpy<2.0"
```

## How to Use

### Getting Started

1. **Sign Up/Login**: Create an account or log in with existing credentials
2. **Navigate to Chat**: Click "Chat" in the navigation bar
3. **Choose a Learning Mode**: Select from Conversation, Grammar, or Vocabulary mode
4. **Start Learning**: Begin chatting with the AI or select from initial prompt options

### Initial Conversation Screen

When starting a new conversation, you'll see five options:

1. **Greeting Practice** - Starts Conversation mode with greeting practice
2. **Grammar Help** - Starts Grammar mode
3. **Common Phrases** - Starts Vocabulary mode with common phrases
4. **Quiz Mode** - Enables quiz mode for testing knowledge
5. **Lux It Up** - Enables full Luxembourgish immersion mode

### Using Learning Modes

#### Switching Modes
- Click the learning mode button in the chat header (shows current mode)
- Select a new mode from the dropdown
- If you have existing messages, choose to:
  - Start a new conversation with the new mode
  - Continue current conversation with new mode

#### Conversation Mode
- Ask questions in English or Luxembourgish
- Practice everyday conversations
- Get natural responses and corrections
- Save vocabulary words from messages

#### Grammar Mode
- Ask about grammar rules: "How do I conjugate verbs in Luxembourgish?"
- Get detailed explanations with examples
- Practice sentence structure

#### Vocabulary Mode
- Request themed vocabulary: "Teach me words about food"
- Learn word groups and common phrases
- Build vocabulary systematically

### Using Quiz Mode

1. **Enable Quiz Mode**: Toggle the quiz button in the header or select from initial screen
2. **Set Difficulty**: Adjust difficulty level (1-5) in the quiz settings
3. **Answer Questions**: Respond to AI-generated quiz questions
4. **Get Feedback**: Receive immediate feedback on answers
5. **View Summary**: See quiz results and accuracy at the end

### Using Lux It Up Mode

1. **Enable Mode**: Toggle "Lux It Up" in the header or select from initial screen
2. **Full Immersion**: AI responds only in Luxembourgish
3. **No Translations**: Challenge yourself with pure Luxembourgish
4. **Best for**: Advanced learners seeking immersion practice

### Managing Vocabulary

#### Saving Words
- Click the "+" icon on any Luxembourgish word in chat messages
- Or manually add words in the vocabulary section

#### Studying Vocabulary
1. Go to `/vocabulary/study`
2. Browse through your saved words
3. Study time is automatically tracked

#### Reviewing Vocabulary
1. Go to `/vocabulary/review`
2. Review words scheduled for today
3. Rate your recall (0-5):
   - **0-1**: Forgot completely
   - **2-3**: Struggled to remember
   - **4-5**: Remembered easily
4. System automatically schedules next review based on performance

### Tracking Progress

#### Daily Challenge
- Located in top-right corner of chat interface
- Shows daily goals and progress for 4 activity types:
  - Words learned
  - Conversations
  - Quiz questions
  - Speaking exercises
- **Different challenge each day**: 7 unique challenge templates rotate based on day of week
- Automatically updates as you learn
- Visual progress bars for each activity type
- Click "View Progress" to see detailed dashboard

#### Progress Dashboard
1. Navigate to `/progress` or click "Progress" in navigation
2. View:
   - Overall statistics (words, conversations, quiz accuracy, speaking exercises, study time, streaks)
   - Vocabulary mastery breakdown
   - Weekly learning rhythm (includes vocabulary review activity)
   - Hourly activity patterns
   - Activity mix percentages (words, conversations, quiz, speaking exercises)

### Speech Practice

#### Pronunciation Practice
1. Navigate to `/practice/pronunciation`
2. Choose to use your vocabulary or default exercises
3. Click to hear the word pronunciation
4. Click microphone to record your pronunciation
5. Get accuracy feedback and try again if needed

#### Dialog Practice
1. Navigate to `/practice/dialog`
2. Select a scenario (greeting, café, directions, shopping)
3. Practice speaking your lines
4. Listen to AI responses
5. Complete the dialog to finish the exercise

## Project Structure

```
letz-learn-app/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   │   ├── chat/             # Chat API endpoint
│   │   ├── speech/           # TTS/STT endpoints
│   │   ├── progress/         # Progress tracking endpoints
│   │   └── vocabulary/       # Vocabulary management endpoints
│   ├── auth/                 # Authentication pages
│   ├── chat/                 # Main chat interface
│   ├── vocabulary/           # Vocabulary management
│   │   ├── study/           # Vocabulary study page
│   │   └── review/          # Spaced repetition review
│   ├── practice/            # Speech practice
│   │   ├── pronunciation/   # Pronunciation exercises
│   │   └── dialog/          # Dialog scenarios
│   ├── progress/            # Progress dashboard
│   └── page.tsx             # Landing page
├── components/              # React components
│   ├── chat/               # Chat-specific components
│   ├── ui/                 # shadcn/ui components
│   ├── vocabulary/         # Vocabulary components
│   ├── speech/             # Speech practice components
│   └── progress/           # Progress tracking components
├── lib/                     # Utilities and configurations
│   ├── ai/                 # AI prompts & logic
│   ├── supabase/           # Supabase client setup
│   ├── elevenlabs/         # ElevenLabs TTS client
│   ├── spaced-repetition.ts # SRS algorithm
│   └── progress-tracking.ts # Progress calculation utilities
├── hooks/                   # Custom React hooks
│   ├── use-text-to-speech.ts
│   └── use-audio-recorder.ts
├── scripts/                 # Database SQL scripts
│   ├── 001_create_tables.sql
│   ├── 002_profile_trigger.sql
│   └── 003_add_progress_features.sql
├── public/                  # Static assets
└── middleware.ts            # Auth middleware
```

## Database Schema

### Tables

**profiles**
- `id` (UUID, primary key, references auth.users)
- `email` (TEXT)
- `display_name` (TEXT)
- `created_at` (TIMESTAMPTZ)

**chat_conversations**
- `id` (UUID, primary key)
- `user_id` (UUID, references auth.users)
- `title` (TEXT)
- `learning_mode` (TEXT)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**chat_messages**
- `id` (UUID, primary key)
- `conversation_id` (UUID, references chat_conversations)
- `user_id` (UUID, references auth.users)
- `role` (TEXT: 'user' or 'assistant')
- `content` (TEXT)
- `created_at` (TIMESTAMPTZ)

**vocabulary_cards**
- `id` (UUID, primary key)
- `user_id` (UUID, references auth.users)
- `luxembourgish_word` (TEXT)
- `english_translation` (TEXT)
- `notes` (TEXT, optional)
- `mastery_level` (TEXT: 'new', 'learning', 'reviewing', 'mastered')
- `next_review_date` (TIMESTAMPTZ)
- `review_count` (INTEGER)
- `ease_factor` (DECIMAL)
- `interval_days` (INTEGER)
- `last_reviewed_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ)

**user_stats**
- `id` (UUID, primary key)
- `user_id` (UUID, unique, references auth.users)
- `total_words_learned` (INTEGER)
- `total_conversations` (INTEGER)
- `total_quiz_questions` (INTEGER)
- `total_quiz_correct` (INTEGER)
- `total_study_time_minutes` (INTEGER)
- `total_speaking_exercises` (INTEGER) - Speaking exercises completed (pronunciation and dialog)
- `current_streak` (INTEGER)
- `longest_streak` (INTEGER)
- `last_study_date` (DATE)
- `created_at`, `updated_at` (TIMESTAMPTZ)

**daily_challenges**
- `id` (UUID, primary key)
- `user_id` (UUID, references auth.users)
- `challenge_date` (DATE)
- `words_goal` (INTEGER) - Varies by challenge template
- `words_completed` (INTEGER, default: 0)
- `conversations_goal` (INTEGER) - Varies by challenge template
- `conversations_completed` (INTEGER, default: 0)
- `quiz_questions_goal` (INTEGER) - Varies by challenge template
- `quiz_questions_completed` (INTEGER, default: 0)
- `speaking_exercises_goal` (INTEGER) - Varies by challenge template
- `speaking_exercises_completed` (INTEGER, default: 0)
- `completed` (BOOLEAN)
- `created_at`, `updated_at` (TIMESTAMPTZ)
- Unique constraint on (user_id, challenge_date)
- **Note**: Challenge goals are set dynamically based on day of week using 7 different templates

### Row Level Security

All tables have RLS policies ensuring users can only:
- View their own data
- Insert data tied to their user ID
- Update/delete their own records

## Development

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

### Environment Variables

Required environment variables are documented in `.env.example`.

### AI Model Configuration

The app uses Groq's `llama-3.3-70b-versatile` model with:
- Temperature: 0.7 (balanced creativity)
- Max tokens: 2000
- Streaming enabled for real-time responses

System prompts for each learning mode are defined in `lib/ai/luxembourgish-prompts.ts`.

### TTS Configuration

The app uses ElevenLabs `eleven_v3` model which:
- Supports Luxembourgish (ltz) language
- Auto-detects language (no manual language code needed)
- Provides high-quality natural pronunciation

## Known Limitations

- No offline support (requires internet for AI responses)
- Speech-to-text uses browser Web Speech API (may vary by browser)
- English-Luxembourgish only (no other language pairs)
- TTS requires ElevenLabs API key (optional feature)

## Future Enhancements

Potential improvements for future iterations:
- Offline mode with cached responses
- Additional language pairs
- Advanced pronunciation analysis
- Custom vocabulary sets and themes
- Social features (share progress, compete with friends)
- Mobile app version
- Integration with external language learning resources

## License

This project is for educational purposes as part of a university course.

## Acknowledgments

- Built for a Generative AI university course
- Uses Groq's free tier for AI completions
- Supabase for backend infrastructure
- ElevenLabs for text-to-speech
- shadcn/ui for beautiful components
