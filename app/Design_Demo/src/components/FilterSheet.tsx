import { X } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategories: string[];
  selectedAllergens: string[];
  onCategoryToggle: (category: string) => void;
  onAllergenToggle: (allergen: string) => void;
}

const categories = [
  "korean",
  "japanese",
  "chinese",
  "western",
  "snack food",
  "burger",
  "pizza",
  "chicken",
];

const allergens = [
  "milk",
  "eggs",
  "peanuts",
  "soy",
  "wheat",
  "fish",
  "shellfish",
  "sesame",
  "tree nuts",
];

export function FilterSheet({
  isOpen,
  onClose,
  selectedCategories,
  selectedAllergens,
  onCategoryToggle,
  onAllergenToggle,
}: FilterSheetProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Speech Bubble Dialog - positioned to fit screen from header to action buttons */}
      <div className="fixed left-0 right-0 z-50 mx-auto max-w-md px-6" style={{ top: "140px", bottom: "160px" }}>
        <div className="bg-white rounded-3xl shadow-2xl w-full h-full flex flex-col animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b flex-shrink-0">
            <h2>Filters</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-5 space-y-6">
              {/* Menu Types */}
              <div>
                <h3 className="mb-3">Menu Types</h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => onCategoryToggle(category)}
                      className={`px-4 py-2 rounded-full border-2 transition-all capitalize ${
                        selectedCategories.includes(category)
                          ? "bg-blue-500 text-white border-blue-500"
                          : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Allergens to Exclude */}
              <div>
                <h3 className="mb-3">Exclude Allergens</h3>
                <div className="flex flex-wrap gap-2">
                  {allergens.map((allergen) => (
                    <button
                      key={allergen}
                      onClick={() => onAllergenToggle(allergen)}
                      className={`px-4 py-2 rounded-full border-2 transition-all capitalize ${
                        selectedAllergens.includes(allergen)
                          ? "bg-blue-500 text-white border-blue-500"
                          : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {allergen}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
