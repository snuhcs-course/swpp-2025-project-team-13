import React, { useEffect, useState } from "react"
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
import { Home, User, Filter, RefreshCw, X, Settings } from "lucide-react-native"
import { Text, RestaurantDetailModal, PreferencesModal } from "../components"
import { colors, spacing } from "../theme"
import { AppStackScreenProps } from "../navigators"
import { useStores } from "../models"
import { api } from "app/services/api"
import * as storage from "app/utils/storage"
import { allCategories, allAllergens } from "../data/mockData"
import * as MediaLibrary from 'expo-media-library';
import { processAlbum } from "app/services/albums/processAlbum"
import { handleSignOut } from "app/services/aws/handleAwsSignin"


interface ProfileScreenProps extends AppStackScreenProps<"Profile"> {}

export const ProfileScreen: React.FC<ProfileScreenProps> = observer(function ProfileScreen({ navigation }) {
  const { foodHistoryStore } = useStores()
  const screenWidth = Dimensions.get('window').width
  const imageSize = (screenWidth - spacing.md * 3 - 12) / 2 // 2 columns with padding
  const [userName, setUserName] = useState("Sophia")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [hideUserImages, setHideUserImages] = useState(false)
  const [hideScrappedImages, setHideScrappedImages] = useState(false)
  const [excludedCategories, setExcludedCategories] = useState<string[]>([])
  const [excludedAllergens, setExcludedAllergens] = useState<string[]>([])
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isPreferencesModalVisible, setIsPreferencesModalVisible] = useState(false)
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();

  const [userImages, setUserImages] = useState<Array<{id: string, type: string, image: any, name: string}>>([
    { id: 'user1', type: 'user', image: require("../../assets/images/restaurant1.jpg"), name: 'My Food Photo 1' },
    { id: 'user2', type: 'user', image: require("../../assets/images/restaurant2.jpg"), name: 'My Food Photo 2' },
  ]);

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.me()
        const d: any = res.data
        if (mounted && res.ok && d && d.username) setUserName(d.username)
      } catch (e) {
        // ignore
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  // Mock data for profile
  const user = {
    name: userName,
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
  
  // Convert scrapped foods to consistent format
  const scrappedImages = scrappedFoods.map(food => ({
    id: food.id.toString(),
    type: 'scrapped',
    image: { uri: food.image },
    name: food.name
  }))
  
  // Combine and filter all images
  const getAllImages = (): Array<{id: string, type: string, image: any, name: string}> => {
    let allImages: Array<{id: string, type: string, image: any, name: string}> = []
    
    if (!hideUserImages) {
      allImages = [...allImages, ...userImages]
    }
    
    if (!hideScrappedImages) {
      allImages = [...allImages, ...scrappedImages]
    }
    
    return allImages
  }
  
  // Filter images based on category and allergen exclusions
  const getFilteredImages = () => {
    const allImages = getAllImages()
    
    return allImages.filter(item => {
      // Find the corresponding food item from scrapped foods
      const foodItem = scrappedFoods.find(food => food.id.toString() === item.id)
      
      if (foodItem) {
        // Check category exclusion
        if (excludedCategories.includes(foodItem.category)) {
          return false
        }
        
        // Check allergen exclusion
        if (foodItem.allergens && foodItem.allergens.some(allergen => excludedAllergens.includes(allergen))) {
          return false
        }
      }
      
      return true
    })
  }
  
  const filteredImages = getFilteredImages()

  // Album sync functionality
  async function getAlbums() {
    if (permissionResponse?.status !== 'granted') {
      await requestPermission();
    }
    const fetchedAlbums = await MediaLibrary.getAlbumsAsync({
      includeSmartAlbums: true,
    });
    for (const album of fetchedAlbums) {
      if (album.assetCount == 0) {
        continue; // skip empty albums
      }
      if (album.title.toLowerCase().includes('camera')) {
        processAlbum(album, userImages, setUserImages);
      }
    }
  }

  return (
    <View style={$container}>
      {/* Scrollable Content */}
      <ScrollView style={$scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={$headerInScroll}>
          <Text style={$headerTitle}>foodigram</Text>
        </View>

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
          <TouchableOpacity 
            style={$settingsButton}
            onPress={() => setIsPreferencesModalVisible(true)}
          >
            <Settings size={16} color={colors.palette.neutral600} />
          </TouchableOpacity>
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
        <View style={$sectionTitleContainer}>
          <Text style={$sectionTitle}>Food History</Text>
          <View style={$sectionButtons}>
            <TouchableOpacity
              style={$sectionButton}
              onPress={() => {
                if (__DEV__) {
                  console.log('Profile: opened filter panel')
                }
                setIsFilterOpen(true)
              }}
            >
              <Filter size={16} color={colors.palette.neutral700} />
            </TouchableOpacity>
            <TouchableOpacity
              style={$sectionButton}
              onPress={getAlbums}
            >
              <RefreshCw size={16} color={colors.palette.neutral700} />
            </TouchableOpacity>
          </View>
        </View>
        {filteredImages.length === 0 ? (
          <View style={$emptyState}>
            <Text style={$emptyText}>No food images to show</Text>
            <Text style={$emptySubtext}>
              {hideUserImages && hideScrappedImages 
                ? "All content types are hidden. Adjust filters to see your food images!" 
                : hideScrappedImages 
                ? "Scrapped images are hidden or no images match your filters. Adjust filters or scrap foods from the Recommendation tab!" 
                : "Add photos to your 'Foodigram' album or scrap foods from Recommendation!"}
            </Text>
          </View>
        ) : (
          <View style={$foodGrid}>
            {filteredImages.map((item) => 
              {
                console.log('Rendering image item: ', item);
                return (              <TouchableOpacity 
                key={item.id} 
                style={[$foodCard, { width: imageSize }]}
                onPress={() => {
                  if (item.type === 'scrapped') {
                    // 스크랩된 음식점 클릭 시 모달 열기
                    setSelectedRestaurantId(parseInt(item.id))
                    setIsModalVisible(true)
                    if (__DEV__) {
                      console.log(`Profile: Opened restaurant detail modal for ID ${item.id}`)
                    }
                  }
                }}
              >
                <Image 
                  source={item.image} 
                  style={[$foodImage, { width: imageSize, height: 160 }]}
                  resizeMode="cover"
                />
                {/* Show type indicator */}
                <View style={item.type === 'user' ? $userImageBadge : $scrappedImageBadge}>
                  <Text style={$imageBadgeText}>{item.type === 'user' ? 'U' : 'S'}</Text>
                </View>
              </TouchableOpacity>);}

            )}
          </View>
        )}

        {/* Logout Button */}
        <TouchableOpacity
          style={$logoutButton}
          onPress={async () => {
            try {
              await api.logout()
              await handleSignOut();
            } catch (e) {
              // ignore network errors and continue logout locally
            }
            await storage.remove("IS_LOGGED_IN")
            navigation.replace("Login")
          }}
        >
          <Text style={$logoutText}>Log out</Text>
        </TouchableOpacity>
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
        </TouchableOpacity>

        <TouchableOpacity
          style={[$tabButton, $tabButtonActive]}
        >
          <User 
            size={28} 
            color={colors.palette.primary500}
          />
        </TouchableOpacity>
      </View>

      {/* Filter Modal */}
      {isFilterOpen && (
        <View style={$speechBubbleContainer}>
          <TouchableOpacity 
            style={$speechBubbleBackdrop}
            activeOpacity={1}
            onPress={() => {
              if (__DEV__) {
                console.log('Profile: closed filter panel')
              }
              setIsFilterOpen(false)
            }}
          />
          <View style={$speechBubble}>
            <View style={$speechBubbleHeader}>
              <Text style={$speechBubbleTitle}>History Filters</Text>
              <TouchableOpacity onPress={() => {
                if (__DEV__) {
                  console.log('Profile: closed filter panel (X button)')
                }
                setIsFilterOpen(false)
              }}>
                <X size={20} color={colors.palette.neutral700} />
              </TouchableOpacity>
            </View>

            <ScrollView style={$speechBubbleContent} showsVerticalScrollIndicator={false}>
              <Text style={$filterSectionTitle}>Hide Content</Text>
              <View style={$filterGrid}>
                <TouchableOpacity
                  style={[
                    $filterChip,
                    hideUserImages && $filterChipSelected
                  ]}
                  onPress={() => {
                    if (__DEV__) {
                      console.log(`Profile: ${!hideUserImages ? 'hiding' : 'showing'} User Images`)
                    }
                    setHideUserImages(!hideUserImages)
                  }}
                >
                  <Text style={[
                      $filterChipText,
                      hideUserImages && $filterChipTextSelected
                    ]}
                  >
                    User Images
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    $filterChip,
                    hideScrappedImages && $filterChipSelected
                  ]}
                  onPress={() => {
                    if (__DEV__) {
                      console.log(`Profile: ${!hideScrappedImages ? 'hiding' : 'showing'} Scrapped Images`)
                    }
                    setHideScrappedImages(!hideScrappedImages)
                  }}
                >
                  <Text style={[
                      $filterChipText,
                      hideScrappedImages && $filterChipTextSelected
                    ]}
                  >
                    Scrapped
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={$filterSectionTitle}>Exclude Categories</Text>
              <View style={$filterGrid}>
                {allCategories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      $filterChip,
                      excludedCategories.includes(category) && $filterChipSelected
                    ]}
                    onPress={() => {
                      if (__DEV__) {
                        console.log(`Profile: ${excludedCategories.includes(category) ? 'including' : 'excluding'} category "${category}"`)
                      }
                      setExcludedCategories(prev =>
                        prev.includes(category)
                          ? prev.filter(c => c !== category)
                          : [...prev, category]
                      )
                    }}
                  >
                    <Text style={[
                        $filterChipText,
                        excludedCategories.includes(category) && $filterChipTextSelected
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={$filterSectionTitle}>Exclude Allergens</Text>
              <View style={$filterGrid}>
                {allAllergens.map((allergen) => (
                  <TouchableOpacity
                    key={allergen}
                    style={[
                      $filterChip,
                      excludedAllergens.includes(allergen) && $filterChipSelected
                    ]}
                    onPress={() => {
                      if (__DEV__) {
                        console.log(`Profile: ${excludedAllergens.includes(allergen) ? 'allowing' : 'excluding'} allergen "${allergen}"`)
                      }
                      setExcludedAllergens(prev =>
                        prev.includes(allergen)
                          ? prev.filter(a => a !== allergen)
                          : [...prev, allergen]
                      )
                    }}
                  >
                    <Text style={[
                        $filterChipText,
                        excludedAllergens.includes(allergen) && $filterChipTextSelected
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

      {/* Restaurant Detail Modal */}
      <RestaurantDetailModal
        restaurantId={selectedRestaurantId}
        visible={isModalVisible}
        onClose={() => {
          setIsModalVisible(false)
          setSelectedRestaurantId(null)
        }}
      />

      {/* Preferences Modal */}
      <PreferencesModal
        visible={isPreferencesModalVisible}
        onClose={() => setIsPreferencesModalVisible(false)}
      />
    </View>
  )
})

const $container: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
  paddingBottom: 65, // Space for bottom tabs
}

const $headerInScroll: ViewStyle = {
  paddingHorizontal: spacing.md,
  paddingTop: spacing.md,
  paddingBottom: spacing.sm,
  backgroundColor: colors.background,
}

const $headerTitle: TextStyle = {
  fontSize: 24,
  fontWeight: "bold",
  textAlign: "center",
  marginTop: spacing.lg,
  marginBottom: spacing.md,
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
  color: colors.palette.primary500,
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
  backgroundColor: colors.palette.neutral100,
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
  backgroundColor: colors.palette.neutral200,
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
  backgroundColor: colors.palette.neutral200,
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
  justifyContent: "center",
  paddingVertical: spacing.md,
}

const $tabButtonActive: ViewStyle = {
  backgroundColor: colors.palette.primary100,
}

const $logoutButton: ViewStyle = {
  marginTop: spacing.lg,
  marginHorizontal: spacing.lg,
  marginBottom: spacing.xl,
  backgroundColor: colors.palette.primary500,
  paddingVertical: spacing.md,
  borderRadius: 12,
  alignItems: "center",
  width: "auto",
}

const $logoutText: TextStyle = {
  color: colors.palette.neutral100,
  fontWeight: "600",
}

const $sectionTitleContainer: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  marginBottom: spacing.sm,
  marginTop: spacing.xs,
}

const $sectionButtons: ViewStyle = {
  flexDirection: "row",
  gap: spacing.sm,
}

const $sectionButton: ViewStyle = {
  padding: spacing.xs,
  borderRadius: 20,
  backgroundColor: colors.palette.neutral100,
  alignItems: "center",
  justifyContent: "center",
}

const $speechBubbleContainer: ViewStyle = {
  position: "absolute",
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  zIndex: 2000,
}

const $speechBubbleBackdrop: ViewStyle = {
  position: "absolute",
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: "rgba(0, 0, 0, 0.4)",
}

const $speechBubble: ViewStyle = {
  backgroundColor: colors.background,
  borderRadius: 16,
  width: "90%",
  maxHeight: "85%",
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
  borderBottomColor: colors.palette.neutral400,
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

const $filterSectionTitle: TextStyle = {
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
}

const $filterChipTextSelected: TextStyle = {
  color: colors.palette.neutral100,
}

const $userImageBadge: ViewStyle = {
  position: "absolute",
  top: spacing.xs,
  right: spacing.xs,
  backgroundColor: colors.palette.primary500,
  borderRadius: 12,
  width: 24,
  height: 24,
  alignItems: "center",
  justifyContent: "center",
}

const $scrappedImageBadge: ViewStyle = {
  position: "absolute",
  top: spacing.xs,
  right: spacing.xs,
  backgroundColor: colors.palette.secondary500,
  borderRadius: 12,
  width: 24,
  height: 24,
  alignItems: "center",
  justifyContent: "center",
}

const $imageBadgeText: TextStyle = {
  fontSize: 10,
  fontWeight: "bold",
  color: colors.palette.neutral100,
}

const $settingsButton: ViewStyle = {
  marginLeft: spacing.sm,
  padding: spacing.sm,
  borderRadius: 20,
  backgroundColor: colors.palette.neutral100,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
  alignItems: "center",
  justifyContent: "center",
}