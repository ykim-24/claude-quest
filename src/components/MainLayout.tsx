import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { X, Settings, Clock, Play, Pause, Pencil, Save, Trash2, Plus } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { useScheduler } from "@/hooks/useScheduler";
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
  const { conversations, activeConversationId, addConversation, setActiveConversation, playerCharacter, deleteConversation, renameConversation, closeConversation, reopenConversation, scheduledTasks, updateScheduledTask, deleteScheduledTask, addScheduledTask } = useAppStore();
  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const hasScheduledTasks = scheduledTasks.length > 0;

  // Run the scheduler for scheduled tasks
  useScheduler();

  // Update "last ran" display every 5 seconds
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [showCharacterCreator, setShowCharacterCreator] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pendingDirectory, setPendingDirectory] = useState<string | null>(null);
  const [questName, setQuestName] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ id: string; title: string } | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showChangelog, setShowChangelog] = useState(false);
  const [changelog, setChangelog] = useState<string>("");
  const [changelogLoading, setChangelogLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    command: "",
    workingDirectory: "",
    intervalMinutes: 60,
    type: "cli" as "cli" | "prompt",
    conversationIds: [] as string[],
  });

  // Set default active task
  const activeTask = scheduledTasks.find((t) => t.id === activeTaskId) || scheduledTasks[0];

  const startEditingTask = (task: typeof activeTask) => {
    if (!task) return;
    setEditingTaskId(task.id);
    setEditForm({
      name: task.name,
      command: task.command,
      workingDirectory: task.workingDirectory || "",
      intervalMinutes: task.intervalMinutes,
      type: task.type || "cli",
      conversationIds: task.conversationIds || [],
    });
  };

  const saveTaskEdit = () => {
    if (!editingTaskId || !editForm.name.trim() || !editForm.command.trim()) return;

    updateScheduledTask(editingTaskId, {
      name: editForm.name.trim(),
      type: editForm.type,
      command: editForm.command.trim(),
      workingDirectory: editForm.type === "cli" ? (editForm.workingDirectory.trim() || "~") : undefined,
      conversationIds: editForm.type === "prompt" && editForm.conversationIds.length > 0 ? editForm.conversationIds : undefined,
      intervalMinutes: editForm.intervalMinutes,
    });
    setEditingTaskId(null);
  };

  const cancelTaskEdit = () => {
    setEditingTaskId(null);
  };

  const createNewTask = () => {
    const newTask = {
      name: "New Task",
      type: "cli" as const,
      command: "",
      workingDirectory: "~",
      intervalMinutes: 60,
      enabled: false,
    };
    addScheduledTask(newTask);
    // Get the newly created task ID (it will be the last one)
    setTimeout(() => {
      const tasks = useAppStore.getState().scheduledTasks;
      const newTaskId = tasks[tasks.length - 1]?.id;
      if (newTaskId) {
        setActiveTaskId(newTaskId);
        startEditingTask(tasks[tasks.length - 1]);
      }
    }, 0);
  };

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
      conv.closed
        ? {
            label: "Reopen",
            onClick: () => reopenConversation(contextMenu.conversationId),
          }
        : {
            label: "Close",
            onClick: () => closeConversation(contextMenu.conversationId),
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

  const handleShowChangelog = async () => {
    setShowChangelog(true);
    setChangelogLoading(true);
    try {
      const result = await invoke<{ stdout: string; stderr: string; exit_code: number }>(
        "run_shell_command",
        {
          processId: `changelog-${Date.now()}`,
          command: "git log --oneline --decorate -30",
          workingDirectory: null,
        }
      );
      if (result.exit_code === 0) {
        setChangelog(result.stdout || "No commits found");
      } else {
        setChangelog("Could not load git history");
      }
    } catch {
      setChangelog("Could not load git history");
    }
    setChangelogLoading(false);
  };

  const formatInterval = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    return `${Math.floor(minutes / 1440)}d`;
  };

  const formatLastRun = (date: Date) => {
    const now = new Date();
    const lastRun = new Date(date);
    const diffMs = now.getTime() - lastRun.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);

    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return lastRun.toLocaleDateString();
  };

  return (
    <div
      className="h-screen bg-slate-950 text-slate-100 p-4 flex flex-col overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header */}
      <header className="mb-4 flex-shrink-0">
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

      <div className="flex gap-8 flex-1 min-h-0">
      {/* Quest Grid */}
      <main className={`overflow-y-auto ${hasScheduledTasks ? "flex-1" : "w-full"}`}>
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
          <>
            {/* Open Quests */}
            {conversations.filter((c) => !c.closed).length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm text-slate-500 mb-3 uppercase tracking-wider">Open</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {conversations
                    .filter((c) => !c.closed)
                    .map((conv) => (
                      <ConversationPanel
                        key={conv.id}
                        conversation={conv}
                        isActive={conv.id === activeConversationId}
                        onClick={() => setActiveConversation(conv.id)}
                        onContextMenu={(e) => handleContextMenu(e, conv.id)}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Closed Quests */}
            {conversations.filter((c) => c.closed).length > 0 && (
              <div>
                <h2 className="text-sm text-amber-600/70 mb-3 uppercase tracking-wider">Closed</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {conversations
                    .filter((c) => c.closed)
                    .map((conv) => (
                      <ConversationPanel
                        key={conv.id}
                        conversation={conv}
                        isActive={conv.id === activeConversationId}
                        onClick={() => setActiveConversation(conv.id)}
                        onContextMenu={(e) => handleContextMenu(e, conv.id)}
                      />
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Scheduled Tasks Panel */}
      {hasScheduledTasks && (
        <aside className="w-[500px] flex-shrink-0 border border-slate-700 flex flex-col h-1/2 self-end">
          {/* Tabs */}
          <div className="flex border-b border-slate-700 overflow-x-auto">
            {scheduledTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => {
                  setActiveTaskId(task.id);
                  updateScheduledTask(task.id, { hasNewOutput: false });
                }}
                className={`flex items-center gap-2 px-4 py-2 text-xs whitespace-nowrap border-r border-slate-800 ${
                  activeTask?.id === task.id
                    ? "bg-slate-800 text-slate-200"
                    : "text-slate-500 hover:bg-slate-900 hover:text-slate-400"
                }`}
              >
                {task.hasNewOutput && activeTask?.id !== task.id && (
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                )}
                {task.lastStatus && (
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    task.lastStatus === "success" ? "bg-green-500" : "bg-red-500"
                  }`} />
                )}
                <span className="truncate max-w-[100px]">{task.name}</span>
              </button>
            ))}
            <button
              onClick={createNewTask}
              className="flex items-center justify-center px-3 py-2 text-slate-600 hover:text-slate-400 hover:bg-slate-900"
              title="Add new task"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Active Task Content */}
          {activeTask && (
            <div className="flex-1 flex flex-col min-h-0">
              {editingTaskId === activeTask.id ? (
                /* Edit Mode */
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Name</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-slate-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Type</label>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditForm({ ...editForm, type: "cli" })}
                        className={`flex-1 px-2 py-1.5 text-xs border ${
                          editForm.type === "cli"
                            ? "border-slate-500 text-slate-300 bg-slate-800"
                            : "border-slate-700 text-slate-500 hover:border-slate-600"
                        }`}
                      >
                        CLI
                      </button>
                      <button
                        onClick={() => setEditForm({ ...editForm, type: "prompt" })}
                        className={`flex-1 px-2 py-1.5 text-xs border ${
                          editForm.type === "prompt"
                            ? "border-slate-500 text-slate-300 bg-slate-800"
                            : "border-slate-700 text-slate-500 hover:border-slate-600"
                        }`}
                      >
                        Prompt
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">
                      {editForm.type === "cli" ? "Command" : "Prompt"}
                    </label>
                    <textarea
                      value={editForm.command}
                      onChange={(e) => setEditForm({ ...editForm, command: e.target.value })}
                      rows={2}
                      placeholder={editForm.type === "cli" ? "e.g., npm run build" : "e.g., Check the status of the project"}
                      className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-slate-500 font-mono resize-none"
                    />
                  </div>
                  {editForm.type === "cli" ? (
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Working Directory</label>
                      <input
                        type="text"
                        value={editForm.workingDirectory}
                        onChange={(e) => setEditForm({ ...editForm, workingDirectory: e.target.value })}
                        placeholder="~"
                        className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-slate-500 font-mono"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Conversations (optional)</label>
                      <div className="max-h-24 overflow-y-auto border border-slate-700 bg-slate-800">
                        {conversations.filter((c) => !c.closed).length === 0 ? (
                          <div className="text-xs text-slate-600 p-2">No open conversations</div>
                        ) : (
                          conversations.filter((c) => !c.closed).map((conv) => (
                            <label
                              key={conv.id}
                              className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-700 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={editForm.conversationIds.includes(conv.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEditForm({ ...editForm, conversationIds: [...editForm.conversationIds, conv.id] });
                                  } else {
                                    setEditForm({ ...editForm, conversationIds: editForm.conversationIds.filter((id) => id !== conv.id) });
                                  }
                                }}
                                className="w-3 h-3 accent-slate-500"
                              />
                              <span className="text-xs text-slate-300 truncate">{conv.title}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Interval (minutes)</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        value={editForm.intervalMinutes}
                        onChange={(e) => setEditForm({ ...editForm, intervalMinutes: Math.max(1, parseInt(e.target.value) || 1) })}
                        min={1}
                        className="w-20 px-2 py-1.5 bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-slate-500"
                      />
                      <div className="flex gap-1">
                        {[1, 5, 15, 30, 60].map((m) => (
                          <button
                            key={m}
                            onClick={() => setEditForm({ ...editForm, intervalMinutes: m })}
                            className={`px-2 py-1 text-xs border ${
                              editForm.intervalMinutes === m
                                ? "border-slate-500 text-slate-300"
                                : "border-slate-700 text-slate-500 hover:border-slate-600"
                            }`}
                          >
                            {m}m
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={cancelTaskEdit}
                      className="px-3 py-1.5 text-xs border border-slate-700 text-slate-400 hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveTaskEdit}
                      disabled={!editForm.name.trim() || !editForm.command.trim()}
                      className="px-3 py-1.5 text-xs border border-slate-500 text-slate-300 hover:bg-slate-800 disabled:opacity-50 flex items-center gap-1"
                    >
                      <Save size={12} /> Save
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={() => {
                        deleteScheduledTask(activeTask.id);
                        setEditingTaskId(null);
                        setActiveTaskId(null);
                      }}
                      className="px-3 py-1.5 text-xs border border-red-900 text-red-500 hover:bg-red-950 flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <>
                  <div className="flex items-center gap-2 p-3 bg-slate-900/50 border-b border-slate-800">
                    <button
                      onClick={() => updateScheduledTask(activeTask.id, { enabled: !activeTask.enabled })}
                      className={activeTask.enabled ? "text-green-500" : "text-slate-600"}
                      title={activeTask.enabled ? "Pause" : "Resume"}
                    >
                      {activeTask.enabled ? <Play size={14} /> : <Pause size={14} />}
                    </button>
                    <span className="text-sm text-slate-300">{activeTask.name}</span>
                    <span className="text-xs text-purple-400">[{formatInterval(activeTask.intervalMinutes)}]</span>
                    <span className="flex-1" />
                    {activeTask.lastRun && (
                      <span className="text-xs text-slate-600" title={new Date(activeTask.lastRun).toLocaleString()}>
                        {formatLastRun(activeTask.lastRun)}
                      </span>
                    )}
                    <button
                      onClick={() => startEditingTask(activeTask)}
                      className="text-slate-600 hover:text-slate-400"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 bg-slate-950">
                    {activeTask.lastOutput ? (
                      <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap break-all">
                        {activeTask.lastOutput}
                      </pre>
                    ) : (
                      <div className="text-xs text-slate-600 italic">No output yet</div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </aside>
      )}
      </div>

      {/* Version */}
      <button
        onClick={handleShowChangelog}
        className="fixed bottom-2 left-2 text-xs text-slate-600 hover:text-slate-400 cursor-pointer"
      >
        v0.1.0
      </button>

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

      {/* Changelog Dialog */}
      {showChangelog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80">
          <div className="bg-slate-950 border border-slate-700 p-6 w-[500px] max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm">Changelog (v0.1.0)</span>
              <button onClick={() => setShowChangelog(false)} className="text-slate-600 hover:text-slate-400">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {changelogLoading ? (
                <div className="text-slate-500 text-sm">Loading...</div>
              ) : (
                <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap">{changelog}</pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
