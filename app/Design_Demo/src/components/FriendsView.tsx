import { X } from "lucide-react";
import { Friend, FoodItem } from "../types";
import { ScrollArea } from "./ui/scroll-area";

interface FriendsViewProps {
  isOpen: boolean;
  onClose: () => void;
  friends: Friend[];
  foodItems: FoodItem[];
  likedItems: number[];
  scrappedItems: number[];
}

export function FriendsView({
  isOpen,
  onClose,
  friends,
  foodItems,
  likedItems,
  scrappedItems,
}: FriendsViewProps) {
  if (!isOpen) return null;

  const getMutualFoods = (friend: Friend) => {
    const userInteractions = [...likedItems, ...scrappedItems];
    return friend.mutualLikes.filter((id) => userInteractions.includes(id));
  };

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
            <h2>Friends</h2>
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
            <div className="p-5 space-y-3">
              {friends.map((friend) => {
                const mutualFoods = getMutualFoods(friend);
                const mutualFoodNames = mutualFoods
                  .map((id) => foodItems.find((f) => f.id === id)?.name)
                  .filter(Boolean);

                return (
                  <div
                    key={friend.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {/* Avatar */}
                    <img
                      src={friend.avatar}
                      alt={friend.name}
                      className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0"
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="mb-1">{friend.name}</h4>
                      {mutualFoodNames.length > 0 ? (
                        <p className="text-sm text-gray-600">
                          Mutual likes: {mutualFoodNames.join(", ")}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400">No mutual likes yet</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
