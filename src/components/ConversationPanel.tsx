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

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`cursor-pointer p-3 border transition-all ${
        isActive
          ? "border-slate-400"
          : hasUnread
          ? "border-indigo-500 conversation-updated"
          : "border-slate-700"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm">{conversation.title}</h3>
          {hasUnread && (
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          )}
        </div>
        <span className="text-xs text-slate-500">{conversation.status}</span>
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
