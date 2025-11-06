import { LinearGradient } from "expo-linear-gradient"
import { Bookmark, Home, User } from "lucide-react-native"
import { observer } from "mobx-react-lite"
import React, { useEffect, useState } from "react"
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ImageBackground,
  RefreshControl,
  ScrollView,
  TextStyle, TouchableOpacity,
  View, ViewStyle
} from "react-native"
import { Text } from "../components"
import { useStores } from "../models"
import { AppStackScreenProps } from "../navigators"
import { api } from "../services/api"
import type { MenuRecommendationItem } from "../services/api/api.types"
import { colors, spacing } from "../theme"

interface FoodigramScreenProps extends AppStackScreenProps<"Foodigram"> {}

export const FoodigramScreen: React.FC<FoodigramScreenProps> = observer(function FoodigramScreen({
  navigation,
}) {
  const { menuScrapStore } = useStores()
  
  // Recommended menu related states
  const [recommendedMenus, setRecommendedMenus] = useState<MenuRecommendationItem[]>([])
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [currentMenuIndex, setCurrentMenuIndex] = useState(0)
  const [isImageLoading, setIsImageLoading] = useState(false)

  // Fetch recommendations function
  const fetchRecommendations = async () => {
    try {
      // User location info (should be obtained from GPS or user settings)
      const userLocation: [number, number] = [126.9619864, 37.477136] // Seoul Gangnam Station coordinates

      const recommendations = await api.getMenuRecommendations(userLocation, {
        maxResults: 10,
      })

      if (recommendations && recommendations.success && recommendations.results) {
        // 매장(place_id)가 중복되는 경우 가장 먼저 나오는 것만 보여주고 나머지는 필터링
        const uniquePlaceMenus = []
        const seenPlaceIds = new Set()
        for (const menu of recommendations.results) {
          if (menu.image_urls && menu.image_urls.length > 0 && !seenPlaceIds.has(menu.place_name)) {
            uniquePlaceMenus.push(menu)
            seenPlaceIds.add(menu.place_name)
          }
        }
        setRecommendedMenus(uniquePlaceMenus)
        setCurrentMenuIndex(0) // Reset to first menu when refreshing
      }
    } catch (error) {
      console.error("Failed to fetch recommended menus:", error)
    }
  }

  // Automatically fetch recommended menus on screen load
  useEffect(() => {
    const fetchInitialRecommendations = async () => {
      setIsLoadingRecommendations(true)
      await fetchRecommendations()
      setIsLoadingRecommendations(false)
    }

    fetchInitialRecommendations()
  }, [])

  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true)
    await fetchRecommendations()
    setRefreshing(false)
  }

  // Preload images
  useEffect(() => {
    if (recommendedMenus.length === 0) return

    const preloadImages = async () => {
      try {
        // Preload current image and next 3 images
        const imagesToPreload = recommendedMenus.slice(0, 4).map((menu) => {
          if (menu.image_urls && menu.image_urls.length > 0) {
            return Image.prefetch(menu.image_urls[0])
          }
          return Promise.resolve()
        })

        await Promise.all(imagesToPreload)
        if (__DEV__) {
          console.log("Image preload completed")
        }
      } catch (error) {
        if (__DEV__) {
          console.error("Image preload failed:", error)
        }
      }
    }

    preloadImages()
  }, [recommendedMenus])

  // Preload next images when index changes
  useEffect(() => {
    if (recommendedMenus.length === 0) return

    const preloadNextImages = async () => {
      try {
        const nextIndexes = [
          (currentMenuIndex + 1) % recommendedMenus.length,
          (currentMenuIndex + 2) % recommendedMenus.length,
        ]

        const imagesToPreload = nextIndexes.map((index) => {
          const menu = recommendedMenus[index]
          if (menu?.image_urls && menu.image_urls.length > 0) {
            return Image.prefetch(menu.image_urls[0])
          }
          return Promise.resolve()
        })

        await Promise.all(imagesToPreload)
      } catch (error) {
        // Ignore errors
      }
    }

    preloadNextImages()
  }, [currentMenuIndex, recommendedMenus])

  const handleNextMenu = () => {
    if (recommendedMenus.length === 0) return
    setCurrentMenuIndex((prev) => (prev + 1) % recommendedMenus.length)
  }

  const handlePreviousMenu = () => {
    if (recommendedMenus.length === 0) return
    // Don't go back from the first item
    if (currentMenuIndex === 0) return
    setCurrentMenuIndex((prev) => prev - 1)
  }

  const toggleBookmark = (menu: MenuRecommendationItem) => {
    const imageUrl = menu.image_urls && menu.image_urls.length > 0 ? menu.image_urls[0] : undefined
    
    menuScrapStore.toggleScrappedMenu({
      id: menu.id,
      menu_name: menu.menu_name,
      place_name: menu.place_name,
      price: menu.price,
      category: menu.category,
      location: menu.location,
      rating: menu.rating,
      review_count: menu.review_count,
      image_url: imageUrl,
      coordinates: menu.coordinates,
    })
  }

  const currentMenu = recommendedMenus[currentMenuIndex]
  const screenHeight = Dimensions.get("window").height

  return (
    <View style={$container}>
      {/* Main Full Screen Content */}
      <ScrollView
        style={$fullScreenContainer}
        contentContainerStyle={[$scrollContentContainer, { minHeight: screenHeight + 1 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#f66c51"
            colors={["#f66c51"]}
            progressViewOffset={60}
          />
        }
        bounces={true}
        scrollEventThrottle={16}
      >
        {isLoadingRecommendations ? (
          // Loading state
          <View style={$loadingContainer}>
            <Text style={$loadingText}>근처 맛집을 찾고 있어요...</Text>
          </View>
        ) : recommendedMenus.length > 0 && currentMenu ? (
          // Full screen menu display
          <>
            {/* Background Image */}
            <ImageBackground
              source={{
                uri:
                  currentMenu.image_urls && currentMenu.image_urls.length > 0
                    ? currentMenu.image_urls[0]
                    : undefined,
              }}
              style={$backgroundImage}
              resizeMode="cover"
              onLoadStart={() => setIsImageLoading(true)}
              onLoadEnd={() => setIsImageLoading(false)}
              onError={() => setIsImageLoading(false)}
            >
              {/* Image Loading Indicator */}
              {isImageLoading && (
                <View style={$imageLoadingContainer}>
                  <ActivityIndicator size="large" color="#fff" />
                </View>
              )}

              {/* Top Gradient Overlay */}
              <LinearGradient
                colors={["rgba(0,0,0,0.6)", "transparent"]}
                style={$gradientOverlayTop}
              />

              {/* Bottom Gradient Overlay */}
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.8)"]}
                style={$gradientOverlay}
              />

              {/* Progress Indicators */}
              <View style={$progressContainer}>
                {recommendedMenus.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      $progressBar,
                      index <= currentMenuIndex && $progressBarActive,
                    ]}
                  />
                ))}
              </View>

              {/* Top Header */}
              <View style={$topHeader}>
                
              </View>

              {/* Bottom Info */}
              <View style={$bottomInfo}>
                <View style={$restaurantNameContainer}>
                <Text style={$restaurantName} numberOfLines={2}>
                  {currentMenu.place_name}
                </Text>
                <TouchableOpacity
                  style={$headerButton}
                  onPress={() => toggleBookmark(currentMenu)}
                >
                  <Bookmark
                    size={24}
                    color="#fff"
                    fill={menuScrapStore.isScrapped(currentMenu.id) ? "#fff" : "transparent"}
                  />
                </TouchableOpacity>
                </View>

                
                <Text style={$restaurantDetails} numberOfLines={1}>
                  {currentMenu.category} • {currentMenu.location}
                </Text>
                <View style={$menuDetails}>
                  <Text style={$menuNameLarge} numberOfLines={1}>
                    {currentMenu.menu_name}
                  </Text>
                  <Text style={$menuPriceLarge} numberOfLines={1}>
                    {currentMenu.price ? `₩${currentMenu.price.toLocaleString()}` : "가격 정보 없음"}
                  </Text>
                  <Text style={$menuRatingLarge} numberOfLines={1}>
                    ⭐ {currentMenu.rating} (리뷰 {currentMenu.review_count}개)
                  </Text>
                  {currentMenu.reason && (
                    <Text style={$menuReasonLarge} numberOfLines={2}>
                      {currentMenu.category} 카테고리
                    </Text>
                  )}
                </View>
              </View>

              {/* Touch Areas for Navigation */}
              <TouchableOpacity
                style={$leftTouchArea}
                activeOpacity={1}
                onPress={handlePreviousMenu}
              />
              <TouchableOpacity
                style={$rightTouchArea}
                activeOpacity={1}
                onPress={handleNextMenu}
              />
            </ImageBackground>
          </>
        ) : (
          // Error state
          <View style={$emptyState}>
            <Text style={$emptyText}>음식점을 불러오지 못했어요</Text>
            <Text style={$emptySubtext}>잠시 후 다시 시도해 주세요</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Tabs */}
      <View style={$bottomTabs}>
        <TouchableOpacity
          style={$tabButton}
          onPress={() => {
            if (__DEV__) {
              console.log(`Home: tapped home button (already on Foodigram)`)
            }
            navigation.navigate("Foodigram")
          }}
        >
          <Home size={24} color={colors.palette.primary500} strokeWidth={2} />
          <Text style={$tabButtonTextActive}>추천</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={$tabButton}
          onPress={() => {
            if (__DEV__) {
              console.log(`Home: navigated to Profile`)
            }
            navigation.navigate("Profile")
          }}
        >
          <User size={24} color={colors.palette.neutral400} strokeWidth={2} />
          <Text style={$tabButtonText}>마이페이지</Text>
        </TouchableOpacity>
      </View>

    </View>
  )
})

const $container: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
}

const $fullScreenContainer: ViewStyle = {
  flex: 1,
  position: "relative",
}

const $scrollContentContainer: ViewStyle = {
  flex: 1,
}

const $backgroundImage: ViewStyle = {
  flex: 1,
  width: "100%",
  height: "100%",
}

const $gradientOverlayTop: ViewStyle = {
  position: "absolute",
  left: 0,
  right: 0,
  top: 0,
  height: "25%",
}

const $gradientOverlay: ViewStyle = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  height: "50%",
}

const $progressContainer: ViewStyle = {
  position: "absolute",
  top: spacing.xl + spacing.xs,
  left: spacing.sm,
  right: spacing.sm,
  flexDirection: "row",
  gap: 4,
  zIndex: 15,
  marginTop: spacing.lg,
}

const $progressBar: ViewStyle = {
  flex: 1,
  height: 3,
  backgroundColor: "rgba(255, 255, 255, 0.3)",
  borderRadius: 2,
}

const $progressBarActive: ViewStyle = {
  backgroundColor: "rgba(255, 255, 255, 0.9)",
}

const $topHeader: ViewStyle = {
  position: "absolute",
  top: 24,
  left: 0,
  right: 0,
  paddingTop: spacing.xxl + spacing.md,
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.md,
  flexDirection: "row",
  justifyContent: "flex-end",
  alignItems: "center",
  zIndex: 10,
}

const $headerButton: ViewStyle = {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: "rgba(0,0,0,0.4)",
  justifyContent: "center",
  alignItems: "center",
}

const $bottomInfo: ViewStyle = {
  position: "absolute",
  bottom: 85, // Above bottom tabs
  left: 0,
  right: 0,
  paddingHorizontal: spacing.lg,
  paddingBottom: spacing.sm,
  zIndex: 10,
}

const $restaurantNameContainer: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
}

const $restaurantName: TextStyle = {
  fontSize: 28,
  fontWeight: "bold",
  color: "#fff",
  marginBottom: 4,
  lineHeight: 36,
}

const $restaurantDetails: TextStyle = {
  fontSize: 16,
  color: "#fff",
  marginBottom: spacing.sm,
}

const $menuDetails: ViewStyle = {
  gap: spacing.xs,
}

const $menuNameLarge: TextStyle = {
  fontSize: 16,
  fontWeight: "600",
  color: "#fff",
}

const $menuPriceLarge: TextStyle = {
  fontSize: 15,
  fontWeight: "500",
  color: "#fff",
}

const $menuRatingLarge: TextStyle = {
  fontSize: 13,
  color: "#fff",
}

const $menuReasonLarge: TextStyle = {
  fontSize: 13,
  color: "rgba(255,255,255,0.85)",
  fontStyle: "italic",
  marginTop: 4,
}

const $leftTouchArea: ViewStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "50%",
  height: "100%",
  zIndex: 5,
}

const $rightTouchArea: ViewStyle = {
  position: "absolute",
  top: 0,
  right: 0,
  width: "50%",
  height: "100%",
  zIndex: 5,
}

const $loadingContainer: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: colors.background,
}

const $loadingText: TextStyle = {
  fontSize: 16,
  color: colors.palette.neutral400,
}

const $imageLoadingContainer: ViewStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "rgba(0,0,0,0.3)",
  zIndex: 20,
}


const $emptyState: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: spacing.md,
  backgroundColor: colors.background,
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

const $bottomTabs: ViewStyle = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  height: 80,
  flexDirection: "row",
  borderTopWidth: 0.5,
  borderTopColor: colors.palette.neutral300,
  backgroundColor: "#ffffff",
  zIndex: 100,
  paddingBottom: spacing.xs,
}

const $tabButton: ViewStyle = {
  flex: 1,
  height: "100%",
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: spacing.sm,
  gap: 4,
}

const $tabButtonText: TextStyle = {
  fontSize: 11,
  color: colors.palette.neutral400,
  fontWeight: "500",
}

const $tabButtonTextActive: TextStyle = {
  fontSize: 11,
  color: colors.palette.primary500,
  fontWeight: "600",
}
