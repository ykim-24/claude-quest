import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ChevronDown, ChevronRight } from "lucide-react";

interface ShellOutput {
  stdout: string;
  stderr: string;
  exit_code: number;
}

interface TerminalEntry {
  command: string;
  output: ShellOutput;
  timestamp: Date;
}

interface TerminalProps {
  workingDirectory: string;
  currentTokens: number;
  totalTokens: number;
}

// Strip ANSI escape codes from output
function stripAnsi(str: string): string {
  return str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "");
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return (tokens / 1000000).toFixed(1) + "M";
  }
  if (tokens >= 1000) {
    return (tokens / 1000).toFixed(1) + "K";
  }
  return tokens.toString();
}

export function Terminal({ workingDirectory, currentTokens, totalTokens }: TerminalProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<TerminalEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentProcessId, setCurrentProcessId] = useState<string | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history]);

  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus();
    }
  }, [isExpanded]);

  const killCurrentProcess = async () => {
    if (currentProcessId) {
      try {
        await invoke("kill_shell_process", { processId: currentProcessId });
      } catch (err) {
        console.error("Failed to kill process:", err);
      }
    }
  };

  const runCommand = async () => {
    if (!input.trim() || isRunning) return;

    const cmd = input.trim();
    setInput("");
    setCommandHistory((prev) => [...prev, cmd]);
    setHistoryIndex(-1);

    // Handle clear command locally
    if (cmd === "clear") {
      setHistory([]);
      return;
    }

    const processId = crypto.randomUUID();
    setCurrentProcessId(processId);
    setIsRunning(true);

    try {
      const output = await invoke<ShellOutput>("run_shell_command", {
        processId,
        command: cmd,
        workingDirectory,
      });

      setHistory((prev) => [
        ...prev,
        { command: cmd, output, timestamp: new Date() },
      ]);
    } catch (err) {
      setHistory((prev) => [
        ...prev,
        {
          command: cmd,
          output: {
            stdout: "",
            stderr: err instanceof Error ? err.message : "Command failed",
            exit_code: -1,
          },
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsRunning(false);
      setCurrentProcessId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle Ctrl+C to kill running process
    if (e.ctrlKey && e.key === "c") {
      if (isRunning) {
        e.preventDefault();
        killCurrentProcess();
        return;
      }
      // If not running, clear input (standard terminal behavior)
      setInput("");
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      runCommand();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex =
          historyIndex < commandHistory.length - 1
            ? historyIndex + 1
            : historyIndex;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || "");
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || "");
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput("");
      }
    }
  };

  return (
    <div className="border-t border-slate-800 mt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 w-full py-2 text-xs text-slate-500 hover:text-slate-400"
      >
        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        Terminal
      </button>

      {isExpanded && (
        <div className="bg-slate-900 border border-slate-800 rounded">
          {/* Output area */}
          <div
            ref={outputRef}
            className="h-32 overflow-y-auto p-2 font-mono text-xs"
          >
            {history.length === 0 && (
              <div className="text-slate-600">
                Run commands in {workingDirectory}
              </div>
            )}
            {history.map((entry, i) => (
              <div key={i} className="mb-2">
                <div className="text-green-500">$ {entry.command}</div>
                {entry.output.stdout && (
                  <pre className="text-slate-300 whitespace-pre-wrap">
                    {stripAnsi(entry.output.stdout)}
                  </pre>
                )}
                {entry.output.stderr && (
                  <pre className="text-red-400 whitespace-pre-wrap">
                    {stripAnsi(entry.output.stderr)}
                  </pre>
                )}
                {entry.output.exit_code !== 0 && entry.output.exit_code !== 130 && (
                  <div className="text-slate-600">
                    exit code: {entry.output.exit_code}
                  </div>
                )}
              </div>
            ))}
            {isRunning && (
              <div className="text-slate-500">
                <span className="animate-pulse">Running...</span>
                <span className="text-slate-600 ml-2">(Ctrl+C to cancel)</span>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="flex items-center border-t border-slate-800 px-2 py-1">
            <span className="text-green-500 text-xs font-mono mr-1">$</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isRunning ? "Ctrl+C to cancel..." : "Enter command..."}
              className="flex-1 bg-transparent text-xs font-mono text-slate-300 placeholder-slate-600 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Token display */}
      <div className="flex justify-between text-xs pt-2 pb-1 px-1 text-slate-600 border-t border-slate-800 mt-2">
        <span>Current: <span className="text-slate-400">{formatTokens(currentTokens)}</span></span>
        <span>Total: <span className="text-slate-400">{formatTokens(totalTokens)}</span></span>
      </div>
    </div>
  );
}
