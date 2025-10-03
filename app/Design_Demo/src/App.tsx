import { useState, useEffect } from "react";
import { Search, Filter, Heart, Users, Home, User, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { FoodCard } from "./components/FoodCard";
import { FilterSheet } from "./components/FilterSheet";
import { FriendsView } from "./components/FriendsView";
import { foodItems, friends } from "./data/mockData";
import { FoodItem } from "./types";

const allCategories = [
  "korean",
  "japanese",
  "chinese",
  "western",
  "snack food",
  "burger",
  "pizza",
  "chicken",
];

export default function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [previousIndex, setPreviousIndex] = useState(0);
  const [likedItems, setLikedItems] = useState<number[]>([]);
  const [scrappedItems, setScrappedItems] = useState<number[]>([]);
  const [showLikedOnly, setShowLikedOnly] = useState(false);
  const [previousLikedOnly, setPreviousLikedOnly] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(allCategories);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [currentTab, setCurrentTab] = useState<"recommendation" | "profile">("recommendation");

  // Filter foods based on search, filters, and liked view
  const getFilteredFoods = (): FoodItem[] => {
    let filtered = [...foodItems];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (food) =>
          food.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          food.keywords.some((k) =>
            k.toLowerCase().includes(searchQuery.toLowerCase())
          )
      );
    }

    // Category filter (include only selected categories)
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(
        (food) => selectedCategories.includes(food.category)
      );
    }

    // Allergen filter (exclude foods with selected allergens)
    if (selectedAllergens.length > 0) {
      filtered = filtered.filter(
        (food) =>
          !food.allergens.some((allergen) =>
            selectedAllergens.includes(allergen)
          )
      );
    }

    // Liked filter
    if (showLikedOnly) {
      filtered = filtered.filter((food) => likedItems.includes(food.id));
    }

    return filtered;
  };

  const filteredFoods = getFilteredFoods();

  // Reset index when filters change
  useEffect(() => {
    if (currentIndex >= filteredFoods.length && filteredFoods.length > 0) {
      setCurrentIndex(0);
    }
  }, [filteredFoods.length, currentIndex]);

  const currentFood = filteredFoods[currentIndex];

  const handleLike = () => {
    if (!currentFood) return;
    setLikedItems((prev) =>
      prev.includes(currentFood.id)
        ? prev.filter((id) => id !== currentFood.id)
        : [...prev, currentFood.id]
    );
  };

  const handleScrap = () => {
    if (!currentFood) return;
    setScrappedItems((prev) =>
      prev.includes(currentFood.id)
        ? prev.filter((id) => id !== currentFood.id)
        : [...prev, currentFood.id]
    );
  };

  const handleNext = () => {
    if (currentIndex < filteredFoods.length - 1) {
      setPreviousIndex(currentIndex);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setPreviousIndex(currentIndex);
      setCurrentIndex(currentIndex - 1);
    }
  };

  const getAnimationDirection = (): "left" | "right" | "vertical" | "none" => {
    // If liked filter was toggled, use vertical animation
    if (showLikedOnly !== previousLikedOnly) {
      setPreviousLikedOnly(showLikedOnly);
      return "vertical";
    }
    
    // If swiping, use horizontal animation
    if (currentIndex > previousIndex) {
      return "left"; // Swiping to next (left swipe)
    } else if (currentIndex < previousIndex) {
      return "right"; // Swiping to previous (right swipe)
    }
    
    return "none";
  };

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleAllergenToggle = (allergen: string) => {
    setSelectedAllergens((prev) =>
      prev.includes(allergen)
        ? prev.filter((a) => a !== allergen)
        : [...prev, allergen]
    );
  };

  const handleSearch = () => {
    setCurrentIndex(0);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto">
      {/* Header */}
      <header className="px-4 py-4 border-b">
        <h1 className="text-center mb-4">foodigram</h1>

        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Search foods..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="rounded-full pr-4 pl-4 bg-gray-50 border-gray-200"
            />
          </div>
          <Button
            onClick={handleSearch}
            className="rounded-full bg-blue-500 hover:bg-blue-600 px-4"
          >
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center py-6 relative">
        {filteredFoods.length === 0 ? (
          <div className="text-center text-gray-400 px-4">
            <p>No foods found</p>
            <p className="text-sm mt-2">Try adjusting your filters or search</p>
          </div>
        ) : currentFood ? (
          <>
            <FoodCard
              key={`${currentFood.id}-${currentIndex}-${showLikedOnly}`}
              food={currentFood}
              isLiked={likedItems.includes(currentFood.id)}
              isScrapped={scrappedItems.includes(currentFood.id)}
              onLike={handleLike}
              onScrap={handleScrap}
              animationDirection={getAnimationDirection()}
            />

            {/* Swipe Navigation */}
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className={`p-2 rounded-full ${
                  currentIndex === 0
                    ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
                aria-label="Previous"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              
              <span className="text-sm text-gray-500">
                {currentIndex + 1} / {filteredFoods.length}
              </span>

              <button
                onClick={handleNext}
                disabled={currentIndex === filteredFoods.length - 1}
                className={`p-2 rounded-full ${
                  currentIndex === filteredFoods.length - 1
                    ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
                aria-label="Next"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </>
        ) : null}
      </main>

      {/* Action Buttons */}
      <div className="px-4 py-4 border-t flex items-center justify-around">
        <Button
          variant={isFilterOpen ? "default" : "outline"}
          onClick={() => setIsFilterOpen(true)}
          className="rounded-full px-6"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>

        <Button
          variant={showLikedOnly ? "default" : "outline"}
          onClick={() => setShowLikedOnly(!showLikedOnly)}
          className={`rounded-full px-6 ${
            showLikedOnly ? "bg-blue-500 hover:bg-blue-600" : ""
          }`}
        >
          <Heart className="w-4 h-4 mr-2" />
          Liked
        </Button>

        <Button
          variant={isFriendsOpen ? "default" : "outline"}
          onClick={() => setIsFriendsOpen(true)}
          className="rounded-full px-6"
        >
          <Users className="w-4 h-4 mr-2" />
          Friends
        </Button>
      </div>

      {/* Bottom Tabs */}
      <nav className="border-t flex">
        <button
          onClick={() => setCurrentTab("recommendation")}
          className={`flex-1 py-4 flex flex-col items-center gap-1 transition-colors ${
            currentTab === "recommendation"
              ? "text-blue-500 bg-blue-50"
              : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-xs">Recommendation</span>
        </button>

        <button
          onClick={() => setCurrentTab("profile")}
          className={`flex-1 py-4 flex flex-col items-center gap-1 transition-colors ${
            currentTab === "profile"
              ? "text-blue-500 bg-blue-50"
              : "text-gray-500 hover:bg-gray-50"
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-xs">Profile</span>
        </button>
      </nav>

      {/* Filter Sheet */}
      <FilterSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        selectedCategories={selectedCategories}
        selectedAllergens={selectedAllergens}
        onCategoryToggle={handleCategoryToggle}
        onAllergenToggle={handleAllergenToggle}
      />

      {/* Friends View */}
      <FriendsView
        isOpen={isFriendsOpen}
        onClose={() => setIsFriendsOpen(false)}
        friends={friends}
        foodItems={foodItems}
        likedItems={likedItems}
        scrappedItems={scrappedItems}
      />
    </div>
  );
}
