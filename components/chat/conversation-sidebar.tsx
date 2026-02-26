"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  MessageSquarePlus, 
  MessageCircle, 
  BookOpen, 
  BookText, 
  Languages,
  ChevronLeft,
  ChevronRight,
  Trash2
} from "lucide-react"
import { cn } from "@/lib/utils"

type Conversation = {
  id: string
  title: string
  learning_mode: string
  updated_at: string
  message_preview?: string
}

interface ConversationSidebarProps {
  conversations: Conversation[]
  currentConversationId: string | null
  isOpen: boolean
  onToggle: () => void
  onSelectConversation: (id: string) => void
  onNewConversation: () => void
  onDeleteConversation?: (id: string) => void
}

const MODE_CONFIG: Record<string, { icon: typeof MessageCircle; label: string; color: string }> = {
  conversation: { icon: MessageCircle, label: "Chat", color: "text-blue-600 bg-blue-50" },
  grammar: { icon: BookOpen, label: "Grammar", color: "text-purple-600 bg-purple-50" },
  vocabulary: { icon: BookText, label: "Vocab", color: "text-amber-600 bg-amber-50" },
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return date.toLocaleDateString()
}

function groupConversationsByDate(conversations: Conversation[]): Map<string, Conversation[]> {
  const groups = new Map<string, Conversation[]>()
  
  for (const conv of conversations) {
    const date = new Date(conv.updated_at)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    let groupKey: string
    if (diffDays === 0) groupKey = "Today"
    else if (diffDays === 1) groupKey = "Yesterday"
    else if (diffDays < 7) groupKey = "This Week"
    else if (diffDays < 30) groupKey = "This Month"
    else groupKey = "Older"

    if (!groups.has(groupKey)) {
      groups.set(groupKey, [])
    }
    groups.get(groupKey)!.push(conv)
  }

  return groups
}

export function ConversationSidebar({
  conversations,
  currentConversationId,
  isOpen,
  onToggle,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: ConversationSidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const groupedConversations = groupConversationsByDate(conversations)

  return (
    <>
      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 z-40 h-full bg-gray-50 border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col overflow-hidden",
          isOpen ? "w-72" : "w-0 md:w-16"
        )}
      >
        {isOpen ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <Button
                onClick={onNewConversation}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white gap-2 shadow-md font-semibold"
              >
                <MessageSquarePlus className="w-4 h-4" />
                New Chat
              </Button>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto p-2">
              {conversations.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8 px-4">
                  No conversations yet. Start a new chat!
                </div>
              ) : (
                Array.from(groupedConversations.entries()).map(([group, convs]) => (
                  <div key={group} className="mb-4">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 mb-2">
                      {group}
                    </div>
                    {convs.map((conv) => {
                      const modeConfig = MODE_CONFIG[conv.learning_mode] || MODE_CONFIG.conversation
                      const ModeIcon = modeConfig.icon
                      const isActive = conv.id === currentConversationId
                      const isHovered = hoveredId === conv.id

                      return (
                        <div
                          key={conv.id}
                          className={cn(
                            "group relative rounded-lg px-3 py-2.5 cursor-pointer transition-all mb-1",
                            isActive 
                              ? "bg-blue-100 border border-blue-200" 
                              : "hover:bg-gray-100 border border-transparent"
                          )}
                          onClick={() => onSelectConversation(conv.id)}
                          onMouseEnter={() => setHoveredId(conv.id)}
                          onMouseLeave={() => setHoveredId(null)}
                        >
                          <div className="flex items-start gap-2">
                            <div className={cn("p-1 rounded", modeConfig.color)}>
                              <ModeIcon className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-sm font-medium truncate block",
                                  isActive ? "text-blue-900" : "text-gray-900"
                                )}>
                                  {conv.title || "New Conversation"}
                                </span>
                              </div>
                              {conv.message_preview && (
                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                  {conv.message_preview}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <span className={cn(
                                  "text-[10px] px-1.5 py-0.5 rounded font-medium",
                                  modeConfig.color
                                )}>
                                  {modeConfig.label}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {formatRelativeDate(conv.updated_at)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Delete button on hover */}
                          {onDeleteConversation && isHovered && !isActive && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onDeleteConversation(conv.id)
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete conversation"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 text-center">
              <p className="text-[10px] text-gray-400">
                {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Collapsed state - thin icon bar (desktop only) */}
            <div className="hidden md:flex flex-col items-center h-full w-full">
              {/* Top section - fixed */}
              <div className="flex flex-col items-center gap-3 py-4 flex-shrink-0">
                {/* New Chat Button */}
                <button
                  onClick={onNewConversation}
                  className="w-12 h-12 p-0 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg flex items-center justify-center transition-all shadow-md group"
                  title="New Chat"
                >
                  <MessageSquarePlus className="w-5 h-5 text-white" />
                </button>

                {/* Divider */}
                <div className="w-8 h-px bg-gray-200" />
              </div>

              {/* Recent conversations (first 5) - scrollable middle section */}
              <div className="flex-1 overflow-y-auto w-full px-2 space-y-1 min-h-0">
                {conversations.slice(0, 5).map((conv) => {
                  const modeConfig = MODE_CONFIG[conv.learning_mode] || MODE_CONFIG.conversation
                  const ModeIcon = modeConfig.icon
                  const isActive = conv.id === currentConversationId

                  return (
                    <button
                      key={conv.id}
                      onClick={() => onSelectConversation(conv.id)}
                      className={cn(
                        "w-full p-2 rounded-lg transition-colors group relative",
                        isActive 
                          ? "bg-blue-100" 
                          : "hover:bg-gray-100"
                      )}
                      title={conv.title || "New Conversation"}
                    >
                      <div className={cn("p-1.5 rounded", modeConfig.color)}>
                        <ModeIcon className="w-4 h-4" />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Toggle Button - always visible, positioned in middle when collapsed */}
      <button
        onClick={onToggle}
        className={cn(
          "fixed z-50 top-1/2 -translate-y-1/2 p-1.5 bg-white border border-gray-200 rounded-full shadow-md hover:bg-gray-50 transition-all duration-300",
          isOpen ? "left-[276px]" : "left-8 -translate-x-1/2"
        )}
        title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        {isOpen ? (
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-600" />
        )}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={onToggle}
        />
      )}
    </>
  )
}

