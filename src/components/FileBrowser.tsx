import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Folder, File, ChevronUp, X } from "lucide-react";

interface DirEntry {
  name: string;
  path: string;
  is_dir: boolean;
}

interface FileBrowserProps {
  onSelect: (path: string) => void;
  onCancel: () => void;
}

export function FileBrowser({ onSelect, onCancel }: FileBrowserProps) {
  const [currentPath, setCurrentPath] = useState("");
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const home = await invoke<string>("get_home_dir");
      setCurrentPath(home);
    };
    init();
  }, []);

  useEffect(() => {
    if (!currentPath) return;

    const loadDir = async () => {
      setLoading(true);
      setError(null);
      try {
        const items = await invoke<DirEntry[]>("list_directory", { path: currentPath });
        setEntries(items);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    };
    loadDir();
  }, [currentPath]);

  const goUp = () => {
    const parent = currentPath.split("/").slice(0, -1).join("/") || "/";
    setCurrentPath(parent);
  };

  const handleEntryClick = (entry: DirEntry) => {
    if (entry.is_dir) {
      setCurrentPath(entry.path);
    }
  };

  const handleSelect = () => {
    onSelect(currentPath);
  };

  return (
    <div className="fixed inset-4 z-50 flex flex-col bg-slate-950 border border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700">
        <span className="text-sm">Select Directory</span>
        <button onClick={onCancel} className="text-slate-600">
          <X size={16} />
        </button>
      </div>

      {/* Current path */}
      <div className="flex items-center gap-2 p-3 border-b border-slate-800">
        <button onClick={goUp} className="text-slate-500">
          <ChevronUp size={16} />
        </button>
        <span className="text-xs text-slate-400 truncate flex-1">{currentPath}</span>
      </div>

      {/* Directory listing */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading && <div className="text-slate-600 text-sm p-2">Loading...</div>}
        {error && <div className="text-red-500 text-sm p-2">{error}</div>}

        {!loading && !error && entries.length === 0 && (
          <div className="text-slate-600 text-sm p-2">Empty directory</div>
        )}

        {entries.map((entry) => (
          <div
            key={entry.path}
            onClick={() => handleEntryClick(entry)}
            className={`flex items-center gap-2 px-2 py-1 text-sm cursor-pointer ${
              entry.is_dir ? "text-slate-300" : "text-slate-600"
            }`}
          >
            {entry.is_dir ? <Folder size={14} /> : <File size={14} />}
            <span className="truncate">{entry.name}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-3 border-t border-slate-700">
        <span className="text-xs text-slate-600 truncate max-w-[60%]">
          {currentPath.split("/").pop()}
        </span>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1 text-sm text-slate-500 border border-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSelect}
            className="px-3 py-1 text-sm border border-slate-600"
          >
            Select
          </button>
        </div>
      </div>
    </div>
  );
}
