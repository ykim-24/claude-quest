import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "@/stores/appStore";

interface ShellOutput {
  stdout: string;
  stderr: string;
  exit_code: number;
}

interface ClaudeResult {
  response: string;
  session_id: string | null;
}

export function useScheduler() {
  const { scheduledTasks, updateScheduledTask, conversations, addMessage } = useAppStore();
  const intervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastRunRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    // Clear all existing intervals
    intervalsRef.current.forEach((interval) => clearInterval(interval));
    intervalsRef.current.clear();

    // Set up intervals for each enabled task
    scheduledTasks.forEach((task) => {
      if (!task.enabled) return;

      const runTask = async () => {
        const now = Date.now();
        const lastRun = lastRunRef.current.get(task.id) || 0;

        // Prevent running more than once per interval
        if (now - lastRun < task.intervalMinutes * 60 * 1000 * 0.9) {
          return;
        }

        lastRunRef.current.set(task.id, now);

        try {
          if (task.type === "cli" || !task.type) {
            // CLI command
            let workingDir = task.workingDirectory || "~";
            if (workingDir === "~" || workingDir.startsWith("~/")) {
              const homeDir = await invoke<string>("get_home_dir");
              workingDir = workingDir === "~" ? homeDir : workingDir.replace("~", homeDir);
            }

            const result = await invoke<ShellOutput>("run_shell_command", {
              processId: `scheduled-${task.id}-${Date.now()}`,
              command: task.command,
              workingDirectory: workingDir,
            });

            const output = result.stdout || result.stderr || "(no output)";
            const status = result.exit_code === 0 ? "success" : "error";

            updateScheduledTask(task.id, {
              lastRun: new Date(),
              lastOutput: output.slice(-2000),
              lastStatus: status,
              hasNewOutput: true,
            });
          } else if (task.type === "prompt") {
            // Prompt to Claude - use first conversation for context if available
            const conversationIds = task.conversationIds || [];
            const primaryConversation = conversationIds.length > 0
              ? conversations.find((c) => c.id === conversationIds[0])
              : null;

            // Build context from selected conversations
            let contextInfo = "";
            if (conversationIds.length > 0) {
              const contextConvs = conversations.filter((c) => conversationIds.includes(c.id));
              contextInfo = contextConvs.map((c) => `[Context: ${c.title}]`).join(" ");
            }

            const fullPrompt = contextInfo
              ? `${contextInfo}\n\n${task.command}`
              : task.command;

            const result = await invoke<ClaudeResult>("send_to_claude", {
              conversationId: `scheduled-${task.id}`,
              message: fullPrompt,
              workingDirectory: primaryConversation?.workingDirectory || null,
              sessionId: null,
            });

            // Add messages to first conversation if one is selected
            if (primaryConversation) {
              addMessage(primaryConversation.id, {
                role: "user",
                content: `[Scheduled Task: ${task.name}]\n${task.command}`,
              });
              addMessage(primaryConversation.id, {
                role: "assistant",
                content: result.response,
              });
            }

            updateScheduledTask(task.id, {
              lastRun: new Date(),
              lastOutput: result.response.slice(-2000),
              lastStatus: "success",
              hasNewOutput: true,
            });
          }
        } catch (error) {
          updateScheduledTask(task.id, {
            lastRun: new Date(),
            lastOutput: `Error: ${error}`,
            lastStatus: "error",
            hasNewOutput: true,
          });
        }
      };

      // Run immediately on first enable, then set interval
      runTask();

      const intervalMs = task.intervalMinutes * 60 * 1000;
      const interval = setInterval(runTask, intervalMs);
      intervalsRef.current.set(task.id, interval);
    });

    // Cleanup on unmount
    return () => {
      intervalsRef.current.forEach((interval) => clearInterval(interval));
      intervalsRef.current.clear();
    };
  }, [scheduledTasks, updateScheduledTask, conversations, addMessage]);
}
