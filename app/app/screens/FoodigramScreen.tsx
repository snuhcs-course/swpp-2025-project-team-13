import React, { useState, useEffect } from "react"
import { observer } from "mobx-react-lite"
import {
  View,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Dimensions,
} from "react-native"
import { Search, Filter, Heart, Users, Home, User, ChevronLeft, ChevronRight, X } from "lucide-react-native"
import { Text, TextField } from "../components"
import { FoodCard } from "../components/FoodCard"
import { colors, spacing } from "../theme"
import { foodItems, friends, allCategories, allAllergens } from "../data/mockData"
import { FoodItem } from "../types/FoodTypes"
import { AppStackScreenProps } from "../navigators"
import { useStores } from "../models"

interface FoodigramScreenProps extends AppStackScreenProps<"Foodigram"> {}

export const FoodigramScreen: React.FC<FoodigramScreenProps> = observer(function FoodigramScreen({ navigation }) {
  const { foodHistoryStore } = useStores()
  const [searchQuery, setSearchQuery] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [likedItems, setLikedItems] = useState<number[]>([])
  const [showLikedOnly, setShowLikedOnly] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isFriendsOpen, setIsFriendsOpen] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>(allCategories)
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([])
  const [screenData, setScreenData] = useState(Dimensions.get('window'))

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

  // Listen for screen dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window)
    })
    
    return () => subscription?.remove()
  }, [])

  // Reset index when filters change
  useEffect(() => {
    if (currentIndex >= filteredFoods.length && filteredFoods.length > 0) {
      setCurrentIndex(0)
    }
  }, [filteredFoods.length, currentIndex])

  const currentFood = filteredFoods[currentIndex]

  // Calculate dynamic padding and food card sizing based on screen height
  const getDynamicStyles = () => {
    const { height, width } = screenData
    
    // Base measurements for fixed elements
    const headerHeight = 120 // Approximate header height
    const actionButtonsHeight = 80 // Approximate action buttons height with increased padding
    const bottomTabsHeight = 55 // Approximate bottom tabs height
    const navigationHeight = 50 // Navigation arrows height
    const minPadding = spacing.sm * 2 // Minimum total padding needed
    
    // Calculate maximum available space for food card
    const maxFoodCardHeight = height - headerHeight - actionButtonsHeight - bottomTabsHeight - navigationHeight - minPadding
    const maxFoodCardWidth = width - (spacing.sm * 4) // Account for horizontal margins
    
    // Define ideal food card dimensions
    const idealCardHeight = 520
    const idealCardWidth = 380
    
    // Calculate scaling factor based on available space
    const heightScale = Math.min(1, maxFoodCardHeight / idealCardHeight)
    const widthScale = Math.min(1, maxFoodCardWidth / idealCardWidth)
    const scale = Math.min(heightScale, widthScale, 1) // Don't scale up, only down
    
    // Calculate actual food card dimensions
    const actualCardHeight = idealCardHeight * scale
    const actualCardWidth = idealCardWidth * scale
    
    // Recalculate available space with actual card size
    const availableHeight = height - headerHeight - actionButtonsHeight - bottomTabsHeight - actualCardHeight - navigationHeight
    
    // Split available space to center food card between search bar and action buttons
    const headerToCardPadding = Math.max(spacing.sm, availableHeight / 2) // Between search bar and food card
    const arrowsToActionPadding = Math.max(spacing.sm, availableHeight / 2) // Between arrows and action buttons
    
    return {
      headerToCardPadding,
      arrowsToActionPadding,
      foodCardScale: scale,
      foodCardHeight: actualCardHeight,
      foodCardWidth: actualCardWidth,
    }
  }

  const dynamicStyles = getDynamicStyles()

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
    foodHistoryStore.toggleScrappedItem(currentFood)
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
    <View style={$container}>
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

      {/* Main Content - Centered between header and action buttons */}
      <View style={$mainContent}>
        <View style={{ flex: 1 }} />
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
              isScrapped={foodHistoryStore.isScrapped(currentFood.id)}
              onLike={handleLike}
              onScrap={handleScrap}
              scale={dynamicStyles.foodCardScale}
              maxWidth={dynamicStyles.foodCardWidth}
              maxHeight={dynamicStyles.foodCardHeight}
            />

            {/* Navigation */}
            <View style={[$navigation, { marginTop: spacing.lg }]}>
              <TouchableOpacity
                onPress={handlePrev}
                disabled={currentIndex === 0}
                style={[
                  $navButton,
                  currentIndex === 0 && $navButtonDisabled
                ]}
              >
                <ChevronLeft 
                  size={16} 
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
                  size={16} 
                  color={currentIndex === filteredFoods.length - 1 ? colors.palette.neutral400 : colors.palette.neutral700}
                />
              </TouchableOpacity>
            </View>
          </>
        ) : null}
        <View style={{ flex: 1 }} />
      </View>

      {/* Action Buttons */}
      <View style={$actionButtons}>
        <TouchableOpacity
          style={[
            $actionButton, 
            showLikedOnly && $actionButtonActive,
            isFilterOpen && $actionButtonHighlighted,
            (isFilterOpen || isFriendsOpen) && !isFilterOpen && $actionButtonDimmed
          ]}
          onPress={() => setIsFilterOpen(true)}
        >
          <Filter size={16} color={colors.palette.neutral700} />
          <Text style={$actionButtonText}>Filter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            $actionButton, 
            showLikedOnly && $actionButtonActive,
            (isFilterOpen || isFriendsOpen) && $actionButtonDimmed
          ]}
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
          style={[
            $actionButton, 
            showLikedOnly && $actionButtonActive,
            isFriendsOpen && $actionButtonHighlighted,
            (isFilterOpen || isFriendsOpen) && !isFriendsOpen && $actionButtonDimmed
          ]}
          onPress={() => setIsFriendsOpen(true)}
        >
          <Users size={16} color={colors.palette.neutral700} />
          <Text style={$actionButtonText}>Friends</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Tabs */}
      <View style={$bottomTabs}>
        <TouchableOpacity
          style={[$tabButton, $tabButtonActive]}
          onPress={() => {
            // already on Recommendation (Foodigram)
            navigation.navigate("Foodigram")
          }}
        >
          <Home 
            size={28} 
            color={colors.palette.primary500}
          />
          <Text 
            style={[$tabText, $tabTextActive]}
          >
            Recommendation
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={$tabButton}
          onPress={() => navigation.navigate("Profile")}
        >
          <User 
            size={28} 
            color={colors.palette.neutral500}
          />
          <Text 
            style={$tabText}
          >
            Profile
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter Speech Bubble */}
      {isFilterOpen && (
        <View style={$speechBubbleContainer}>
          <View style={$speechBubble}>
            <View style={$speechBubbleHeader}>
              <Text style={$speechBubbleTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setIsFilterOpen(false)}>
                <X size={20} color={colors.palette.neutral700} />
              </TouchableOpacity>
            </View>

            <ScrollView style={$speechBubbleContent} showsVerticalScrollIndicator={false}>
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
        </View>
      )}

      {/* Friends Speech Bubble */}
      {isFriendsOpen && (
        <View style={$speechBubbleContainer}>
          <View style={$speechBubble}>
            <View style={$speechBubbleHeader}>
              <Text style={$speechBubbleTitle}>Friends</Text>
              <TouchableOpacity onPress={() => setIsFriendsOpen(false)}>
                <X size={20} color={colors.palette.neutral700} />
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
              style={$speechBubbleContent}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      )}
    </View>
  )
})

const $container: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
  paddingBottom: 65 + spacing.lg + 60, // Space for larger bottom tabs + increased action buttons margin + action buttons height
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
  position: "absolute",
  bottom: 65 + spacing.lg, // Increased margin above larger bottom tabs
  left: 0,
  right: 0,
  flexDirection: "row",
  justifyContent: "space-around",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.md,
  borderTopWidth: 1,
  borderTopColor: colors.palette.neutral200,
  backgroundColor: colors.background,
}

const $actionButton: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: 20,
  gap: spacing.xs,
}

const $actionButtonActive: ViewStyle = {
  backgroundColor: colors.palette.primary500,
}

const $actionButtonText: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral700,
}

const $bottomTabs: ViewStyle = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  height: 65, // Increased height to accommodate larger icons and text
  flexDirection: "row",
  borderTopWidth: 1,
  borderTopColor: colors.palette.neutral200,
  backgroundColor: colors.background,
}

const $tabButton: ViewStyle = {
  flex: 1,
  height: "100%", // Take full height of parent
  alignItems: "center",
  justifyContent: "space-evenly", // Distribute space evenly
  flexDirection: "column", // Ensure vertical layout
  paddingTop: spacing.sm, // Increased top margin for icon
  paddingBottom: spacing.sm, // Equal bottom margin
}

const $tabButtonActive: ViewStyle = {
  backgroundColor: colors.palette.primary100,
}

const $tabText: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral500,
}

const $tabTextActive: TextStyle = {
  color: colors.palette.primary500,
}

const $speechBubbleContainer: ViewStyle = {
  position: "absolute",
  top: 120, // Start from bottom of search bar
  bottom: 65, // End at top of bottom tabs (fill completely)
  left: 0,
  right: 0,
  backgroundColor: "rgba(0, 0, 0, 0.4)", // Semi-transparent overlay covering full area
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: spacing.md,
}

const $speechBubble: ViewStyle = {
  backgroundColor: colors.background,
  borderRadius: 16,
  width: "85%", // Fixed width for consistent sizing
  maxHeight: "90%",
  minHeight: "60%",
  shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: 4,
  },
  shadowOpacity: 0.25,
  shadowRadius: 8,
  elevation: 8,
}

const $speechBubbleHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral200,
}

const $speechBubbleTitle: TextStyle = {
  fontSize: 16,
  fontWeight: "bold",
  color: colors.text,
}

const $speechBubbleContent: ViewStyle = {
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

const $actionButtonHighlighted: ViewStyle = {
  backgroundColor: colors.background, // Keep clicked button bright and undarkened
  shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: 2,
  },
  shadowOpacity: 0.15,
  shadowRadius: 4,
  elevation: 4,
}

const $actionButtonDimmed: ViewStyle = {
  backgroundColor: "rgba(0, 0, 0, 0.4)", // Apply same darkening as other components
}