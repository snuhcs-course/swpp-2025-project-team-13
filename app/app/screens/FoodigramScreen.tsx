import { LinearGradient } from "expo-linear-gradient"
import { Bookmark, Home, User } from "lucide-react-native"
import { observer } from "mobx-react-lite"
import React, { useEffect, useState, useRef } from "react"
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ImageBackground,
  RefreshControl,
  ScrollView,
  TextStyle, TouchableOpacity,
  View, ViewStyle,
  NativeSyntheticEvent,
  NativeScrollEvent
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
  const [isImageLoading, setIsImageLoading] = useState<{ [key: string]: boolean }>({})
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreData, setHasMoreData] = useState(true)
  const [currentMaxResults, setCurrentMaxResults] = useState(10)
  const scrollViewRef = useRef<ScrollView>(null)

  // Fetch recommendations function
  const fetchRecommendations = async (append = false) => {
    try {
      // User location info (should be obtained from GPS or user settings)
      const userLocation: [number, number] = [126.9619864, 37.477136] // Seoul Gangnam Station coordinates

      const maxResults = append ? currentMaxResults + 10 : 10
      const recommendations = await api.getMenuRecommendations(userLocation, {
        maxResults,
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
        
        if (append) {
          // 추가 로드: 기존 메뉴 ID를 추적하여 중복 제거
          const existingIds = new Set(recommendedMenus.map(m => m.id))
          const newMenus = uniquePlaceMenus.filter(menu => !existingIds.has(menu.id))
          
          if (newMenus.length === 0) {
            setHasMoreData(false)
          } else {
            setRecommendedMenus(prev => [...prev, ...newMenus])
            setCurrentMaxResults(maxResults)
          }
        } else {
          // 초기 로드
          setRecommendedMenus(uniquePlaceMenus)
          setCurrentMaxResults(10)
          setHasMoreData(uniquePlaceMenus.length >= 10)
        }
      }
    } catch (error) {
      console.error("Failed to fetch recommended menus:", error)
      setHasMoreData(false)
    }
  }

  // Load more recommendations
  const loadMoreRecommendations = async () => {
    if (isLoadingMore || !hasMoreData) return
    
    setIsLoadingMore(true)
    await fetchRecommendations(true)
    setIsLoadingMore(false)
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
    setHasMoreData(true)
    await fetchRecommendations(false)
    setRefreshing(false)
  }

  // Handle scroll event for infinite scroll
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent
    const paddingBottom = 100 // 하단 padding 크기
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingBottom

    if (isCloseToBottom && hasMoreData && !isLoadingMore && !isLoadingRecommendations) {
      loadMoreRecommendations()
    }
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

  const screenHeight = Dimensions.get("window").height

  return (
    <View style={$container}>
      {/* Main Full Screen Content */}
      <ScrollView
        ref={scrollViewRef}
        style={$fullScreenContainer}
        contentContainerStyle={$scrollContentContainer}
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
        onScroll={handleScroll}
      >
        {isLoadingRecommendations ? (
          // Loading state
          <View style={[$loadingContainer, { height: screenHeight }]}>
            <Text style={$loadingText}>근처 맛집을 찾고 있어요...</Text>
          </View>
        ) : recommendedMenus.length > 0 ? (
          // Vertical list of menu items
          <>
            {recommendedMenus.map((menu, index) => (
              <ImageBackground
                key={menu.id || index}
                source={{
                  uri:
                    menu.image_urls && menu.image_urls.length > 0
                      ? menu.image_urls[0]
                      : undefined,
                }}
                style={[$backgroundImage, { height: screenHeight }]}
                resizeMode="cover"
                onLoadStart={() => setIsImageLoading((prev) => ({ ...prev, [menu.id]: true }))}
                onLoadEnd={() => setIsImageLoading((prev) => ({ ...prev, [menu.id]: false }))}
                onError={() => setIsImageLoading((prev) => ({ ...prev, [menu.id]: false }))}
              >
                {/* Image Loading Indicator */}
                {isImageLoading[menu.id] && (
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

                {/* Top Header */}
                <View style={$topHeader}>
                  
                </View>

                {/* Bottom Info */}
                <View style={$bottomInfo}>
                  <View style={$restaurantNameContainer}>
                  <Text style={$restaurantName} numberOfLines={2}>
                    {menu.place_name}
                  </Text>
                  <TouchableOpacity
                    style={$headerButton}
                    onPress={() => toggleBookmark(menu)}
                  >
                    <Bookmark
                      size={24}
                      color="#fff"
                      fill={menuScrapStore.isScrapped(menu.id) ? "#fff" : "transparent"}
                    />
                  </TouchableOpacity>
                  </View>

                  
                  <Text style={$restaurantDetails} numberOfLines={1}>
                    {menu.category} • {menu.location}
                  </Text>
                  <View style={$menuDetails}>
                    <Text style={$menuNameLarge} numberOfLines={1}>
                      {menu.menu_name}
                    </Text>
                    <Text style={$menuPriceLarge} numberOfLines={1}>
                      {menu.price ? `₩${menu.price.toLocaleString()}` : "가격 정보 없음"}
                    </Text>
                    <Text style={$menuRatingLarge} numberOfLines={1}>
                      ⭐ {menu.rating} (리뷰 {menu.review_count}개)
                    </Text>
                    {menu.reason && (
                      <Text style={$menuReasonLarge} numberOfLines={2}>
                        {menu.category} 카테고리
                      </Text>
                    )}
                  </View>
                </View>
              </ImageBackground>
            ))}
            
            {/* Bottom padding with loading spinner */}
            <View style={$bottomPaddingContainer}>
              {isLoadingMore && (
                <View style={$loadingMoreContainer}>
                  <ActivityIndicator size="large" color="#f66c51" />
                  <Text style={$loadingMoreText}>더 많은 맛집을 찾고 있어요...</Text>
                </View>
              )}
            </View>
          </>
        ) : (
          // Error state
          <View style={[$emptyState, { height: screenHeight }]}>
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
  width: "100%",
}

const $backgroundImage: ViewStyle = {
  width: "100%",
  justifyContent: "space-between",
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

const $bottomPaddingContainer: ViewStyle = {
  height: 100,
  width: "100%",
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: spacing.lg,
  marginBottom: 80
}

const $loadingMoreContainer: ViewStyle = {
  justifyContent: "center",
  alignItems: "center",
  gap: spacing.sm,
}

const $loadingMoreText: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral400,
  marginTop: spacing.xs,
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
