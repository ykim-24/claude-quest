export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ConversationService {
  id: string;
  name: string;
  command: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  status: "idle" | "active" | "completed";
  createdAt: Date;
  updatedAt: Date;
  equippedSkills: string[];
  equippedIntegrations: string[];
  workingDirectory: string;
  character: string;
  lastSeenMessageCount: number;
  tokensUsed: number;
  closed?: boolean; // When true, conversation is locked and read-only
  services?: ConversationService[]; // Configured services for this conversation
  claudeSessionId?: string; // Claude CLI session ID for conversation continuity
}

export interface Character {
  id: string;
  name: string;
  image: string;
  isCustom?: boolean;
}

export interface CharacterCustomization {
  hat: string | null;
  hair: string | null;
  beard: string | null;
  top: string | null;
  accessory: string | null;
}

export interface PlayerCharacter {
  name: string;
  classId: string;
  color: string;
  customization: CharacterCustomization;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  color?: string;
  effect: string; // System prompt added when skill is equipped
}

export type IntegrationType = "mcp" | "api-key";

export interface Integration {
  id: string;
  name: string;
  description: string;
  type: IntegrationType;
  icon: string;
  color?: string;            // Custom color for the icon
  enabled: boolean;
  // MCP specific
  serverCommand?: string;    // e.g., "npx"
  serverArgs?: string[];     // e.g., ["@modelcontextprotocol/server-filesystem", "/path"]
  // API key specific
  serviceName?: string;      // e.g., "GitHub", "Linear"
  envVariable?: string;      // e.g., "GITHUB_TOKEN"
  apiKey?: string;           // The actual key value
}

export type CommandType = "prompt" | "cli";

export interface CustomCommand {
  id: string;
  name: string;           // Display name
  trigger: string;        // Slash command trigger (e.g., "summarize" for /summarize)
  type: CommandType;      // "prompt" sends to Claude, "cli" executes in terminal
  prompt: string;         // The prompt text or CLI command to execute
  icon: string;           // Icon identifier
  color: string;          // Hex color
  isQuickAction: boolean; // Show as button in chat UI
  scopedConversationIds?: string[]; // If set, only show in these conversations (empty = all)
}

export interface ScheduledTask {
  id: string;
  name: string;           // Display name
  type: "cli" | "prompt"; // Type of task
  command: string;        // CLI command or prompt text
  workingDirectory?: string; // Directory to run command in (for CLI)
  conversationIds?: string[]; // Conversations for context (for prompt type, optional)
  intervalMinutes: number; // How often to run (in minutes)
  enabled: boolean;       // Whether the task is active
  lastRun?: Date;         // Last time this task ran
  nextRun?: Date;         // Next scheduled run time
  lastOutput?: string;    // Output from last run
  lastStatus?: "success" | "error"; // Status of last run
  hasNewOutput?: boolean; // Whether there's unread output
}

export interface AppState {
  conversations: Conversation[];
  skills: Skill[];
  integrations: Integration[];
  customCommands: CustomCommand[];
  scheduledTasks: ScheduledTask[];
  characters: Character[];
  playerCharacter: PlayerCharacter | null;
  activeConversationId: string | null;
  totalTokensUsed: number;

  // Actions
  addConversation: (workingDirectory: string, title?: string) => void;
  setActiveConversation: (id: string | null) => void;
  addMessage: (conversationId: string, message: Omit<Message, "id" | "timestamp">) => void;
  addTokens: (conversationId: string, tokens: number) => void;
  equipSkill: (conversationId: string, skillId: string) => void;
  unequipSkill: (conversationId: string, skillId: string) => void;
  setPlayerCharacter: (character: PlayerCharacter) => void;
  renameConversation: (conversationId: string, title: string) => void;
  deleteConversation: (conversationId: string) => void;
  clearMessages: (conversationId: string) => void;
  // Skill actions
  addSkill: (skill: Omit<Skill, "id">) => void;
  updateSkill: (id: string, changes: Partial<Skill>) => void;
  deleteSkill: (id: string) => void;
  // Integration actions
  addIntegration: (integration: Omit<Integration, "id">) => void;
  updateIntegration: (id: string, changes: Partial<Integration>) => void;
  deleteIntegration: (id: string) => void;
  equipIntegration: (conversationId: string, integrationId: string) => void;
  unequipIntegration: (conversationId: string, integrationId: string) => void;
  // Custom command actions
  addCustomCommand: (command: Omit<CustomCommand, "id">) => void;
  updateCustomCommand: (id: string, changes: Partial<CustomCommand>) => void;
  deleteCustomCommand: (id: string) => void;
  // Scheduled task actions
  addScheduledTask: (task: Omit<ScheduledTask, "id">) => void;
  updateScheduledTask: (id: string, changes: Partial<ScheduledTask>) => void;
  deleteScheduledTask: (id: string) => void;
  // Conversation seen tracking
  markConversationSeen: (conversationId: string) => void;
  // Close/reopen conversations
  closeConversation: (conversationId: string) => void;
  reopenConversation: (conversationId: string) => void;
  // Service actions
  addService: (conversationId: string, service: Omit<ConversationService, "id">) => void;
  removeService: (conversationId: string, serviceId: string) => void;
  // Session ID for Claude conversation continuity
  setClaudeSessionId: (conversationId: string, sessionId: string) => void;
  // Set character for a conversation
  setCharacter: (conversationId: string, characterId: string) => void;
}
