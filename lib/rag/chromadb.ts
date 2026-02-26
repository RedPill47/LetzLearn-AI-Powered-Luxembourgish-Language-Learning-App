/**
 * ChromaDB RAG utility for Luxembourgish knowledge retrieval
 * 
 * Queries ChromaDB directly using Python script (no server needed).
 * Falls back to static content if ChromaDB is unavailable.
 * 
 * Implements topic-based caching: fetches context once per topic and reuses it.
 */

import path from "path"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

// Cache RAG context by topic
const ragCache = new Map<string, { context: string; timestamp: number }>()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour cache TTL

// Fallback content when ChromaDB is unavailable
const FALLBACK_CONTENT = {
  greeting: `
--- Greetings (Begréissungen) ---
Moien - Hello (informal, until noon)
Gudde Moien - Good morning
Gudde Mëtteg - Good afternoon
Gudden Owend - Good evening
Gutt Nuecht - Good night
Bonjour - Hello (formal)
Salut - Hi (very informal)

Example dialogues:
- Person 1: Moien! Wéi geet et?
  Person 2: Gutt, Merci! An dir?
- Person 1: Gudden Owend, Madame Wagner!
  Person 2: Oh, gudden Owend, Här Michels!
`,
  goodbye: `
--- Farewells (Ofschied) ---
Äddi - Goodbye
Awar/Awuer - Goodbye (formal)
Bis muer - See you tomorrow
Bis geschwënn - See you soon
Nach e schéinen Dag - Have a nice day
Nach e schéinen Owend - Have a nice evening

Example: Äddi an nach e schéinen Owend! - Goodbye and have a nice evening!
`,
  default: `
No specific content found for your query. Here are some common topics:
- Greetings (Moien, Gudde Moien, Gudden Owend)
- Farewells (Äddi, Awar)
- Introductions (Wéi heescht Dir?)
- How are you (Wéi geet et?)
- Numbers (Zuelen)
- Articles (de, d', en, eng)
- Verb conjugation (sinn, hunn)

Try searching for one of these topics!
`,
}

/**
 * Get RAG context for a topic
 * Uses caching to avoid querying on every message
 * Only queries when topic changes or cache expires
 */
export async function getRAGContext(
  topic: string,
  nResults: number = 5,
  forceRefresh: boolean = false
): Promise<string> {
  // Check cache first
  if (!forceRefresh) {
    const cached = ragCache.get(topic)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`✅ [RAG] Using cached context for topic: ${topic}`)
      return cached.context
    }
  }

  // Build query from topic
  const query = buildTopicQuery(topic)
  
  return await fetchRAGContext(query, topic, nResults)
}

/**
 * Build a query string from a topic ID
 */
function buildTopicQuery(topic: string): string {
  const topicQueries: Record<string, string> = {
    greetings: "greetings farewells hello goodbye Moien Äddi Bonjour",
    introductions: "introductions name where from nationality language",
    numbers: "numbers dates time telephone numbers calendar",
    shopping: "shopping store buy sell price money",
    work: "work job profession occupation workplace",
    home: "home family house daily life routine",
    grammar_basics: "grammar rules articles verbs conjugation sentence structure",
    vocabulary_common: "common words everyday vocabulary essential phrases",
    general: "Luxembourgish language learning basics",
  }
  
  return topicQueries[topic] || topic
}

/**
 * Fetch RAG context from ChromaDB (internal function)
 */
async function fetchRAGContext(
  query: string,
  topic: string,
  nResults: number = 5
): Promise<string> {
  try {
    // Find Python script path
    const scriptPath = path.join(process.cwd(), "scripts", "query_chromadb.py")
    
    // Escape query for shell (handle special characters)
    const escapedQuery = query.replace(/'/g, "'\\''")
    
    // Run Python script
    console.log(`🔍 [RAG] Querying ChromaDB via Python script: "${query.substring(0, 50)}..."`)
    
    const { stdout, stderr } = await execAsync(
      `python3 "${scriptPath}" '${escapedQuery}' ${nResults}`,
      {
        timeout: 180000, // 3 minute timeout (model download can take 1-2 minutes on first run)
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      }
    )

    if (stderr && !stderr.includes("UserWarning")) {
      console.warn("Python script stderr:", stderr)
    }

    // Parse JSON response
    const result = JSON.parse(stdout.trim())
    
    if (result.error) {
      // Log error but don't show schema mismatch to user - just use fallback
      if (result.error.includes("schema mismatch") || result.error.includes("no such column")) {
        console.warn(`⚠️  [RAG] ChromaDB schema mismatch - using fallback content`)
      } else {
        console.warn(`⚠️  [RAG] ChromaDB query error: ${result.error}`)
      }
      return getFallbackContent(query)
    }

    if (result.success && result.results && result.results.length > 0) {
      console.log(`✅ [RAG] Found ${result.count} relevant documents for topic: ${topic}`)
      
      const formattedResults = result.results
        .map((r: { content: string; index: number }) => `--- Result ${r.index} ---\n${r.content.trim()}`)
        .join("\n\n")

      // Cache the result
      ragCache.set(topic, {
        context: formattedResults,
        timestamp: Date.now(),
      })
      
      return formattedResults
    }

    console.log("⚠️  [RAG] No documents found, using fallback content")
    const fallback = getFallbackContent(query)
    
    // Cache fallback too
    ragCache.set(topic, {
      context: fallback,
      timestamp: Date.now(),
    })
    
    return fallback
  } catch (error) {
    console.warn("❌ [RAG] ChromaDB query error:", error)
    if (error instanceof Error) {
      const errorMsg = error.message
      // Check if it's a timeout error (model download on first run)
      if (errorMsg.includes("SIGTERM") || errorMsg.includes("killed") || errorMsg.includes("timeout")) {
        console.warn("⚠️  [RAG] Query timed out - this may happen on first run while downloading the embedding model")
        console.warn("   The model will be cached for future queries (~1.3GB download)")
      } else {
        console.warn("Error details:", errorMsg)
      }
    }
    return getFallbackContent(query)
  }
}

/**
 * Get fallback content based on query
 */
function getFallbackContent(query: string): string {
  const queryLower = query.toLowerCase()

  if (
    queryLower.includes("greet") ||
    queryLower.includes("hello") ||
    queryLower.includes("moien") ||
    queryLower.includes("bonjour")
  ) {
    return FALLBACK_CONTENT.greeting
  }

  if (
    queryLower.includes("goodbye") ||
    queryLower.includes("farewell") ||
    queryLower.includes("äddi") ||
    queryLower.includes("awuer")
  ) {
    return FALLBACK_CONTENT.goodbye
  }

  return FALLBACK_CONTENT.default
}
