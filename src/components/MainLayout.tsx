import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { X, Settings } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { ConversationPanel } from "./ConversationPanel";
import { ConversationView } from "./ConversationView";
import { FileBrowser } from "./FileBrowser";
import { CharacterCreator } from "./CharacterCreator";
import { PixelCharacter } from "./PixelCharacter";
import { ContextMenu, ContextMenuItem } from "./ContextMenu";
import { SettingsPanel } from "./SettingsPanel";

interface ContextMenuState {
  x: number;
  y: number;
  conversationId: string;
}

export function MainLayout() {
  const { conversations, activeConversationId, addConversation, setActiveConversation, playerCharacter, deleteConversation, renameConversation } = useAppStore();
  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [showCharacterCreator, setShowCharacterCreator] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pendingDirectory, setPendingDirectory] = useState<string | null>(null);
  const [questName, setQuestName] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ id: string; title: string } | null>(null);

  const handleNewQuest = () => {
    setShowFileBrowser(true);
  };

  const handleDirectorySelect = (path: string) => {
    const defaultName = path.split("/").pop() || "New Quest";
    setQuestName(defaultName);
    setPendingDirectory(path);
    setShowFileBrowser(false);
  };

  const handleCreateQuest = () => {
    if (pendingDirectory) {
      addConversation(pendingDirectory, questName.trim() || undefined);
      setPendingDirectory(null);
      setQuestName("");
    }
  };

  const handleCancelNaming = () => {
    setPendingDirectory(null);
    setQuestName("");
  };

  const handleContextMenu = (e: React.MouseEvent, conversationId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, conversationId });
  };

  const getContextMenuItems = (): ContextMenuItem[] => {
    if (!contextMenu) return [];
    const conv = conversations.find((c) => c.id === contextMenu.conversationId);
    if (!conv) return [];

    return [
      {
        label: "Open",
        onClick: () => setActiveConversation(contextMenu.conversationId),
      },
      {
        label: "Rename",
        onClick: () => setRenameTarget({ id: contextMenu.conversationId, title: conv.title }),
      },
      {
        label: "Delete",
        onClick: () => deleteConversation(contextMenu.conversationId),
        danger: true,
      },
    ];
  };

  const handleRename = () => {
    if (renameTarget && renameTarget.title.trim()) {
      renameConversation(renameTarget.id, renameTarget.title.trim());
    }
    setRenameTarget(null);
  };

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 p-4"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl">Claude Quest</h1>
            {/* Player character display */}
            <div
              onClick={() => setShowCharacterCreator(true)}
              className="flex items-center gap-2 px-2 py-1 border border-slate-700 cursor-pointer"
            >
              {playerCharacter ? (
                <>
                  <PixelCharacter
                    classId={playerCharacter.classId}
                    customization={playerCharacter.customization}
                    color={playerCharacter.color}
                    size={24}
                  />
                  <span className="text-sm" style={{ color: playerCharacter.color }}>
                    {playerCharacter.name}
                  </span>
                </>
              ) : (
                <span className="text-sm text-slate-500">Create Character</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 border border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600"
              title="Settings"
            >
              <Settings size={16} />
            </button>
            <button
              onClick={handleNewQuest}
              className="px-3 py-1 border border-slate-600"
            >
              New Quest
            </button>
          </div>
        </div>
      </header>

      {/* Quest Grid */}
      <main className="mb-20">
        {conversations.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <p>No active quests</p>
            <button
              onClick={handleNewQuest}
              className="mt-4 px-3 py-1 border border-slate-600"
            >
              Start New Quest
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {conversations.map((conv) => (
              <ConversationPanel
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeConversationId}
                onClick={() => setActiveConversation(conv.id)}
                onContextMenu={(e) => handleContextMenu(e, conv.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* File Browser */}
      {showFileBrowser && (
        <FileBrowser
          onSelect={handleDirectorySelect}
          onCancel={() => setShowFileBrowser(false)}
        />
      )}

      {/* Character Creator */}
      {showCharacterCreator && (
        <CharacterCreator onClose={() => setShowCharacterCreator(false)} />
      )}

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}

      {/* Quest Naming Dialog */}
      {pendingDirectory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80">
          <div className="bg-slate-950 border border-slate-700 p-6 w-96">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm">Name Your Quest</span>
              <button onClick={handleCancelNaming} className="text-slate-600">
                <X size={16} />
              </button>
            </div>
            <input
              type="text"
              value={questName}
              onChange={(e) => setQuestName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateQuest()}
              placeholder="Quest name..."
              autoFocus
              className="w-full px-3 py-2 bg-transparent border border-slate-700 text-slate-100 text-sm focus:outline-none mb-2"
            />
            <div className="text-xs text-slate-600 mb-4 truncate">
              {pendingDirectory}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCancelNaming}
                className="flex-1 py-2 border border-slate-700 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateQuest}
                className="flex-1 py-2 border border-slate-600 text-sm"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conversation View */}
      <AnimatePresence>
        {activeConversation && (
          <ConversationView
            conversation={activeConversation}
            onClose={() => setActiveConversation(null)}
          />
        )}
      </AnimatePresence>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Rename Dialog */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80">
          <div className="bg-slate-950 border border-slate-700 p-6 w-96">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm">Rename Quest</span>
              <button onClick={() => setRenameTarget(null)} className="text-slate-600">
                <X size={16} />
              </button>
            </div>
            <input
              type="text"
              value={renameTarget.title}
              onChange={(e) => setRenameTarget({ ...renameTarget, title: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              autoFocus
              className="w-full px-3 py-2 bg-transparent border border-slate-700 text-slate-100 text-sm focus:outline-none mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setRenameTarget(null)}
                className="flex-1 py-2 border border-slate-700 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                className="flex-1 py-2 border border-slate-600 text-sm"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
