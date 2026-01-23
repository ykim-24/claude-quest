import { useState } from "react";
import { X } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import type { Skill } from "@/types";

interface SkillModalProps {
  skill?: Skill | null;
  onSave: (skill: Omit<Skill, "id"> | Skill) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

// Skill icons
const skillIcons = [
  { value: "sword", icon: "⚔" },
  { value: "staff", icon: "⚗" },
  { value: "ring", icon: "◎" },
  { value: "book", icon: "◈" },
  { value: "shield", icon: "⛊" },
  { value: "potion", icon: "⚱" },
  { value: "scroll", icon: "⋈" },
  { value: "gem", icon: "◆" },
  { value: "wand", icon: "⚚" },
  { value: "helm", icon: "⛑" },
  { value: "arrow", icon: "➤" },
  { value: "orb", icon: "●" },
  { value: "star", icon: "★" },
  { value: "moon", icon: "☽" },
  { value: "sun", icon: "☀" },
  { value: "eye", icon: "◉" },
  { value: "heart", icon: "♥" },
  { value: "lightning", icon: "↯" },
  { value: "flame", icon: "♨" },
  { value: "leaf", icon: "❧" },
  { value: "skull", icon: "☠" },
  { value: "crown", icon: "♔" },
  { value: "anchor", icon: "⚓" },
  { value: "key", icon: "⚿" },
];

// Color palette
const colorPalette = [
  { value: "default", label: "Default", color: null },
  { value: "red", label: "Red", color: "#ef4444" },
  { value: "orange", label: "Orange", color: "#f97316" },
  { value: "amber", label: "Amber", color: "#f59e0b" },
  { value: "yellow", label: "Yellow", color: "#eab308" },
  { value: "lime", label: "Lime", color: "#84cc16" },
  { value: "green", label: "Green", color: "#22c55e" },
  { value: "emerald", label: "Emerald", color: "#10b981" },
  { value: "teal", label: "Teal", color: "#14b8a6" },
  { value: "cyan", label: "Cyan", color: "#06b6d4" },
  { value: "sky", label: "Sky", color: "#0ea5e9" },
  { value: "blue", label: "Blue", color: "#3b82f6" },
  { value: "indigo", label: "Indigo", color: "#6366f1" },
  { value: "violet", label: "Violet", color: "#8b5cf6" },
  { value: "purple", label: "Purple", color: "#a855f7" },
  { value: "fuchsia", label: "Fuchsia", color: "#d946ef" },
  { value: "pink", label: "Pink", color: "#ec4899" },
  { value: "rose", label: "Rose", color: "#f43f5e" },
];

export function getSkillIconDisplay(iconValue: string): string {
  const found = skillIcons.find(i => i.value === iconValue);
  return found?.icon || "◇";
}

export function SkillModal({ skill, onSave, onDelete, onClose }: SkillModalProps) {
  const [name, setName] = useState(skill?.name || "");
  const [description, setDescription] = useState(skill?.description || "");
  const [icon, setIcon] = useState(skill?.icon || "gem");
  const [color, setColor] = useState(skill?.color || "");
  const [effect, setEffect] = useState(skill?.effect || "");

  // Improve prompt state
  const [isImproving, setIsImproving] = useState(false);
  const [improvedEffect, setImprovedEffect] = useState<string | null>(null);

  const isEditing = !!skill?.id;

  const handleImprovePrompt = async () => {
    if (!effect.trim()) return;

    setIsImproving(true);

    try {
      const improveRequest = `You are a prompt engineering expert. Improve the following system prompt to be more effective, clear, and well-structured. Keep the same intent but make it better. Only output the improved prompt, nothing else.

Original prompt:
${effect}`;

      const result = await invoke<{ response: string; session_id: string | null }>("send_to_claude", {
        conversationId: "improve-prompt-" + Date.now(),
        message: improveRequest,
        systemPrompt: "You are a helpful assistant that improves prompts. Only output the improved prompt text, no explanations or markdown.",
        workingDirectory: null,
        integrations: null,
      });

      setImprovedEffect(result.response.trim());
    } catch (err) {
      console.error("Failed to improve prompt:", err);
    } finally {
      setIsImproving(false);
    }
  };

  const handleAcceptImproved = () => {
    if (improvedEffect) {
      setEffect(improvedEffect);
    }
    setImprovedEffect(null);
  };

  const handleRejectImproved = () => {
    setImprovedEffect(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: Omit<Skill, "id"> | Skill = {
      name,
      description,
      icon,
      color: color || undefined,
      effect,
      ...(isEditing ? { id: skill.id } : {}),
    };

    onSave(data as Skill);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-sm text-slate-300">
            {isEditing ? "Edit Skill" : "New Skill"}
          </h2>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-400">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs text-slate-500 block mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Debug Focus, Clarity"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-slate-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-slate-500 block mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of what this skill does"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-slate-500"
            />
          </div>

          {/* Icon */}
          <div>
            <label className="text-xs text-slate-500 block mb-1">Icon</label>
            <div className="grid grid-cols-8 gap-1 p-2 bg-slate-800 border border-slate-700 max-h-24 overflow-y-auto">
              {skillIcons.map((i) => (
                <button
                  key={i.value}
                  type="button"
                  onClick={() => setIcon(i.value)}
                  className={`w-7 h-7 flex items-center justify-center text-sm border ${
                    icon === i.value
                      ? "border-slate-400 text-slate-200 bg-slate-700"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                  style={color ? { color } : undefined}
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
                  onClick={() => setColor(c.color || "")}
                  className={`w-6 h-6 border ${
                    (color || "") === (c.color || "")
                      ? "border-white"
                      : "border-slate-600"
                  }`}
                  style={{ backgroundColor: c.color || "#334155" }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Effect (System Prompt) */}
          <div>
            <label className="text-xs text-slate-500 block mb-1">System Prompt</label>
            <textarea
              value={improvedEffect !== null ? improvedEffect : effect}
              onChange={(e) => {
                if (improvedEffect !== null) {
                  setImprovedEffect(e.target.value);
                } else {
                  setEffect(e.target.value);
                }
              }}
              placeholder="Instructions for Claude when this skill is equipped. e.g., 'Be concise and clear. Avoid unnecessary verbosity.'"
              rows={4}
              className={`w-full px-3 py-2 bg-slate-800 border text-slate-200 text-sm focus:outline-none resize-none ${
                improvedEffect !== null
                  ? "border-green-700"
                  : "border-slate-700 focus:border-slate-500"
              }`}
              required
              disabled={isImproving}
            />

            {/* Improve button or Accept/Cancel buttons */}
            <div className="flex items-center gap-2 mt-2">
              {improvedEffect !== null ? (
                <>
                  <span className="text-xs text-green-500">Improved</span>
                  <div className="flex-1" />
                  <button
                    type="button"
                    onClick={handleRejectImproved}
                    className="px-3 py-1 text-xs border border-slate-700 text-slate-400 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAcceptImproved}
                    className="px-3 py-1 text-xs border border-green-700 text-green-400 hover:bg-green-900/20"
                  >
                    Accept
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs text-slate-600 flex-1">
                    This text is passed to Claude as a system prompt when the skill is equipped.
                  </p>
                  <button
                    type="button"
                    onClick={handleImprovePrompt}
                    disabled={isImproving || !effect.trim()}
                    className="px-3 py-1 text-xs border border-slate-700 text-slate-400 hover:bg-slate-800 disabled:opacity-50"
                  >
                    {isImproving ? "Improving..." : "Improve"}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            {isEditing && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(skill.id);
                  onClose();
                }}
                className="px-4 py-2 text-xs border border-red-800 text-red-400 hover:bg-red-900/20"
              >
                Delete
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs border border-slate-700 text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs border border-slate-500 text-slate-300 hover:bg-slate-800"
            >
              {isEditing ? "Save" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
