import { useState } from "react";
import { X } from "lucide-react";
import type { Integration, IntegrationType } from "@/types";

interface IntegrationModalProps {
  integration?: Integration | null;
  onSave: (integration: Omit<Integration, "id"> | Integration) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

// Icon categories
const iconCategories = {
  icons: [
    // Services
    { value: "github", icon: "⌥" },
    { value: "linear", icon: "◫" },
    { value: "slack", icon: "◈" },
    { value: "discord", icon: "◆" },
    { value: "notion", icon: "▣" },
    { value: "figma", icon: "◎" },
    { value: "jira", icon: "◉" },
    { value: "stripe", icon: "◐" },
    // Tools
    { value: "folder", icon: "▤" },
    { value: "database", icon: "⛁" },
    { value: "api", icon: "↯" },
    { value: "key", icon: "⚿" },
    { value: "server", icon: "⬚" },
    { value: "cloud", icon: "☁" },
    { value: "terminal", icon: "▢" },
    { value: "code", icon: "◇" },
    { value: "git", icon: "⎇" },
    { value: "docker", icon: "▧" },
    { value: "kubernetes", icon: "⎈" },
    { value: "aws", icon: "△" },
    { value: "gcp", icon: "▲" },
    { value: "azure", icon: "◰" },
    // Symbols
    { value: "star", icon: "★" },
    { value: "star-outline", icon: "☆" },
    { value: "heart", icon: "♥" },
    { value: "heart-outline", icon: "♡" },
    { value: "diamond", icon: "♦" },
    { value: "spade", icon: "♠" },
    { value: "club", icon: "♣" },
    { value: "bolt", icon: "↯" },
    { value: "gear", icon: "⚙" },
    { value: "link", icon: "⛓" },
    { value: "lock", icon: "⚿" },
    { value: "globe", icon: "◉" },
    { value: "sun", icon: "☀" },
    { value: "moon", icon: "☽" },
    { value: "check", icon: "✓" },
    { value: "cross", icon: "✗" },
    { value: "plus", icon: "✚" },
    { value: "minus", icon: "−" },
    { value: "arrow-right", icon: "→" },
    { value: "arrow-left", icon: "←" },
    { value: "arrow-up", icon: "↑" },
    { value: "arrow-down", icon: "↓" },
    { value: "circle", icon: "●" },
    { value: "circle-outline", icon: "○" },
    { value: "square", icon: "■" },
    { value: "square-outline", icon: "□" },
    { value: "triangle", icon: "▲" },
    { value: "triangle-outline", icon: "△" },
    { value: "infinity", icon: "∞" },
    { value: "omega", icon: "Ω" },
    { value: "delta", icon: "Δ" },
    { value: "sigma", icon: "Σ" },
    { value: "lambda", icon: "λ" },
    { value: "pi", icon: "π" },
  ],
  letters: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(letter => ({
    value: `letter-${letter.toLowerCase()}`,
    icon: letter,
  })),
};

// Flatten all icons for lookup
const allIcons = [
  ...iconCategories.icons,
  ...iconCategories.letters,
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

export function getIconDisplay(iconValue: string): string {
  const found = allIcons.find(i => i.value === iconValue);
  return found?.icon || iconValue || "●";
}

export function IntegrationModal({ integration, onSave, onDelete, onClose }: IntegrationModalProps) {
  const [type, setType] = useState<IntegrationType>(integration?.type || "api-key");
  const [name, setName] = useState(integration?.name || "");
  const [description, setDescription] = useState(integration?.description || "");
  const [icon, setIcon] = useState(integration?.icon || "api");
  const [color, setColor] = useState(integration?.color || "");
  const [iconCategory, setIconCategory] = useState<"icons" | "letters">("icons");

  // API Key fields
  const [serviceName, setServiceName] = useState(integration?.serviceName || "");
  const [envVariable, setEnvVariable] = useState(integration?.envVariable || "");
  const [apiKey, setApiKey] = useState(integration?.apiKey || "");

  // MCP fields
  const [serverCommand, setServerCommand] = useState(integration?.serverCommand || "npx");
  const [serverArgs, setServerArgs] = useState(integration?.serverArgs?.join(" ") || "");

  const isEditing = !!integration?.id;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const base = {
      name,
      description,
      type,
      icon,
      color: color || undefined,
      enabled: true,
    };

    const data: Omit<Integration, "id"> | Integration = type === "api-key"
      ? {
          ...base,
          serviceName,
          envVariable,
          apiKey,
          ...(isEditing ? { id: integration.id } : {}),
        }
      : {
          ...base,
          serverCommand,
          serverArgs: serverArgs.split(" ").filter(Boolean),
          ...(isEditing ? { id: integration.id } : {}),
        };

    onSave(data as Integration);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-sm text-slate-300">
            {isEditing ? "Edit Integration" : "New Integration"}
          </h2>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-400">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Selection */}
          <div>
            <label className="text-xs text-slate-500 block mb-2">Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("api-key")}
                className={`flex-1 py-2 px-3 text-xs border ${
                  type === "api-key"
                    ? "border-amber-600 text-amber-400 bg-amber-900/20"
                    : "border-slate-700 text-slate-500"
                }`}
              >
                API Key
              </button>
              <button
                type="button"
                onClick={() => setType("mcp")}
                className={`flex-1 py-2 px-3 text-xs border ${
                  type === "mcp"
                    ? "border-cyan-600 text-cyan-400 bg-cyan-900/20"
                    : "border-slate-700 text-slate-500"
                }`}
              >
                MCP Server
              </button>
            </div>
          </div>

          {/* Common Fields */}
          <div>
            <label className="text-xs text-slate-500 block mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., GitHub, Linear, Filesystem"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-slate-500"
              required
            />
          </div>

          <div>
            <label className="text-xs text-slate-500 block mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this integration do?"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-slate-500"
            />
          </div>

          {/* Icon Selection */}
          <div>
            <label className="text-xs text-slate-500 block mb-1">Icon</label>
            {/* Category tabs */}
            <div className="flex gap-1 mb-2">
              {(["icons", "letters"] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setIconCategory(cat)}
                  className={`px-2 py-1 text-xs border ${
                    iconCategory === cat
                      ? "border-slate-500 text-slate-300"
                      : "border-slate-800 text-slate-600"
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
            {/* Icon grid */}
            <div className="grid grid-cols-9 gap-1 p-2 bg-slate-800 border border-slate-700 max-h-24 overflow-y-auto">
              {iconCategories[iconCategory].map((i) => (
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

          {/* Color Selection */}
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

          {/* API Key Fields */}
          {type === "api-key" && (
            <>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Service Name</label>
                <input
                  type="text"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="e.g., GitHub, OpenAI"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 block mb-1">Environment Variable</label>
                <input
                  type="text"
                  value={envVariable}
                  onChange={(e) => setEnvVariable(e.target.value)}
                  placeholder="e.g., GITHUB_TOKEN, OPENAI_API_KEY"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-slate-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 block mb-1">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-slate-500"
                />
                <p className="text-xs text-slate-600 mt-1">
                  Stored locally. Passed as env variable to Claude.
                </p>
              </div>
            </>
          )}

          {/* MCP Fields */}
          {type === "mcp" && (
            <>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Command</label>
                <input
                  type="text"
                  value={serverCommand}
                  onChange={(e) => setServerCommand(e.target.value)}
                  placeholder="e.g., npx, node, python"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-slate-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 block mb-1">Arguments</label>
                <input
                  type="text"
                  value={serverArgs}
                  onChange={(e) => setServerArgs(e.target.value)}
                  placeholder="e.g., -y @modelcontextprotocol/server-filesystem /"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-slate-200 text-sm focus:outline-none focus:border-slate-500"
                />
                <p className="text-xs text-slate-600 mt-1">
                  Space-separated arguments passed to the command.
                </p>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            {isEditing && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(integration.id);
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
              className={`px-4 py-2 text-xs border ${
                type === "api-key"
                  ? "border-amber-700 text-amber-400 hover:bg-amber-900/20"
                  : "border-cyan-700 text-cyan-400 hover:bg-cyan-900/20"
              }`}
            >
              {isEditing ? "Save" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
