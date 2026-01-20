import { X } from "lucide-react";
import { useAppStore } from "@/stores/appStore";

interface CharacterSelectorProps {
  conversationId: string;
  currentCharacter: string;
  onClose: () => void;
}

export function CharacterSelector({ conversationId, currentCharacter, onClose }: CharacterSelectorProps) {
  const { characters, setCharacter } = useAppStore();

  const handleSelect = (characterId: string) => {
    setCharacter(conversationId, characterId);
    onClose();
  };

  return (
    <div className="absolute inset-0 bg-slate-950/95 z-10 flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-slate-500">Select Character</span>
        <button onClick={onClose} className="text-slate-600">
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 flex-1 overflow-y-auto">
        {characters.map((char) => (
          <div
            key={char.id}
            onClick={() => handleSelect(char.id)}
            className={`flex flex-col items-center p-2 border cursor-pointer ${
              char.id === currentCharacter
                ? "border-slate-500"
                : "border-slate-800"
            }`}
          >
            <div
              className="w-16 h-16 border border-slate-700 mb-1 flex items-center justify-center"
              style={{ imageRendering: "pixelated" }}
            >
              <img
                src={char.image}
                alt={char.name}
                className="w-full h-full object-contain"
                style={{ imageRendering: "pixelated" }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
            <span className="text-xs text-slate-400">{char.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
