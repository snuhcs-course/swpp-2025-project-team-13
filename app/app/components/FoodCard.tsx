import React, { useRef } from "react"
import { View, ViewStyle, TextStyle, TouchableOpacity, Image, ImageStyle } from "react-native"
import Animated, { useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, withSpring } from "react-native-reanimated"
import { Heart, Bookmark } from "lucide-react-native"
import { Text } from "./Text"
import { colors, spacing } from "../theme"
import { FoodItem } from "../types/FoodTypes"

interface FoodCardProps {
  food: FoodItem
  isLiked: boolean
  isScrapped: boolean
  onLike: () => void
  onScrap: () => void
  scale?: number
  maxWidth?: number
  maxHeight?: number
}

export function FoodCard({ food, isLiked, isScrapped, onLike, onScrap, scale = 1, maxWidth, maxHeight }: FoodCardProps) {
  // Create refs for the scroll views
  const titleScrollRef = useRef<Animated.ScrollView>(null)
  const allergenScrollRef = useRef<Animated.ScrollView>(null)
  
  // Shared values for scroll positions and spring animations
  const titleScrollX = useSharedValue(0)
  const allergenScrollX = useSharedValue(0)
  
  // Animated scroll handlers with spring effects
  const titleScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      titleScrollX.value = withSpring(event.contentOffset.x, {
        damping: 15,
        stiffness: 150,
      })
    },
  })
  
  const allergenScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      allergenScrollX.value = withSpring(event.contentOffset.x, {
        damping: 15,
        stiffness: 150,
      })
    },
  })
  
  // Animated styles for subtle visual feedback during scrolling
  const titleContainerAnimatedStyle = useAnimatedStyle(() => {
    const isScrolling = titleScrollX.value > 0
    return {
      opacity: withSpring(isScrolling ? 0.95 : 1, {
        damping: 20,
        stiffness: 300,
      }),
    }
  })
  
  const allergenContainerAnimatedStyle = useAnimatedStyle(() => {
    const isScrolling = allergenScrollX.value > 0
    return {
      opacity: withSpring(isScrolling ? 0.95 : 1, {
        damping: 20,
        stiffness: 300,
      }),
    }
  })
  const dynamicContainerStyle = {
    ...($container as any),
    maxWidth: maxWidth || $container.maxWidth,
    maxHeight: maxHeight || $container.maxHeight,
  }

  const scaledSpacing = {
    xs: spacing.xs * scale,
    sm: spacing.sm * scale,
    md: spacing.md * scale,
    lg: spacing.lg * scale,
  }

  const dynamicStyles = {
    title: { ...($title as any), fontSize: ($title.fontSize || 18) * scale },
    categoryText: { ...($categoryText as any), fontSize: ($categoryText.fontSize || 12) * scale },
    distance: { ...($distance as any), fontSize: ($distance.fontSize || 13) * scale },
    allergenText: { ...($allergenText as any), fontSize: ($allergenText.fontSize || 12) * scale },
    imageContainer: { 
      ...($imageContainer as any), 
      maxHeight: (($imageContainer as any).maxHeight || 320) * scale,
      aspectRatio: 1, // Ensure square ratio is maintained
    },
    infoContainer: { 
      ...($infoContainer as any), 
      // Remove maxHeight constraint to allow allergen buttons to be visible
    },
    headerRow: { 
      ...($headerRow as any), 
      height: (($headerRow as any).height || 85) * scale,
      marginBottom: 0 // Minimize spacing between title/distance and allergens
    },
    categoryBadge: {
      ...($categoryBadge as any),
      paddingHorizontal: scaledSpacing.sm,
      paddingVertical: scaledSpacing.xs,
      maxHeight: 48 * scale,
    },
    allergenBadge: {
      ...($allergenBadge as any),
      paddingHorizontal: scaledSpacing.sm,
      paddingVertical: scaledSpacing.xs,
      // Remove maxHeight constraint to ensure allergen badges are visible
    },
  }

  return (
    <View style={dynamicContainerStyle}>
      {/* Food Image */}
      <View style={dynamicStyles.imageContainer}>
        <Image 
          source={{ uri: food.image }} 
          style={$image}
          resizeMode="cover"
        />
        {/* Category Badge Overlay */}
        <View style={dynamicStyles.categoryBadge}>
          <Text style={dynamicStyles.categoryText}>{food.category}</Text>
        </View>
      </View>

      {/* Food Info */}
      <View style={dynamicStyles.infoContainer}>
        <View style={dynamicStyles.headerRow}>
          <Animated.View style={[$leftContent, titleContainerAnimatedStyle]}>
            {/* Scrollable Title and Distance */}
            <Animated.ScrollView 
              ref={titleScrollRef}
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={$titleScrollContainer}
              contentContainerStyle={$titleContentContainer}
              scrollEnabled={true}
              nestedScrollEnabled={true}
              onScroll={titleScrollHandler}
              scrollEventThrottle={16}
              decelerationRate={0.985}
              bounces={true}
              bouncesZoom={false}
            >
              <View style={$titleRow}>
                <Text style={dynamicStyles.title}>{food.name}</Text>
                <Text style={dynamicStyles.distance}>{food.distance}</Text>
              </View>
            </Animated.ScrollView>
            
          </Animated.View>

          {/* Action buttons */}
          <View style={$actionButtons}>
            <TouchableOpacity onPress={onLike} style={$actionButton}>
              <Heart
                size={24 * scale}
                color={isLiked ? colors.palette.angry500 : colors.palette.neutral800}
                fill={isLiked ? colors.palette.angry500 : "none"}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={onScrap} style={$actionButton}>
              <Bookmark
                size={24 * scale}
                color={isScrapped ? colors.palette.primary500 : colors.palette.neutral800}
                fill={isScrapped ? colors.palette.primary500 : "none"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Allergens */}
        <Animated.View style={[$allergensContainer, allergenContainerAnimatedStyle]}>
          <Animated.ScrollView 
            ref={allergenScrollRef}
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={$allergensScrollContainer}
            contentContainerStyle={$allergensContentContainer}
            scrollEnabled={true}
            nestedScrollEnabled={true}
            onScroll={allergenScrollHandler}
            scrollEventThrottle={16}
            decelerationRate={0.985}
            bounces={true}
            bouncesZoom={false}
          >
            {food.allergens.map((allergen, index) => (
              <View key={index} style={dynamicStyles.allergenBadge}>
                <Text style={dynamicStyles.allergenText}>{allergen}</Text>
              </View>
            ))}
          </Animated.ScrollView>
        </Animated.View>
      </View>
    </View>
  )
}

const $container: ViewStyle = {
  width: "100%",
  alignSelf: "center",
  alignItems: "center", // Center all child elements horizontally
  marginHorizontal: spacing.lg, // Margin on both sides
  maxHeight: 520, // Increased to utilize more screen space
}

const $imageContainer: ViewStyle = {
  width: "100%",
  aspectRatio: 1, // Square image
  maxHeight: 320, // Restored to original height
  borderRadius: 12,
  overflow: "hidden",
  backgroundColor: colors.palette.neutral200,
  marginBottom: spacing.xs, // Reduced spacing
  position: "relative", // Allow absolute positioning of category badge
}

const $image: ImageStyle = {
  width: "100%",
  height: "100%",
}

const $infoContainer: ViewStyle = {
  width: "100%",
  // Removed maxHeight constraint to allow allergen buttons to be visible
  // flex: 1, // Allow to shrink if needed
}

const $headerRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 0, // Minimize spacing between title/distance and allergens
  height: 45, // Slightly increased for better proportions
}

const $leftContent: ViewStyle = {
  flex: 1,
  marginRight: spacing.sm,
}

const $titleScrollContainer: ViewStyle = {
  maxHeight: 50, // Limit title scroll area
  marginBottom: 2, // Minimal spacing between title and distance
}

const $titleContentContainer: ViewStyle = {
  alignItems: "flex-start",
  paddingRight: spacing.md, // Extra padding for scroll
}

const $titleRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  flexWrap: "nowrap", // Don't wrap to ensure horizontal scroll
}

const $title: TextStyle = {
  fontSize: 24,
  fontWeight: "bold",
  top: spacing.xs,
  color: colors.text,
  marginRight: spacing.xs,
  flexShrink: 0, // Don't shrink title text
}

const $categoryBadge: ViewStyle = {
  position: "absolute",
  top: spacing.xs,
  right: spacing.xs,
  backgroundColor: colors.palette.primary100,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 8, // Match the food image container border radius
  shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: 1,
  },
  shadowOpacity: 0.2,
  shadowRadius: 2,
  elevation: 3,
}

const $categoryText: TextStyle = {
  fontSize: 12,
  color: colors.palette.primary600,
  textTransform: "capitalize",
}

const $distance: TextStyle = {
  fontSize: 16,
  color: colors.palette.neutral600,
  top: spacing.xs,
  marginLeft: spacing.xs, // Add left margin since it's now next to title
  flexShrink: 0, // Don't shrink distance text
}

const $actionButtons: ViewStyle = {
  flexDirection: "row",
  marginTop: spacing.xxs,
  gap: spacing.xs, // Reduced gap for tighter layout
}

const $actionButton: ViewStyle = {
  padding: spacing.xxs,
}

const $allergensContainer: ViewStyle = {
  borderRadius: 12,
  backgroundColor: colors.palette.neutral100,
  marginTop: spacing.xxs,
  overflow: "hidden",
}

const $allergensScrollContainer: ViewStyle = {
  // Remove maxHeight constraint to ensure allergen badges are visible
}

const $allergensContentContainer: ViewStyle = {
  flexDirection: "row",
  gap: spacing.xs,
  paddingLeft: spacing.xs,
  paddingRight: spacing.xs, // Extra padding for scroll
}

const $allergenBadge: ViewStyle = {
  // backgroundColor: colors.palette.neutral100,
  // borderWidth: 1,
  // borderColor: colors.palette.neutral300,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 12,
  alignSelf: "center", // Center vertically within allergen container
  flexShrink: 0, // Don't shrink allergen badges
}

const $allergenText: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral700,
  textTransform: "capitalize",
}