import React, { useState, useEffect } from "react"
import { observer } from "mobx-react-lite"
import {
  View,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
} from "react-native"
import { Search, Filter, Heart, Users, Home, User, ChevronLeft, ChevronRight, X } from "lucide-react-native"
import { Screen, Text, TextField } from "../components"
import { FoodCard } from "../components/FoodCard"
import { colors, spacing } from "../theme"
import { foodItems, friends, allCategories, allAllergens } from "../data/mockData"
import { FoodItem } from "../types/FoodTypes"
import { AppStackScreenProps } from "../navigators"

interface FoodigramScreenProps extends AppStackScreenProps<"Foodigram"> {}

export const FoodigramScreen: React.FC<FoodigramScreenProps> = observer(function FoodigramScreen() {
  const [searchQuery, setSearchQuery] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [likedItems, setLikedItems] = useState<number[]>([])
  const [scrappedItems, setScrappedItems] = useState<number[]>([])
  const [showLikedOnly, setShowLikedOnly] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isFriendsOpen, setIsFriendsOpen] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>(allCategories)
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([])
  const [currentTab, setCurrentTab] = useState<"recommendation" | "profile">("recommendation")

  // Filter foods based on search, filters, and liked view
  const getFilteredFoods = (): FoodItem[] => {
    let filtered = [...foodItems]

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (food) =>
          food.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          food.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((food) => selectedCategories.includes(food.category))
    }

    // Allergen filter (exclude foods with selected allergens)
    if (selectedAllergens.length > 0) {
      filtered = filtered.filter(
        (food) => !food.allergens.some((allergen) => selectedAllergens.includes(allergen))
      )
    }

    // Liked filter
    if (showLikedOnly) {
      filtered = filtered.filter((food) => likedItems.includes(food.id))
    }

    return filtered
  }

  const filteredFoods = getFilteredFoods()

  // Reset index when filters change
  useEffect(() => {
    if (currentIndex >= filteredFoods.length && filteredFoods.length > 0) {
      setCurrentIndex(0)
    }
  }, [filteredFoods.length, currentIndex])

  const currentFood = filteredFoods[currentIndex]

  const handleLike = () => {
    if (!currentFood) return
    setLikedItems((prev) =>
      prev.includes(currentFood.id)
        ? prev.filter((id) => id !== currentFood.id)
        : [...prev, currentFood.id]
    )
  }

  const handleScrap = () => {
    if (!currentFood) return
    setScrappedItems((prev) =>
      prev.includes(currentFood.id)
        ? prev.filter((id) => id !== currentFood.id)
        : [...prev, currentFood.id]
    )
  }

  const handleNext = () => {
    if (currentIndex < filteredFoods.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    )
  }

  const handleAllergenToggle = (allergen: string) => {
    setSelectedAllergens((prev) =>
      prev.includes(allergen)
        ? prev.filter((a) => a !== allergen)
        : [...prev, allergen]
    )
  }

  return (
    <Screen style={$container} preset="fixed">
      {/* Header */}
      <View style={$header}>
        <Text style={$headerTitle}>foodigram</Text>
        
        {/* Search Bar */}
        <View style={$searchContainer}>
          <View style={$searchInputContainer}>
            <TextField
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search foods..."
              containerStyle={$searchInput}
            />
          </View>
          <TouchableOpacity style={$searchButton}>
            <Search size={20} color={colors.palette.neutral100} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={$mainContent}>
        {filteredFoods.length === 0 ? (
          <View style={$emptyState}>
            <Text style={$emptyText}>No foods found</Text>
            <Text style={$emptySubtext}>Try adjusting your filters or search</Text>
          </View>
        ) : currentFood ? (
          <>
            <FoodCard
              food={currentFood}
              isLiked={likedItems.includes(currentFood.id)}
              isScrapped={scrappedItems.includes(currentFood.id)}
              onLike={handleLike}
              onScrap={handleScrap}
            />

            {/* Navigation */}
            <View style={$navigation}>
              <TouchableOpacity
                onPress={handlePrev}
                disabled={currentIndex === 0}
                style={[
                  $navButton,
                  currentIndex === 0 && $navButtonDisabled
                ]}
              >
                <ChevronLeft 
                  size={24} 
                  color={currentIndex === 0 ? colors.palette.neutral400 : colors.palette.neutral700}
                />
              </TouchableOpacity>

              <Text style={$navText}>
                {currentIndex + 1} / {filteredFoods.length}
              </Text>

              <TouchableOpacity
                onPress={handleNext}
                disabled={currentIndex === filteredFoods.length - 1}
                style={[
                  $navButton,
                  currentIndex === filteredFoods.length - 1 && $navButtonDisabled
                ]}
              >
                <ChevronRight 
                  size={24} 
                  color={currentIndex === filteredFoods.length - 1 ? colors.palette.neutral400 : colors.palette.neutral700}
                />
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </View>

      {/* Action Buttons */}
      <View style={$actionButtons}>
        <TouchableOpacity
          style={[$actionButton, isFilterOpen && $actionButtonActive]}
          onPress={() => setIsFilterOpen(true)}
        >
          <Filter size={16} color={colors.palette.neutral700} />
          <Text style={$actionButtonText}>Filter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[$actionButton, showLikedOnly && $actionButtonActive]}
          onPress={() => setShowLikedOnly(!showLikedOnly)}
        >
          <Heart 
            size={16} 
            color={colors.palette.neutral700}
            fill={showLikedOnly ? colors.palette.neutral700 : "none"}
          />
          <Text style={$actionButtonText}>Liked</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[$actionButton, isFriendsOpen && $actionButtonActive]}
          onPress={() => setIsFriendsOpen(true)}
        >
          <Users size={16} color={colors.palette.neutral700} />
          <Text style={$actionButtonText}>Friends</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Tabs */}
      <View style={$bottomTabs}>
        <TouchableOpacity
          style={[
            $tabButton,
            currentTab === "recommendation" && $tabButtonActive
          ]}
          onPress={() => setCurrentTab("recommendation")}
        >
          <Home 
            size={20} 
            color={currentTab === "recommendation" ? colors.palette.primary500 : colors.palette.neutral500}
          />
          <Text 
            style={[
              $tabText,
              currentTab === "recommendation" && $tabTextActive
            ]}
          >
            Recommendation
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            $tabButton,
            currentTab === "profile" && $tabButtonActive
          ]}
          onPress={() => setCurrentTab("profile")}
        >
          <User 
            size={20} 
            color={currentTab === "profile" ? colors.palette.primary500 : colors.palette.neutral500}
          />
          <Text 
            style={[
              $tabText,
              currentTab === "profile" && $tabTextActive
            ]}
          >
            Profile
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter Modal */}
      <Modal visible={isFilterOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={$modalContainer}>
          <View style={$modalHeader}>
            <Text style={$modalTitle}>Filters</Text>
            <TouchableOpacity onPress={() => setIsFilterOpen(false)}>
              <X size={24} color={colors.palette.neutral700} />
            </TouchableOpacity>
          </View>

          <ScrollView style={$modalContent}>
            <Text style={$sectionTitle}>Categories</Text>
            <View style={$filterGrid}>
              {allCategories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    $filterChip,
                    selectedCategories.includes(category) && $filterChipSelected
                  ]}
                  onPress={() => handleCategoryToggle(category)}
                >
                  <Text 
                    style={[
                      $filterChipText,
                      selectedCategories.includes(category) && $filterChipTextSelected
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={$sectionTitle}>Exclude Allergens</Text>
            <View style={$filterGrid}>
              {allAllergens.map((allergen) => (
                <TouchableOpacity
                  key={allergen}
                  style={[
                    $filterChip,
                    selectedAllergens.includes(allergen) && $filterChipSelected
                  ]}
                  onPress={() => handleAllergenToggle(allergen)}
                >
                  <Text 
                    style={[
                      $filterChipText,
                      selectedAllergens.includes(allergen) && $filterChipTextSelected
                    ]}
                  >
                    {allergen}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Friends Modal */}
      <Modal visible={isFriendsOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={$modalContainer}>
          <View style={$modalHeader}>
            <Text style={$modalTitle}>Friends</Text>
            <TouchableOpacity onPress={() => setIsFriendsOpen(false)}>
              <X size={24} color={colors.palette.neutral700} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={friends}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={$friendItem}>
                <Text style={$friendName}>{item.name}</Text>
                <Text style={$friendLikes}>{item.mutualLikes.length} mutual likes</Text>
              </View>
            )}
            style={$modalContent}
          />
        </View>
      </Modal>
    </Screen>
  )
})

const $container: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
}

const $header: ViewStyle = {
  paddingHorizontal: spacing.md,
  paddingTop: spacing.md,
  paddingBottom: spacing.sm,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral200,
}

const $headerTitle: TextStyle = {
  fontSize: 24,
  fontWeight: "bold",
  textAlign: "center",
  marginBottom: spacing.md,
  color: colors.text,
}

const $searchContainer: ViewStyle = {
  flexDirection: "row",
  gap: spacing.sm,
}

const $searchInputContainer: ViewStyle = {
  flex: 1,
}

const $searchInput: ViewStyle = {
  borderRadius: 20,
  backgroundColor: colors.palette.neutral100,
}

const $searchButton: ViewStyle = {
  backgroundColor: colors.palette.primary500,
  borderRadius: 20,
  padding: spacing.sm,
  justifyContent: "center",
  alignItems: "center",
}

const $mainContent: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: spacing.md,
}

const $emptyState: ViewStyle = {
  alignItems: "center",
  paddingHorizontal: spacing.md,
}

const $emptyText: TextStyle = {
  fontSize: 18,
  color: colors.palette.neutral400,
  marginBottom: spacing.xs,
}

const $emptySubtext: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral400,
  textAlign: "center",
}

const $navigation: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: spacing.md,
  marginTop: spacing.lg,
}

const $navButton: ViewStyle = {
  padding: spacing.sm,
  borderRadius: 20,
  backgroundColor: colors.palette.neutral100,
}

const $navButtonDisabled: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
}

const $navText: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral500,
}

const $actionButtons: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-around",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  borderTopWidth: 1,
  borderTopColor: colors.palette.neutral200,
}

const $actionButton: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
  gap: spacing.xs,
}

const $actionButtonActive: ViewStyle = {
  backgroundColor: colors.palette.primary500,
  borderColor: colors.palette.primary500,
}

const $actionButtonText: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral700,
}

const $bottomTabs: ViewStyle = {
  flexDirection: "row",
  borderTopWidth: 1,
  borderTopColor: colors.palette.neutral200,
}

const $tabButton: ViewStyle = {
  flex: 1,
  paddingVertical: spacing.md,
  alignItems: "center",
  gap: spacing.xs,
}

const $tabButtonActive: ViewStyle = {
  backgroundColor: colors.palette.primary100,
}

const $tabText: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral500,
}

const $tabTextActive: TextStyle = {
  color: colors.palette.primary500,
}

const $modalContainer: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
}

const $modalHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral200,
}

const $modalTitle: TextStyle = {
  fontSize: 18,
  fontWeight: "bold",
  color: colors.text,
}

const $modalContent: ViewStyle = {
  flex: 1,
  paddingHorizontal: spacing.md,
}

const $sectionTitle: TextStyle = {
  fontSize: 16,
  fontWeight: "bold",
  marginTop: spacing.lg,
  marginBottom: spacing.sm,
  color: colors.text,
}

const $filterGrid: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.xs,
  marginBottom: spacing.md,
}

const $filterChip: ViewStyle = {
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
  backgroundColor: colors.background,
}

const $filterChipSelected: ViewStyle = {
  backgroundColor: colors.palette.primary500,
  borderColor: colors.palette.primary500,
}

const $filterChipText: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral700,
  textTransform: "capitalize",
}

const $filterChipTextSelected: TextStyle = {
  color: colors.palette.neutral100,
}

const $friendItem: ViewStyle = {
  paddingVertical: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral200,
}

const $friendName: TextStyle = {
  fontSize: 16,
  fontWeight: "bold",
  color: colors.text,
  marginBottom: spacing.xs,
}

const $friendLikes: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral500,
}