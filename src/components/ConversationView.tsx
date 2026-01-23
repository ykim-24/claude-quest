import { useState, useRef, useEffect, useMemo, memo } from "react";
import { X, Plus, Lock, Unlock } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { useClaude } from "@/hooks/useClaude";
import { PixelCharacter } from "./PixelCharacter";
import { IntegrationModal, getIconDisplay } from "./IntegrationModal";
import { SkillModal, getSkillIconDisplay } from "./SkillModal";
import { ContextMenu } from "./ContextMenu";
import { getCommandIconDisplay } from "./SettingsPanel";
import { Markdown } from "./Markdown";
import { Terminal } from "./Terminal";
import { Services } from "./Services";
import { Tooltip } from "./Tooltip";
import type { Conversation, Integration, Skill } from "@/types";

interface ConversationViewProps {
  conversation: Conversation;
  onClose: () => void;
}

// Static array - moved outside component to avoid recreation
const builtInCommands = [
  { trigger: "clear", name: "Clear conversation", type: "builtin" as const },
  { trigger: "help", name: "Show help", type: "builtin" as const },
  { trigger: "status", name: "Quest status", type: "builtin" as const },
  { trigger: "summary", name: "Summarize conversation", type: "builtin" as const },
  { trigger: "review", name: "Review code changes", type: "builtin" as const },
];

// Memoized message component - prevents re-rendering all messages on every keystroke
const MessageItem = memo(function MessageItem({ role, content }: { role: string; content: string }) {
  return (
    <div className="text-sm">
      <span className="text-slate-600">{role === "user" ? "You" : "Claude"}:</span>
      <div className="text-slate-300 mt-1 ml-2 break-words">
        {role === "assistant" ? (
          <Markdown content={content} />
        ) : (
          <pre className="whitespace-pre-wrap break-words font-sans">{content}</pre>
        )}
      </div>
    </div>
  );
});

export function ConversationView({ conversation, onClose }: ConversationViewProps) {
  const [input, setInput] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(conversation.title);
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [skillContextMenu, setSkillContextMenu] = useState<{ x: number; y: number; skill: Skill } | null>(null);
  const [integrationContextMenu, setIntegrationContextMenu] = useState<{ x: number; y: number; integration: Integration } | null>(null);
  const [autocompleteIndex, setAutocompleteIndex] = useState(0);
  const {
    addMessage,
    skills,
    integrations,
    customCommands,
    playerCharacter,
    totalTokensUsed,
    equipSkill,
    unequipSkill,
    addSkill,
    updateSkill,
    deleteSkill,
    equipIntegration,
    unequipIntegration,
    addIntegration,
    updateIntegration,
    deleteIntegration,
    renameConversation,
    clearMessages,
    closeConversation,
    reopenConversation,
    setClaudeSessionId,
  } = useAppStore();
  const { sendMessage, isLoading, streamingContent, thinking, clearStreaming } = useClaude(conversation.id);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Memoize filtered skills - only recompute when skills or equipped list changes
  const equippedSkills = useMemo(() =>
    skills.filter((skill) => conversation.equippedSkills.includes(skill.id)),
    [skills, conversation.equippedSkills]
  );

  const unequippedSkills = useMemo(() =>
    skills.filter((skill) => !conversation.equippedSkills.includes(skill.id)),
    [skills, conversation.equippedSkills]
  );

  // Memoize scoped commands - only recompute when commands or conversation changes
  const scopedCommands = useMemo(() =>
    customCommands.filter((cmd) =>
      !cmd.scopedConversationIds ||
      cmd.scopedConversationIds.length === 0 ||
      cmd.scopedConversationIds.includes(conversation.id)
    ),
    [customCommands, conversation.id]
  );

  const quickActions = useMemo(() =>
    scopedCommands.filter((cmd) => cmd.isQuickAction),
    [scopedCommands]
  );

  // Memoize all commands list
  const allCommands = useMemo(() => [
    ...builtInCommands,
    ...scopedCommands.map(cmd => ({ trigger: cmd.trigger, name: cmd.name, type: cmd.type })),
  ], [scopedCommands]);

  // Memoize filtered commands - depends on input for autocomplete
  const filteredCommands = useMemo(() => {
    if (!input.startsWith("/")) return [];
    const query = input.slice(1).toLowerCase();
    if (query === "") return allCommands;
    return allCommands.filter(cmd => cmd.trigger.toLowerCase().startsWith(query));
  }, [input, allCommands]);

  // Memoize integrations filtering
  const equippedIntegrations = useMemo(() =>
    integrations.filter((int) => conversation.equippedIntegrations.includes(int.id)),
    [integrations, conversation.equippedIntegrations]
  );

  const unequippedIntegrations = useMemo(() =>
    integrations.filter((int) => !conversation.equippedIntegrations.includes(int.id) && int.enabled),
    [integrations, conversation.equippedIntegrations]
  );

  // Memoize system prompt - only rebuild when equipped skills/integrations change
  const systemPrompt = useMemo(() => {
    const parts: string[] = [];

    // Base instructions - always included
    parts.push(`## Output Format for Code Changes
When making changes to files, always output a summary of the changes in diff format, grouped by file name:

### filename.ext
\`\`\`diff
- removed line
+ added line
\`\`\`

### another-file.ext
\`\`\`diff
- old code
+ new code
\`\`\`

This helps the user quickly see what was modified.

## Style Guidelines
- Do NOT use emojis. Use ASCII symbols only (e.g., *, -, >, #, =, +, etc.)
- Keep output clean and terminal-friendly`);

    // Add skill effects
    if (equippedSkills.length > 0) {
      parts.push(equippedSkills.map((skill) => skill.effect).join("\n"));
    }

    // Add API key integration instructions
    const apiKeyIntegrations = equippedIntegrations.filter(int => int.type === "api-key" && int.apiKey);
    if (apiKeyIntegrations.length > 0) {
      const serviceNames = apiKeyIntegrations.map(int => int.serviceName || int.name);
      const integrationInstructions = apiKeyIntegrations.map(int => {
        const serviceName = int.serviceName || int.name;
        return `- ${serviceName}: API key available in environment variable $${int.envVariable}`;
      }).join("\n");

      parts.push(`\n## API Key Integrations\n${integrationInstructions}\n\nIMPORTANT: Use Node.js with fetch() for HTTP requests (curl is blocked). Example:
\`\`\`bash
node -e "fetch('https://api.example.com/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': process.env.API_KEY },
  body: JSON.stringify({ query: '...' })
}).then(r => r.json()).then(console.log)"
\`\`\`
Do NOT use curl or MCP tools for ${serviceNames.join(", ")}.`);
    }

    return parts.length > 0 ? parts.join("\n\n") : undefined;
  }, [equippedSkills, equippedIntegrations]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation.messages, streamingContent]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    let userMessage = input.trim();
    setInput("");

    // Check for built-in commands first
    if (userMessage.startsWith("/")) {
      const commandTrigger = userMessage.slice(1).split(/\s/)[0].toLowerCase();

      // Built-in commands
      if (commandTrigger === "clear") {
        clearMessages(conversation.id);
        return;
      }

      if (commandTrigger === "help") {
        const customCmds = scopedCommands.map(cmd => `  /${cmd.trigger} - ${cmd.name}${cmd.type === "cli" ? " (CLI)" : ""}`).join("\n");
        const helpText = `**Commands:**
  /clear - Clear conversation history
  /help - Show this help
  /status - Show quest info
  /summary - Summarize conversation
  /review - Review recent changes

**Custom Commands:**
${customCmds || "  (none)"}`;
        addMessage(conversation.id, { role: "assistant", content: helpText });
        return;
      }

      if (commandTrigger === "status") {
        const skillNames = equippedSkills.map(s => s.name).join(", ") || "none";
        const integrationNames = equippedIntegrations.map(i => i.name).join(", ") || "none";
        const statusText = `**Quest Status:**
- **Title:** ${conversation.title}
- **Directory:** ${conversation.workingDirectory}
- **Messages:** ${conversation.messages.length}
- **Skills:** ${skillNames}
- **Integrations:** ${integrationNames}`;
        addMessage(conversation.id, { role: "assistant", content: statusText });
        return;
      }

      // Prompt-based commands (since Claude CLI commands don't work in --print mode)
      const promptCommands: Record<string, string> = {
        summary: "Please provide a concise summary of our conversation so far.",
        review: "Please review the recent code changes in this project and provide feedback.",
        compact: "Please provide a concise summary of our conversation so far.",
      };
      if (promptCommands[commandTrigger]) {
        userMessage = promptCommands[commandTrigger];
      }

      // Custom commands (only scoped ones)
      const matchedCommand = scopedCommands.find((cmd) => cmd.trigger === commandTrigger);
      if (matchedCommand) {
        const restOfMessage = userMessage.slice(1 + commandTrigger.length).trim();
        // Show command name in chat, but send actual prompt to Claude
        const displayMessage = restOfMessage ? `/${matchedCommand.trigger} ${restOfMessage}` : `/${matchedCommand.trigger}`;
        addMessage(conversation.id, { role: "user", content: displayMessage });

        if (matchedCommand.type === "cli") {
          const cliCommand = restOfMessage
            ? `${matchedCommand.prompt} ${restOfMessage}`
            : matchedCommand.prompt;
          userMessage = `Run this command: ${cliCommand}`;
        } else {
          userMessage = restOfMessage
            ? `${matchedCommand.prompt} ${restOfMessage}`
            : matchedCommand.prompt;
        }

        // Send to Claude (message already added above)
        try {
          const result = await sendMessage(
            userMessage,
            systemPrompt,
            conversation.workingDirectory,
            equippedIntegrations.length > 0 ? equippedIntegrations : undefined,
            conversation.claudeSessionId
          );
          clearStreaming();
          if (result.sessionId) {
            setClaudeSessionId(conversation.id, result.sessionId);
          }
          addMessage(conversation.id, { role: "assistant", content: result.response });
        } catch (err) {
          clearStreaming();
          addMessage(conversation.id, {
            role: "assistant",
            content: `Error: ${err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err)}`,
          });
        }
        return;
      }
    }

    addMessage(conversation.id, { role: "user", content: userMessage });

    try {
      const result = await sendMessage(
        userMessage,
        systemPrompt,
        conversation.workingDirectory,
        equippedIntegrations.length > 0 ? equippedIntegrations : undefined,
        conversation.claudeSessionId
      );
      clearStreaming();
      if (result.sessionId) {
        setClaudeSessionId(conversation.id, result.sessionId);
      }
      addMessage(conversation.id, { role: "assistant", content: result.response });
    } catch (err) {
      clearStreaming();
      const errorMsg = err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err);
      addMessage(conversation.id, {
        role: "assistant",
        content: `Error: ${errorMsg}`,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Autocomplete navigation
    if (filteredCommands.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setAutocompleteIndex(i => (i + 1) % filteredCommands.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setAutocompleteIndex(i => (i - 1 + filteredCommands.length) % filteredCommands.length);
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
        e.preventDefault();
        const selected = filteredCommands[autocompleteIndex];
        if (selected) {
          setInput(`/${selected.trigger} `);
          setAutocompleteIndex(0);
        }
        return;
      }
      if (e.key === "Escape") {
        setInput("");
        setAutocompleteIndex(0);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleQuickAction = async (command: typeof customCommands[0]) => {
    if (isLoading) return;

    // Show command trigger in chat
    const displayMessage = `/${command.trigger}`;

    // Build actual message to send to Claude
    let actualMessage: string;
    if (command.type === "cli") {
      actualMessage = `Run this command: ${command.prompt}`;
    } else {
      actualMessage = command.prompt;
    }

    addMessage(conversation.id, { role: "user", content: displayMessage });

    try {
      const result = await sendMessage(
        actualMessage,
        systemPrompt,
        conversation.workingDirectory,
        equippedIntegrations.length > 0 ? equippedIntegrations : undefined,
        conversation.claudeSessionId
      );
      clearStreaming();
      if (result.sessionId) {
        setClaudeSessionId(conversation.id, result.sessionId);
      }
      addMessage(conversation.id, { role: "assistant", content: result.response });
    } catch (err) {
      clearStreaming();
      addMessage(conversation.id, {
        role: "assistant",
        content: `Error: ${err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err)}`,
      });
    }
  };

  const handleEquipSkill = (skillId: string) => {
    equipSkill(conversation.id, skillId);
  };

  const handleUnequipSkill = (skillId: string) => {
    unequipSkill(conversation.id, skillId);
  };

  const handleEquipIntegration = (integrationId: string) => {
    if (equippedIntegrations.length < 4) {
      equipIntegration(conversation.id, integrationId);
    }
  };

  const handleUnequipIntegration = (integrationId: string) => {
    unequipIntegration(conversation.id, integrationId);
  };

  const handleSaveIntegration = (integration: Omit<Integration, "id"> | Integration) => {
    if ("id" in integration && integration.id) {
      updateIntegration(integration.id, integration);
    } else {
      addIntegration(integration);
    }
  };

  const handleEditIntegration = (integration: Integration) => {
    setEditingIntegration(integration);
    setShowIntegrationModal(true);
  };

  const handleAddIntegration = () => {
    setEditingIntegration(null);
    setShowIntegrationModal(true);
  };

  const handleSaveSkill = (skill: Omit<Skill, "id"> | Skill) => {
    if ("id" in skill && skill.id) {
      updateSkill(skill.id, skill);
    } else {
      addSkill(skill);
    }
  };

  const handleEditSkill = (skill: Skill) => {
    setEditingSkill(skill);
    setShowSkillModal(true);
  };

  const handleAddSkill = () => {
    setEditingSkill(null);
    setShowSkillModal(true);
  };

  const handleTitleClick = () => {
    setEditedTitle(conversation.title);
    setIsEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  };

  const handleTitleSave = () => {
    if (editedTitle.trim()) {
      renameConversation(conversation.id, editedTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleTitleSave();
    } else if (e.key === "Escape") {
      setIsEditingTitle(false);
      setEditedTitle(conversation.title);
    }
  };

  return (
    <div className={`fixed inset-4 z-50 flex bg-slate-950 border ${conversation.closed ? "border-amber-900" : "border-slate-700"}`}>
      {/* Header buttons */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        {conversation.closed ? (
          <button
            onClick={() => reopenConversation(conversation.id)}
            className="text-amber-600 hover:text-amber-400 flex items-center gap-1"
            title="Reopen conversation"
          >
            <Unlock size={14} />
            <span className="text-xs">Reopen</span>
          </button>
        ) : (
          <button
            onClick={() => closeConversation(conversation.id)}
            className="text-slate-600 hover:text-slate-400"
            title="Close and lock conversation"
          >
            <Lock size={14} />
          </button>
        )}
        <button onClick={onClose} className="text-slate-600 hover:text-slate-400">
          <X size={16} />
        </button>
      </div>

      {/* Left side - Character + Skills */}
      <div className="w-1/4 border-r border-slate-700 p-4 flex flex-col overflow-hidden">
        {isEditingTitle ? (
          <input
            ref={titleInputRef}
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={handleTitleKeyDown}
            className="text-xs text-slate-300 mb-1 bg-transparent border border-slate-600 px-1 focus:outline-none"
          />
        ) : (
          <div
            onClick={handleTitleClick}
            className="text-xs text-slate-600 mb-1 cursor-pointer"
            title="Click to rename"
          >
            {conversation.title}
          </div>
        )}
        <div className="text-xs text-slate-700 mb-2 truncate" title={conversation.workingDirectory}>
          {conversation.workingDirectory}
        </div>

        {/* Character + Equipped skills row */}
        <div className="flex items-start gap-2 py-4">
          {/* Equipped slots - vertical */}
          <div className="flex flex-col gap-1">
            {[...Array(5)].map((_, i) => {
              const skill = equippedSkills[i];
              return (
                <Tooltip
                  key={i}
                  content={skill ? (
                    <div>
                      <div className="font-medium text-slate-100 mb-1">{skill.name}</div>
                      <div className="text-slate-400">{skill.effect}</div>
                    </div>
                  ) : null}
                >
                  {({ onMouseEnter, onMouseLeave, ref }) => (
                    <div
                      ref={ref}
                      onMouseEnter={onMouseEnter}
                      onMouseLeave={onMouseLeave}
                      onClick={() => skill && handleUnequipSkill(skill.id)}
                      className={`w-10 h-10 border flex items-center justify-center text-base cursor-pointer hover:bg-slate-800/50 ${
                        skill ? "border-slate-600" : "border-slate-800 text-slate-800"
                      }`}
                      style={skill?.color ? { color: skill.color } : skill ? { color: "#cbd5e1" } : undefined}
                    >
                      {skill ? getSkillIconDisplay(skill.icon) : "·"}
                    </div>
                  )}
                </Tooltip>
              );
            })}
          </div>

          {/* Character image - pixel art */}
          <div className="flex flex-col items-center">
            <div
              className="border-2 flex items-center justify-center"
              style={{ borderColor: playerCharacter?.color || "#1e293b" }}
            >
              {playerCharacter ? (
                <PixelCharacter
                  classId={playerCharacter.classId}
                  customization={playerCharacter.customization}
                  color={playerCharacter.color}
                  size={144}
                />
              ) : (
                <div className="w-36 h-36 flex items-center justify-center">
                  <span className="text-slate-700 text-xs">No Character</span>
                </div>
              )}
            </div>
            {playerCharacter && (
              <span
                className="text-xs mt-1"
                style={{ color: playerCharacter.color }}
              >
                {playerCharacter.name}
              </span>
            )}
          </div>

          {/* MCP/Integrations slots - 2x2 grid */}
          <div className="grid grid-cols-2 gap-1">
            {[...Array(4)].map((_, i) => {
              const integration = equippedIntegrations[i];
              const defaultColor = integration?.type === "mcp" ? "#22d3ee" : "#fbbf24";
              return (
                <Tooltip
                  key={i}
                  content={integration ? (
                    <div>
                      <div className="font-medium text-slate-100 mb-1">{integration.name}</div>
                      <div className="text-slate-400">{integration.description}</div>
                    </div>
                  ) : null}
                >
                  {({ onMouseEnter, onMouseLeave, ref }) => (
                    <div
                      ref={ref}
                      onMouseEnter={onMouseEnter}
                      onMouseLeave={onMouseLeave}
                      onClick={() => integration && handleUnequipIntegration(integration.id)}
                      className={`w-14 h-14 border flex items-center justify-center text-xl cursor-pointer hover:bg-slate-800/50 ${
                        integration
                          ? integration.type === "mcp"
                            ? "border-cyan-700"
                            : "border-amber-700"
                          : "border-slate-800 text-slate-800"
                      }`}
                      style={integration ? { color: integration.color || defaultColor } : undefined}
                    >
                      {integration ? getIconDisplay(integration.icon) : "·"}
                    </div>
                  )}
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* Skills section */}
        <div className="border-t border-slate-800 pt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-slate-500">Skills</div>
            <button
              onClick={handleAddSkill}
              className="text-slate-600 hover:text-slate-400"
              title="Add skill"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {unequippedSkills.map((skill) => (
              <Tooltip
                key={skill.id}
                content={
                  <div>
                    <div className="font-medium text-slate-100 mb-1">{skill.name}</div>
                    <div className="text-slate-400">{skill.effect}</div>
                  </div>
                }
              >
                {({ onMouseEnter, onMouseLeave, ref }) => (
                  <div
                    ref={ref}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    onClick={() => handleEquipSkill(skill.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setSkillContextMenu({ x: e.clientX, y: e.clientY, skill });
                    }}
                    className="w-12 h-12 border border-slate-800 flex items-center justify-center text-xl cursor-pointer text-slate-500 hover:text-slate-300 hover:border-slate-600 hover:bg-slate-800/50"
                    style={skill.color ? { color: skill.color } : undefined}
                  >
                    {getSkillIconDisplay(skill.icon)}
                  </div>
                )}
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Integrations section */}
        <div className="flex-1 overflow-y-auto border-t border-slate-800 pt-3 mt-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-slate-500">Integrations</div>
            <button
              onClick={handleAddIntegration}
              className="text-slate-600 hover:text-slate-400"
              title="Add integration"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {unequippedIntegrations.map((integration) => {
              const defaultColor = integration.type === "mcp" ? "#0891b2" : "#d97706";
              const hoverColor = integration.type === "mcp" ? "#22d3ee" : "#fbbf24";
              return (
                <Tooltip
                  key={integration.id}
                  content={
                    <div>
                      <div className="font-medium text-slate-100 mb-1">{integration.name}</div>
                      <div className="text-slate-400">{integration.description}</div>
                    </div>
                  }
                >
                  {({ onMouseEnter, onMouseLeave, ref }) => (
                    <div
                      ref={ref}
                      onClick={() => handleEquipIntegration(integration.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setIntegrationContextMenu({ x: e.clientX, y: e.clientY, integration });
                      }}
                      className={`w-12 h-12 border flex items-center justify-center text-xl cursor-pointer transition-colors hover:bg-slate-800/50 ${
                        integration.type === "mcp"
                          ? "border-cyan-900 hover:border-cyan-700"
                          : "border-amber-900 hover:border-amber-700"
                      }`}
                      style={{ color: integration.color || defaultColor }}
                      onMouseEnter={(e) => {
                        onMouseEnter();
                        if (!integration.color) {
                          e.currentTarget.style.color = hoverColor;
                        }
                      }}
                      onMouseLeave={(e) => {
                        onMouseLeave();
                        if (!integration.color) {
                          e.currentTarget.style.color = defaultColor;
                        }
                      }}
                    >
                      {getIconDisplay(integration.icon)}
                    </div>
                  )}
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* Services */}
        <Services conversation={conversation} />

        {/* Terminal */}
        <Terminal
          workingDirectory={conversation.workingDirectory}
          currentTokens={conversation.tokensUsed}
          totalTokens={totalTokensUsed}
        />
      </div>

      {/* Integration Modal */}
      {showIntegrationModal && (
        <IntegrationModal
          integration={editingIntegration}
          onSave={handleSaveIntegration}
          onDelete={deleteIntegration}
          onClose={() => {
            setShowIntegrationModal(false);
            setEditingIntegration(null);
          }}
        />
      )}

      {/* Skill Modal */}
      {showSkillModal && (
        <SkillModal
          skill={editingSkill}
          onSave={handleSaveSkill}
          onDelete={deleteSkill}
          onClose={() => {
            setShowSkillModal(false);
            setEditingSkill(null);
          }}
        />
      )}

      {/* Skill Context Menu */}
      {skillContextMenu && (
        <ContextMenu
          x={skillContextMenu.x}
          y={skillContextMenu.y}
          items={[
            {
              label: "Edit",
              onClick: () => handleEditSkill(skillContextMenu.skill),
            },
            {
              label: "Delete",
              onClick: () => deleteSkill(skillContextMenu.skill.id),
              danger: true,
            },
          ]}
          onClose={() => setSkillContextMenu(null)}
        />
      )}

      {/* Integration Context Menu */}
      {integrationContextMenu && (
        <ContextMenu
          x={integrationContextMenu.x}
          y={integrationContextMenu.y}
          items={[
            {
              label: "Edit",
              onClick: () => handleEditIntegration(integrationContextMenu.integration),
            },
            {
              label: "Delete",
              onClick: () => deleteIntegration(integrationContextMenu.integration.id),
              danger: true,
            },
          ]}
          onClose={() => setIntegrationContextMenu(null)}
        />
      )}

      {/* Right side - Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {conversation.messages.length === 0 && !isLoading && (
            <div className="text-slate-600 text-sm">
              Begin your quest...
            </div>
          )}

          {conversation.messages.map((msg) => (
            <MessageItem key={msg.id} role={msg.role} content={msg.content} />
          ))}

          {isLoading && conversation.messages[conversation.messages.length - 1]?.role !== "assistant" && (
            <div className="text-sm">
              <span className="text-slate-600">Claude:</span>
              <div className="mt-1 ml-2">
                <div className="text-slate-500 text-xs italic">
                  {thinking || "thinking..."}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className={`border-t ${conversation.closed ? "border-amber-900" : "border-slate-700"}`}>
          {/* Closed conversation notice */}
          {conversation.closed ? (
            <div className="p-4 flex items-center justify-center gap-2 text-amber-600">
              <Lock size={14} />
              <span className="text-sm">This conversation is closed</span>
            </div>
          ) : (
            <>
            {/* Quick Actions */}
            {quickActions.length > 0 && (
              <div className="flex flex-wrap gap-1 px-4 pt-3">
                {quickActions.map((cmd) => (
                  <button
                    key={cmd.id}
                    onClick={() => handleQuickAction(cmd)}
                    disabled={isLoading}
                    className="flex items-center gap-1 px-2 py-1 text-xs border border-slate-700 hover:border-slate-600 disabled:opacity-50 leading-none"
                    style={{ color: cmd.color }}
                    title={cmd.prompt}
                  >
                    <span className="flex items-center">{getCommandIconDisplay(cmd.icon)}</span>
                    <span className="flex items-center">{cmd.name}</span>
                  </button>
                ))}
              </div>
            )}

          <form onSubmit={handleSubmit} className="p-4 relative">
            {/* Autocomplete dropdown */}
            {filteredCommands.length > 0 && (
              <div className="absolute bottom-full left-4 right-4 mb-1 bg-slate-900 border border-slate-700 max-h-48 overflow-y-auto">
                {filteredCommands.map((cmd, i) => (
                  <div
                    key={cmd.trigger}
                    onClick={() => {
                      setInput(`/${cmd.trigger} `);
                      setAutocompleteIndex(0);
                      inputRef.current?.focus();
                    }}
                    className={`px-3 py-2 cursor-pointer flex items-center justify-between ${
                      i === autocompleteIndex ? "bg-slate-800" : "hover:bg-slate-800"
                    }`}
                  >
                    <span className="text-sm">
                      <span className="text-slate-400">/</span>
                      <span className="text-slate-200">{cmd.trigger}</span>
                    </span>
                    <span className="text-xs text-slate-500">{cmd.name}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setAutocompleteIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Describe your story..."
                disabled={isLoading}
                rows={2}
                className="flex-1 px-3 py-2 bg-transparent border border-slate-700 text-slate-100 placeholder-slate-600 text-sm resize-none focus:outline-none"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-4 border border-slate-700 text-sm disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </form>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
