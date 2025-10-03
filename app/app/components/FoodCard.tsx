import React from "react"
import { View, ViewStyle, TextStyle, TouchableOpacity, Image, ImageStyle } from "react-native"
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
}

export function FoodCard({ food, isLiked, isScrapped, onLike, onScrap }: FoodCardProps) {
  return (
    <View style={$container}>
      {/* Food Image */}
      <View style={$imageContainer}>
        <Image 
          source={{ uri: food.image }} 
          style={$image}
          resizeMode="cover"
        />
      </View>

      {/* Food Info */}
      <View style={$infoContainer}>
        <View style={$headerRow}>
          <View style={$textContainer}>
            <View style={$titleRow}>
              <Text style={$title}>{food.name}</Text>
              <View style={$categoryBadge}>
                <Text style={$categoryText}>{food.category}</Text>
              </View>
            </View>
            <Text style={$distance}>{food.distance}</Text>
          </View>

          {/* Action buttons */}
          <View style={$actionButtons}>
            <TouchableOpacity onPress={onLike} style={$actionButton}>
              <Heart
                size={28}
                color={isLiked ? colors.palette.angry500 : colors.palette.neutral800}
                fill={isLiked ? colors.palette.angry500 : "none"}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={onScrap} style={$actionButton}>
              <Bookmark
                size={28}
                color={isScrapped ? colors.palette.primary500 : colors.palette.neutral800}
                fill={isScrapped ? colors.palette.primary500 : "none"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Allergens */}
        <View style={$allergensContainer}>
          {food.allergens.map((allergen, index) => (
            <View key={index} style={$allergenBadge}>
              <Text style={$allergenText}>{allergen}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}

const $container: ViewStyle = {
  width: "100%",
  maxWidth: 360,
  alignSelf: "center",
  marginHorizontal: spacing.md,
}

const $imageContainer: ViewStyle = {
  width: "100%",
  aspectRatio: 1,
  borderRadius: 12,
  overflow: "hidden",
  backgroundColor: colors.palette.neutral200,
  marginBottom: spacing.sm,
}

const $image: ImageStyle = {
  width: "100%",
  height: "100%",
}

const $infoContainer: ViewStyle = {
  width: "100%",
}

const $headerRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: spacing.sm,
}

const $textContainer: ViewStyle = {
  flex: 1,
  marginRight: spacing.sm,
}

const $titleRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: spacing.xs,
  flexWrap: "wrap",
}

const $title: TextStyle = {
  fontSize: 18,
  fontWeight: "bold",
  color: colors.text,
  marginRight: spacing.sm,
}

const $categoryBadge: ViewStyle = {
  backgroundColor: colors.palette.primary100,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 16,
}

const $categoryText: TextStyle = {
  fontSize: 12,
  color: colors.palette.primary600,
  textTransform: "capitalize",
}

const $distance: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral600,
}

const $actionButtons: ViewStyle = {
  flexDirection: "row",
  gap: spacing.sm,
}

const $actionButton: ViewStyle = {
  padding: spacing.xs,
}

const $allergensContainer: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: spacing.xs,
}

const $allergenBadge: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderRadius: 16,
}

const $allergenText: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral700,
  textTransform: "capitalize",
}