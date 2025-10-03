import { Heart, Bookmark } from "lucide-react";
import { FoodItem } from "../types";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface FoodCardProps {
  food: FoodItem;
  isLiked: boolean;
  isScrapped: boolean;
  onLike: () => void;
  onScrap: () => void;
  animationDirection?: "left" | "right" | "vertical" | "none";
}

export function FoodCard({
  food,
  isLiked,
  isScrapped,
  onLike,
  onScrap,
  animationDirection = "none",
}: FoodCardProps) {
  const getAnimationClass = () => {
    switch (animationDirection) {
      case "left":
        return "animate-in fade-in slide-in-from-right-8 duration-400";
      case "right":
        return "animate-in fade-in slide-in-from-left-8 duration-400";
      case "vertical":
        return "animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-500";
      default:
        return "";
    }
  };

  return (
    <div className={`flex flex-col items-center w-full px-4 ${getAnimationClass()}`}>
      {/* Food Image */}
      <div className="w-full aspect-square max-w-[360px] rounded-lg overflow-hidden bg-gray-100 mb-3">
        <ImageWithFallback
          src={food.image}
          alt={food.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Food Info */}
      <div className="w-full max-w-[360px]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3>{food.name}</h3>
              <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs capitalize">
                {food.category}
              </span>
            </div>
            <p className="text-gray-500 text-sm">{food.distance}</p>
          </div>

          {/* Like and Scrap buttons */}
          <div className="flex gap-3 flex-shrink-0 ml-3">
            <button
              onClick={onLike}
              className="p-0 bg-transparent border-none cursor-pointer"
              aria-label="Like"
            >
              <Heart
                className={`w-7 h-7 ${
                  isLiked
                    ? "fill-blue-500 stroke-blue-500"
                    : "fill-none stroke-black"
                } transition-all`}
              />
            </button>
            <button
              onClick={onScrap}
              className="p-0 bg-transparent border-none cursor-pointer"
              aria-label="Save"
            >
              <Bookmark
                className={`w-7 h-7 ${
                  isScrapped
                    ? "fill-blue-500 stroke-blue-500"
                    : "fill-none stroke-black"
                } transition-all`}
              />
            </button>
          </div>
        </div>

        {/* Allergens */}
        <div className="flex flex-wrap gap-2">
          {food.allergens.map((allergen, index) => (
            <span
              key={index}
              className="px-4 py-2 bg-white text-gray-700 border-2 border-gray-300 rounded-full text-sm capitalize"
            >
              {allergen}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
