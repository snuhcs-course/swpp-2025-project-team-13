import React from "react"
import { View, ViewStyle, TextStyle, TouchableOpacity, Image, ImageStyle, ScrollView } from "react-native"
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
      maxHeight: (($infoContainer as any).maxHeight || 180) * scale 
    },
    headerRow: { 
      ...($headerRow as any), 
      height: (($headerRow as any).height || 85) * scale,
      marginBottom: scaledSpacing.xs / 4
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
      maxHeight: 43 * scale,
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
      </View>

      {/* Food Info */}
      <View style={dynamicStyles.infoContainer}>
        <View style={dynamicStyles.headerRow}>
          <View style={$leftContent}>
            {/* Scrollable Title and Category */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={$titleScrollContainer}
              contentContainerStyle={$titleContentContainer}
            >
              <View style={$titleRow}>
                <Text style={dynamicStyles.title}>{food.name}</Text>
                <View style={dynamicStyles.categoryBadge}>
                  <Text style={dynamicStyles.categoryText}>{food.category}</Text>
                </View>
              </View>
            </ScrollView>
            
            {/* Fixed Distance */}
            <Text style={dynamicStyles.distance}>{food.distance}</Text>
          </View>

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
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={$allergensScrollContainer}
          contentContainerStyle={$allergensContentContainer}
        >
          {food.allergens.map((allergen, index) => (
            <View key={index} style={dynamicStyles.allergenBadge}>
              <Text style={dynamicStyles.allergenText}>{allergen}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  )
}

const $container: ViewStyle = {
  width: "100%",
  maxWidth: 380, // Slightly larger for better screen utilization
  alignSelf: "center",
  marginHorizontal: spacing.sm, // Reduced margin for more space
  maxHeight: 520, // Increased to utilize more screen space
}

const $imageContainer: ViewStyle = {
  width: "100%",
  aspectRatio: 1, // Square image
  maxHeight: 320, // Increased image height
  borderRadius: 12,
  overflow: "hidden",
  backgroundColor: colors.palette.neutral200,
  marginBottom: spacing.xs, // Reduced spacing
}

const $image: ImageStyle = {
  width: "100%",
  height: "100%",
}

const $infoContainer: ViewStyle = {
  width: "100%",
  maxHeight: 180, // Increased info section height
  flex: 1, // Allow to shrink if needed
}

const $headerRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: spacing.xs / 4, // Even further reduced spacing between distance and allergens
  height: 85, // Slightly increased for better proportions
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
  minWidth: 180, // Minimum width to ensure content is readable
}

const $title: TextStyle = {
  fontSize: 18,
  fontWeight: "bold",
  color: colors.text,
  marginRight: spacing.sm,
  flexShrink: 0, // Don't shrink title text
}

const $categoryBadge: ViewStyle = {
  backgroundColor: colors.palette.primary100,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 16,
  alignSelf: "center", // Center vertically within title container
  maxHeight: 48, // Don't exceed title scroll container height
}

const $categoryText: TextStyle = {
  fontSize: 12,
  color: colors.palette.primary600,
  textTransform: "capitalize",
}

const $distance: TextStyle = {
  fontSize: 13,
  color: colors.palette.neutral600,
  marginTop: 0, // Remove top margin for tighter spacing
}

const $actionButtons: ViewStyle = {
  flexDirection: "row",
  gap: spacing.xs, // Reduced gap for tighter layout
}

const $actionButton: ViewStyle = {
  padding: spacing.xs,
}

const $allergensScrollContainer: ViewStyle = {
  maxHeight: 45, // Slightly reduced for tighter layout
}

const $allergensContentContainer: ViewStyle = {
  flexDirection: "row",
  gap: spacing.xs,
  paddingRight: spacing.md, // Extra padding for scroll
}

const $allergenBadge: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 16,
  alignSelf: "center", // Center vertically within allergen container
  maxHeight: 43, // Don't exceed allergen scroll container height
}

const $allergenText: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral700,
  textTransform: "capitalize",
}