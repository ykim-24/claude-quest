import { useState } from "react";
import { X, Plus, Trash2, Clock, Play, Pause } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import type { CustomCommand, CommandType, ScheduledTask } from "@/types";

interface SettingsPanelProps {
  onClose: () => void;
}

// Reuse same icons from SkillModal for consistency
const commandIcons = [
  { value: "sword", icon: "\u2694" },
  { value: "staff", icon: "\u2697" },
  { value: "ring", icon: "\u25CE" },
  { value: "book", icon: "\u25C8" },
  { value: "shield", icon: "\u26CA" },
  { value: "potion", icon: "\u2671" },
  { value: "scroll", icon: "\u22C8" },
  { value: "gem", icon: "\u25C6" },
  { value: "wand", icon: "\u269A" },
  { value: "helm", icon: "\u26D1" },
  { value: "arrow", icon: "\u27A4" },
  { value: "orb", icon: "\u25CF" },
  { value: "star", icon: "\u2605" },
  { value: "moon", icon: "\u263D" },
  { value: "sun", icon: "\u2600" },
  { value: "eye", icon: "\u25C9" },
];

const colorPalette = [
  { value: "#cbd5e1", label: "Default" },
  { value: "#ef4444", label: "Red" },
  { value: "#f97316", label: "Orange" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#eab308", label: "Yellow" },
  { value: "#84cc16", label: "Lime" },
  { value: "#22c55e", label: "Green" },
  { value: "#10b981", label: "Emerald" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#0ea5e9", label: "Sky" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#6366f1", label: "Indigo" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#a855f7", label: "Purple" },
  { value: "#d946ef", label: "Fuchsia" },
  { value: "#ec4899", label: "Pink" },
  { value: "#f43f5e", label: "Rose" },
];

export function getCommandIconDisplay(iconValue: string): string {
  const found = commandIcons.find((i) => i.value === iconValue);
  return found?.icon || "\u25C7";
}

type SettingsTab = "commands" | "scheduled";

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { customCommands, conversations, scheduledTasks, addCustomCommand, updateCustomCommand, deleteCustomCommand, addScheduledTask, updateScheduledTask, deleteScheduledTask } = useAppStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>("commands");
  const [editingCommand, setEditingCommand] = useState<CustomCommand | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Scheduled task state
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  // Form state for commands
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("");
  const [commandType, setCommandType] = useState<CommandType>("prompt");
  const [prompt, setPrompt] = useState("");
  const [icon, setIcon] = useState("gem");
  const [color, setColor] = useState("#cbd5e1");
  const [isQuickAction, setIsQuickAction] = useState(false);
  const [scopedConversationIds, setScopedConversationIds] = useState<string[]>([]);

  // Form state for scheduled tasks
  const [taskName, setTaskName] = useState("");
  const [taskType, setTaskType] = useState<"cli" | "prompt">("cli");
  const [taskCommand, setTaskCommand] = useState("");
  const [taskDirectory, setTaskDirectory] = useState("");
  const [taskConversationIds, setTaskConversationIds] = useState<string[]>([]);
  const [taskInterval, setTaskInterval] = useState(60);
  const [taskEnabled, setTaskEnabled] = useState(true);

  const resetForm = () => {
    setName("");
    setTrigger("");
    setCommandType("prompt");
    setPrompt("");
    setIcon("gem");
    setColor("#cbd5e1");
    setIsQuickAction(false);
    setScopedConversationIds([]);
    setEditingCommand(null);
    setIsCreating(false);
  };

  const resetTaskForm = () => {
    setTaskName("");
    setTaskType("cli");
    setTaskCommand("");
    setTaskDirectory("");
    setTaskConversationIds([]);
    setTaskInterval(60);
    setTaskEnabled(true);
    setEditingTask(null);
    setIsCreatingTask(false);
  };

  const startEditing = (command: CustomCommand) => {
    setEditingCommand(command);
    setIsCreating(false);
    setName(command.name);
    setTrigger(command.trigger);
    setCommandType(command.type || "prompt");
    setPrompt(command.prompt);
    setIcon(command.icon);
    setColor(command.color);
    setIsQuickAction(command.isQuickAction);
    setScopedConversationIds(command.scopedConversationIds || []);
  };

  const startCreating = () => {
    resetForm();
    setIsCreating(true);
  };

  const startEditingTask = (task: ScheduledTask) => {
    setEditingTask(task);
    setIsCreatingTask(false);
    setTaskName(task.name);
    setTaskType(task.type || "cli");
    setTaskCommand(task.command);
    setTaskDirectory(task.workingDirectory || "");
    setTaskConversationIds(task.conversationIds || []);
    setTaskInterval(task.intervalMinutes);
    setTaskEnabled(task.enabled);
  };

  const startCreatingTask = () => {
    resetTaskForm();
    setIsCreatingTask(true);
  };

  const handleSave = () => {
    if (!name.trim() || !trigger.trim() || !prompt.trim()) return;

    const commandData = {
      name: name.trim(),
      trigger: trigger.trim().toLowerCase().replace(/^\//, "").replace(/\s/g, "-"),
      type: commandType,
      prompt: prompt.trim(),
      icon,
      color,
      isQuickAction,
      scopedConversationIds: scopedConversationIds.length > 0 ? scopedConversationIds : undefined,
    };

    if (editingCommand) {
      updateCustomCommand(editingCommand.id, commandData);
    } else {
      addCustomCommand(commandData);
    }

    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteCustomCommand(id);
    if (editingCommand?.id === id) {
      resetForm();
    }
  };

  const handleSaveTask = () => {
    if (!taskName.trim() || !taskCommand.trim()) return;

    const taskData = {
      name: taskName.trim(),
      type: taskType,
      command: taskCommand.trim(),
      workingDirectory: taskType === "cli" ? (taskDirectory.trim() || "~") : undefined,
      conversationIds: taskType === "prompt" && taskConversationIds.length > 0 ? taskConversationIds : undefined,
      intervalMinutes: taskInterval,
      enabled: taskEnabled,
    };

    if (editingTask) {
      updateScheduledTask(editingTask.id, taskData);
    } else {
      addScheduledTask(taskData);
    }

    resetTaskForm();
  };

  const handleDeleteTask = (id: string) => {
    deleteScheduledTask(id);
    if (editingTask?.id === id) {
      resetTaskForm();
    }
  };

  const isFormOpen = isCreating || editingCommand !== null;
  const isTaskFormOpen = isCreatingTask || editingTask !== null;

  const formatInterval = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    return `${Math.floor(minutes / 1440)}d`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80">
      <div className="bg-slate-950 border border-slate-700 w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-4">
            <h2 className="text-sm text-slate-300">Settings</h2>
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab("commands")}
                className={`px-3 py-1 text-xs border ${
                  activeTab === "commands"
                    ? "border-slate-500 text-slate-300 bg-slate-800"
                    : "border-slate-700 text-slate-500 hover:border-slate-600"
                }`}
              >
                Commands
              </button>
              <button
                onClick={() => setActiveTab("scheduled")}
                className={`px-3 py-1 text-xs border flex items-center gap-1 ${
                  activeTab === "scheduled"
                    ? "border-slate-500 text-slate-300 bg-slate-800"
                    : "border-slate-700 text-slate-500 hover:border-slate-600"
                }`}
              >
                <Clock size={12} />
                Scheduled
              </button>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-400">
            <X size={16} />
          </button>
        </div>

        {activeTab === "commands" ? (
        <div className="flex flex-1 overflow-hidden">
          {/* Left side - Command list */}
          <div className="w-1/2 border-r border-slate-700 flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-slate-800">
              <span className="text-xs text-slate-500">Custom Commands</span>
              <button
                onClick={startCreating}
                className="text-slate-600 hover:text-slate-400"
                title="Add command"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {customCommands.length === 0 && !isFormOpen ? (
                <div className="text-center py-8 text-slate-600 text-xs">
                  <p>No custom commands</p>
                  <button
                    onClick={startCreating}
                    className="mt-2 px-3 py-1 border border-slate-700 hover:border-slate-600"
                  >
                    Create one
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  {customCommands.map((cmd) => (
                    <div
                      key={cmd.id}
                      className={`flex items-center gap-2 p-2 border cursor-pointer ${
                        editingCommand?.id === cmd.id
                          ? "border-slate-600 bg-slate-900"
                          : "border-slate-800 hover:border-slate-700"
                      }`}
                      onClick={() => startEditing(cmd)}
                    >
                      <span style={{ color: cmd.color }}>{getCommandIconDisplay(cmd.icon)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-300 truncate">{cmd.name}</div>
                        <div className="text-xs text-slate-600 truncate">/{cmd.trigger}</div>
                      </div>
                      {cmd.type === "cli" && (
                        <span className="text-xs text-cyan-600 border border-cyan-800 px-1">CLI</span>
                      )}
                      {cmd.isQuickAction && (
                        <span className="text-xs text-slate-600 border border-slate-700 px-1">QA</span>
                      )}
                      {cmd.scopedConversationIds && cmd.scopedConversationIds.length > 0 && (
                        <span className="text-xs text-amber-600 border border-amber-800 px-1" title="Scoped to specific conversations">S</span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(cmd.id);
                        }}
                        className="text-slate-700 hover:text-red-500"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right side - Editor */}
          <div className="w-1/2 flex flex-col">
            {isFormOpen ? (
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Summarize"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-slate-500"
                    />
                  </div>

                  {/* Trigger */}
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Trigger</label>
                    <div className="flex items-center">
                      <span className="px-2 py-2 bg-slate-800 border border-r-0 border-slate-700 text-slate-500 text-sm">
                        /
                      </span>
                      <input
                        type="text"
                        value={trigger}
                        onChange={(e) => setTrigger(e.target.value)}
                        placeholder="summarize"
                        autoCorrect="off"
                        autoCapitalize="off"
                        autoComplete="off"
                        spellCheck={false}
                        className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-slate-500"
                      />
                    </div>
                    <p className="text-xs text-slate-600 mt-1">Type /{trigger || "trigger"} to use this command</p>
                  </div>

                  {/* Type */}
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Type</label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setCommandType("prompt")}
                        className={`flex-1 px-3 py-2 text-xs border ${
                          commandType === "prompt"
                            ? "border-slate-500 text-slate-300 bg-slate-800"
                            : "border-slate-700 text-slate-500 hover:border-slate-600"
                        }`}
                      >
                        Prompt
                      </button>
                      <button
                        type="button"
                        onClick={() => setCommandType("cli")}
                        className={`flex-1 px-3 py-2 text-xs border ${
                          commandType === "cli"
                            ? "border-slate-500 text-slate-300 bg-slate-800"
                            : "border-slate-700 text-slate-500 hover:border-slate-600"
                        }`}
                      >
                        CLI Command
                      </button>
                    </div>
                  </div>

                  {/* Prompt / Command */}
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">
                      {commandType === "cli" ? "Command" : "Prompt"}
                    </label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={
                        commandType === "cli"
                          ? "e.g., npm run build"
                          : "The prompt to send when this command is triggered..."
                      }
                      rows={4}
                      autoCorrect="off"
                      autoCapitalize="off"
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-slate-500 resize-none font-mono"
                    />
                    <p className="text-xs text-slate-600 mt-1">
                      {commandType === "cli"
                        ? "Executes in the quest's working directory"
                        : "Sends this text to Claude"}
                    </p>
                  </div>

                  {/* Icon */}
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Icon</label>
                    <div className="grid grid-cols-8 gap-1 p-2 bg-slate-800 border border-slate-700">
                      {commandIcons.map((i) => (
                        <button
                          key={i.value}
                          type="button"
                          onClick={() => setIcon(i.value)}
                          className={`w-7 h-7 flex items-center justify-center text-sm border ${
                            icon === i.value
                              ? "border-slate-400 bg-slate-700"
                              : "border-transparent hover:border-slate-600"
                          }`}
                          style={{ color }}
                        >
                          {i.icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color */}
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Color</label>
                    <div className="flex flex-wrap gap-1 p-2 bg-slate-800 border border-slate-700">
                      {colorPalette.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setColor(c.value)}
                          className={`w-6 h-6 border ${
                            color === c.value ? "border-white" : "border-slate-600"
                          }`}
                          style={{ backgroundColor: c.value }}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Quick Action Toggle */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <button
                        type="button"
                        onClick={() => setIsQuickAction(!isQuickAction)}
                        className={`w-9 h-5 border rounded-full relative transition-colors flex-shrink-0 flex items-center ${
                          isQuickAction
                            ? "bg-green-800 border-green-600"
                            : "bg-slate-800 border-slate-700"
                        }`}
                      >
                        <span
                          className={`absolute left-0.5 w-3.5 h-3.5 bg-slate-300 rounded-full transition-transform ${
                            isQuickAction ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                      <span className="text-xs text-slate-400">Show as Quick Action</span>
                    </label>
                    <p className="text-xs text-slate-600 mt-1">Quick actions appear as buttons above the chat input</p>
                  </div>

                  {/* Scope to Conversations */}
                  <div>
                    <label className="text-xs text-slate-400 mb-2 block">Scope to Conversations (optional)</label>
                    <p className="text-xs text-slate-600 mb-2">Leave empty to show in all conversations</p>
                    <div className="max-h-32 overflow-y-auto border border-slate-700 rounded">
                      {conversations.length === 0 ? (
                        <div className="text-xs text-slate-600 p-2">No conversations yet</div>
                      ) : (
                        conversations.map((conv) => (
                          <label
                            key={conv.id}
                            className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={scopedConversationIds.includes(conv.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setScopedConversationIds([...scopedConversationIds, conv.id]);
                                } else {
                                  setScopedConversationIds(scopedConversationIds.filter((id) => id !== conv.id));
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
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-6">
                  <button
                    onClick={resetForm}
                    className="px-4 py-2 text-xs border border-slate-700 text-slate-400 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={handleSave}
                    disabled={!name.trim() || !trigger.trim() || !prompt.trim()}
                    className="px-4 py-2 text-xs border border-slate-500 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                  >
                    {editingCommand ? "Save" : "Create"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-600 text-xs">
                <div className="text-center">
                  <p>Select a command to edit</p>
                  <p className="text-slate-700 mt-1">or create a new one</p>
                </div>
              </div>
            )}
          </div>
        </div>
        ) : (
        /* Scheduled Tasks Tab */
        <div className="flex flex-1 overflow-hidden">
          {/* Left side - Task list */}
          <div className="w-1/2 border-r border-slate-700 flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-slate-800">
              <span className="text-xs text-slate-500">Scheduled Tasks</span>
              <button
                onClick={startCreatingTask}
                className="text-slate-600 hover:text-slate-400"
                title="Add scheduled task"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {scheduledTasks.length === 0 && !isTaskFormOpen ? (
                <div className="text-center py-8 text-slate-600 text-xs">
                  <p>No scheduled tasks</p>
                  <button
                    onClick={startCreatingTask}
                    className="mt-2 px-3 py-1 border border-slate-700 hover:border-slate-600"
                  >
                    Create one
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  {scheduledTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-center gap-2 p-2 border cursor-pointer ${
                        editingTask?.id === task.id
                          ? "border-slate-600 bg-slate-900"
                          : "border-slate-800 hover:border-slate-700"
                      }`}
                      onClick={() => startEditingTask(task)}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateScheduledTask(task.id, { enabled: !task.enabled });
                        }}
                        className={task.enabled ? "text-green-500" : "text-slate-600"}
                        title={task.enabled ? "Pause" : "Resume"}
                      >
                        {task.enabled ? <Play size={12} /> : <Pause size={12} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-300 truncate">{task.name}</div>
                        <div className="text-xs text-slate-600 truncate font-mono">
                          {formatInterval(task.intervalMinutes)} · {task.command}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTask(task.id);
                        }}
                        className="text-slate-700 hover:text-red-500"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right side - Task Editor */}
          <div className="w-1/2 flex flex-col">
            {isTaskFormOpen ? (
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Name</label>
                    <input
                      type="text"
                      value={taskName}
                      onChange={(e) => setTaskName(e.target.value)}
                      placeholder="e.g., Daily Status Check"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-slate-500"
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Type</label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setTaskType("cli")}
                        className={`flex-1 px-3 py-2 text-xs border ${
                          taskType === "cli"
                            ? "border-slate-500 text-slate-300 bg-slate-800"
                            : "border-slate-700 text-slate-500 hover:border-slate-600"
                        }`}
                      >
                        CLI Command
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaskType("prompt")}
                        className={`flex-1 px-3 py-2 text-xs border ${
                          taskType === "prompt"
                            ? "border-slate-500 text-slate-300 bg-slate-800"
                            : "border-slate-700 text-slate-500 hover:border-slate-600"
                        }`}
                      >
                        Prompt
                      </button>
                    </div>
                  </div>

                  {/* Command/Prompt */}
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">
                      {taskType === "cli" ? "Command" : "Prompt"}
                    </label>
                    <textarea
                      value={taskCommand}
                      onChange={(e) => setTaskCommand(e.target.value)}
                      placeholder={taskType === "cli" ? "e.g., npm run build" : "e.g., Check the project status"}
                      rows={3}
                      autoCorrect="off"
                      autoCapitalize="off"
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-slate-500 resize-none font-mono"
                    />
                  </div>

                  {/* Working Directory (CLI) or Conversation (Prompt) */}
                  {taskType === "cli" ? (
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Working Directory</label>
                      <input
                        type="text"
                        value={taskDirectory}
                        onChange={(e) => setTaskDirectory(e.target.value)}
                        placeholder="~ (home directory)"
                        autoCorrect="off"
                        autoCapitalize="off"
                        autoComplete="off"
                        spellCheck={false}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-slate-500 font-mono"
                      />
                      <p className="text-xs text-slate-600 mt-1">Leave empty to use home directory</p>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">Conversations (optional)</label>
                      <p className="text-xs text-slate-600 mb-2">Select conversations for context</p>
                      <div className="max-h-32 overflow-y-auto border border-slate-700 bg-slate-800">
                        {conversations.filter((c) => !c.closed).length === 0 ? (
                          <div className="text-xs text-slate-600 p-2">No open conversations</div>
                        ) : (
                          conversations.filter((c) => !c.closed).map((conv) => (
                            <label
                              key={conv.id}
                              className="flex items-center gap-2 px-3 py-2 hover:bg-slate-700 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={taskConversationIds.includes(conv.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setTaskConversationIds([...taskConversationIds, conv.id]);
                                  } else {
                                    setTaskConversationIds(taskConversationIds.filter((id) => id !== conv.id));
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

                  {/* Interval */}
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Run Every</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={taskInterval}
                        onChange={(e) => setTaskInterval(Math.max(1, parseInt(e.target.value) || 1))}
                        min={1}
                        className="w-24 px-3 py-2 bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-slate-500"
                      />
                      <span className="px-3 py-2 text-sm text-slate-400">minutes</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {[15, 30, 60, 360, 1440].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setTaskInterval(mins)}
                          className={`px-2 py-1 text-xs border ${
                            taskInterval === mins
                              ? "border-slate-500 text-slate-300"
                              : "border-slate-700 text-slate-500 hover:border-slate-600"
                          }`}
                        >
                          {mins < 60 ? `${mins}m` : mins < 1440 ? `${mins / 60}h` : "1d"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Enabled Toggle */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <button
                        type="button"
                        onClick={() => setTaskEnabled(!taskEnabled)}
                        className={`w-9 h-5 border rounded-full relative transition-colors flex-shrink-0 flex items-center ${
                          taskEnabled
                            ? "bg-green-800 border-green-600"
                            : "bg-slate-800 border-slate-700"
                        }`}
                      >
                        <span
                          className={`absolute left-0.5 w-3.5 h-3.5 bg-slate-300 rounded-full transition-transform ${
                            taskEnabled ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                      <span className="text-xs text-slate-400">Enabled</span>
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-6">
                  <button
                    onClick={resetTaskForm}
                    className="px-4 py-2 text-xs border border-slate-700 text-slate-400 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={handleSaveTask}
                    disabled={!taskName.trim() || !taskCommand.trim()}
                    className="px-4 py-2 text-xs border border-slate-500 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                  >
                    {editingTask ? "Save" : "Create"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-600 text-xs">
                <div className="text-center">
                  <Clock size={24} className="mx-auto mb-2 text-slate-700" />
                  <p>Select a task to edit</p>
                  <p className="text-slate-700 mt-1">or create a new one</p>
                </div>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
