import { useState } from "react";
import { X } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { PixelCharacter } from "./PixelCharacter";
import type { CharacterCustomization } from "@/types";

interface CharacterCreatorProps {
  onClose: () => void;
}

const colors = [
  { id: "slate", value: "#64748b" },
  { id: "red", value: "#ef4444" },
  { id: "orange", value: "#f97316" },
  { id: "amber", value: "#f59e0b" },
  { id: "green", value: "#22c55e" },
  { id: "cyan", value: "#06b6d4" },
  { id: "blue", value: "#3b82f6" },
  { id: "purple", value: "#a855f7" },
  { id: "pink", value: "#ec4899" },
];

const customizationOptions = {
  hat: [
    { id: null, name: "None", icon: "·" },
    { id: "cap", name: "Cap", icon: "⌐" },
    { id: "wizard", name: "Wizard Hat", icon: "▲" },
    { id: "crown", name: "Crown", icon: "♔" },
    { id: "hood", name: "Hood", icon: "◠" },
  ],
  hair: [
    { id: null, name: "None", icon: "·" },
    { id: "short", name: "Short", icon: "∩" },
    { id: "long", name: "Long", icon: "≋" },
    { id: "spiky", name: "Spiky", icon: "⋏" },
    { id: "curly", name: "Curly", icon: "∿" },
  ],
  beard: [
    { id: null, name: "None", icon: "·" },
    { id: "stubble", name: "Stubble", icon: ":" },
    { id: "short", name: "Short", icon: "⌓" },
    { id: "long", name: "Long", icon: "⌇" },
    { id: "wizard", name: "Wizard", icon: "⋮" },
  ],
  top: [
    { id: null, name: "None", icon: "·" },
    { id: "shirt", name: "Shirt", icon: "⊓" },
    { id: "armor", name: "Armor", icon: "⛊" },
    { id: "robe", name: "Robe", icon: "⌻" },
    { id: "cloak", name: "Cloak", icon: "◿" },
  ],
  accessory: [
    { id: null, name: "None", icon: "·" },
    { id: "glasses", name: "Glasses", icon: "◎" },
    { id: "eyepatch", name: "Eyepatch", icon: "◐" },
    { id: "scar", name: "Scar", icon: "∕" },
    { id: "earring", name: "Earring", icon: "◦" },
  ],
};

const defaultCustomization: CharacterCustomization = {
  hat: null,
  hair: null,
  beard: null,
  top: null,
  accessory: null,
};

export function CharacterCreator({ onClose }: CharacterCreatorProps) {
  const { characters, playerCharacter, setPlayerCharacter } = useAppStore();
  const [name, setName] = useState(playerCharacter?.name || "");
  const [selectedClass, setSelectedClass] = useState(playerCharacter?.classId || "claude");
  const [selectedColor, setSelectedColor] = useState(playerCharacter?.color || "#64748b");
  const [customization, setCustomization] = useState<CharacterCustomization>(
    playerCharacter?.customization || defaultCustomization
  );

  const selectedCharacter = characters.find((c) => c.id === selectedClass);

  const handleCustomizationChange = (category: keyof CharacterCustomization, value: string | null) => {
    setCustomization((prev) => ({ ...prev, [category]: value }));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    setPlayerCharacter({
      name: name.trim(),
      classId: selectedClass,
      color: selectedColor,
      customization,
    });
    onClose();
  };

  return (
    <div className="fixed inset-4 z-50 bg-slate-950 border border-slate-700 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <span className="text-sm">Character Creator</span>
        <button onClick={onClose} className="text-slate-600">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left side - Big character preview */}
        <div className="w-1/3 border-r border-slate-700 p-6 flex flex-col items-center">
          <div
            className="border-2 flex items-center justify-center"
            style={{ borderColor: selectedColor }}
          >
            <PixelCharacter
              classId={selectedClass}
              customization={customization}
              color={selectedColor}
              size={192}
            />
          </div>

          {/* Character info under preview */}
          <div className="mt-4 text-center">
            <div className="text-lg" style={{ color: selectedColor }}>
              {name || "???"}
            </div>
            <div className="text-xs text-slate-600 mt-1">
              {selectedCharacter?.name} Class
            </div>
          </div>

          {/* Customization summary */}
          <div className="mt-4 flex gap-2 flex-wrap justify-center">
            {Object.entries(customization).map(([key, value]) => {
              if (!value) return null;
              const option = customizationOptions[key as keyof typeof customizationOptions]?.find(
                (o) => o.id === value
              );
              return (
                <span key={key} className="text-xs px-2 py-1 border border-slate-700 text-slate-500">
                  {option?.name}
                </span>
              );
            })}
          </div>
        </div>

        {/* Right side - Customization options */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-lg space-y-6">
            {/* Name input */}
            <div>
              <label className="block text-xs text-slate-500 mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name..."
                className="w-full px-3 py-2 bg-transparent border border-slate-700 text-slate-100 text-sm focus:outline-none"
                maxLength={20}
              />
            </div>

            {/* Class selection */}
            <div>
              <label className="block text-xs text-slate-500 mb-2">Class</label>
              <div className="flex gap-2">
                {characters.map((char) => (
                  <div
                    key={char.id}
                    onClick={() => setSelectedClass(char.id)}
                    className={`flex flex-col items-center p-2 border cursor-pointer ${
                      char.id === selectedClass ? "border-slate-400" : "border-slate-800"
                    }`}
                  >
                    <PixelCharacter
                      classId={char.id}
                      customization={defaultCustomization}
                      color="#64748b"
                      size={48}
                    />
                    <span className="text-xs text-slate-500 mt-1">{char.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Color selection */}
            <div>
              <label className="block text-xs text-slate-500 mb-2">Color</label>
              <div className="flex gap-2 flex-wrap">
                {colors.map((color) => (
                  <div
                    key={color.id}
                    onClick={() => setSelectedColor(color.value)}
                    className={`w-8 h-8 cursor-pointer border-2 ${
                      selectedColor === color.value ? "border-white" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color.value }}
                  />
                ))}
              </div>
            </div>

            {/* Customization sections */}
            {(Object.keys(customizationOptions) as Array<keyof typeof customizationOptions>).map(
              (category) => (
                <div key={category}>
                  <label className="block text-xs text-slate-500 mb-2 capitalize">{category}</label>
                  <div className="flex gap-1 flex-wrap">
                    {customizationOptions[category].map((option) => (
                      <div
                        key={option.id || "none"}
                        onClick={() => handleCustomizationChange(category, option.id)}
                        className={`w-12 h-12 border flex flex-col items-center justify-center cursor-pointer ${
                          customization[category] === option.id
                            ? "border-slate-400 text-slate-200"
                            : "border-slate-800 text-slate-600"
                        }`}
                        title={option.name}
                      >
                        <span className="text-lg">{option.icon}</span>
                        <span className="text-[8px] mt-0.5">{option.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="p-4 border-t border-slate-700 flex justify-end">
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="px-4 py-2 border border-slate-600 text-sm disabled:opacity-50"
        >
          Save Character
        </button>
      </div>
    </div>
  );
}
