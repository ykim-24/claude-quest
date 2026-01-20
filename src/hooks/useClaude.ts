import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Integration } from "@/types";
import { useAppStore } from "@/stores/appStore";

interface ClaudeResponse {
  content: string;
  is_complete: boolean;
  thinking?: string;
  tokens_used?: number;
}

interface IntegrationConfig {
  id: string;
  name: string;
  type: string;
  server_command?: string;
  server_args?: string[];
  env_variable?: string;
  api_key?: string;
}

export function useClaude(conversationId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [thinking, setThinking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const unlistenRef = useRef<UnlistenFn | null>(null);
  const addTokens = useAppStore((state) => state.addTokens);

  useEffect(() => {
    // Set up event listener for streaming responses
    const setupListener = async () => {
      unlistenRef.current = await listen<ClaudeResponse>(
        `claude-response-${conversationId}`,
        (event) => {
          if (event.payload.is_complete) {
            setIsLoading(false);
            setStreamingContent("");
            setThinking(null);
            // Track tokens when response is complete
            if (event.payload.tokens_used) {
              addTokens(conversationId, event.payload.tokens_used);
            }
          } else {
            if (event.payload.thinking) {
              setThinking(event.payload.thinking);
            }
            if (event.payload.content) {
              setThinking(null); // Clear thinking when content starts
              setStreamingContent((prev) => prev + event.payload.content);
            }
          }
        }
      );
    };

    setupListener();

    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
      }
    };
  }, [conversationId, addTokens]);

  const sendMessage = useCallback(
    async (message: string, systemPrompt?: string, workingDirectory?: string, integrations?: Integration[], continueConversation?: boolean) => {
      setIsLoading(true);
      setStreamingContent("");
      setError(null);

      // Convert integrations to the format expected by Rust backend
      const integrationConfigs: IntegrationConfig[] | undefined = integrations?.map((int) => ({
        id: int.id,
        name: int.name,
        type: int.type,
        server_command: int.serverCommand,
        server_args: int.serverArgs,
        env_variable: int.envVariable,
        api_key: int.apiKey,
      }));

      try {
        const response = await invoke<string>("send_to_claude", {
          conversationId,
          message,
          systemPrompt,
          workingDirectory,
          integrations: integrationConfigs,
          continueConversation,
        });
        return response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId]
  );

  const checkInstalled = useCallback(async () => {
    try {
      return await invoke<boolean>("check_claude_installed");
    } catch {
      return false;
    }
  }, []);

  const clearStreaming = useCallback(() => {
    setStreamingContent("");
    setThinking(null);
  }, []);

  return {
    sendMessage,
    checkInstalled,
    isLoading,
    streamingContent,
    thinking,
    clearStreaming,
    error,
  };
}
