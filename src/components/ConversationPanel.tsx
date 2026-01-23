import { Lock } from "lucide-react";
import type { Conversation } from "@/types";

interface ConversationPanelProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export function ConversationPanel({ conversation, isActive, onClick, onContextMenu }: ConversationPanelProps) {
  const lastMessage = conversation.messages[conversation.messages.length - 1];
  const hasUnread = conversation.messages.length > (conversation.lastSeenMessageCount ?? 0);
  const isClosed = conversation.closed;

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`cursor-pointer p-3 border transition-all ${
        isClosed
          ? "border-amber-900 opacity-60"
          : isActive
          ? "border-slate-400"
          : hasUnread
          ? "border-indigo-500 conversation-updated"
          : "border-slate-700"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isClosed && <Lock size={12} className="text-amber-600" />}
          <h3 className="text-sm">{conversation.title}</h3>
          {hasUnread && !isClosed && (
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          )}
        </div>
        <span className={`text-xs ${isClosed ? "text-amber-600" : "text-slate-500"}`}>
          {isClosed ? "closed" : conversation.status}
        </span>
      </div>

      <div className="text-xs text-slate-400 h-12 overflow-hidden">
        {lastMessage ? (
          <p className="line-clamp-2">{lastMessage.content}</p>
        ) : (
          <p className="text-slate-600">No messages yet...</p>
        )}
      </div>

      <div className="flex items-center justify-between mt-2 text-xs text-slate-600">
        <span>{conversation.messages.length} msg</span>
        <span>{conversation.equippedSkills.length} skills</span>
      </div>
    </div>
  );
}
