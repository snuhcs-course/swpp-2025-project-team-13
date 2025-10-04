import React from "react"
import { observer } from "mobx-react-lite"
import {
  View,
  ViewStyle,
  TextStyle,
  ScrollView,
  Image,
  ImageStyle,
  TouchableOpacity,
  Dimensions,
} from "react-native"
import { ChevronLeft, Home, User } from "lucide-react-native"
import { Text } from "../components"
import { colors, spacing } from "../theme"
import { AppStackScreenProps } from "../navigators"
import { useStores } from "../models"

interface ProfileScreenProps extends AppStackScreenProps<"Profile"> {}

export const ProfileScreen: React.FC<ProfileScreenProps> = observer(function ProfileScreen({ navigation }) {
  const { foodHistoryStore } = useStores()
  const screenWidth = Dimensions.get('window').width
  const imageSize = (screenWidth - spacing.md * 3 - 12) / 2 // 2 columns with padding

  // Mock data for profile
  const user = {
    name: "Sophia",
    role: "Foodie",
    tags: ["Italian", "Seafood", "Desserts"],
  }

  const likedRestaurants = [
    { id: 1, name: "The Pasta Place", image: require("../../assets/images/restaurant1.jpg") },
    { id: 2, name: "Ocean's Catch", image: require("../../assets/images/restaurant2.jpg") },
    { id: 3, name: "Sweet Garden", image: require("../../assets/images/restaurant3.jpg") },
  ]

  // Get scrapped items from store
  const scrappedFoods = foodHistoryStore.scrappedItemsList

  return (
    <View style={$container}>
      {/* Header */}
      <View style={$header}>
        <TouchableOpacity 
          style={$backButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={$headerTitle}>History</Text>
        <View style={$backButton} />
      </View>

      {/* Scrollable Content */}
      <ScrollView style={$scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={$profileSection}>
          {/* Profile Image */}
          <View style={$profileImageContainer}>
            <View style={$profileImage} />
          </View>

          {/* User Name */}
          <Text style={$userName}>{user.name}</Text>

          {/* Foodie Label */}
          <Text style={$userRole}>{user.role}</Text>
        </View>

        {/* Food Tags */}
        <View style={$tagsContainer}>
          {user.tags.map((tag, index) => (
            <View key={index} style={$tag}>
              <Text style={$tagText}>{tag}</Text>
            </View>
          ))}
        </View>

        {/* Liked Restaurants Section */}
        <Text style={$sectionTitle}>Liked Restaurants</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={$restaurantsScroll}
          style={$restaurantsScrollView}
        >
          {likedRestaurants.map((restaurant) => (
            <TouchableOpacity key={restaurant.id} style={$restaurantCard}>
              <View style={$restaurantImageContainer}>
                <Image 
                  source={restaurant.image} 
                  style={$restaurantImage}
                  resizeMode="cover"
                />
              </View>
              <Text style={$restaurantName}>{restaurant.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Food History Section */}
        <Text style={$sectionTitle}>Food History</Text>
        {scrappedFoods.length === 0 ? (
          <View style={$emptyState}>
            <Text style={$emptyText}>No scrapped foods yet</Text>
            <Text style={$emptySubtext}>Scrap foods from the Recommendation tab to see them here!</Text>
          </View>
        ) : (
          <View style={$foodGrid}>
            {scrappedFoods.map((food) => (
              <TouchableOpacity 
                key={food.id} 
                style={[$foodCard, { width: imageSize }]}
              >
                <Image 
                  source={{ uri: food.image }} 
                  style={[$foodImage, { width: imageSize, height: 160 }]}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom Tabs */}
      <View style={$bottomTabs}>
        <TouchableOpacity
          style={$tabButton}
          onPress={() => navigation.navigate("Foodigram")}
        >
          <Home 
            size={28} 
            color={colors.palette.neutral500}
          />
          <Text style={$tabText}>Recommendation</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[$tabButton, $tabButtonActive]}
        >
          <User 
            size={28} 
            color={colors.palette.primary500}
          />
          <Text style={[$tabText, $tabTextActive]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
})

const $container: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
  paddingBottom: 65, // Space for bottom tabs
}

const $header: ViewStyle = {
  height: 56,
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: colors.background,
  paddingHorizontal: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral200,
}

const $backButton: ViewStyle = {
  width: 40,
  height: 40,
  justifyContent: "center",
  alignItems: "center",
}

const $headerTitle: TextStyle = {
  fontSize: 18,
  fontWeight: "bold",
  color: colors.text,
}

const $scrollView: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
}

const $profileSection: ViewStyle = {
  alignItems: "center",
  paddingTop: spacing.lg,
  paddingBottom: spacing.md,
}

const $profileImageContainer: ViewStyle = {
  width: 100,
  height: 100,
  borderRadius: 50,
  overflow: "hidden",
  marginBottom: spacing.sm,
}

const $profileImage: ViewStyle = {
  width: "100%",
  height: "100%",
  backgroundColor: "#E8C4A8",
}

const $userName: TextStyle = {
  fontSize: 22,
  fontWeight: "bold",
  color: colors.text,
  marginTop: spacing.sm,
}

const $userRole: TextStyle = {
  fontSize: 14,
  color: "#FF6B9D",
  marginTop: spacing.xs,
}

const $tagsContainer: ViewStyle = {
  flexDirection: "row",
  justifyContent: "center",
  gap: spacing.sm,
  paddingHorizontal: spacing.lg,
  marginBottom: spacing.lg,
  flexWrap: "wrap",
}

const $tag: ViewStyle = {
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.xs,
  backgroundColor: "#F0F0F0",
  borderRadius: 16,
}

const $tagText: TextStyle = {
  fontSize: 14,
  color: colors.text,
}

const $sectionTitle: TextStyle = {
  fontSize: 18,
  fontWeight: "bold",
  color: colors.text,
  marginLeft: spacing.lg,
  marginBottom: spacing.md,
  marginTop: spacing.xs,
}

const $restaurantsScrollView: ViewStyle = {
  marginBottom: spacing.lg,
}

const $restaurantsScroll: ViewStyle = {
  paddingHorizontal: spacing.lg,
  gap: spacing.md,
}

const $restaurantCard: ViewStyle = {
  width: 140,
  marginRight: spacing.md,
}

const $restaurantImageContainer: ViewStyle = {
  width: 140,
  height: 140,
  borderRadius: 12,
  overflow: "hidden",
  backgroundColor: "#FFD4C4",
  marginBottom: spacing.sm,
}

const $restaurantImage: ImageStyle = {
  width: "100%",
  height: "100%",
}

const $restaurantName: TextStyle = {
  fontSize: 14,
  fontWeight: "bold",
  color: colors.text,
}

const $foodGrid: ViewStyle = {
  flexDirection: "row",
  flexWrap: "wrap",
  paddingHorizontal: spacing.lg,
  gap: 12,
  paddingBottom: spacing.xl,
}

const $foodCard: ViewStyle = {
  marginBottom: spacing.sm,
}

const $foodImage: ImageStyle = {
  borderRadius: 12,
  backgroundColor: "#D5D5D5",
}

const $emptyState: ViewStyle = {
  alignItems: "center",
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.xl,
}

const $emptyText: TextStyle = {
  fontSize: 16,
  color: colors.palette.neutral400,
  marginBottom: spacing.xs,
  fontWeight: "bold",
}

const $emptySubtext: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral400,
  textAlign: "center",
}

const $bottomTabs: ViewStyle = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  height: 65,
  flexDirection: "row",
  borderTopWidth: 1,
  borderTopColor: colors.palette.neutral200,
  backgroundColor: colors.background,
}

const $tabButton: ViewStyle = {
  flex: 1,
  height: "100%",
  alignItems: "center",
  justifyContent: "space-evenly",
  flexDirection: "column",
  paddingTop: spacing.sm,
  paddingBottom: spacing.sm,
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
