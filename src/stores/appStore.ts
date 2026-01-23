import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";
import type { AppState, Conversation, Message, Character, PlayerCharacter } from "@/types";

// Custom storage using Tauri filesystem
const tauriStorage: StateStorage = {
  getItem: async (_name: string): Promise<string | null> => {
    try {
      const data = await invoke<string | null>("load_data");
      return data;
    } catch (e) {
      console.error("Failed to load data:", e);
      return null;
    }
  },
  setItem: async (_name: string, value: string): Promise<void> => {
    try {
      await invoke("save_data", { data: value });
    } catch (e) {
      console.error("Failed to save data:", e);
    }
  },
  removeItem: async (_name: string): Promise<void> => {
    try {
      await invoke("save_data", { data: "{}" });
    } catch (e) {
      console.error("Failed to remove data:", e);
    }
  },
};

const defaultCharacters: Character[] = [
  { id: "claude", name: "Claude", image: "/characters/claude.png" },
  { id: "wizard", name: "Wizard", image: "/characters/wizard.png" },
  { id: "knight", name: "Knight", image: "/characters/knight.png" },
  { id: "rogue", name: "Rogue", image: "/characters/rogue.png" },
];



export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      conversations: [],
      skills: [],
      integrations: [],
      customCommands: [],
      scheduledTasks: [],
      characters: defaultCharacters,
      playerCharacter: null,
      activeConversationId: null,
      totalTokensUsed: 0,

      addConversation: (workingDirectory: string, title?: string) => {
        const dirName = workingDirectory.split("/").pop() || "New Quest";
        const newConversation: Conversation = {
          id: crypto.randomUUID(),
          title: title || dirName,
          messages: [],
          status: "idle",
          createdAt: new Date(),
          updatedAt: new Date(),
          equippedSkills: [],
          equippedIntegrations: [],
          workingDirectory,
          character: "claude",
          lastSeenMessageCount: 0,
          tokensUsed: 0,
        };
        set((state) => ({
          conversations: [...state.conversations, newConversation],
          activeConversationId: newConversation.id,
        }));
      },

      setActiveConversation: (id) =>
        set((state) => ({
          activeConversationId: id,
          // Mark conversation as seen when opening
          conversations: id
            ? state.conversations.map((conv) =>
                conv.id === id
                  ? { ...conv, lastSeenMessageCount: conv.messages.length }
                  : conv
              )
            : state.conversations,
        })),

      addMessage: (conversationId, message) => {
        const newMessage: Message = {
          ...message,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        };
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  messages: [...conv.messages, newMessage],
                  updatedAt: new Date(),
                  status: "active" as const,
                }
              : conv
          ),
        }));
      },

      addTokens: (conversationId, tokens) =>
        set((state) => ({
          totalTokensUsed: state.totalTokensUsed + tokens,
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? { ...conv, tokensUsed: conv.tokensUsed + tokens }
              : conv
          ),
        })),

      equipSkill: (conversationId, skillId) =>
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  equippedSkills: [...new Set([...conv.equippedSkills, skillId])],
                }
              : conv
          ),
        })),

      unequipSkill: (conversationId, skillId) =>
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  equippedSkills: conv.equippedSkills.filter((id) => id !== skillId),
                }
              : conv
          ),
        })),

      setPlayerCharacter: (character: PlayerCharacter) =>
        set({ playerCharacter: character }),

      renameConversation: (conversationId: string, title: string) =>
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? { ...conv, title }
              : conv
          ),
        })),

      deleteConversation: (conversationId: string) =>
        set((state) => ({
          conversations: state.conversations.filter((conv) => conv.id !== conversationId),
          activeConversationId: state.activeConversationId === conversationId ? null : state.activeConversationId,
        })),

      clearMessages: (conversationId: string) =>
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? { ...conv, messages: [], tokensUsed: 0, claudeSessionId: undefined }
              : conv
          ),
        })),

      // Skill actions
      addSkill: (skill) =>
        set((state) => ({
          skills: [...state.skills, { ...skill, id: crypto.randomUUID() }],
        })),

      updateSkill: (id, changes) =>
        set((state) => ({
          skills: state.skills.map((skill) =>
            skill.id === id ? { ...skill, ...changes } : skill
          ),
        })),

      deleteSkill: (id) =>
        set((state) => ({
          skills: state.skills.filter((skill) => skill.id !== id),
          // Also remove from all conversations
          conversations: state.conversations.map((conv) => ({
            ...conv,
            equippedSkills: conv.equippedSkills.filter((skillId) => skillId !== id),
          })),
        })),

      // Integration actions
      addIntegration: (integration) =>
        set((state) => ({
          integrations: [...state.integrations, { ...integration, id: crypto.randomUUID() }],
        })),

      updateIntegration: (id, changes) =>
        set((state) => ({
          integrations: state.integrations.map((int) =>
            int.id === id ? { ...int, ...changes } : int
          ),
        })),

      deleteIntegration: (id) =>
        set((state) => ({
          integrations: state.integrations.filter((int) => int.id !== id),
          // Also remove from all conversations
          conversations: state.conversations.map((conv) => ({
            ...conv,
            equippedIntegrations: conv.equippedIntegrations.filter((intId) => intId !== id),
          })),
        })),

      equipIntegration: (conversationId, integrationId) =>
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  equippedIntegrations: [...new Set([...conv.equippedIntegrations, integrationId])],
                }
              : conv
          ),
        })),

      unequipIntegration: (conversationId, integrationId) =>
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  equippedIntegrations: conv.equippedIntegrations.filter((id) => id !== integrationId),
                }
              : conv
          ),
        })),

      // Custom command actions
      addCustomCommand: (command) =>
        set((state) => ({
          customCommands: [...state.customCommands, { ...command, id: crypto.randomUUID() }],
        })),

      updateCustomCommand: (id, changes) =>
        set((state) => ({
          customCommands: state.customCommands.map((cmd) =>
            cmd.id === id ? { ...cmd, ...changes } : cmd
          ),
        })),

      deleteCustomCommand: (id) =>
        set((state) => ({
          customCommands: state.customCommands.filter((cmd) => cmd.id !== id),
        })),

      // Scheduled task actions
      addScheduledTask: (task) =>
        set((state) => ({
          scheduledTasks: [...state.scheduledTasks, { ...task, id: crypto.randomUUID() }],
        })),

      updateScheduledTask: (id, changes) =>
        set((state) => ({
          scheduledTasks: state.scheduledTasks.map((task) =>
            task.id === id ? { ...task, ...changes } : task
          ),
        })),

      deleteScheduledTask: (id) =>
        set((state) => ({
          scheduledTasks: state.scheduledTasks.filter((task) => task.id !== id),
        })),

      markConversationSeen: (conversationId) =>
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? { ...conv, lastSeenMessageCount: conv.messages.length }
              : conv
          ),
        })),

      closeConversation: (conversationId) =>
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? { ...conv, closed: true }
              : conv
          ),
          // Also deselect if it was active
          activeConversationId: state.activeConversationId === conversationId ? null : state.activeConversationId,
        })),

      reopenConversation: (conversationId) =>
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? { ...conv, closed: false }
              : conv
          ),
        })),

      addService: (conversationId, service) =>
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  services: [
                    ...(conv.services || []),
                    { ...service, id: crypto.randomUUID() },
                  ],
                }
              : conv
          ),
        })),

      removeService: (conversationId, serviceId) =>
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  services: (conv.services || []).filter((s) => s.id !== serviceId),
                }
              : conv
          ),
        })),

      setClaudeSessionId: (conversationId, sessionId) =>
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? { ...conv, claudeSessionId: sessionId }
              : conv
          ),
        })),

      setCharacter: (conversationId, characterId) =>
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? { ...conv, character: characterId }
              : conv
          ),
        })),
    }),
    {
      name: "claude-quest-storage",
      storage: createJSONStorage(() => tauriStorage),
      // Migration to handle old data format
      migrate: (persistedState: unknown, _version: number) => {
        const state = persistedState as Record<string, unknown>;

        // Migrate inventory -> skills
        if (state.inventory && !state.skills) {
          state.skills = state.inventory;
          delete state.inventory;
        }

        // Migrate conversations with equippedItems -> equippedSkills
        if (Array.isArray(state.conversations)) {
          state.conversations = state.conversations.map((conv: Record<string, unknown>) => {
            if (conv.equippedItems && !conv.equippedSkills) {
              conv.equippedSkills = conv.equippedItems;
              delete conv.equippedItems;
            }
            // Ensure equippedSkills exists
            if (!conv.equippedSkills) {
              conv.equippedSkills = [];
            }
            // Ensure equippedIntegrations exists
            if (!conv.equippedIntegrations) {
              conv.equippedIntegrations = [];
            }
            // Ensure lastSeenMessageCount exists (default to current message count = no unread)
            if (conv.lastSeenMessageCount === undefined) {
              const messages = conv.messages as unknown[];
              conv.lastSeenMessageCount = messages?.length || 0;
            }
            // Ensure tokensUsed exists
            if (conv.tokensUsed === undefined) {
              conv.tokensUsed = 0;
            }
            return conv;
          });
        }

        // Ensure totalTokensUsed exists
        if (state.totalTokensUsed === undefined) {
          state.totalTokensUsed = 0;
        }

        // Ensure integrations exist
        if (!state.integrations) {
          state.integrations = [];
        }

        // Ensure skills exist
        if (!state.skills) {
          state.skills = [];
        }

        // Ensure customCommands exist
        if (!state.customCommands) {
          state.customCommands = [];
        }

        // Ensure scheduledTasks exist
        if (!state.scheduledTasks) {
          state.scheduledTasks = [];
        }

        return state;
      },
      version: 7,
    }
  )
);
