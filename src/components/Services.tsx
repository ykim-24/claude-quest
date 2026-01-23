import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { ChevronDown, ChevronRight, Plus, X, Play, Square } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import type { Conversation } from "@/types";

interface ServiceOutput {
  service_id: string;
  output: string;
  is_stderr: boolean;
  is_complete: boolean;
  exit_code: number | null;
}

interface ServiceRunState {
  isRunning: boolean;
  output: string[];
  isExpanded: boolean;
}

interface ServicesProps {
  conversation: Conversation;
}

const MAX_OUTPUT_LINES = 200;

export function Services({ conversation }: ServicesProps) {
  const { addService, removeService } = useAppStore();
  const services = conversation.services || [];

  const [isExpanded, setIsExpanded] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCommand, setNewCommand] = useState("");

  // Runtime state for each service (not persisted)
  const [runStates, setRunStates] = useState<Record<string, ServiceRunState>>({});
  const listenersRef = useRef<Map<string, UnlistenFn>>(new Map());
  const outputRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  // Initialize run states for new services
  useEffect(() => {
    setRunStates((prev) => {
      const newStates = { ...prev };
      services.forEach((service) => {
        if (!newStates[service.id]) {
          newStates[service.id] = {
            isRunning: false,
            output: [],
            isExpanded: true,
          };
        }
      });
      // Clean up states for removed services
      Object.keys(newStates).forEach((id) => {
        if (!services.find((s) => s.id === id)) {
          delete newStates[id];
        }
      });
      return newStates;
    });
  }, [services]);

  // Check for already running services on mount
  useEffect(() => {
    const checkRunning = async () => {
      try {
        const running = await invoke<string[]>("get_running_services");
        setRunStates((prev) => {
          const newStates = { ...prev };
          running.forEach((serviceId) => {
            if (newStates[serviceId]) {
              newStates[serviceId] = { ...newStates[serviceId], isRunning: true };
              // Re-setup listener for running service
              setupListener(serviceId);
            }
          });
          return newStates;
        });
      } catch (err) {
        console.error("Failed to check running services:", err);
      }
    };
    checkRunning();
  }, []);

  // Clean up listeners on unmount
  useEffect(() => {
    return () => {
      listenersRef.current.forEach((unlisten) => unlisten());
      listenersRef.current.clear();
    };
  }, []);

  // Auto-scroll output
  useEffect(() => {
    services.forEach((service) => {
      const state = runStates[service.id];
      const outputEl = outputRefs.current.get(service.id);
      if (outputEl && state?.isExpanded) {
        outputEl.scrollTop = outputEl.scrollHeight;
      }
    });
  }, [runStates, services]);

  const setupListener = async (serviceId: string) => {
    // Remove existing listener if any
    const existing = listenersRef.current.get(serviceId);
    if (existing) {
      existing();
      listenersRef.current.delete(serviceId);
    }

    const unlisten = await listen<ServiceOutput>(
      `service-output-${serviceId}`,
      (event) => {
        const data = event.payload;

        if (data.is_complete) {
          // Service stopped
          setRunStates((prev) => ({
            ...prev,
            [serviceId]: {
              ...prev[serviceId],
              isRunning: false,
              output: [
                ...(prev[serviceId]?.output || []),
                `[Process exited with code ${data.exit_code ?? "unknown"}]`,
              ].slice(-MAX_OUTPUT_LINES),
            },
          }));
          // Clean up listener
          const listener = listenersRef.current.get(serviceId);
          if (listener) {
            listener();
            listenersRef.current.delete(serviceId);
          }
        } else if (data.output) {
          // New output line
          setRunStates((prev) => ({
            ...prev,
            [serviceId]: {
              ...prev[serviceId],
              output: [...(prev[serviceId]?.output || []), data.output].slice(
                -MAX_OUTPUT_LINES
              ),
            },
          }));
        }
      }
    );

    listenersRef.current.set(serviceId, unlisten);
  };

  const handleAddService = () => {
    if (!newName.trim() || !newCommand.trim()) return;
    if (services.length >= 4) return;

    addService(conversation.id, {
      name: newName.trim(),
      command: newCommand.trim(),
    });

    setNewName("");
    setNewCommand("");
    setShowAddForm(false);
  };

  const handleRemoveService = async (serviceId: string) => {
    const state = runStates[serviceId];
    if (state?.isRunning) {
      await stopService(serviceId);
    }
    removeService(conversation.id, serviceId);
  };

  const startService = async (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;

    try {
      await setupListener(serviceId);
      await invoke("start_service", {
        serviceId,
        command: service.command,
        workingDirectory: conversation.workingDirectory,
      });

      setRunStates((prev) => ({
        ...prev,
        [serviceId]: {
          ...prev[serviceId],
          isRunning: true,
          output: [`$ ${service.command}`],
        },
      }));
    } catch (err) {
      setRunStates((prev) => ({
        ...prev,
        [serviceId]: {
          ...prev[serviceId],
          output: [
            ...(prev[serviceId]?.output || []),
            `Error: ${err instanceof Error ? err.message : "Failed to start"}`,
          ],
        },
      }));
    }
  };

  const stopService = async (serviceId: string) => {
    try {
      await invoke("stop_service", { serviceId });
      setRunStates((prev) => ({
        ...prev,
        [serviceId]: {
          ...prev[serviceId],
          isRunning: false,
          output: [...(prev[serviceId]?.output || []), "[Stopped]"],
        },
      }));
    } catch (err) {
      console.error("Failed to stop service:", err);
    }
  };

  const toggleExpanded = (serviceId: string) => {
    setRunStates((prev) => ({
      ...prev,
      [serviceId]: {
        ...prev[serviceId],
        isExpanded: !prev[serviceId]?.isExpanded,
      },
    }));
  };

  const runningCount = Object.values(runStates).filter((s) => s?.isRunning).length;

  return (
    <div className="border-t border-slate-800 mt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full py-2 text-xs text-slate-500 hover:text-slate-400"
      >
        <div className="flex items-center gap-1">
          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          Services
          {runningCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-green-900 text-green-400 rounded text-xs">
              {runningCount} running
            </span>
          )}
        </div>
        {isExpanded && services.length < 4 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowAddForm(true);
            }}
            className="text-slate-600 hover:text-slate-400"
            title="Add service"
          >
            <Plus size={14} />
          </button>
        )}
      </button>

      {isExpanded && (
        <div className="space-y-2">
          {/* Add service form */}
          {showAddForm && (
            <div className="bg-slate-900 border border-slate-800 rounded p-2 space-y-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Service name (e.g., Dev Server)"
                className="w-full px-2 py-1 bg-transparent border border-slate-700 text-xs text-slate-300 placeholder-slate-600 focus:outline-none"
                autoFocus
              />
              <input
                type="text"
                value={newCommand}
                onChange={(e) => setNewCommand(e.target.value)}
                placeholder="Command (e.g., npm run dev)"
                className="w-full px-2 py-1 bg-transparent border border-slate-700 text-xs text-slate-300 placeholder-slate-600 focus:outline-none"
                onKeyDown={(e) => e.key === "Enter" && handleAddService()}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-1 text-xs border border-slate-700 text-slate-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddService}
                  disabled={!newName.trim() || !newCommand.trim()}
                  className="flex-1 py-1 text-xs border border-slate-600 text-slate-300 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Service list */}
          {services.map((service) => {
            const state = runStates[service.id] || {
              isRunning: false,
              output: [],
              isExpanded: true,
            };

            return (
              <div
                key={service.id}
                className={`bg-slate-900 border rounded ${
                  state.isRunning ? "border-green-900" : "border-slate-800"
                }`}
              >
                {/* Service header */}
                <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-800">
                  <button
                    onClick={() => toggleExpanded(service.id)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300"
                  >
                    {state.isExpanded ? (
                      <ChevronDown size={12} />
                    ) : (
                      <ChevronRight size={12} />
                    )}
                    <span className={state.isRunning ? "text-green-400" : ""}>
                      {service.name}
                    </span>
                    {state.isRunning && (
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    {state.isRunning ? (
                      <button
                        onClick={() => stopService(service.id)}
                        className="p-1 text-red-500 hover:text-red-400"
                        title="Stop"
                      >
                        <Square size={12} />
                      </button>
                    ) : (
                      <button
                        onClick={() => startService(service.id)}
                        className="p-1 text-green-500 hover:text-green-400"
                        title="Start"
                      >
                        <Play size={12} />
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveService(service.id)}
                      className="p-1 text-slate-600 hover:text-slate-400 disabled:opacity-50"
                      title="Remove"
                      disabled={state.isRunning}
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>

                {/* Service output */}
                {state.isExpanded && (
                  <div
                    ref={(el) => { outputRefs.current.set(service.id, el); }}
                    className="h-24 overflow-y-auto p-2 font-mono text-xs"
                  >
                    {state.output.length === 0 ? (
                      <div className="text-slate-600">
                        {state.isRunning ? "Waiting for output..." : "Not started"}
                      </div>
                    ) : (
                      state.output.map((line, i) => (
                        <div
                          key={i}
                          className={
                            line.startsWith("$")
                              ? "text-green-500"
                              : line.startsWith("[")
                              ? "text-slate-500"
                              : line.startsWith("Error")
                              ? "text-red-400"
                              : "text-slate-300"
                          }
                        >
                          {line}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Empty state */}
          {services.length === 0 && !showAddForm && (
            <div className="text-center py-3 text-xs text-slate-600">
              No services configured.{" "}
              <button
                onClick={() => setShowAddForm(true)}
                className="text-slate-500 hover:text-slate-400 underline"
              >
                Add one
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
