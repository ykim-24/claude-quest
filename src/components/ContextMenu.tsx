import { useEffect, useRef } from "react";

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Adjust position if menu would go off screen
  const adjustedX = Math.min(x, window.innerWidth - 160);
  const adjustedY = Math.min(y, window.innerHeight - items.length * 32 - 16);

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] bg-slate-900 border border-slate-700 py-1 min-w-[150px]"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {items.map((item, index) => (
        <button
          key={index}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          className={`w-full px-3 py-1.5 text-left text-sm ${
            item.danger
              ? "text-red-400 hover:bg-red-950"
              : "text-slate-300 hover:bg-slate-800"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
