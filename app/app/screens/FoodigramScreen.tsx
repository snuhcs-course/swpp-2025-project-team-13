import { LinearGradient } from "expo-linear-gradient"
import { Bookmark, Home, User } from "lucide-react-native"
import { observer } from "mobx-react-lite"
import React, { useEffect, useState, useRef, useCallback } from "react"
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ImageBackground,
  RefreshControl,
  FlatList,
  TextStyle, TouchableOpacity,
  View, ViewStyle,
  ListRenderItem
} from "react-native"
import { ScrapToast, Text } from "../components"
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
  const [showScrapToast, setShowScrapToast] = useState(false)
  const flatListRef = useRef<FlatList>(null)

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
  const loadMoreRecommendations = useCallback(async () => {
    if (isLoadingMore || !hasMoreData) return
    
    setIsLoadingMore(true)
    await fetchRecommendations(true)
    setIsLoadingMore(false)
  }, [isLoadingMore, hasMoreData])

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

  // Handle end reached for infinite scroll
  const handleEndReached = useCallback(() => {
    if (hasMoreData && !isLoadingMore && !isLoadingRecommendations && recommendedMenus.length > 0) {
      loadMoreRecommendations()
    }
  }, [hasMoreData, isLoadingMore, isLoadingRecommendations, recommendedMenus.length, loadMoreRecommendations])

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


  const toggleBookmark = useCallback((menu: MenuRecommendationItem) => {
    const imageUrl = menu.image_urls && menu.image_urls.length > 0 ? menu.image_urls[0] : undefined
    
    const wasScrapped = menuScrapStore.isScrapped(menu.id)
    const isNowScrapped = menuScrapStore.toggleScrappedMenu({
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
    
    // Show toast only when item is newly scrapped (wasn't scrapped before, but is now)
    if (!wasScrapped && isNowScrapped) {
      setShowScrapToast(true)
    }
  }, [menuScrapStore])

  const screenHeight = Dimensions.get("window").height

  // Render individual menu item
  const renderMenuItem: ListRenderItem<MenuRecommendationItem> = useCallback(({ item: menu }) => {
    return (
      <ImageBackground
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
          <Text style={$restaurantName} numberOfLines={1} ellipsizeMode="tail">
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
                {menu.category}
              </Text>
            )}
          </View>
        </View>
      </ImageBackground>
    )
  }, [screenHeight, isImageLoading, toggleBookmark, menuScrapStore.scrappedMenus.length])

  // Get item layout for performance optimization
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: screenHeight,
      offset: screenHeight * index,
      index,
    }),
    [screenHeight]
  )

  // Key extractor
  const keyExtractor = useCallback((item: MenuRecommendationItem, index: number) => {
    return item.id?.toString() || `menu-${index}`
  }, [])

  // List footer component (loading spinner)
  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null
    
    return (
      <View style={$bottomPaddingContainer}>
        <View style={$loadingMoreContainer}>
          <ActivityIndicator size="large" color="#f66c51" />
          <Text style={$loadingMoreText}>더 많은 맛집을 찾고 있어요...</Text>
        </View>
      </View>
    )
  }, [isLoadingMore])

  // List empty component
  const renderEmpty = useCallback(() => {
    if (isLoadingRecommendations) {
      return (
        <View style={[$loadingContainer, { height: screenHeight }]}>
          <Text style={$loadingText}>근처 맛집을 찾고 있어요...</Text>
        </View>
      )
    }
    
    return (
      <View style={[$emptyState, { height: screenHeight }]}>
        <Text style={$emptyText}>음식점을 불러오지 못했어요</Text>
        <Text style={$emptySubtext}>잠시 후 다시 시도해 주세요</Text>
      </View>
    )
  }, [isLoadingRecommendations, screenHeight])

  return (
    <View style={$container}>
      {/* Main Full Screen Content */}
      <FlatList
        ref={flatListRef}
        data={recommendedMenus}
        renderItem={renderMenuItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        extraData={menuScrapStore.scrappedMenus.length}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#f66c51"
            colors={["#f66c51"]}
            progressViewOffset={60}
          />
        }
        style={$fullScreenContainer}
        contentContainerStyle={$scrollContentContainer}
        bounces={true}
        pagingEnabled={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
        updateCellsBatchingPeriod={50}
      />

      {/* Scrap Toast */}
      <ScrapToast
        visible={showScrapToast}
        onDismiss={() => setShowScrapToast(false)}
        onNavigate={() => navigation.navigate("Scrap")}
      />

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
              console.log(`Home: navigated to Scrap`)
            }
            navigation.navigate("Scrap")
          }}
        >
          <Bookmark size={24} color={colors.palette.neutral400} strokeWidth={2} />
          <Text style={$tabButtonText}>스크랩</Text>
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
  gap: spacing.sm,
}

const $restaurantName: TextStyle = {
  fontSize: 28,
  fontWeight: "bold",
  color: "#fff",
  marginBottom: 4,
  lineHeight: 36,
  flex: 1,
  flexShrink: 1,
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
